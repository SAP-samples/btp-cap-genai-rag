import cds from "@sap/cds";
import { Request } from "@sap/cds/apis/services";
import { v5 as uuidv5 } from "uuid";

import CommonMailInsights from "../common/handlers/common-mail-insights";
import { ITranslatedMail } from "../common/handlers/types";

export default class MailInsightsService extends CommonMailInsights {
    async init() {
        await super.init();
        this.on("submitResponse", this.onSubmitResponse);
        this.on("regenerateInsights", this.onRegenerateInsights);
        this.on("regenerateResponse", this.onRegenerateResponse);
        this.on("translateResponse", this.onTranslateResponse);
        this.on("syncWithOffice365", this.onSyncWithOffice365);
    }

    // Regenerate Insights for all available Mails
    private onRegenerateInsights = async (req: Request) => {
        const { tenant } = req;
        const { rag } = req.data;
        const { Mails } = this.entities;
        const mails = await SELECT.from(Mails);
        await this.regenerateInsights(mails, rag, tenant);
        return true;
    };

    // Regenerate Response for a single Mail
    private onRegenerateResponse = async (req: Request) => {
        const { tenant } = req;
        const { id, rag, additionalInformation } = req.data;
        const { Mails } = this.entities;
        const mail = await SELECT.one.from(Mails, id);
        const response = await this.regenerateResponse(mail, rag, tenant, additionalInformation);
        return response;
    };

    // Translate Response to original e-mail language
    private onTranslateResponse = async (req: Request) => {
        const { id, response } = req.data;
        const { Mails } = this.entities;
        const mail = await SELECT.one.from(Mails, id);
        const translation = (await this.translateResponse(response, mail.languageNameDetermined)).responseBody;
        return translation;
    };

    // Submit response for single Mail
    private onSubmitResponse = async (req: Request) => {
        try {
            const { id, response, translation, modified } = req.data;
            const { Mails } = this.entities;
            const mail = await SELECT.one.from(Mails, id);

            const dbEntry = [
                Object.assign(
                    {
                        ...mail,
                        responded: true,
                        responseModified: modified || false,
                        translations: translation ? [Object.assign(mail.translations[0], { responseBody: translation })] : []
                    },
                    response ? { responseBody: response } : {}
                )
            ];

            // Implement your custom logic to send e-mail e.g. using Microsoft Graph API
            
            await UPSERT.into(Mails).entries(dbEntry);
            return true;
        } catch (error: any) {
            console.error(`Error: ${error?.message}`);
        }
    };

    // Sync with Office 365
    private onSyncWithOffice365 = async (req: Request) => {
        try {
            const { tenant } = req;
            const mailInbox = await cds.connect.to("SUBSCRIBER_OFFICE365_DESTINATION");

            const mails = (
                await mailInbox.send({
                    method: "GET",
                    path: `messages?$select=id,sender,subject,body`
                })
            ).value?.map((mail: any) => {
                return {
                    ID: uuidv5(mail.id, uuidv5.URL),
                    sender: mail.sender?.emailAddress?.address || "",
                    subject: mail.subject || "",
                    body: mail.body?.content || ""
                };
            });

            const mailBatch = await this.regenerateInsights(mails);

            // embed mail bodies with IDs
            console.log("EMBED MAILS WITH IDs...");
            const typeormVectorStore = await this.getVectorStore(tenant);

            const queryString = `DELETE from ${typeormVectorStore.tableName} where (metadata->'id')::jsonb ?| $1`;
            await typeormVectorStore.appDataSource.query(queryString, [mails.map((mail: any) => mail.ID)]);

            await typeormVectorStore.addDocuments(
                mailBatch.map((mail: ITranslatedMail) => ({
                    pageContent: mail.mail.body,
                    metadata: { id: mail.mail.ID }
                }))
            );
            return true;
        } catch (error: any) {
            console.error(`Error: ${error?.message}`);
            req.error(`Error: Shared Inbox Sync Error: ${error?.message}`);
        }
    };
    
 }