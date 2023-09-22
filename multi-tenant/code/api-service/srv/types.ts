export interface IBaseMail {
    ID: string;
    subject: string;
    body: string;
    senderEmailAddress: string;
}

export interface IProcessedMail {
    mail : IBaseMail,
    insights : IInsights
}

export interface ITranslatedMail extends IProcessedMail {
    translations? : Array<ITranslatedInsights> | {};
}

export interface CustomField {
    title?: string;
    isNumber?: boolean;
    description?: string;
}

interface ITranslatedInsights {
    subject?: String;
    body?: String;
    sender?: String;
    summary?: String;
    keyFacts?: Array<IKeyFacts>;
    customFields?: Array<ICustomField>;
    requestedServices?: Array<String>;
    responseBody?: String;
}

interface IInsights {
    category?: string;
    sentiment?: number;
    sender? : string;
    urgency?: number;
    summary?: string;
    customFields?: Array<ICustomField>;
    keyFacts?: Array<IKeyFacts>;
    requestedServices?: Array<String>;
    suggestedActions?: Array<String>;
    responseBody?: String;
    languageNameDetermined?: String;
    languageMatch?: Boolean;
}

interface ICustomField {
    title?: string;
    value?: string;
}

interface IKeyFacts {
    keyfact?: string;
    keyfactcategory?: string;
}
