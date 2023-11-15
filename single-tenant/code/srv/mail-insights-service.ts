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
import { TypeORMVectorStore, TypeORMVectorStoreArgs, TypeORMVectorStoreDocument } from "langchain/vectorstores/typeorm";

import * as aiCore from "./utils/ai-core";
import BTPEmbedding from "./utils/langchain/BTPEmbedding";
import BTPAzureOpenAIChatLLM from "./utils/langchain/BTPAzureOpenAIChatLLM";

import { IBaseMail, IProcessedMail, ITranslatedMail, IStoredMail } from "./types";
import * as schemas from "./schemas";
import { actions } from "./default-values";

const DEFAULT_TENANT = "_main";

/**
 * Class representing CommonMailInsights
 * @extends ApplicationService
 */
export default class CommonMailInsights extends ApplicationService {
    /**
     * Initiate CommonMailInsights instance
     * @returns {Promise<void>}
     */
    async init(): Promise<void> {
        await super.init();

        const { Mails } = cds.entities;

        // Create a default AI core resource group if non existent
        await aiCore.checkDefaultResourceGroup();

        // Handlers
        this.after("READ", Mails, this.onAfterReadMails);

        // Actions
        this.on("getMails", this.onGetMails);
        this.on("getMail", this.onGetMail);
        this.on("addMails", this.onAddMails);
        this.on("deleteMail", this.onDeleteMail);
        this.on("submitResponse", this.onSubmitResponse);
        this.on("revokeResponse", this.onRevokeResponse);
        this.on("regenerateInsights", this.onRegenerateInsights);
        this.on("regenerateResponse", this.onRegenerateResponse);
        this.on("translateResponse", this.onTranslateResponse);
    }

    /**
     * Handler for after reading mails
     * @param {any} mails
     * @returns {Promise<any>}
     */
    private onAfterReadMails = async (mails: any): Promise<any> => {
        try {
            // Add default descriptions for actions
            mails.forEach((mail: any) => {
                if (mail.suggestedActions) {
                    mail.suggestedActions = mail.suggestedActions?.map((suggestedAction: any) => {
                        return {
                            ...suggestedAction,
                            descr: actions.find((action: any) => action.value === suggestedAction.value)?.descr || ""
                        };
                    });
                }
            });
            return mails;
        } catch (error: any) {
            console.error(`Error: ${error?.message}`);
            return mails;
        }
    };

