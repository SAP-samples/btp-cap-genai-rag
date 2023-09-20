export interface IBaseMail {
    subject: string;
    body: string;
    sender: string;
}

export interface IMail extends IBaseMail {
    ID: string;
    category: string;
    sentiment: number;
    urgency: number;
    summary: string;
    translationSubject: string;
    translationBody: string;
    translationSummary: string;
    potentialResponse: string;
    similarMails: Array<{
        similarity: number;
        mail: IMailsOverview;
    }>;
}

export interface ISimilarMail {
    similarity: number;
    mail: IMailsOverview;
}
export type IMailsOverview = Pick<IMail, "ID" | "subject" | "body" | "category" | "sender">;

export interface CategorizedMails {
    [category: string]: Array<IMail>;
}
