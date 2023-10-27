import cds from "@sap/cds";
import { Request } from "@sap/cds/apis/services";
import { v5 as uuidv5, v4 as uuidv4 } from "uuid";

import CommonMailInsights from "../common/handlers/common-mail-insights";
import { IStoredMail, ITranslatedMail } from "../common/handlers/types";

export default class MailInsightsService extends CommonMailInsights {
    async init() {
        // Shared handlers (getMails, getMail, addMails, deleteMail)
        await super.init();
        // Additional handlers
        this.on("submitResponse", this.onSubmitResponse);
        this.on("regenerateInsights", this.onRegenerateInsights);
        this.on("regenerateResponse", this.onRegenerateResponse);
        this.on("translateResponse", this.onTranslateResponse);
        this.on("syncWithOffice365", this.onSyncWithOffice365);
    }

    // Regenerate Insights for all available Mails
    private onRegenerateInsights = async (req: Request) => {
        try {
            const { tenant } = req;
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

    // Regenerate Response for a single Mail
    private onRegenerateResponse = async (req: Request) => {
        try {
            const { tenant } = req;
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

    // Translate Response to original e-mail language
    private onTranslateResponse = async (req: Request) => {
        try {
            const { id, response } = req.data;
            const { Mails } = this.entities;
            const mail = await SELECT.one.from(Mails, id);
            const translation = (await this.translateResponse(response, mail.languageNameDetermined)).responseBody;
            return translation;
        } catch (error: any) {
            console.error(`Error: ${error?.message}`);
            return req.error(`Error: ${error?.message}`);
        }
    };

    // Submit response for single Mail
    // Response always passed in user's working language
    private onSubmitResponse = async (req: Request) => {
        try {
            const { tenant } = req;
            const { id, response } = req.data;
            const { Mails } = this.entities;
            const mail = await SELECT.one.from(Mails, id).columns((m: any) => {
                m("*");
                m.translation((t: any) => t("*"));
            });

            // Translate working language response to recipient's original language
            const translation = !mail.insights?.languageMatch
                ? (await this.translateResponse(response, mail.insights?.languageNameDetermined)).responseBody
                : response;

            // Store working language response in translation response Body
            // Store either working language or original language in translation responseBody

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
                mailBatch.map((mail: IStoredMail) => ({
                    pageContent: mail.body,
                    metadata: { id: mail.ID }
                }))
            );
            return true;
        } catch (error: any) {
            console.error(`Error: ${error?.message}`);
            return req.error(`Error: ${error?.message}`);
        }
    };
}