    /**
     * Handler for getting mails action
     * @param {Request} req
     * @returns {Promise<any>}
     */
    private onGetMails = async (req: Request): Promise<any> => {
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
    private onGetMail = async (req: Request): Promise<any> => {
        try {
            const tenant = cds.env?.requires?.multitenancy && req.tenant;
            const { id } = req.data;
            const { Mails } = this.entities;

            const mail = await SELECT.one
                .from(Mails, (m: any) => {
                    m`.*`;
                    m.translation((t: any) => {
                        t`.*`;
                    });
                })
                .where(`ID = '${id}'`);

            // Add default descriptions for actions
            mail.suggestedActions = mail.suggestedActions?.map((suggestedAction: any) => {
                return {
                    ...suggestedAction,
                    descr: actions.find((action: any) => action.value === suggestedAction.value)?.descr || ""
                };
            });

            const closestMailsIDs = await this.getClosestMails(id, 5, false, tenant);

            const closestMails =
                closestMailsIDs.length > 0
                    ? await SELECT.from(Mails, (m: any) => {
                          m.ID;
                          m.subject;
                          m.body;
                          m.category;
                          m.sender;
                          m.responded;
                          m.responseBody;
                          m.translation((t: any) => {
                              t`.*`;
                          });
                      }).where({
                          ID: {
                              in: closestMailsIDs.map(
                                  ([doc, _]: [TypeORMVectorStoreDocument, number]) => doc.id
                              )
                          }
                      })
                    : [];

            const closestMailsWithSimilarity: { similarity: number; mail: any } = closestMails.map((mail: any) => {
                //@ts-ignore
                const [_, similarity]: [TypeORMVectorStoreDocument, number] = closestMailsIDs.find(
                    ([doc, _]: [TypeORMVectorStoreDocument, number]) => mail.ID === doc.id
                );
                return { similarity, mail };
            });
            
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
    private onAddMails = async (req: Request): Promise<any> => {
        try {
            const { Mails } = this.entities;
            const tenant = cds.env?.requires?.multitenancy && req.tenant;
            const { mails, rag } = req.data;
            const mailBatch = await this.regenerateInsights(mails, rag, tenant);

            // insert mails with insights
            console.log("UPDATE MAILS WITH INSIGHTS...");

            await INSERT.into(Mails).entries(mailBatch);

            const insertedMails = await SELECT.from(Mails, (m: any) => {
                m`.*`;
                m.translation((t: any) => {
                    t`.*`;
                });
            }).where({
                ID: { in: mailBatch.map((mail: any) => mail.ID) }
            });

            // Add default descriptions for actions
            insertedMails.forEach((mail: any) => {
                mail.suggestedActions = mail.suggestedActions?.map((suggestedAction: any) => {
                    return {
                        ...suggestedAction,
                        descr: actions.find((action: any) => action.value === suggestedAction.value)?.descr || ""
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
     * Handler for deleting a mail
     * @param {Request} req
     * @returns {Promise<any>}
     */
    private onDeleteMail = async (req: Request): Promise<any> => {
        try {
            const { id } = req.data;
            const { Mails } = this.entities;
            await DELETE.from(Mails, id);
            return true;
        } catch (error: any) {
            console.error(`Error: ${error?.message}`);
            return req.error(`Error: ${error?.message}`);
        }
    };

    /**
     * (Re-)Generate Insights, Response(s) and Translation(s) for single or multiple Mail(s)
     * @param {Array<IBaseMail>} mails - array of mails
     * @param {boolean} rag - flag to denote if RAG status should be considered
     * @param {string} tenant - tenant id
     * @returns {Promise<Array<ITranslatedMail>>} Promise object represents the translated mails
     */
    public regenerateInsights = async (
        mails: Array<IBaseMail>,
        rag: boolean = false,
        tenant: string = DEFAULT_TENANT
    ) => {
        // Add unique ID to mails if not existent
        mails = mails.map((mail) => {
            return { ...mail, ID: mail.ID || uuidv4() };
        });

        const [generalInsights, potentialResponses, languageMatches, embeddings] = await Promise.all([
            this.extractGeneralInsights(mails, tenant),
            this.preparePotentialResponses(mails, rag, tenant),
            this.extractLanguageMatches(mails, tenant),
            this.createEmbeddings(mails, tenant)
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
                    embedding: embedding
                },
            });

            return acc;
        }, [] as IProcessedMail[]);

        const translatedMails: Array<ITranslatedMail> = await this.translateInsights(processedMails, tenant);

        return translatedMails.map((mail) => {
            return {
                ...mail.mail,
                ...mail.insights,
                translation: mail.translation
            };
        });
    };

    /**
     * (Re-)Generate Response for a single Mail
     * @param {IStoredMail} mail - stored mail
     * @param {boolean} rag - flag to denote if RAG status should be considered
     * @param {string} tenant - tenant id
     * @param {string} additionalInformation - additional information for the response
     * @returns {Promise<IStoredMail>} Promise object represents the stored mail with regenerated response
     */
    public regenerateResponse = async (
        mail: IStoredMail,
        rag: boolean = false,
        tenant: string = DEFAULT_TENANT,
        additionalInformation?: string
    ): Promise<IStoredMail> => {
        const { Translations } = this.entities;
        const regeneratedResponse = (
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
        )[0]?.response?.responseBody;

        //@ts-ignore
        const translation = await SELECT.one.from(Translations, mail.translation_ID);

        if (!mail.languageMatch) {
            translation.responseBody = (
                await this.translateResponse(regeneratedResponse, tenant, schemas.WORKING_LANGUAGE)
            ).responseBody;
        } else {
            translation.responseBody = regeneratedResponse;
        }

        // Add default descriptions for actions
        mail.suggestedActions = mail.suggestedActions?.map((suggestedAction: any) => {
            return {
                ...suggestedAction,
                descr: actions.find((action: any) => action.value === suggestedAction.value)?.descr || ""
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
     *
     * @param {Array<IBaseMail>} mails - Array of mails to extract insights from.
     * @param {string} [tenant=DEFAULT_TENANT] - Tenant string (default value is DEFAULT_TENANT).
     * @returns {Promise<Array<IProcessedMail>>} - A promise that resolves to an array of processed mails.
     */
    public extractGeneralInsights = async (
        mails: Array<IBaseMail>,
        tenant: string = DEFAULT_TENANT
    ): Promise<Array<IProcessedMail>> => {
        const parser = StructuredOutputParser.fromZodSchema(schemas.MAIL_INSIGHTS_SCHEMA);
        const formatInstructions = parser.getFormatInstructions();
        const llm = new BTPAzureOpenAIChatLLM(aiCore.chatCompletion, tenant);

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
        const chatPrompt = ChatPromptTemplate.fromMessages([systemMessagePrompt, humanMessagePrompt]);

        const chain = new LLMChain({
            llm: llm,
            prompt: chatPrompt,
            outputKey: "text",
            outputParser: OutputFixingParser.fromLLM(llm, parser)
        });

        console.log("GENERATING INSIGHTS...");
        const mailsInsights = await Promise.all(
            mails.map(async (mail: IBaseMail): Promise<IProcessedMail> => {
                const insights: z.infer<typeof schemas.MAIL_INSIGHTS_SCHEMA> = (
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

    /**
     * Generate potential Response(s) using LLM.
     * @param {Array<IBaseMail>} mails - An array of mails.
     * @param {boolean} rag - A flag to control retrieval augmented generation usage.
     * @param {string} [tenant=DEFAULT_TENANT] - Tenant string (default value is DEFAULT_TENANT).
     * @param {string} additionalInformation - Additional information for mail response.
     * @return {Promise} - Returns a Promise that resolves to an array of potential responses.
     */
    public preparePotentialResponses = async (
        mails: Array<IBaseMail>,
        rag: boolean = false,
        tenant: string = DEFAULT_TENANT,
        additionalInformation?: string
    ): Promise<any> => {
        const parser = StructuredOutputParser.fromZodSchema(schemas.MAIL_RESPONSE_SCHEMA);
        const formatInstructions = parser.getFormatInstructions();
        const llm = new BTPAzureOpenAIChatLLM(aiCore.chatCompletion, tenant);

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
                    const closestMails = await this.getClosestMails(mail.ID, 5, true, tenant);
                    const closestResponses = await this.getClosestResponses(closestMails);

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
                    const response: z.infer<typeof schemas.MAIL_RESPONSE_SCHEMA> = (
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

    /**
     * Extract Language Match(es) using LLM.
     * @param {Array<IBaseMail>} mails - An array of mails.
     * @param {string} [tenant=DEFAULT_TENANT] - Tenant string (default value is DEFAULT_TENANT).
     * @return {Promise} - Returns a Promise that resolves to an array of language matches.
     */
    public extractLanguageMatches = async (mails: Array<IBaseMail>, tenant: string = DEFAULT_TENANT): Promise<any> => {
        // prepare response
        const parser = StructuredOutputParser.fromZodSchema(schemas.MAIL_LANGUAGE_SCHEMA);
        const formatInstructions = parser.getFormatInstructions();
        const llm = new BTPAzureOpenAIChatLLM(aiCore.chatCompletion, tenant);

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
                const languageMatch: z.infer<typeof schemas.MAIL_LANGUAGE_SCHEMA> = (
                    await chain.call({
                        mail: mail.body
                    })
                ).text;

                return { mail, languageMatch };
            })
        );

        return languageMatches;
    };


    /**
     * Create Embeddings
     * @param {Array<IBaseMail>} mails - An array of mails.
     * @param {string} [tenant=DEFAULT_TENANT] - Tenant string (default value is DEFAULT_TENANT).
     * @return {Promise} - Returns a Promise that resolves to an array of embeddings.
     */
    public createEmbeddings = async (mails: Array<IBaseMail>, tenant: string = DEFAULT_TENANT): Promise<any> => {
        const embed = new BTPEmbedding(aiCore.embed, tenant);
        const embeddings = await Promise.all(
            mails.map(async (mail: IBaseMail) => {
                const embedding = `[${(await embed.embedDocuments([mail.subject]))[0].toString()}]`
                return { mail, embedding };
            })
        );

        return embeddings;
    };

    /**
     * Translates Insight(s) using LLM.
     * @param {Array<IProcessedMail>} mails - An array of processed mails.
     * @param {string} [tenant=DEFAULT_TENANT] - Tenant string (default value is DEFAULT_TENANT).
     * @return {Promise} - Returns a Promise that resolves to an array of translations.
     */
    public translateInsights = async (mails: Array<IProcessedMail>, tenant: string = DEFAULT_TENANT): Promise<any> => {
        // prepare response
        const parser = StructuredOutputParser.fromZodSchema(schemas.MAIL_INSIGHTS_TRANSLATION_SCHEMA);
        const formatInstructions = parser.getFormatInstructions();
        const llm = new BTPAzureOpenAIChatLLM(aiCore.chatCompletion, tenant);

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
                if (!mail.insights?.languageMatch) {
                    const translation: z.infer<typeof schemas.MAIL_INSIGHTS_TRANSLATION_SCHEMA> = (
                        await chain.call({
                            insights: JSON.stringify(
                                filterForTranslation({
                                    ...mail.mail,
                                    ...mail.insights
                                })
                            )
                        })
                    ).text;

                    return { ...mail, translation: [translation] };
                } else {
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
                }
            })
        );

        return translations;
    };

    /**
     * Translates a single response using LLM.
     * @param {string} response - The response text.
     * @param {string} [tenant=DEFAULT_TENANT] - Tenant string (default value is DEFAULT_TENANT).
     * @param {string} language - The language for translation.
     * @return {Promise} - Returns a Promise that resolves to the translated response.
     */
    public translateResponse = async (response: string, tenant: string = DEFAULT_TENANT, language: string): Promise<any> => {
        try {
            // prepare response
            const parser = StructuredOutputParser.fromZodSchema(schemas.MAIL_RESPONSE_TRANSLATION_SCHEMA);
            const formatInstructions = parser.getFormatInstructions();
            const llm = new BTPAzureOpenAIChatLLM(aiCore.chatCompletion, tenant);

            const systemPrompt = new PromptTemplate({
                template: `Translate the following response of the customer support into ${language}.
            {format_instructions}
            Make sure to escape special characters by double slashes.`,
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

            const translation: z.infer<typeof schemas.MAIL_RESPONSE_TRANSLATION_SCHEMA> = (
                await chain.call({
                    response: response
                })
            ).text;
            return translation;
        } catch (error: any) {
            console.error(`Error: ${error?.message}`);
            return {
                responseBody: response || ""
            };
        }
    };

    /**
     * Method to regenerate Insights for all available Mails
     * @async
     * @param {Request} req - Request object
     * @returns {Promise<boolean|*>}
     */
    private onRegenerateInsights = async (req: Request) => {
        try {
            const tenant = cds.env?.requires?.multitenancy && req.tenant;
            const { rag } = req.data;
            const { Mails } = this.entities;
            const mails = await SELECT.from(Mails);
            const mailBatch = await this.regenerateInsights(mails, rag, tenant);

            // insert mails with insights
            console.log("UPDATE MAILS WITH INSIGHTS...");

            cds.tx(async () => {
                const { Mails } = this.entities;
                await UPSERT.into(Mails).entries(mailBatch);
            });

            return true;
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
    private onRegenerateResponse = async (req: Request) => {
        try {
            const tenant = cds.env?.requires?.multitenancy && req.tenant;
            const { id, rag, additionalInformation } = req.data;
            const { Mails } = this.entities;
            const mail = await SELECT.one.from(Mails, id);
            const response = await this.regenerateResponse(mail, rag, tenant, additionalInformation);
            return response;
        } catch (error: any) {
            console.error(`Error: ${error?.message}`);
            return req.error(`Error: ${error?.message}`);
        }
    };

    /**
     * Method to translate Response to original e-mail language
     * @async
     * @param {Request} req - Request object
     * @returns {Promise<boolean|*>}
     */
    private onTranslateResponse = async (req: Request) => {
        try {
            const tenant = cds.env?.requires?.multitenancy && req.tenant;
            const { id, response } = req.data;
            const { Mails } = this.entities;
            const mail = await SELECT.one.from(Mails, id);
            const translation = (await this.translateResponse(response, tenant, mail.languageNameDetermined))
                .responseBody;
            return translation;
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
    private onSubmitResponse = async (req: Request) => {
        try {
            const tenant = cds.env?.requires?.multitenancy && req.tenant;
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
                    : (await this.translateResponse(response, tenant, mail.languageNameDetermined)).responseBody;

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
    private onRevokeResponse = async (req: Request) => {
        try {
            const { id } = req.data;
            const { Mails } = this.entities;
            const success = await UPDATE(Mails, id).with({responded : false});
            return new Boolean(success);
        } catch (error: any) {
            console.error(`Error: ${error?.message}`);
            return req.error(`Error: ${error?.message}`);
        }
    };

    /**
     * Get responses of x closest Mails.
     * @param {Array<[TypeORMVectorStoreDocument, number]>} mails - An array of mails along with their distances.
     * @return {Promise<Array<[Document]>>} - Returns a Promise that resolves to an array of closest responses.
     */
    public getClosestResponses = async (
        mails: Array<[TypeORMVectorStoreDocument, number]>
    ): Promise<Array<[Document]>> => {
        if (mails.length === 0) {
            return [];
        }
        const { Mails } = this.entities;

        const responses: Promise<Array<[Document]>> = (
            await SELECT.from(Mails)
                .where({
                    ID: {
                        in: mails.map(([doc, _distance]: [TypeORMVectorStoreDocument, number]) => doc.metadata.id)
                    }
                })
                .columns((m: any) => {
                    m.ID;
                    m.responseBody;
                })
        ).map((mail: any) => new Document({ metadata: { id: mail.id }, pageContent: mail.responseBody }));

        return responses;
    };


    /**
     * Get closest mails.
     * @param {string} id - The id of the mail.
     * @param {number} k - The number of closest mails to fetch (default value is 5).
     * @param {string} tenant - The tenant identifier.
     * @return {Promise<Array<[TypeORMVectorStoreDocument, number]>>} - Returns a Promise that resolves to an array of closest mails.
     */
    public getClosestMails = async (
        id: string,
        k: number = 5,
        responded: boolean = false,
        tenant?: string
    ): Promise<Array<[TypeORMVectorStoreDocument, number]>> => {
        
        const documents = await cds.run(`
            SELECT 
                similars.ID as "id",
                similars.BODY as "pageContent",
                COSINE_SIMILARITY(TO_REAL_VECTOR(similars."EMBEDDING"), focus."EMBEDDING") as "similarity"
            FROM "AI_DB_MAILS" as similars
            JOIN (
                SELECT 
                    ID, 
                    TO_REAL_VECTOR("EMBEDDING") as "EMBEDDING"
                FROM "AI_DB_MAILS"
                WHERE ID = ?
                LIMIT 1
            ) as focus ON focus.ID <> similars.ID
            ${responded ? 'WHERE RESPONDED = true' : ''}
            ORDER BY "similarity" DESC LIMIT ?`, [id, k]
        );

        const results: Array<[TypeORMVectorStoreDocument, number]> = [];
        for (const doc of documents) {
            if (doc.similarity != null && doc.pageContent != null) {
                const document = new TypeORMVectorStoreDocument(doc);
                document.id = doc.id;
                results.push([document, doc.similarity]);
            }
        }
        return results;
    };
}

/**
 * Filters given object for translation related properties.
 *
 * @param {Object} The object containing potential fields for translation.
 * @returns {Object} - An object containing the filtered fields.
 */
const filterForTranslation = ({
    subject,
    body,
    sender,
    requestedServices,
    customFields,
    summary,
    keyFacts,
    responseBody
}: any): object => ({
    subject,
    body,
    sender,
    requestedServices,
    customFields,
    summary,
    keyFacts,
    responseBody
});


/**
 * Parses JSON strings, adding missing ',' for valid JSON and replacing '\n' by '\\n' in property values.
 *
 * @param {string} jsonString - The JSON string to parse.
 * @returns {string} - The parsed JSON string.
 */
const fixJsonString = (jsonString: String): string => {
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



