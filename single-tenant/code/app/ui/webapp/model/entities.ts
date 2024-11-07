export interface EmailObject {
    mail: Mail;
    closestMails: ClosestMail[];
}

export interface Mail {
    ID: string;
    createdAt: null;
    createdBy: null;
    modifiedAt: Date;
    modifiedBy: string;
    subject: string;
    body: string;
    senderEmailAddress: String;
    sender: string;
    responded: boolean;
    category: string;
    sentiment: number;
    urgency: number;
    summary: string;
    responseBody: string;
    languageNameDetermined: string;
    languageMatch: boolean;
    suggestedActions: Action[];
    keyFacts: KeyFact[];
    translation: Mail;
}

export interface Action {
    type: string;
    value: string;
    descr: string;
}

export interface KeyFact {
    category: string;
    fact: string;
}

export interface ClosestMail {
    similarity: number;
    mail: Mail;
}

export interface FilterItem {
    id: string;
    label: string;
}
