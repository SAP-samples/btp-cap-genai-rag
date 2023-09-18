import { ApplicationService } from "@sap/cds";
import { Request } from "@sap/cds/apis/services";
import { v4 as uuidv4 } from "uuid";
import { DataSourceOptions } from "typeorm";
import { z } from "zod";
import {
    ChatPromptTemplate,
    HumanMessagePromptTemplate,
    PromptTemplate,
    SystemMessagePromptTemplate
} from "langchain/prompts";
import { StructuredOutputParser } from "langchain/output_parsers";
import { TypeORMVectorStore, TypeORMVectorStoreDocument } from "langchain/vectorstores/typeorm";
import { getDestination } from "@sap-cloud-sdk/connectivity";
import { BTPLLMContext } from "@sap/llm-commons";
import { BTPOpenAIChat } from "@sap/llm-commons/langchain/chat/openai";
import { BTPOpenAIEmbedding } from "@sap/llm-commons/langchain/embedding/openai";
import { LLMChain } from "langchain";

interface IBaseMail {
    ID?: string;
    sender: string;
    subject: string;
    body: string;
}

const LLM_SERVICE_DESTINATION = "PROVIDER_AI_CORE_DESTINATION_CANARY";

const DEFAULT_TABLE = "_main";

const MAIL_INSIGHTS_SCHEMA = z
    .object({
        category: z.string().describe(`Category of the email. It could be one of the following:
        - Booking Assistance
        - Cancellation
        - Problem During Travel
        - Post-Trip Complaint
        - General Inquiry
        - Special Requests
        `),
        sentiment: z.number().describe("The sentiment of the email: -10 for very bad up to 10 for very good"),
        urgency: z
            .number()
            .describe("Whether the email is urgent or not ranging from 0 for not urgent to 10 for urgent"),
        summary: z.string().describe("Summary of the mail in original language"),
        translationSubject: z.string().describe("Translation of the mail subject into german"),
        translationBody: z.string().describe("Translation of the mail body into german"),
        translationSummary: z.string().describe("Summary of the mail into german"),
        potentialResponse: z
            .string()
            .describe("A potential response of the mail acting as customer service in the source language as email"),
        facts: z
            .array(
                z.object({
                    fact: z.string().optional().describe("key for the fact which should be unique"),
                    factTitle: z.string().optional().describe("label for the fact which should be unique"),
                    value: z.string().optional().describe("value or insight of the fact")
                })
            )
            .describe("An array additional of up to 5 key facts found in the email")
    })
    .describe("Insights about the email and potential actions as e.g., a potential reply to the incoming email");

interface CustomField {
    key: string;
    isNumber: boolean;
    description: string;
}

export default class ApiService extends ApplicationService {
    async init() {
        await super.init();
        this.on("getMails", this.getMails);
        this.on("getMail", this.getMail);
        this.on("addMails", this.addMails);
        this.on("recalculateInsights", this.recalculateInsights);
        this.on("deleteMail", this.deleteMail);
        this.on("userInfo", this.userInfo);
    }

    private getMails = async (_req: Request) => {
        try {
            const { Mails } = this.entities;
            const mails = await SELECT.from(Mails).columns((m: any) => {
                m.ID;
                m.subject;
                m.body;
                m.category;
                m.sender;
            });
            return mails;
        } catch (error: any) {
            console.error(`Error: ${error?.message}`);
            return {};
        }
    };

    private getMail = async (req: Request) => {
        try {
            const { tenant } = req;
            const { id } = req.data;
            const { Mails } = this.entities;
            const mail = await SELECT.one.from(Mails, id);
            const closestMailsIDs = await getClosestMails(id, 5, {}, tenant);
            const closestMails =
                closestMailsIDs.length > 0
                    ? await SELECT.from(Mails)
                          .where({
                              ID: {
                                  in: closestMailsIDs.map(
                                      ([doc, _distance]: [TypeORMVectorStoreDocument, number]) => doc.metadata.id
                                  )
                              }
                          })
                          .columns((m: any) => {
                              m.ID;
                              m.subject;
                              m.body;
                              m.category;
                              m.sender;
                          })
                    : [];
            const closestMailsWithSimilarity: { similarity: number; mail: any } = closestMails.map((mail: any) => {
                const [_, _distance]: [TypeORMVectorStoreDocument, number] = closestMailsIDs.find(
                    ([doc, _distance]: [TypeORMVectorStoreDocument, number]) => mail.ID === doc.metadata.id
                );
                return { similarity: 1.0 - _distance, mail: mail };
            });
            return { mail, closestMails: closestMailsWithSimilarity };
        } catch (error: any) {
            console.error(`Error: ${error?.message}`);
            return {};
        }
    };

