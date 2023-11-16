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

import * as schemas from "./schemas";
import { actions } from "./default-values";

import { Mail, Mails, Translation, Translations } from "./@cds-models/mail-insights-service/MailInsightsService";
import { Action } from "./@cds-models/mail-insights-service/ai/db";

// Default table used in PostgreSQL
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
     * @param {Mails} mails
     * @returns {Promise<Mails>}
     */
    private onAfterReadMails = async (mails: Mails): Promise<Mails> => {
        try {
            // Add default descriptions for actions
            mails.forEach((mail: Mail) => {
                if (mail.suggestedActions) {
                    mail.suggestedActions = mail.suggestedActions?.map((suggestedAction: Action) => {
                        return {
                            ...suggestedAction,
                            descr: actions.find((action: Action) => action.value === suggestedAction.value)?.descr || ""
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
     * @returns {Promise<Mails|Express.Request>}
     */
    private onGetMails = async (req: Request): Promise<Mails | Express.Request> => {
        try {
            const mails = await SELECT.from(Mails).columns((m) => {
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
     * @returns {Promise<Mail|Express.Request>}
     */
    private onGetMail = async (req: Request): Promise<Mail | Express.Request> => {
        try {
            const tenant = cds.env?.requires?.multitenancy && req.tenant;
            const { id }: { id: string } = req.data;

            const mail = await SELECT.one
                .from(Mails, (m) => {
                    m("*");
                    m.translation((t) => {
                        t("*");
                    });
                })
                .where(`ID = '${id}'`);

            // Add default descriptions for actions
            mail.suggestedActions = mail.suggestedActions?.map((suggestedAction) => {
                return {
                    ...suggestedAction,
                    descr: actions.find((action) => action.value === suggestedAction.value)?.descr || ""
                };
            });

            const closestMailsIDs = await this.getClosestMails(id, 5, {}, tenant);

            const closestMails =
                closestMailsIDs.length > 0
                    ? await SELECT.from(Mails, (m) => {
                          m.ID;
                          m.subject;
                          m.body;
                          m.category;
                          m.sender;
                          m.responded;
                          m.responseBody;
                          m.translation((t) => {
                              t("*");
                          });
                      }).where({
                          ID: {
                              in: closestMailsIDs.map(
                                  ([doc, _distance]: [TypeORMVectorStoreDocument, number]) => doc.metadata.id
                              )
                          }
                      })
                    : [];

            const closestMailsWithSimilarity = closestMails.map((mail: Mail) => {
                const [_, _distance]: [TypeORMVectorStoreDocument, number] = closestMailsIDs.find(
                    ([doc, _distance]: [TypeORMVectorStoreDocument, number]) => mail.ID === doc.metadata.id
                );
                return { similarity: 1.0 - _distance, mail: mail };
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
     * @returns {Promise<Mail|Express.Request>}
     */
    private onAddMails = async (req: Request): Promise<Mail | Express.Request> => {
        try {
            const tenant = cds.env?.requires?.multitenancy && req.tenant;
            const { mails, rag }: { mails: Mails; rag: boolean } = req.data;
            const mailBatch = await this.regenerateInsights(mails, rag, tenant);

            // insert mails with insights
            console.log("UPDATE MAILS WITH INSIGHTS...");

            await INSERT.into(Mails).entries(mailBatch);

            // Embed mail bodies with IDs
            console.log("EMBED MAILS WITH IDs...");

            await (
                await this.getVectorStore(tenant)
            ).addDocuments(
                mailBatch.map((mail: Mail) => ({
                    pageContent: mail.body,
                    metadata: { id: mail.ID }
                }))
            );

            const insertedMails = await SELECT.from(Mails, (m) => {
                m("*");
                m.translation((t) => {
                    t("*")
                });
            }).where({
                ID: { in: mailBatch.map((mail) => mail.ID) }
            });

            // Add default descriptions for actions
            insertedMails.forEach((mail) => {
                mail.suggestedActions = mail.suggestedActions?.map((suggestedAction) => {
                    return {
                        ...suggestedAction,
                        descr: actions.find((action) => action.value === suggestedAction.value)?.descr || ""
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
     * @returns {Promise<boolean|Express.Request>}
     */
    private onDeleteMail = async (req: Request): Promise<boolean | Express.Request> => {
        try {
            const tenant = cds.env?.requires?.multitenancy && req.tenant;
            const { id } : { id : string } = req.data;

            await DELETE.from(Mails, id);

            const typeormVectorStore = await this.getVectorStore(tenant);
            const queryString = `DELETE FROM ${typeormVectorStore.tableName} WHERE (metadata->'id')::jsonb ? $1;`;
            await typeormVectorStore.appDataSource.query(queryString, [id]);

            return true;
        } catch (error: any) {
            console.error(`Error: ${error?.message}`);
            return req.error(`Error: ${error?.message}`);
        }
    };

    /**
     * (Re-)Generate Insights, Response(s) and Translation(s) for single or multiple Mail(s)
     * @param {Array<Mails>} mails - array of mails
     * @param {boolean} rag - flag to denote if RAG status should be considered
     * @param {string} tenant - tenant id
     * @returns {Promise<Mails>} Promise object represents the translated mails
     */
    public regenerateInsights = async (
        mails: Mails,
        rag: boolean = false,
        tenant: string = DEFAULT_TENANT
    ): Promise<Mails> => {
        // Add unique ID to mails if not existent
        mails = mails.map((mail) => {
            return { ...mail, ID: mail.ID || uuidv4() };
        });

        const [generalInsights, potentialResponses, languageMatches] = await Promise.all([
            this.extractGeneralInsights(mails, tenant),
            this.preparePotentialResponses(mails, rag, tenant),
            this.extractLanguageMatches(mails, tenant)
        ]);

        const processedMails = mails.reduce((acc, mail) => {
            const generalInsight = generalInsights.find((res) => res.ID === mail.ID);
            const potentialResponse = potentialResponses.find((res) => res.ID === mail.ID);
            const languageMatch = languageMatches.find((res) => res.ID === mail.ID);

            acc.push({
                ...generalInsight,
                responseBody: potentialResponse.responseBody,
                languageMatch: languageMatch.languageMatch,
                languageNameDetermined: languageMatch.languageNameDetermined
            });

            return acc;
        }, [] as Mails);

        const translatedMails = await this.translateInsights(processedMails, tenant);
        return translatedMails;
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
        mail: Mail,
        rag: boolean = false,
        tenant: string = DEFAULT_TENANT,
        additionalInformation?: string
    ): Promise<Mail> => {
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
        )[0]?.responseBody;

        const translation = (await SELECT.one.from(Translations, mail.translation_ID)) as Translation;

        if (!mail.languageMatch) {
            translation.responseBody = await this.translateResponse(
                regeneratedResponse,
                tenant,
                schemas.WORKING_LANGUAGE
            );
        } else {
            translation.responseBody = regeneratedResponse;
        }

        // Add default descriptions for actions
        mail.suggestedActions = mail.suggestedActions?.map((suggestedAction) => {
            return {
                ...suggestedAction,
                descr: actions.find((action) => action.value === suggestedAction.value)?.descr || ""
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
     * @param {Mails} mails - Array of mails to extract insights from.
     * @param {string} [tenant=DEFAULT_TENANT] - Tenant string (default value is DEFAULT_TENANT).
     * @returns {Promise<Mails>} - A promise that resolves to an array of processed mails.
     */
    public extractGeneralInsights = async (mails: Mails, tenant: string = DEFAULT_TENANT): Promise<Mails> => {
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
            mails.map(async (mail): Promise<Mail> => {
                const insights: z.infer<typeof schemas.MAIL_INSIGHTS_SCHEMA> = (
                    await chain.call({
                        subject: mail.subject,
                        body: mail.body
                    })
                ).text;
                return { ...mail, ...insights };
            })
        );

        return mailsInsights;
    };

    /**
     * Generate potential Response(s) using LLM.
     * @param {Mails} mails - An array of mails.
     * @param {boolean} rag - A flag to control retrieval augmented generation usage.
     * @param {string} [tenant=DEFAULT_TENANT] - Tenant string (default value is DEFAULT_TENANT).
     * @param {string} additionalInformation - Additional information for mail response.
     * @return {Promise} - Returns a Promise that resolves to an array of potential responses.
     */
    public preparePotentialResponses = async (
        mails: Mails,
        rag: boolean = false,
        tenant: string = DEFAULT_TENANT,
        additionalInformation?: string
    ): Promise<Mails> => {
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
            mails.map(async (mail) => {
                if (rag) {
                    const closestMails = await this.getClosestMails(mail.ID, 5, { submitted: true }, tenant);
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

                    return { ...mail, responseBody: response.responseBody };
                } else {
                    const response: z.infer<typeof schemas.MAIL_RESPONSE_SCHEMA> = (
                        await chain.call({
                            sender: mail.senderEmailAddress,
                            subject: mail.subject,
                            body: mail.body,
                            additionalInformation: additionalInformation || ""
                        })
                    ).text;
                    return { ...mail, responseBody: response.responseBody };
                }
            })
        );

        return potentialResponses;
    };

    /**
     * Extract Language Match(es) using LLM.
     * @param {Mails} mails - An array of mails.
     * @param {string} [tenant=DEFAULT_TENANT] - Tenant string (default value is DEFAULT_TENANT).
     * @return {Promise<Mails>} - Returns a Promise that resolves to an array of language matches.
     */
    public extractLanguageMatches = async (mails: Mails, tenant: string = DEFAULT_TENANT): Promise<Mails> => {
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
            mails.map(async (mail) => {
                const languageMatch: z.infer<typeof schemas.MAIL_LANGUAGE_SCHEMA> = (
                    await chain.call({
                        mail: mail.body
                    })
                ).text;

                return { ...mail, ...languageMatch };
            })
        );

        return languageMatches;
    };

    /**
     * Translates Insight(s) using LLM.
     * @param {Mails} mails - An array of processed mails.
     * @param {string} [tenant=DEFAULT_TENANT] - Tenant string (default value is DEFAULT_TENANT).
     * @return {Promise} - Returns a Promise that resolves to an array of translations.
     */
    public translateInsights = async (mails: Mails, tenant: string = DEFAULT_TENANT): Promise<Mails> => {
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

        const translations = (await Promise.all(
            mails.map(async (mail) => {
                if (!mail.languageMatch) {
                    const translation: z.infer<typeof schemas.MAIL_INSIGHTS_TRANSLATION_SCHEMA> = (
                        await chain.call({
                            insights: JSON.stringify(
                                filterForTranslation({
                                    ...mail
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
                                subject: mail.subject || "",
                                body: mail.body || "",
                                sender: mail.sender || "",
                                summary: mail.summary || "",
                                keyFacts: mail.keyFacts || "",
                                requestedServices: mail.requestedServices || "",
                                responseBody: mail.responseBody || ""
                            }
                        ]
                    };
                }
            })
        )) as Mails;

        return translations;
    };

    /**
     * Translates a single response using LLM.
     * @param {string} response - The response text.
     * @param {string} [tenant=DEFAULT_TENANT] - Tenant string (default value is DEFAULT_TENANT).
     * @param {string} language - The language for translation.
     * @return {Promise<string>} - Returns a Promise that resolves to the translated response.
     */
    public translateResponse = async (
        response: string,
        tenant: string = DEFAULT_TENANT,
        language: string
    ): Promise<string> => {
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
            return translation?.responseBody || "";
        } catch (error: any) {
            console.error(`Error: ${error?.message}`);
            return response || "";
        }
    };

    /**
     * Method to regenerate Insights for all available Mails
     * @async
     * @param {Request} req - Request object
     * @returns {Promise<boolean|Express.Request>}
     */
    private onRegenerateInsights = async (req: Request): Promise<boolean | Express.Request> => {
        try {
            const tenant = cds.env?.requires?.multitenancy && req.tenant;
            const { rag } : { rag : boolean} = req.data;
            
            const mails = await SELECT.from(Mails);
            const mailBatch = await this.regenerateInsights(mails, rag, tenant);

            // insert mails with insights
            console.log("UPDATE MAILS WITH INSIGHTS...");

            await UPSERT.into(Mails).entries(mailBatch);

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
     * @returns {Promise<boolean|Express.Request>}
     */
    private onRegenerateResponse = async (req: Request): Promise<boolean | Express.Request> => {
        try {
            const tenant = cds.env?.requires?.multitenancy && req.tenant;
            const { id, rag, additionalInformation } = req.data;
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
     * @returns {Promise<boolean|Express.Request>}
     */
    private onTranslateResponse = async (req: Request): Promise<boolean | Express.Request> => {
        try {
            const tenant = cds.env?.requires?.multitenancy && req.tenant;
            const { id, response } = req.data;
            const mail = await SELECT.one.from(Mails, id);
            const translation = await this.translateResponse(response, tenant, mail.languageNameDetermined);
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
     * @returns {Promise<boolean|Express.Request>}
     */
    private onSubmitResponse = async (req: Request): Promise<boolean | Express.Request> => {
        try {
            const tenant = cds.env?.requires?.multitenancy && req.tenant;
            const { id, response } = req.data;
            const mail = await SELECT.one.from(Mails, id).columns((m) => {
                m("*");
                m.translation((t) => t("*"));
            });

            // Translate working language response to recipient's original language
            const translation =
                mail.languageMatch === undefined || mail.languageMatch
                    ? response
                    : await this.translateResponse(response, tenant, mail.languageNameDetermined);

            // Implement your custom logic to send e-mail e.g. using Microsoft Graph API
            // Send the working language response + target language translation + AI Translation Disclaimer;
            const submittedMail = {
                ...mail,
                responded: true,
                responseBody: translation,
                translation: { ...mail.translation, responseBody: response }
            };
            const success = await UPDATE(Mails, mail.ID).set(submittedMail);
            if (success) {
                const typeormVectorStore = await this.getVectorStore(tenant);
                const submitQueryPGVector = `UPDATE ${typeormVectorStore.tableName} SET metadata = metadata::jsonb || '{"submitted": true}' where (metadata->'id')::jsonb ? $1`;
                await typeormVectorStore.appDataSource.query(submitQueryPGVector, [id]);
            }
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
     * @returns {Promise<boolean|Express.Request>}
     */
    private onRevokeResponse = async (req: Request): Promise<boolean | Express.Request> => {
        try {
            const tenant = cds.env?.requires?.multitenancy && req.tenant;
            const { id } = req.data;

            const success = await UPDATE(Mails, id).with({ responded: false });

            if (success) {
                const typeormVectorStore = await this.getVectorStore(tenant);
                const submitQueryPGVector = `UPDATE ${typeormVectorStore.tableName} SET metadata = metadata::jsonb || '{"submitted": false}' where (metadata->'id')::jsonb ? $1`;
                await typeormVectorStore.appDataSource.query(submitQueryPGVector, [id]);
            }

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
    ): Promise<Array<Document>> => {
        if (mails.length === 0) {
            return [];
        }

        const responses: Array<Document> = (
            await SELECT.from(Mails)
                .where({
                    ID: {
                        in: mails.map(([doc, _distance]: [TypeORMVectorStoreDocument, number]) => doc.metadata.id)
                    }
                })
                .columns((m) => {
                    m.ID;
                    m.responseBody;
                })
        ).map((mail) => new Document({ metadata: { id: mail.ID }, pageContent: mail.responseBody }));

        return responses;
    };

    /**
     * Get VectorStore instance.
     * @param {string} tenant - The tenant identifier.
     * @return {Promise<TypeORMVectorStore>} - Returns a Promise that resolves to a VectorStore instance.
     */
    public getVectorStore = async (tenant?: string): Promise<TypeORMVectorStore> => {
        const embeddings = new BTPEmbedding(aiCore.embed, tenant);
        const args = getPostgresConnectionOptions(tenant);
        const typeormVectorStore = await TypeORMVectorStore.fromDataSource(embeddings, args);
        await typeormVectorStore.ensureTableInDatabase();
        return typeormVectorStore;
    };

    /**
     * Get closest mails.
     * @param {string} id - The id of the mail.
     * @param {number} k - The number of closest mails to fetch (default value is 5).
     * @param {any} filter - The filter criteria.
     * @param {string} tenant - The tenant identifier.
     * @return {Promise<Array<[TypeORMVectorStoreDocument, number]>>} - Returns a Promise that resolves to an array of closest mails.
     */
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
 * Gets PostgreSQL server connection options.
 *
 * @param {string} [tenant] - The tenant string.
 * @returns {TypeORMVectorStoreArgs} - An object containing connection options and the table name.
 */
const getPostgresConnectionOptions = (tenant?: string): TypeORMVectorStoreArgs => {
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

        tableName: tenant ? "_" + tenant.replace(/-/g, "") : DEFAULT_TENANT
    } as TypeORMVectorStoreArgs;
};

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
