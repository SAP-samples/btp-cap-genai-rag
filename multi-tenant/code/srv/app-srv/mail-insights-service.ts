import cds from "@sap/cds";
import { Request } from "@sap/cds/apis/services";

import CommonMailInsights from "../common/handlers/common-mail-insights";
import * as aiCore from "../common/utils/ai-core"; 

/**
 * MailInsightsService class extends CommonMailInsights
 * @extends CommonMailInsights
 */
export default class MailInsightsService extends CommonMailInsights {
    /**
     * Initialization method to register CAP Action Handlers
     * @async
     * @returns {Promise<void>}
     */
    async init(): Promise<void> {
        // Shared handlers (getMails, getMail, addMails, deleteMail)
        await super.init();

        // Create a default SAP AI Core resource groups if non existent
        await aiCore.checkDefaultResourceGroup();

        // Additional handlers
        this.on("submitResponse", this.onSubmitResponse);
        this.on("revokeResponse", this.onRevokeResponse);
        this.on("regenerateInsights", this.onRegenerateInsights);
        this.on("regenerateResponse", this.onRegenerateResponse);
        this.on("translateResponse", this.onTranslateResponse);
    }

    /**
     * Method to regenerate Insights for all available Mails
     * @async
     * @param {Request} req - Request object
     * @returns {Promise<boolean|*>}
     */
    private onRegenerateInsights = async (req: Request): Promise<boolean | any> => {
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
    private onRegenerateResponse = async (req: Request): Promise<boolean | any> => {
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
    private onTranslateResponse = async (req: Request): Promise<boolean | any> => {
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
    private onSubmitResponse = async (req: Request): Promise<boolean | any> => {
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
    private onRevokeResponse = async (req: Request): Promise<boolean | any> => {
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
}