    private recalculateInsights = async (_req: Request) => {
        const { Mails } = this.entities;
        const mails = await SELECT.from(Mails);
        await this.upsertInsights(mails);
        return true;
    };

    private upsertInsights = async (mails: Array<IBaseMail>) => {
        // dynamically add custom fields
        // todo: custom fields from database
        let customFields = [
            {
                key: "location",
                isNumber: false,
                description: "Extract the geo location for the trip the email is about"
            }
        ];
        const zodCustomFields = customFields.reduce(
            (fields: { [key: string]: z.ZodNumber | z.ZodString | any }, field: CustomField) => {
                return {
                    ...fields,
                    [field.key]: z.optional(field.isNumber ? z.number() : z.string()).describe(field.description)
                };
            },
            {}
        );
        let mailInsightsSchemaWithCustomFields = MAIL_INSIGHTS_SCHEMA.merge(
            z.object({
                customFields: z.object(zodCustomFields)
            })
        );
        const parser = StructuredOutputParser.fromZodSchema(mailInsightsSchemaWithCustomFields);
        const formatInstructions = parser.getFormatInstructions();
        await initializeBTPContext();
        const llm = new BTPOpenAIChat({ deployment_id: "gpt-35-turbo", temperature: 0.0, maxTokens: 2000 });
        const systemPrompt = new PromptTemplate({
            template: "Give insights about the incoming email.\n{format_instructions}",
            inputVariables: [],
            partialVariables: { format_instructions: formatInstructions }
        });
        const systemMessagePrompt = new SystemMessagePromptTemplate({ prompt: systemPrompt });
        const humanTemplate = "{subject}\n{body}";
        const humanMessagePrompt = HumanMessagePromptTemplate.fromTemplate(humanTemplate);

        const chatPrompt = ChatPromptTemplate.fromPromptMessages([systemMessagePrompt, humanMessagePrompt]);
        const chain = new LLMChain({
            llm: llm,
            prompt: chatPrompt
        });
        console.log("GENERATING INSIGHTS...");
        const mailsInsights = await Promise.all(
            mails.map(async (mail: { ID?: string; subject: string; body: string; sender: string }) => {
                const result = await chain.call({
                    subject: mail.subject,
                    body: mail.body
                });
                const insights = await parser.parse(result.text);
                return { mail, insights };
            })
        );

        // insert mails with insights
        console.log("UPDATE MAILS WITH INSIGHTS...");
        const mailBatch = mailsInsights.reduce(
            (mails: Array<IBaseMail>, { mail, insights }: { mail: IBaseMail; insights: any }) => {
                return [
                    ...mails,
                    {
                        ID: mail.ID || uuidv4(),
                        subject: mail.subject,
                        body: mail.body,
                        sender: mail.sender,
                        category: insights.category,
                        sentiment: insights.sentiment,
                        urgency: insights.urgency,
                        summary: insights.summary,
                        translationSubject: insights.translationSubject,
                        translationBody: insights.translationBody,
                        translationSummary: insights.translationBody,
                        potentialResponse: insights.potentialResponse
                        // add facts
                        // add custom fields
                    }
                ];
            },
            new Array<IBaseMail>()
        );

        cds.tx(async () => {
            const { Mails } = this.entities;
            await UPSERT.into(Mails).entries(mailBatch);
        });
        return mailBatch;
    };

    private deleteMail = async (req: Request) => {
        try {
            const { tenant } = req;
            const { id } = req.data;
            const { Mails } = this.entities;
            const response = await DELETE.from(Mails, id);
            console.log(response);
            const typeormVectorStore = await getVectorStore(tenant);
            const queryString = `DELETE FROM ${typeormVectorStore.tableName} WHERE (metadata->'id')::jsonb ? $1;`;

            const vectorStoreResult = await typeormVectorStore.appDataSource.query(queryString, [id]);
            console.log(vectorStoreResult);
            return true;
        } catch (error: any) {
            console.error(`Error: ${error?.message}`);
        }
    };

