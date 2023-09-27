import cds, { ApplicationService } from "@sap/cds";
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
import { LLMChain } from "langchain/chains";
import { OutputFixingParser, StructuredOutputParser } from "langchain/output_parsers";
import { TypeORMVectorStore, TypeORMVectorStoreDocument } from "langchain/vectorstores/typeorm";
import { getDestination } from "@sap-cloud-sdk/connectivity";
import { BTPLLMContext } from "@sap/llm-commons";
import { BTPOpenAIGPTChat } from "@sap/llm-commons/langchain/chat/openai";
import { BTPOpenAIGPTEmbedding } from "@sap/llm-commons/langchain/embedding/openai";
import {
    IBaseMail,
    IProcessedMail,
    ITranslatedMail,
    IStoredMail,
    CustomField,
    ZodOptionalStringOrNumber
} from "./types";
import {
    MAIL_INSIGHTS_SCHEMA,
    MAIL_INSIGHTS_TRANSLATION_SCHEMA,
    MAIL_RESPONSE_TRANSLATION_SCHEMA,
    MAIL_LANGUAGE_SCHEMA,
    MAIL_RESPONSE_SCHEMA
} from "./schemas";

const LLM_SERVICE_DESTINATION = "PROVIDER_AI_CORE_DESTINATION_CANARY";
const DEFAULT_TABLE = "_main";

const filterForTranslation = ({
    subject,
    body,
    sender,
    requestedServices,
    customFields,
    summary,
    keyFacts,
    responseBody
}: any) => ({
    subject,
    body,
    sender,
    requestedServices,
    customFields,
    summary,
    keyFacts,
    responseBody
});

