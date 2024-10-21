import { z } from "zod";

export type ZodOptionalStringOrNumber = z.ZodString | z.ZodNumber | z.ZodOptional<z.ZodString | z.ZodNumber>;

export interface IBaseMail {
    ID?: string;
    subject?: string;
    body?: string;
    senderEmailAddress?: string;
    responded?: boolean;
}

export interface IProcessedMail {
    mail: IBaseMail;
    insights: IInsights;
}

export interface ITranslatedMail extends IProcessedMail {
    translation: ITranslatedInsight | {};
}

export interface IStoredMail extends IBaseMail, IInsights {
    translation: ITranslatedInsight | {};
}

export interface CustomField {
    title?: string;
    isNumber?: boolean;
    description?: string;
}

interface ITranslatedInsight {
    subject?: String;
    body?: String;
    sender?: String;
    summary?: String;
    keyFacts?: Array<IKeyFact>;
    requestedServices?: Array<String>;
    responseBody?: String;
}

interface IInsights {
    category?: string;
    sentiment?: number;
    sender?: string;
    urgency?: number;
    summary?: string;
    keyFacts?: Array<IKeyFact>;
    requestedServices?: Array<String>;
    suggestedActions?: Array<IAction>;
    responseBody?: String;
    languageNameDetermined?: String;
    languageMatch?: Boolean;
    embedding?: String;
}

interface IKeyFact {
    fact?: string;
    category?: string;
}

export interface IAction {
    type?: string;
    value?: string;
}

export interface MailWithSimilarity {
    ID: string;
    body: string;
    similarity: number;
}