    private addMails = async (req: Request) => {
        try {
            const { tenant } = req;
            const { mails } = req.data;
            const mailBatch = await this.upsertInsights(mails);
            // embed mail bodies with IDs
            console.log("EMBED MAILS WITH IDs...");
            const typeormVectorStore = await getVectorStore(tenant);
            await typeormVectorStore.addDocuments(
                mailBatch.map((mail: IBaseMail) => ({
                    pageContent: mail.body,
                    // add category, services, actions to metadata
                    metadata: { id: mail.ID }
                }))
            );

            return mailBatch[0];
        } catch (error: any) {
            console.error(`Error: ${error?.message}`);
        }
    };

    private userInfo = (req: Request) => {
        let results = {
            user: req.user.id,
            locale: req.locale,
            tenant: req.tenant,
            scopes: {
                authenticated: req.user.is("authenticated-user"),
                identified: req.user.is("identified-user"),
                Member: req.user.is("Member"),
                Admin: req.user.is("Admin"),
                ExtendCDS: req.user.is("ExtendCDS"),
                ExtendCDSdelete: req.user.is("ExtendCDSdelete")
            }
        };

        return results;
    };
}

const getVectorStore = async (tenant: string) => {
    await initializeBTPContext();
    const embeddings = new BTPOpenAIEmbedding({
        deployment_id: "text-embedding-ada-002-v2"
    });
    const args = getPostgresConnectionOptions(tenant);
    const typeormVectorStore = await TypeORMVectorStore.fromDataSource(embeddings, args);
    await typeormVectorStore.ensureTableInDatabase();
    return typeormVectorStore;
};

const getPostgresConnectionOptions = (tenant: string) => {
    // @ts-ignore
    const credentials = cds.env.requires?.postgres?.credentials;
    return {
        postgresConnectionOptions: {
            type: "postgres",
            host: credentials?.hostname,
            username: credentials?.username,
            database: credentials?.dbname,
            password: credentials?.password,
            port: credentials?.port,
            ssl: credentials?.sslcert
                ? {
                      cert: credentials?.sslcert,
                      ca: credentials?.sslrootcert,
                      rejectUnauthorized: credentials?.hostname === "127.0.0.1" ? false : undefined
                  }
                : false
        } as DataSourceOptions,

        tableName: tenant ? "_" + tenant.replace(/-/g, "") : DEFAULT_TABLE
    };
};

const getClosestMails = async (
    id: string,
    k: number = 5,
    filter: any = {},
    tenant: string = DEFAULT_TABLE
): Promise<Array<[TypeORMVectorStoreDocument, number]>> => {
    const typeormVectorStore = await getVectorStore(tenant);

    const queryString = `
    SELECT x.id, x."pageContent", x.metadata, x.embedding <=> focus.embedding as _distance from ${typeormVectorStore.tableName} as x
    join (SELECT * from ${typeormVectorStore.tableName} where (metadata->'id')::jsonb ? $1) as focus
    on focus.id != x.id
    WHERE x.metadata @> $2
    ORDER BY _distance LIMIT $3;
    `;

    const documents = await typeormVectorStore.appDataSource.query(queryString, [id, filter, k]);
    const results: Array<[TypeORMVectorStoreDocument, number]> = [];
    for (const doc of documents) {
        if (doc._distance != null && doc.pageContent != null) {
            const document = new TypeORMVectorStoreDocument(doc);
            document.id = doc.id;
            results.push([document, doc._distance]);
        }
    }
    return results;
};

const initializeBTPContext = async () => {
    // get from LLM Proxy binding
    const credentials = await getLLMAccessCredentials();
    await BTPLLMContext.init({
        oauthClientId: credentials.clientId,
        oauthClientSecret: credentials.clientSecret,
        oauthTokenUrl: credentials.tokenServiceUrl, // the Auth URL ending `ondemand.com`
        llmProxyBaseUrl: credentials.url // the service URL ending `ondemand.com`
    });
};

const getLLMAccessCredentials = async () => {
    const { clientId, clientSecret, url, tokenServiceUrl } = await getDestination({
        destinationName: LLM_SERVICE_DESTINATION
    });
    return {
        clientId,
        clientSecret,
        url,
        tokenServiceUrl: tokenServiceUrl.replace("/oauth/token", "")
    };
};
