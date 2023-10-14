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
import { Document } from "langchain/document";
import { LLMChain, StuffDocumentsChain } from "langchain/chains";
import { OutputFixingParser, StructuredOutputParser } from "langchain/output_parsers";
import { TypeORMVectorStore, TypeORMVectorStoreDocument } from "langchain/vectorstores/typeorm";

import * as aiCore from "../utils/ai-core";
import BTPLLM from "../utils/langchain/BTPLLM";
import BTPEmbedding from "../utils/langchain/BTPEmbedding";

import {
    IBaseMail,
    IProcessedMail,
    ITranslatedMail,
    IStoredMail
} from "./types";
import {
    MAIL_INSIGHTS_SCHEMA,
    MAIL_INSIGHTS_TRANSLATION_SCHEMA,
    MAIL_RESPONSE_TRANSLATION_SCHEMA,
    MAIL_LANGUAGE_SCHEMA,
    MAIL_RESPONSE_SCHEMA
} from "./schemas";

// Name of LLM Proxy Service Destination
const LLM_SERVICE_DESTINATION = "PROVIDER_AI_CORE_DESTINATION_CANARY";

// Default table used in PostgreSQL
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

export default class CommonMailInsights extends ApplicationService {
    async init() {
        await super.init();
        this.on("getMails", this.onGetMails);
        this.on("getMail", this.onGetMail);
        this.on("addMails", this.onAddMails);
        this.on("deleteMail", this.onDeleteMail);
    }

    // Get all Mails excl. closest Mails
    private onGetMails = async (_req: Request) => {
        try {
            const { Mails } = this.entities;
            const mails = await SELECT.from(Mails).columns((m: any) => {
                m.ID;
                m.subject;
                m.body;
                m.category;
                m.responded;
                m.sender;
            });
            return mails;
        } catch (error: any) {
            console.error(`Error: ${error?.message}`);
            return {};
        }
    };

    // Get a single Mail incl. closest Mails
    private onGetMail = async (req: Request) => {
        try {
            const { tenant } = req;
            const { id } = req.data;
            const { Mails } = this.entities;
            const mail = await SELECT.one.from(Mails, id);
            const closestMailsIDs = await this.getClosestMails(id, 5, {}, tenant);
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
                              m.responded;
                              m.responseBody;
                              m.translations;
                          })
                    : [];
            const closestMailsWithSimilarity: { similarity: number; mail: any } = closestMails.map((mail: any) => {
                //@ts-ignore
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

    // Process single or multiple new Mail(s)
    private onAddMails = async (req: Request) => {
        try {
            const { tenant } = req;
            const { mails, rag } = req.data;
            const mailBatch = await this.regenerateInsights(mails, rag, tenant);

            // Embed mail bodies with IDs
            console.log("EMBED MAILS WITH IDs...");
            const typeormVectorStore = await this.getVectorStore(tenant);
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

    // Delete single Mail from SAP HANA Cloud and PostgreSQL
    private onDeleteMail = async (req: Request) => {
        try {
            const { tenant } = req;
            const { id } = req.data;
            const { Mails } = this.entities;

            await DELETE.from(Mails, id);

            const typeormVectorStore = await this.getVectorStore(tenant);
            const queryString = `DELETE FROM ${typeormVectorStore.tableName} WHERE (metadata->'id')::jsonb ? $1;`;

            await typeormVectorStore.appDataSource.query(queryString, [id]);
            return true;
        } catch (error: any) {
            console.error(`Error: ${error?.message}`);
        }
    };

    // (Re-)Generate Insights, Response(s) and Translation(s) for single or multiple Mail(s)
    public regenerateInsights = async (mails: Array<IBaseMail>, rag?: boolean, tenant?: string) => {
        // Add unique ID to mails if not existent
        mails = mails.map((mail) => {
            return { ...mail, ID: mail.ID || uuidv4() };
        });

        const [generalInsights, potentialResponses, languageMatches] = await Promise.all([
            this.extractGeneralInsights(mails),
            this.preparePotentialResponses(mails, rag, tenant),
            this.extractLanguageMatches(mails)
        ]);

        const processedMails = mails.reduce((acc, mail) => {
            const generalInsight = generalInsights.find((res) => res.mail.ID === mail.ID)?.insights;
            const potentialResponse = potentialResponses.find((res) => res.mail.ID === mail.ID)?.response;
            const languageMatch = languageMatches.find((res) => res.mail.ID === mail.ID)?.languageMatch;

            acc.push({
                mail,
                insights: {
                    ...generalInsight,
                    ...potentialResponse,
                    ...languageMatch
                }
            });

            return acc;
        }, [] as IProcessedMail[]);

        const translatedMails: Array<ITranslatedMail> = await this.translateInsights(processedMails);

        // insert mails with insights
        console.log("UPDATE MAILS WITH INSIGHTS...");

        const dbEntries = translatedMails.map((mail) => {
            return {
                ...mail.mail,
                ...mail.insights,
                translations: mail.translations
            };
        });

        cds.tx(async () => {
            const { Mails } = this.entities;
            await UPSERT.into(Mails).entries(dbEntries);
        });

        return translatedMails;
    };

    // (Re-)Generate Response for a single Mail
    public regenerateResponse = async (
        mail: IStoredMail,
        rag?: boolean,
        tenant?: string,
        additionalInformation?: string
    ): Promise<IStoredMail> => {
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
                        rag,
                        tenant,
                        additionalInformation
                    )
                )[0]?.response?.responseBody
            }
        };

        let translation: String | null = null;

        if (!mail.languageMatch) {
            translation = (await this.translateResponse(processedMail.insights.responseBody)).responseBody;
        }

        const suggestedResponse = {
            ...mail,
            responseBody: processedMail.insights.responseBody,
            //@ts-ignore
            translations: translation ? [Object.assign(mail.translations[0], { responseBody: translation })] : []
        };

        return suggestedResponse;
    };
    
