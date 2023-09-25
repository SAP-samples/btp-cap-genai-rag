export interface FilterItem {
    id: string,
    label: string
}

export interface EmailObject {
    mail: Mail,
    closestMails: ClosestMail[]
}

export interface Mail {
    ID: string,
    createdAt: null,
    createdBy: null,
    modifiedAt: Date,
    modifiedBy: string,
    sender: string,
    senderEmailAddress: String,
    subject: string,
    body: string,
    category: string,
    sentiment: number,
    urgency: number,
    summary: string,
    responseBody: string,
    languageNameDetermined: string,
    languageMatch: boolean,
    translations: Mail[]
}

export interface ClosestMail {
    similarity: number,
    mail: Mail
}