export default class ApiService extends ApplicationService {
    async init() {
        await super.init();
        this.on("getMails", this.getMails);
        this.on("getMail", this.getMail);
        this.on("addMails", this.addMails);
        this.on("recalculateInsights", this.recalculateInsights);
        this.on("recalculateResponse", this.recalculateResponse);
        this.on("deleteMail", this.deleteMail);
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
                              m.translations;
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

    private recalculateResponse = async (req: Request) => {
        const { id, additionalInformation = "" } = req.data;
        const { Mails } = this.entities;
        const mail = await SELECT.one.from(Mails, id);
        await this.upsertResponse(mail, additionalInformation);
        return true;
    };

    private extractGeneralInsights = async (mails: Array<IBaseMail>): Promise<Array<IProcessedMail>> => {
        const { CustomFields } = this.entities;
        const customFields = await SELECT.from(CustomFields);

        const zodCustomFields = customFields.reduce(
            (fields: { [title: string]: ZodOptionalStringOrNumber }, field: CustomField) => {
                return {
                    ...fields,
                    [field.title]: (field.isNumber ? z.number() : z.string()).nullable().describe(field.description)
                };
            },
            {} as { [key: string]: ZodOptionalStringOrNumber }
        );
        let mailInsightsSchemaWithCustomFields = MAIL_INSIGHTS_SCHEMA.merge(
            z
                .object({
                    customFields: z.object(zodCustomFields)
                })
                .describe(`Extract additional information ouf of the mail.`)
        );
        const parser = StructuredOutputParser.fromZodSchema(mailInsightsSchemaWithCustomFields);
        const formatInstructions = parser.getFormatInstructions();

        await initializeBTPContext();
        const llm = new BTPOpenAIGPTChat({ deployment_id: "gpt-35-turbo", temperature: 0.0, maxTokens: 2000 });

        const systemPrompt = new PromptTemplate({
            template:
                "Give insights about the incoming email.\n{format_instructions}\n" +
                "Make sure to escape special characters by double slashes.",
            inputVariables: [],
            partialVariables: { format_instructions: formatInstructions }
        });

        const systemMessagePrompt = new SystemMessagePromptTemplate({ prompt: systemPrompt });
        const humanTemplate = "{subject}\n{body}";
        const humanMessagePrompt = HumanMessagePromptTemplate.fromTemplate(humanTemplate);
        const chatPrompt = ChatPromptTemplate.fromPromptMessages([systemMessagePrompt, humanMessagePrompt]);

        const chain = new LLMChain({
            llm: llm,
            prompt: chatPrompt,
            outputKey: "text",
            outputParser: OutputFixingParser.fromLLM(llm, parser)
        });

        console.log("GENERATING INSIGHTS...");
        const mailsInsights = await Promise.all(
            mails.map(async (mail: IBaseMail): Promise<IProcessedMail> => {
                const insights: z.infer<typeof mailInsightsSchemaWithCustomFields> = (
                    await chain.call({
                        subject: mail.subject,
                        body: mail.body
                    })
                ).text;
                const reducedInsights = (({ customFields, ...o }) => o)(insights);
                const customFields = Object.entries(insights.customFields).map(
                    ([key, value]): { title?: string; value?: string } => ({
                        title: key,
                        value: value
                    })
                );

                return { mail: { ...mail }, insights: { ...reducedInsights, customFields: customFields } };
            })
        );

        return mailsInsights;
    };

    private preparePotentialResponses = async (mails: Array<IBaseMail>, additionalInformation: String | "" = "") => {
        let responseAdditionalInformation = additionalInformation;

        // prepare response
        const parser = StructuredOutputParser.fromZodSchema(MAIL_RESPONSE_SCHEMA);
        const formatInstructions = parser.getFormatInstructions();

        await initializeBTPContext();
        const llm = new BTPOpenAIGPTChat({ deployment_id: "gpt-35-turbo", temperature: 0.0, maxTokens: 2000 });

        const systemPrompt = new PromptTemplate({
            template:
                "Formulate a response to the original mail using given additional information." +
                "Address the sender appropriately.\n{format_instructions}\n" +
                "Make sure to escape special characters by double slashes.",
            inputVariables: [],
            partialVariables: { format_instructions: formatInstructions }
        });

        const systemMessagePrompt = new SystemMessagePromptTemplate({ prompt: systemPrompt });
        const humanTemplate = "{sender}\n{subject}\n{body}\n{additionalInformation}";
        const humanMessagePrompt = HumanMessagePromptTemplate.fromTemplate(humanTemplate);
        const chatPrompt = ChatPromptTemplate.fromMessages([systemMessagePrompt, humanMessagePrompt]);

        const chain = new LLMChain({
            llm: llm,
            prompt: chatPrompt,
            outputKey: "text",
            outputParser: OutputFixingParser.fromLLM(llm, parser)
        });

        const potentialResponses = await Promise.all(
            mails.map(async (mail: IBaseMail) => {
                const response: z.infer<typeof MAIL_RESPONSE_SCHEMA> = (
                    await chain.call({
                        sender: mail.senderEmailAddress,
                        subject: mail.subject,
                        body: mail.body,
                        additionalInformation: responseAdditionalInformation
                    })
                ).text;
                return { mail, response };
            })
        );

        return potentialResponses;
    };

    // Extract Language Matches
    private extractLanguageMatches = async (mails: Array<IBaseMail>) => {
        // prepare response
        const parser = StructuredOutputParser.fromZodSchema(MAIL_LANGUAGE_SCHEMA);
        const formatInstructions = parser.getFormatInstructions();

        await initializeBTPContext();
        const llm = new BTPOpenAIGPTChat({ deployment_id: "gpt-35-turbo", temperature: 0.0, maxTokens: 2000 });

        const systemPrompt = new PromptTemplate({
            template:
                "Extract the language related information.\n{format_instructions}\n" +
                "Make sure to escape special characters by double slashes.",
            inputVariables: [],
            partialVariables: { format_instructions: formatInstructions }
        });

        const systemMessagePrompt = new SystemMessagePromptTemplate({ prompt: systemPrompt });
        const humanMessagePrompt = HumanMessagePromptTemplate.fromTemplate("{mail}");
        const chatPrompt = ChatPromptTemplate.fromMessages([systemMessagePrompt, humanMessagePrompt]);

        const chain = new LLMChain({
            llm: llm,
            prompt: chatPrompt,
            outputKey: "text",
            outputParser: OutputFixingParser.fromLLM(llm, parser)
        });

        const languageMatches = await Promise.all(
            mails.map(async (mail: IBaseMail) => {
                const languageMatch: z.infer<typeof MAIL_LANGUAGE_SCHEMA> = (
                    await chain.call({
                        mail: mail.body
                    })
                ).text;

                return { mail, languageMatch };
            })
        );

        return languageMatches;
    };

    // Translates all insights
    private translateInsights = async (mails: Array<IProcessedMail>) => {
        // prepare response
        const parser = StructuredOutputParser.fromZodSchema(MAIL_INSIGHTS_TRANSLATION_SCHEMA);
        const formatInstructions = parser.getFormatInstructions();

        await initializeBTPContext();
        const llm = new BTPOpenAIGPTChat({ deployment_id: "gpt-35-turbo", temperature: 0.0, maxTokens: 2000 });

        const systemPrompt = new PromptTemplate({
            template:
                "Translate the insights of the incoming json.\n{format_instructions}\n" +
                "Make sure to escape special characters by double slashes.",
            inputVariables: [],
            partialVariables: { format_instructions: formatInstructions }
        });

        const systemMessagePrompt = new SystemMessagePromptTemplate({ prompt: systemPrompt });
        const humanMessagePrompt = HumanMessagePromptTemplate.fromTemplate("{insights}");
        const chatPrompt = ChatPromptTemplate.fromMessages([systemMessagePrompt, humanMessagePrompt]);

        const chain = new LLMChain({
            llm: llm,
            prompt: chatPrompt,
            outputKey: "text",
            outputParser: OutputFixingParser.fromLLM(llm, parser)
        });

        const translations = await Promise.all(
            mails.map(async (mail: IProcessedMail) => {
                if (!mail.insights.languageMatch) {
                    const translations: z.infer<typeof MAIL_INSIGHTS_TRANSLATION_SCHEMA> = (
                        await chain.call({
                            insights: JSON.stringify(
                                filterForTranslation({
                                    ...mail.mail,
                                    ...mail.insights
                                })
                            )
                        })
                    ).text;

                    return { ...mail, translations: [translations] };
                } else {
                    return { ...mail, translations: [] };
                }
            })
        );

        return translations;
    };

    // Only translates the Potential Response
    private translatePotentialResponse = async (responseBody: String) => {
        // prepare response
        const parser = StructuredOutputParser.fromZodSchema(MAIL_RESPONSE_TRANSLATION_SCHEMA);
        const formatInstructions = parser.getFormatInstructions();

        await initializeBTPContext();
        const llm = new BTPOpenAIGPTChat({ deployment_id: "gpt-35-turbo", temperature: 0.0, maxTokens: 2000 });

        const systemPrompt = new PromptTemplate({
            template:
                "Translate the response of the incoming json.\n{format_instructions}\n" +
                "Make sure to escape special characters by double slashes.",
            inputVariables: [],
            partialVariables: { format_instructions: formatInstructions }
        });

        const systemMessagePrompt = new SystemMessagePromptTemplate({ prompt: systemPrompt });
        const humanMessagePrompt = HumanMessagePromptTemplate.fromTemplate("{response}");
        const chatPrompt = ChatPromptTemplate.fromMessages([systemMessagePrompt, humanMessagePrompt]);

        const chain = new LLMChain({
            llm: llm,
            prompt: chatPrompt,
            outputKey: "text",
            outputParser: OutputFixingParser.fromLLM(llm, parser)
        });

        const translation: z.infer<typeof MAIL_RESPONSE_TRANSLATION_SCHEMA> = (
            await chain.call({
                response: JSON.stringify(responseBody)
            })
        ).text;

        return translation;
    };

    private upsertInsights = async (mails: Array<IBaseMail>) => {
        // Add unique ID to mails if not existent
        mails = mails.map((mail) => {
            return { ...mail, ID: mail.ID || uuidv4() };
        });

        const generalInsights = await this.extractGeneralInsights(mails);
        const potentialResponses = await this.preparePotentialResponses(mails);
        const languageMatches = await this.extractLanguageMatches(mails);

        const processedMails = mails.reduce((mails: Array<IProcessedMail>, mail: IBaseMail) => {
            return [
                ...mails,
                {
                    mail: { ...mail },
                    insights: {
                        ...generalInsights.filter(
                            (res: { mail: IBaseMail; insights: any }) => res.mail.ID === mail.ID
                        )[0].insights,
                        ...potentialResponses.filter(
                            (res: { mail: IBaseMail; response: any }) => res.mail.ID === mail.ID
                        )[0].response,
                        ...languageMatches.filter(
                            (res: { mail: IBaseMail; languageMatch: any }) => res.mail.ID === mail.ID
                        )[0].languageMatch
                    }
                }
            ];
        }, new Array<IProcessedMail>());

        const translatedMails: Array<ITranslatedMail> = await this.translateInsights(processedMails);

        // insert mails with insights
        console.log("UPDATE MAILS WITH INSIGHTS...");

        const dbEntries = translatedMails.map((translatedMail) => {
            return {
                ...translatedMail.mail,
                ...translatedMail.insights,
                translations: translatedMail.translations
            };
        });

        cds.tx(async () => {
            const { Mails } = this.entities;
            await UPSERT.into(Mails).entries(dbEntries);
        });

        return translatedMails;
    };

    private upsertResponse = async (mail: IStoredMail, additionalInformation: String = "") => {
        const processedMail = {
            mail: { ...mail },
            insights: {
                ...mail,
                responseBody: (
                    await this.preparePotentialResponses(
                        [
                            {
                                ID: mail.ID,
                                body: mail.body,
                                senderEmailAddress: mail.senderEmailAddress,
                                subject: mail.subject
                            }
                        ],
                        additionalInformation
                    )
                )[0]?.response?.responseBody
            }
        };

        // insert mails with insights
        console.log("UPDATE RESPONSE...");
        let translation: String;

        if (!mail.languageMatch) {
            translation = (await this.translatePotentialResponse(processedMail.insights.responseBody)).responseBody;
        }

        const dbEntry = [
            {
                ...mail,
                responseBody: processedMail.insights.responseBody,
                translations: translation ? [Object.assign(mail.translations[0], { responseBody: translation })] : []
            }
        ];

        cds.tx(async () => {
            const { Mails } = this.entities;
            await UPSERT.into(Mails).entries(dbEntry);
        });
    };

    private deleteMail = async (req: Request) => {
        try {
            const { tenant } = req;
            const { id } = req.data;
            const { Mails } = this.entities;

            await DELETE.from(Mails, id);

            const typeormVectorStore = await getVectorStore(tenant);
            const queryString = `DELETE FROM ${typeormVectorStore.tableName} WHERE (metadata->'id')::jsonb ? $1;`;

            await typeormVectorStore.appDataSource.query(queryString, [id]);
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

            // Embed mail bodies with IDs
            console.log("EMBED MAILS WITH IDs...");
            const typeormVectorStore = await getVectorStore(tenant);
            await typeormVectorStore.addDocuments(
                mailBatch.map((mail: any) => ({
                    pageContent: mail.mail.body,
                    // add category, services, actions to metadata
                    metadata: { id: mail.mail.ID }
                }))
            );

            // Return array of added Mails
            return mailBatch.map((mail) => {
                return {
                    ...mail.mail,
                    ...mail.insights,
                    translations: mail.translations
                };
            });
        } catch (error: any) {
            console.error(`Error: ${error?.message}`);
        }
    };
}

const getVectorStore = async (tenant: string) => {
    await initializeBTPContext();
    const embeddings = new BTPOpenAIGPTEmbedding({
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

const fixJsonString = (jsonString: String) => {
    return (
        jsonString
            // Workaround - Add missing ',' for valid JSON
            .replace(/\"\s*\"/g, '", "')
            // Workaround - Replace \n by \\n in property values
            .replace(/"([^"]*)"/g, (match, capture) => {
                return match.replace(/\n(?!\\n)/g, "\\n");
            })
    );
};
