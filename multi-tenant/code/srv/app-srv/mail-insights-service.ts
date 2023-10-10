import CommonMailInsights from "../common/handlers/common-mail-insights";

export default class MailInsightsService extends CommonMailInsights {
    async init() {
        await super.init();
        this.on("getMails", this.getMails);
        this.on("getMail", this.getMail);
        this.on("recalculateInsights", this.recalculateInsights);
        this.on("recalculateResponse", this.recalculateResponse);
        this.on("addMails", this.addMails);
        this.on("deleteMail", this.deleteMail);
        this.on("syncWithOffice365", this.syncWithOffice365);
    }
}