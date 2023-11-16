import { z } from "zod";

export type ZodOptionalStringOrNumber = z.ZodString | z.ZodNumber | z.ZodOptional<z.ZodString | z.ZodNumber>

export interface IBaseMail {
    ID?: string;
    subject?: string;
    body?: string;
    senderEmailAddress?: string;
}

