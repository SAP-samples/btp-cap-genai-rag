import cds from "@sap/cds";
import { AzureOpenAiChatClient, AzureOpenAiEmbeddingClient } from "@sap-ai-sdk/langchain";

import { z } from "zod";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { StructuredOutputParser } from "@langchain/core/output_parsers";
import { OutputFixingParser } from "langchain/output_parsers";

import { getAppName, checkOrPrepareDeployments } from "./utils/ai-core.js";
import { IBaseMail, IProcessedMail, IStoredMail, IAction, MailWithSimilarity } from "./types.js";
import * as schemas from "./schemas.js";
import { ACTIONS } from "./constants.js";

import type { Mail, Translation } from "#cds-models/MailInsightsService";

/**
 * Class representing MailInsights
 * @extends ApplicationService
 */
export default class MailInsights extends cds.ApplicationService {
    private resourceGroupId: string;

    /**
     * Initiate MailInsights instance
     * @returns {Promise<void>}
     */
    async init(): Promise<void> {
        await super.init();
        // Functions & Actions
        this.on("getMails", this.onGetMails);
        this.on("getMail", this.onGetMail);
        this.on("addMails", this.onAddMails);
        this.on("deleteMail", this.onDeleteMail);
        this.on("submitResponse", this.onSubmitResponse);
        this.on("revokeResponse", this.onRevokeResponse);
        this.on("generateResponse", this.onGenerateResponse);

        this.resourceGroupId = getAppName();
        checkOrPrepareDeployments(this.resourceGroupId);

        // listen to all topics
        /* const messaging = await cds.connect.to('messaging');
        messaging.on('*', msg => {
            console.info('EVENT!');
            console.warn(msg.data);
        }); */
    }

