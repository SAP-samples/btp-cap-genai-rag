import { z } from "zod";

// Set default working language of user 
// Can be stored/defined dynamically in a future release
export const WORKING_LANGUAGE = "English";

// Custom Schema for Language Determination
export const MAIL_LANGUAGE_SCHEMA = z.object({
    languageNameDetermined: z
        .string()
        .describe("Determine the language in the email. Return a full name of the language."),
    languageMatch: z
        .boolean()
        .describe(
            "If the email body is written in " + WORKING_LANGUAGE + ", then return 'true', otherwise return 'false'"
        )
}).describe(`You are supporting a travel agency which receives emails from customers all over the world. 
             Your task is to determine the language of the email in order to trigger translation if needed.`);

// Custom Schema for Mail Insights extraction
export const MAIL_INSIGHTS_SCHEMA = z.object({
    category: z.string().describe(`Classify the email into one the following categories:
        - Booking Assistance - if the email is asking for help in the process of booking of a travel or hotel stay,
        - Cancellation or Change - if the email is referring to an existing booking and asks for the booking to be changed or canceled,
        - Unexpected Problem - if the email is sent during the travel and indicates an urgent problem situation,
        - Feedback - if the email is related to a previous travel or hotel stay and expresses any sort of positive or negative feedback or complaint.,
        - General Inquiry - all other emails
        `),
    sender: z
        .string()
        .describe(
            'Extract the name of the customer from the mail body as the name of the sender. If not found, return "X"'
        ),
    sentiment: z
        .number()
        .transform((number) => Math.round(number))
        .describe(
            "Determine the sentiment of the mail on a scale from -1 (negative) via 0 (neutral) up to 1 (positive) as an integer. "
        ),
    urgency: z
        .number()
        .transform((number) => Math.round(number))
        .describe(
            "What level of urgency does the email express? Give your answer as an integer from 0 (lowest urgency) to 2 (high urgency)."
        ),
    summary: z.string().describe("Summarize the email, use maximum 10 words, in the language of the body."),
    keyFacts: z
        .array(
            z.object({
                fact: z
                    .string()
                    .optional()
                    .describe("fact (for the respective category) which should be unique, maximum 2 words"),
                category: z.string().optional().describe("category of the fact")
            })
        )
        .max(5)
        .describe(`Extract some relevant known facts ouf of the mail in a structured array, each fact needs a category classifying the fact.
            The categories of the facts can be one of the following:
            - Travelers - who is traveling, family, group, couple
            - Guests - how many persons are traveling
            - Location - the exact location which is referred in the email 
            - Country - the country which is referred in the email
            - BookingCode - the booking code or id which is referred in the email
            `),
    requestedServices: z.array(z.string())
        .describe(`Extract an array of the following services which are referred in the email, it can be multiple.
              - Accommodation - if the email is referring booking of an accommodation or hotel or other type of stay
              - Flight - if the email is referring to flight booking
              - Car - if the email is referring to rental car or other vehicle booking
              - Transfer - if the mail is referring to any sort of transfer, shuttle, taxi or similar
            `),
    suggestedActions: z.array(
        z.object({
            type: z.string().optional().describe("type of the action"),
            value: z.string().optional().describe("value of the action")
        })
    )
        .describe(`Based on the email and the services the email is asking for, which of the following action types and action values do you suggest.
            The following actions are structured like "type of action - value of action - description of action". 
            Only use the values provided in the following list while the result can contain multiple actions:
            - Hotel - Hotel Availability - check if the requested hotel is available and offer results to the sender
            - Hotel - Hotel Cancelation - cancel the previously booked hotel
            - Hotel - Hotel Fix" - check the hotel booking and provide information to the sender
            - Flight - Flight Availability - check if a flight is available according to the mail request and offer it to the sender
            - Flight - Flight Cancelation - cancel the previously booked flight
            - Flight - Flight Fix - check the flight booking and provide information to the sender
            - Car - Car Availability - check for a rental car offer available and offer results to the sender
            - Car - Car Cancelation - cancel the previously booked rental car
            - Car - Car Fix - check the rental car booking and provide information to the sender
            - General - General Fix - if any other action is required
        `)
}).describe(`You are supporting a travel agency which receives emails from customers requesting help or information. 
    Your task is to extract relevant insights out of the emails. Extract the information out of the email subject and body and return a clean and valid JSON format.`);

// Custom Schema for Mail Insights Translation
export const MAIL_INSIGHTS_TRANSLATION_SCHEMA = z.object({
    subject: z.string(),
    body: z.string(),
    sender: z.string(),
    summary: z.string(),
    keyFacts: z.array(
        z.object({
            fact: z.string().optional(),
            category: z.string().optional().nullable()
        })
    ),
    requestedServices: z.array(z.string()),
    responseBody: z.string().transform((responseBody) => responseBody.replace(/\\\\n/g, "\n"))
}).describe(`You are supporting a travel agency which receives emails from customers requesting help or information. 
      Your task is to translate the values for this schema into ${WORKING_LANGUAGE}. Return a clean and valid JSON format`);

// Custom Schema for Mail Response Translation
export const MAIL_RESPONSE_TRANSLATION_SCHEMA = z.object({
    responseBody: z.string().transform((responseBody) => responseBody.replace(/\\\\n/g, "\n"))
}).describe(`You are supporting a travel agency which receives emails from customers requesting help or information. 
        Your task is to translate the values for this schema into the explicitly provided language or into 
        ${WORKING_LANGUAGE} if no other language is provided. Return a clean and valid JSON format`);

// Custom Schema for Mail Response Generation
export const MAIL_RESPONSE_SCHEMA = z
    .object({
        responseBody: z.string().transform((responseBody) => responseBody.replace(/\\\\n/g, "\n"))
            .describe(`Formulate a response to the mail acting as customer service, include the additional information given in this text.
                Formulate the response in the same language as the original. The signature of the response will be "Your ThorTours Team".`)
    })
    .describe(
        `You are working on an incoming mail addressing a travel agency. Formulate a response. Return a clean and valid JSON format.`
    );
