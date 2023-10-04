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
    subject: string,
    body: string,
    category: string,
    sentiment: number,
    urgency: number,
    summary: string,
    translationSubject: string,
    translationBody: string,
    translationSummary: string,
    potentialResponse: string
}

export interface ClosestMail {
    similarity: number,
    mail: Mail
}