    /**
     * Handler for getting mails action
     * @param {Request} req
     * @returns {Promise<any>}
     */
    private onGetMails = async (req: cds.Request): Promise<IBaseMail | Error> => {
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
            return req.error(`Error: ${error?.message}`);
        }
    };

    /**
     * Handler for getting a single mail
     * @param {Request} req
     * @returns {Promise<any>}
     */
    private onGetMail = async (req: cds.Request): Promise<any | Error> => {
        try {
            const { id } = req.data;
            const { Mails } = this.entities;

            const mail = await SELECT.one
                .from(Mails, (m: Mail) => {
                    //@ts-ignore
                    m`.*`;
                    //@ts-ignore
                    m.translation((t: Translation) => {
                        //@ts-ignore
                        t`.*`;
                    });
                })
                .where(`ID = '${id}'`);

            // Add default descriptions for actions
            mail.suggestedActions = mail.suggestedActions?.map((suggestedAction: IAction) => {
                return {
                    ...suggestedAction,
                    descr: ACTIONS[suggestedAction.value] || ""
                };
            });

            const closestMailsIDs: Array<MailWithSimilarity> = await this.getClosestMailIDsWithSimilarity(id, 5);
            const closestMailsIndex: { [key: string]: MailWithSimilarity } = closestMailsIDs.reduce(
                (acc: { [key: string]: MailWithSimilarity }, mailWithSimilarity: MailWithSimilarity) => ({
                    ...acc,
                    [mailWithSimilarity.ID]: mailWithSimilarity
                }),
                {}
            );

            const closestMails =
                closestMailsIDs.length > 0
                    ? await SELECT.from(Mails, (m: Mail) => {
                          m.ID;
                          m.subject;
                          m.body;
                          m.category;
                          m.sender;
                          m.responded;
                          m.responseBody;
                          // @ts-ignore
                          m.translation((t: Translation) => {
                              // @ts-ignore
                              t`.*`;
                          });
                      }).where({
                          ID: {
                              in: Object.keys(closestMailsIndex)
                          }
                      })
                    : [];

            // merge similarity mails with actual mails
            const closestMailsWithSimilarity: { similarity: number; mail: any } = closestMails.map(
                (mail: IBaseMail) => {
                    const matchingMail: MailWithSimilarity = closestMailsIndex[mail.ID];
                    return { similarity: matchingMail.similarity, mail };
                }
            );

            return { mail, closestMails: closestMailsWithSimilarity };
        } catch (error: any) {
            console.error(`Error: ${error?.message}`);
            return req.error(`Error: ${error?.message}`);
        }
    };

    /**
     * Handler for adding mails
     * @param {Request} req
     * @returns {Promise<any>}
     */
    private onAddMails = async (req: cds.Request): Promise<Array<IBaseMail> | Error> => {
        try {
            const { Mails } = this.entities;
            const { mails, rag } = req.data;
            const mailBatch = await this.generateInsights(mails, rag);

            // insert mails with insights
            await INSERT.into(Mails).entries(mailBatch);

            const insertedMails = await SELECT.from(Mails, (m: any) => {
                //@ts-ignore
                m`.*`;
                //@ts-ignore
                m.translation((t: Translation) => {
                    //@ts-ignore
                    t`.*`;
                });
            }).where({
                ID: { in: mailBatch.map((mail: any) => mail.ID) }
            });

            /* const messaging = await cds.connect.to('messaging');
            await messaging.emit({
                event: 'sap/btp/pbc/demo1',
                data: mails,
                headers: {'X-Correlation-ID': req.headers['X-Correlation-ID']}
            });
            // listen to all topics
            messaging.on('*', msg => {
                console.info('EVENT!');
                console.warn(msg.data);
            }); */


            // Add default descriptions for actions
            insertedMails.forEach((mail: any) => {
                mail.suggestedActions = mail.suggestedActions?.map((suggestedAction: IAction) => {
                    return {
                        ...suggestedAction,
                        descr: ACTIONS[suggestedAction.value] || ""
                    };
                });
            });

            return insertedMails;
        } catch (error: any) {
            console.error(`Error: ${error?.message}`);
            return req.error(`Error: ${error?.message}`);
        }
    };

    /**
     * Method to regenerate Response for a single Mail
     * @async
     * @param {Request} req - Request object
     * @returns {Promise<boolean|*>}
     */
    private onGenerateResponse = async (req: cds.Request): Promise<boolean | any> => {
        try {
            const { id, rag, additionalInformation } = req.data;
            const { Mails } = this.entities;
            const mail = await SELECT.one.from(Mails, id);
            const response = await this.generateResponse(mail, rag, additionalInformation);
            return response;
        } catch (error: any) {
            console.error(`Error: ${error?.message}`);
            return req.error(`Error: ${error?.message}`);
        }
    };

    /**
     * Method to submit response for a single Mail. Response always passed in user's working language
     * @async
     * @param {Request} req - Request object
     * @returns {Promise<boolean|*>}
     */
    private onSubmitResponse = async (req: cds.Request): Promise<boolean | any> => {
        try {
            const { id, response } = req.data;
            const { Mails } = this.entities;
            const mail = await SELECT.one.from(Mails, id).columns((m: any) => {
                m("*");
                m.translation((t: any) => t("*"));
            });

            // Translate working language response to recipient's original language
            const translation =
                mail.languageMatch === undefined || mail.languageMatch
                    ? response
                    : (await this.translateResponse(response, mail.languageNameDetermined)).responseBody;

            // Implement your custom logic to send e-mail e.g. using Microsoft Graph API
            // Send the working language response + target language translation + AI Translation Disclaimer;
            const submittedMail = {
                ...mail,
                responded: true,
                responseBody: translation,
                translation: { ...mail.translation, responseBody: response }
            };
            const success = await UPDATE(Mails, mail.ID).set(submittedMail);
            return new Boolean(success);
        } catch (error: any) {
            console.error(`Error: ${error?.message}`);
            return req.error(`Error: ${error?.message}`);
        }
    };

    /**
     * Method to revoke responded status for a single mail
     * @async
     * @param {Request} req - Request object
     * @returns {Promise<boolean|*>}
     */
    private onRevokeResponse = async (req: cds.Request): Promise<boolean | any> => {
        try {
            const { id } = req.data;
            const { Mails } = this.entities;
            const result = await UPDATE(Mails, id).with({ responded: false });
            return new Boolean(result);
        } catch (error: any) {
            console.error(`Error: ${error?.message}`);
            return req.error(`Error: ${error?.message}`);
        }
    };

    /**
     * Handler for deleting a mail
     * @param {Request} req
     * @returns {Promise<any>}
     */
    private onDeleteMail = async (req: cds.Request): Promise<any> => {
        try {
            const { id } = req.data;
            const { Mails } = this.entities;
            const result = await DELETE.from(Mails, id);
            return Boolean(result);
        } catch (error: any) {
            console.error(`Error: ${error?.message}`);
            return req.error(`Error: ${error?.message}`);
        }
    };

    /**
     * (Re-)Generate Insights, Response(s), Translation(s) and Embeddings for single or multiple Mail(s)
     * @param {Array<IBaseMail>} mails - array of mails
     * @param {boolean} rag - flag to denote if RAG status should be considered
     * @returns Promise object represents the translated mails
     */
    private generateInsights = async (mails: Array<IBaseMail>, rag: boolean = false) => {
        // Add unique ID to mails if not existent
        mails.forEach((mail) => {
            mail.ID ??= crypto.randomUUID();
        });

        const [generalInsights, potentialResponses, languageMatches, embeddings] = await Promise.all([
            this.extractGeneralInsights(mails),
            this.preparePotentialResponses(mails, rag),
            this.extractLanguageMatches(mails),
            this.createEmbeddings(mails)
        ]);

        const processedMails = mails.reduce((acc, mail) => {
            const generalInsight = generalInsights.find((res: any) => res.mail.ID === mail.ID)?.insights;
            const potentialResponse = potentialResponses.find((res: any) => res.mail.ID === mail.ID)?.response;
            const languageMatch = languageMatches.find((res: any) => res.mail.ID === mail.ID)?.languageMatch;
            const embedding = embeddings.find((res: any) => res.mail.ID === mail.ID)?.embedding;
            acc.push({
                mail,
                insights: {
                    ...generalInsight,
                    ...potentialResponse,
                    ...languageMatch,
                    embedding
                }
            });

            return acc;
        }, [] as IProcessedMail[]);

        const mailsWithTranslation: Array<IBaseMail> = await this.addTranslatedInsights(processedMails);

        return mailsWithTranslation;
    };

    /**
     * (Re-)Generate Response for a single Mail
     * @param {IStoredMail} mail - stored mail
     * @param {boolean} rag - flag to denote if RAG status should be considered
     * @param {string} additionalInformation - additional information for the response
     * @returns {Promise<IStoredMail>} Promise object represents the stored mail with regenerated response
     */
    private generateResponse = async (
        mail: IStoredMail,
        rag: boolean = false,
        additionalInformation?: string
    ): Promise<IStoredMail> => {
        const { Translations } = this.entities;
        const responses = await this.preparePotentialResponses([mail], rag, additionalInformation);
        const regeneratedResponse = responses[0]?.response?.responseBody;

        //@ts-ignore
        const translation = await SELECT.one.from(Translations, mail.translation_ID);
        if (mail.languageMatch) {
            translation.responseBody = regeneratedResponse;
        } else {
            const translatedResponse = await this.translateResponse(regeneratedResponse, schemas.WORKING_LANGUAGE);
            translation.responseBody = translatedResponse.responseBody;
        }

        // Add default descriptions for actions
        mail.suggestedActions = mail.suggestedActions?.map((suggestedAction: IAction) => {
            return {
                ...suggestedAction,
                descr: ACTIONS[suggestedAction.value] || ""
            };
        });

        return {
            ...mail,
            responseBody: regeneratedResponse,
            translation: translation
        };
    };

    /**
     * Extract insights for mails using LLM.
     * @param {Array<IBaseMail>} mails - Array of mails to extract insights from.
     * @returns {Promise<Array<IProcessedMail>>} - A promise that resolves to an array of processed mails.
     */
    private extractGeneralInsights = async (mails: Array<IBaseMail>): Promise<Array<IProcessedMail>> => {
        // langchain wrapper for language model
        const llm = getChatModel(this.resourceGroupId);
        // parser
        const parser = StructuredOutputParser.fromZodSchema(schemas.MAIL_INSIGHTS_SCHEMA);
        const formatInstructions = parser.getFormatInstructions();
        const parserWithFix = OutputFixingParser.fromLLM(llm, parser);

        // prompt template
        const promptTemplate = await ChatPromptTemplate.fromMessages([
            [
                "system",
                "Give insights about the incoming email.\n{formatInstructions}\nMake sure to escape special characters by double slashes."
            ],
            ["user", "{subject}\n{body}"]
        ]).partial({ formatInstructions });
        // chain together template, client, and parser
        const llmChain = promptTemplate.pipe(llm).pipe(parserWithFix);

        const mailsInsights = await Promise.all(
            mails.map(async (mail: IBaseMail): Promise<IProcessedMail> => {
                // invoke the chain
                const response = await llmChain.invoke({
                    subject: mail.subject,
                    body: mail.body
                });

                const insights: z.infer<typeof schemas.MAIL_INSIGHTS_SCHEMA> = response;
                return { mail: { ...mail }, insights: { ...insights } };
            })
        );

        return mailsInsights;
    };

    /**
     * Generate potential Response(s) using LLM.
     * @param {Array<IBaseMail>} mails - An array of mails.
     * @param {boolean} rag - A flag to control retrieval augmented generation usage.
     * @param {string} additionalInformation - Additional information for mail response.
     * @return {Promise} - Returns a Promise that resolves to an array of potential responses.
     */
    private preparePotentialResponses = async (
        mails: Array<IBaseMail>,
        rag: boolean = false,
        additionalInformation?: string
    ): Promise<any> => {
        // langchain wrapper for language model
        const llm = getChatModel(this.resourceGroupId);
        // parser
        const parser = StructuredOutputParser.fromZodSchema(schemas.MAIL_RESPONSE_SCHEMA);
        const formatInstructions = parser.getFormatInstructions();
        const parserWithFix = OutputFixingParser.fromLLM(llm, parser);
        const ragSystemPrompt = `Context information based on similar mail responses is given below. 
                                    Context:{context}
                                Formulate a response to the original mail given this context information.
                                Prefer the context when generating your answer to any prior knowledge.
                                Also consider given additional information if available to enhance the response.`;
        const systemPrompt = "Formulate a response to the original mail using given additional information.";

        const promptTemplate = await ChatPromptTemplate.fromMessages([
            [
                "system",
                (rag ? ragSystemPrompt : systemPrompt) +
                    `Address the sender appropriately.
                    {formatInstructions}
                    Make sure to escape special characters by double slashes except '\n'.`
            ],
            ["user", "{subject}\n{body}"]
        ]).partial({ formatInstructions });

        // chain together template, client, and parser
        const llmChain = promptTemplate.pipe(llm).pipe(parserWithFix);

        const potentialResponses = await Promise.all(
            mails.map(async (mail: IBaseMail) => {
                let closestResponses: Array<string> = [];
                if (rag) {
                    closestResponses = await this.getClosestResponses(mail.ID);
                }

                const response: z.infer<typeof schemas.MAIL_RESPONSE_SCHEMA> = await llmChain.invoke({
                    sender: mail.senderEmailAddress,
                    subject: mail.subject,
                    body: mail.body,
                    additionalInformation: additionalInformation || "",
                    context: closestResponses
                });

                return { mail, response };
            })
        );

        return potentialResponses;
    };

    /**
     * Extract Language Match(es) using LLM.
     * @param {Array<IBaseMail>} mails - An array of mails.
     * @return {Promise} - Returns a Promise that resolves to an array of language matches.
     */
    private extractLanguageMatches = async (mails: Array<IBaseMail>): Promise<any> => {
        // langchain wrapper for language model
        const llm = getChatModel(this.resourceGroupId);
        // parser
        const parser = StructuredOutputParser.fromZodSchema(schemas.MAIL_LANGUAGE_SCHEMA);
        const formatInstructions = parser.getFormatInstructions();
        const parserWithFix = OutputFixingParser.fromLLM(llm, parser);

        // prompt template
        const promptTemplate = await ChatPromptTemplate.fromMessages([
            [
                "system",
                "Extract the language related information.\n{formatInstructions}\nMake sure to escape special characters by double slashes."
            ],
            ["user", "{mail}"]
        ]).partial({ formatInstructions });
        // chain together template, client, and parser
        const llmChain = promptTemplate.pipe(llm).pipe(parserWithFix);

        const languageMatches = await Promise.all(
            mails.map(async (mail: IBaseMail) => {
                // invoke the chain
                const languageMatch: z.infer<typeof schemas.MAIL_LANGUAGE_SCHEMA> = await llmChain.invoke({
                    mail: mail.body
                });

                return { mail, languageMatch };
            })
        );

        return languageMatches;
    };

    /**
     * Create Embeddings
     * @param {Array<IBaseMail>} mails - An array of mails.
     * @return {Promise} - Returns a Promise that resolves to an array of embeddings.
     */
    private createEmbeddings = async (mails: Array<IBaseMail>): Promise<any> => {
        const embed = getEmbeddingModel(this.resourceGroupId);
        const embeddings = await Promise.all(
            mails.map(async (mail: IBaseMail) => {
                const embeddings = await embed.embedDocuments([mail.body]);
                const embedding = `[${embeddings[0]}]`;
                return { mail, embedding };
            })
        );

        return embeddings;
    };

    /**
     * Translates Insight(s) using LLM.
     * @param {Array<IProcessedMail>} mails - An array of processed mails.
     * @return {Promise} - Returns a Promise that resolves to an array of translations.
     */
    private addTranslatedInsights = async (mails: Array<IProcessedMail>): Promise<Array<IBaseMail>> => {
        // langchain wrapper for language model
        const llm = getChatModel(this.resourceGroupId);
        // parser
        const parser = StructuredOutputParser.fromZodSchema(schemas.MAIL_INSIGHTS_TRANSLATION_SCHEMA);
        const formatInstructions = parser.getFormatInstructions();
        const parserWithFix = OutputFixingParser.fromLLM(llm, parser);

        // prompt template
        const promptTemplate = await ChatPromptTemplate.fromMessages([
            [
                "system",
                "Translate the insights of the incoming json.\n{formatInstructions}\nMake sure to escape special characters by double slashes."
            ],
            ["user", "{insights}"]
        ]).partial({ formatInstructions });
        // chain together template, client, and parser
        const llmChain = promptTemplate.pipe(llm).pipe(parserWithFix);

        const translations = await Promise.all(
            mails.map(async (mail: IProcessedMail) => {
                if (mail.insights?.languageMatch) {
                    return {
                        ...mail,
                        translation: [
                            {
                                subject: mail.mail?.subject || "",
                                body: mail.mail?.body || "",
                                sender: mail.insights?.sender || "",
                                summary: mail.insights?.summary || "",
                                keyFacts: mail.insights?.keyFacts || "",
                                requestedServices: mail.insights?.requestedServices || "",
                                responseBody: mail.insights?.responseBody || ""
                            }
                        ]
                    };
                } else {
                    const translation: z.infer<typeof schemas.MAIL_INSIGHTS_TRANSLATION_SCHEMA> = await llmChain.invoke(
                        {
                            insights: JSON.stringify({
                                subject: mail.mail.subject,
                                body: mail.mail.body,
                                sender: mail.insights.sender,
                                requestedServices: mail.insights.requestedServices,
                                summary: mail.insights.summary,
                                keyFacts: mail.insights.keyFacts,
                                responseBody: mail.insights.responseBody
                            })
                        }
                    );
                    return { ...mail, translation: [translation] };
                }
            })
        );

        return translations.map((mail) => {
            return {
                ...mail.mail,
                ...mail.insights,
                translation: mail.translation
            };
        });
    };

    /**
     * Translates a single response using LLM.
     * @param {string} response - The response text.
     * @param {string} language - The language for translation.
     * @return {Promise} - Returns a Promise that resolves to the translated response.
     */
    private translateResponse = async (response: string, language: string): Promise<any> => {
        try {
            // langchain wrapper for language model
            const llm = getChatModel(this.resourceGroupId);
            // parser
            const parser = StructuredOutputParser.fromZodSchema(schemas.MAIL_INSIGHTS_TRANSLATION_SCHEMA);
            const formatInstructions = parser.getFormatInstructions();
            const parserWithFix = OutputFixingParser.fromLLM(llm, parser);

            // prompt template
            const promptTemplate = await ChatPromptTemplate.fromMessages([
                [
                    "system",
                    `Translate the following response of the customer support into ${language}.
                        {formatInstructions}
                        Make sure to escape special characters by double slashes.`
                ],
                ["user", "{response}"]
            ]).partial({ formatInstructions });
            // chain together template, client, and parser
            const llmChain = promptTemplate.pipe(llm).pipe(parserWithFix);
            // invoke the chain
            const translation: z.infer<typeof schemas.MAIL_RESPONSE_TRANSLATION_SCHEMA> = await llmChain.invoke({
                response: response
            });
            return translation;
        } catch (error: any) {
            console.error(`Error: ${error?.message}`);
            return {
                responseBody: response || ""
            };
        }
    };

    /**
     * Get responses of 5 closest Mails.
     * @param {string} id - ID of the mail for which the closest responses need to be fetched.
     * @return {Promise<Array<[TypeORMVectorStoreDocument]>>} - Returns a Promise that resolves to an array of closest responses.
     */
    private getClosestResponses = async (id: string): Promise<Array<string>> => {
        const closestMails = await this.getClosestMailIDsWithSimilarity(id, 5, true);
        if (closestMails.length === 0) {
            return [];
        }
        const { Mails } = this.entities;

        const responses: Promise<Array<string>> = (
            await SELECT.from(Mails)
                .where({
                    ID: {
                        in: closestMails.map((m: MailWithSimilarity) => m.ID)
                    }
                })
                .columns((m: any) => {
                    m.ID;
                    m.responseBody;
                })
        ).map((mail: any) => mail.responseBody);

        return responses;
    };

    /**
     * Get closest mails.
     * @param {string} id - The id of the mail.
     * @param {number} k - The number of closest mails to fetch (default value is 5).
     * @param {boolean} responded - Only consider responded mails for similarity search
     * @return {Promise<Array<[TypeORMVectorStoreDocument, number]>>} - Returns a Promise that resolves to an array of closest mails.
     */
    private getClosestMailIDsWithSimilarity = async (
        id: string,
        k: number = 5,
        responded: boolean = false
    ): Promise<Array<MailWithSimilarity>> => {
        const mailsWithSimilarity: Array<MailWithSimilarity> = await cds.run(
            `
            SELECT 
                similars.ID as "ID",
                similars.BODY as "body",
                COSINE_SIMILARITY(similars."EMBEDDING", focus."EMBEDDING") as "similarity"
            FROM "AI_DB_MAILS" as similars
            JOIN (
                SELECT 
                    ID, 
                    "EMBEDDING"
                FROM "AI_DB_MAILS"
                WHERE ID = ?
                LIMIT 1
            ) as focus ON focus.ID <> similars.ID
            ${responded ? "WHERE RESPONDED = true" : ""}
            ORDER BY "similarity" DESC LIMIT ?`,
            [id, k]
        );

        return mailsWithSimilarity;
    };
}

const getChatModel = (resourceGroupId: string) => {
      return new AzureOpenAiChatClient({
        modelName: "gpt-4o",
        modelVersion: "latest",
        resourceGroup: resourceGroupId
    });
};

const getEmbeddingModel = (resourceGroupId: string) => {
    return new AzureOpenAiEmbeddingClient({
        modelName: "text-embedding-3-small",
        modelVersion: "latest",
        resourceGroup: resourceGroupId
    });
};