    // Extract Insights for Mail(s) using LLM
    public extractGeneralInsights = async (mails: Array<IBaseMail>): Promise<Array<IProcessedMail>> => {
        const parser = StructuredOutputParser.fromZodSchema(MAIL_INSIGHTS_SCHEMA);
        const formatInstructions = parser.getFormatInstructions();
        const llm = new BTPLLM(aiCore.completion, undefined, { temperature: 0.0, max_tokens: 2000 });

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
                const insights: z.infer<typeof MAIL_INSIGHTS_SCHEMA> = (
                    await chain.call({
                        subject: mail.subject,
                        body: mail.body
                    })
                ).text;
                return { mail: { ...mail }, insights: { ...insights } };
            })
        );

        return mailsInsights;
    };

    // Generate potential Response(s) using LLM
    public preparePotentialResponses = async (
        mails: Array<IBaseMail>,
        rag: boolean = true,
        tenant?: string,
        additionalInformation?: string
    ) => {
        // prepare response
        const parser = StructuredOutputParser.fromZodSchema(MAIL_RESPONSE_SCHEMA);
        const formatInstructions = parser.getFormatInstructions();
        const llm = new BTPLLM(aiCore.completion, undefined, { temperature: 0.0, max_tokens: 2000 });

        const systemPrompt = new PromptTemplate({
            template:
                (rag
                    ? "Context information based on similar mail responses is given below." +
                      "---------------------{context}---------------------" +
                      "Formulate a response to the original mail given this context information." +
                      "Prefer the context when generating your answer to any prior knowledge." +
                      "Also consider given additional information if available to enhance the response."
                    : "Formulate a response to the original mail using given additional information.") +
                "Address the sender appropriately.\n{format_instructions}\n" +
                "Make sure to escape special characters by double slashes.",
            inputVariables: rag ? ["context"] : [],
            partialVariables: { format_instructions: formatInstructions }
        });

        const systemMessagePrompt = new SystemMessagePromptTemplate({ prompt: systemPrompt });
        const humanTemplate = "{sender}\n{subject}\n{body}\n{additionalInformation}";
        const humanMessagePrompt = HumanMessagePromptTemplate.fromTemplate(humanTemplate);
        const chatPrompt = ChatPromptTemplate.fromMessages([systemMessagePrompt, humanMessagePrompt]);

        const chain = rag
            ? new StuffDocumentsChain({
                  llmChain: new LLMChain({
                      llm: llm,
                      prompt: chatPrompt
                  })
              })
            : new LLMChain({
                  llm: llm,
                  prompt: chatPrompt,
                  outputKey: "text",
                  outputParser: OutputFixingParser.fromLLM(llm, parser)
              });

        const potentialResponses = await Promise.all(
            mails.map(async (mail: IBaseMail) => {
                if (rag) {
                    const closestMails = await this.getClosestMails(mail.ID, 5, {}, tenant);
                    const closestResponses = closestMails.length > 0 ? await this.closestResponses(closestMails) : [];

                    const result = (
                        await chain.call({
                            sender: mail.senderEmailAddress,
                            subject: mail.subject,
                            body: mail.body,
                            additionalInformation: additionalInformation || "",
                            input_documents: closestResponses
                        })
                    ).text;
                    const response = await parser.parse(fixJsonString(result));

                    return { mail, response };
                } else {
                    const response: z.infer<typeof MAIL_RESPONSE_SCHEMA> = (
                        await chain.call({
                            sender: mail.senderEmailAddress,
                            subject: mail.subject,
                            body: mail.body,
                            additionalInformation: additionalInformation || ""
                        })
                    ).text;
                    return { mail, response };
                }
            })
        );

        return potentialResponses;
    };

    // Extract Language Match(es) using LLM
    public extractLanguageMatches = async (mails: Array<IBaseMail>) => {
        // prepare response
        const parser = StructuredOutputParser.fromZodSchema(MAIL_LANGUAGE_SCHEMA);
        const formatInstructions = parser.getFormatInstructions();
        const llm = new BTPLLM(aiCore.completion, undefined, { temperature: 0.0, max_tokens: 2000 });

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

    // Translates Insight(s) using LLM
    public translateInsights = async (mails: Array<IProcessedMail>) => {
        // prepare response
        const parser = StructuredOutputParser.fromZodSchema(MAIL_INSIGHTS_TRANSLATION_SCHEMA);
        const formatInstructions = parser.getFormatInstructions();
        const llm = new BTPLLM(aiCore.completion, undefined, { temperature: 0.0, max_tokens: 2000 });

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

    // Translates a single response using LLM
    public translateResponse = async (
        response: string,
        language? : string
        ) => {
        // prepare response
        const parser = StructuredOutputParser.fromZodSchema(MAIL_RESPONSE_TRANSLATION_SCHEMA);
        const formatInstructions = parser.getFormatInstructions();
        const llm = new BTPLLM(aiCore.completion, undefined, { temperature: 0.0, max_tokens: 2000 });

        const systemPrompt = new PromptTemplate({
            template:
                "Translate the response of the incoming json" + (language ? ` into ${language}` : '') + ".\n{format_instructions}\n" +
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
                response: JSON.stringify(response)
            })
        ).text;

        return translation;
    };

    // Get responses of x closest Mails
    public closestResponses = async (
        closestMails: Array<[TypeORMVectorStoreDocument, number]>
    ): Promise<Array<[Document]>> => {
        const { Mails } = this.entities;

        const responses: Promise<Array<[Document]>> = (
            await SELECT.from(Mails)
                .where({
                    ID: {
                        in: closestMails.map(
                            ([doc, _distance]: [TypeORMVectorStoreDocument, number]) => doc.metadata.id
                        )
                    }
                })
                .columns((m: any) => {
                    m.ID;
                    m.responseBody;
                })
        ).map((mail: any) => new Document({ metadata: { id: mail.id }, pageContent: mail.responseBody }));

        return responses;
    };

    public getVectorStore = async (tenant?: string) => {
        const embeddings = new BTPEmbedding(aiCore.embed, undefined, {});
        const args = getPostgresConnectionOptions(tenant);
        const typeormVectorStore = await TypeORMVectorStore.fromDataSource(embeddings, args);
        await typeormVectorStore.ensureTableInDatabase();
        return typeormVectorStore;
    };

    public getClosestMails = async (
        id: string,
        k: number = 5,
        filter: any = {},
        tenant?: string
    ): Promise<Array<[TypeORMVectorStoreDocument, number]>> => {
        const typeormVectorStore = await this.getVectorStore(tenant);
    
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
}

const getPostgresConnectionOptions = (tenant?: string) => {
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
