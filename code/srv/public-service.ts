import { ApplicationService } from "@sap/cds";
import pg from "pg";
import { Request } from "@sap/cds/apis/services";
import { v4 as uuidv4 } from "uuid";

import {
    ChatPromptTemplate,
    HumanMessagePromptTemplate,
    PromptTemplate,
    SystemMessagePromptTemplate
} from "langchain/prompts";
import { StructuredOutputParser } from "langchain/output_parsers";
import { LLMChain } from "langchain/chains";
import { TypeORMVectorStore, TypeORMVectorStoreDocument } from "langchain/vectorstores/typeorm";
import { z } from "zod";
import { createStructuredOutputChainFromZod } from "langchain/chains/openai_functions";
import { DataSourceOptions } from "typeorm";

import BTPAzureOpenAILLM from "./langchain/BTPAzureOpenAILLM";
import BTPAzureOpenAIChatLLM from "./langchain/BTPAzureOpenAIChatLLM";
import BTPAzureOpenAIEmbedding from "./langchain/BTPAzureOpenAIEmbedding";
import { Subject } from "typeorm/persistence/Subject";

const MAIL_INSIGHTS_SCHEMA = z
    .object({
        sentiment: z.number().describe("The sentiment of the email: -10 for very bad up to 10 for very good"),
        urgency: z
            .number()
            .describe("Whether the email is urgent or not ranging from 0 for not urgent to 10 for urgent"),
        category: z.string().describe("Category of the email. It could wheter be 'COMPLAINT' or 'INFORMATION'"),
        translation: z.string().describe("Translation of the mail into german"),
        response: z.string().describe("A potential response of the mail acting as customer service"),
        facts: z
            .array(
                z.object({
                    fact: z.string().optional().describe("key for the fact which should be unique"),
                    factTitle: z.string().optional().describe("label for the fact which should be unique"),
                    value: z.string().optional().describe("value or insight of the fact")
                })
            )
            .describe("An array additional of up to 5 key facts found in the email")
    })
    .describe("Insights about the email and potential actions as e.g., a potential reply to the incoming email");

export class PublicService extends ApplicationService {
    async init() {
        await super.init();
        this.on("userInfo", this.userInfo);
        this.on("inference", this.inference);
        this.on("embed", this.embed);
        this.on("simSearch", this.simSearch);
        this.on("pgvalue", this.pgvalue);
        this.on("addMails", this.addMails);
        this.on("getMail", this.getMail);
    }

    private getMail = async (req: Request) => {
        try {
            const { tenant } = req;
            const { id } = req.data;
            const { Mails } = this.entities;
            console.log(id);
            const mail = await SELECT.one.from(Mails, id).columns((m: any) => {
                m("*");
                m.facts;
            });
            const closestMailsIDs = await this.getClosestMails(id, 5, null, tenant);
            const closestMails = await SELECT.from(Mails)
                .where({
                    ID: {
                        in: closestMailsIDs.map(
                            ([doc, _distance]: [TypeORMVectorStoreDocument, number]) => doc.metadata.id
                        )
                    }
                })
                .columns((m: any) => {
                    m.ID;
                    m.subject;
                    m.body;
                    m.category;
                });
            console.log(closestMailsIDs);
            const closestMailsWithSimilarity: { similarity: number; mail: any } = closestMails.map((mail: any) => {
                const [_, _distance]: [TypeORMVectorStoreDocument, number] = closestMailsIDs.find(
                    ([doc, _distance]: [TypeORMVectorStoreDocument, number]) => mail.ID === doc.metadata.id
                );
                return { similarity: 1.0 - _distance, mail: mail };
            });
            console.log("mail:", mail);
            console.log("closestMails:", closestMails);
            return { mail, closestMails: closestMailsWithSimilarity };
        } catch (error: any) {
            console.error(`Error: ${error?.message}`);
            return {};
        }
    };

    async getClosestMails(
        id: string,
        k: number = 5,
        filter: any = "{}",
        tenant: string = "main"
    ): Promise<Array<[TypeORMVectorStoreDocument, number]>> {
        const typeormVectorStore = await getVectorStore(tenant);
        const _filter = filter ?? "{}";

        const queryString = `
        SELECT x.id, x."pageContent", x.metadata, x.embedding <-> focus.embedding as _distance from ${typeormVectorStore.tableName} as x
        join (SELECT * from ${typeormVectorStore.tableName} where (metadata->'id')::jsonb ? $1) as focus
        on focus.id != x.id
        WHERE x.metadata @> $2
        ORDER BY _distance LIMIT $3;
        `;

        const documents = await typeormVectorStore.appDataSource.query(queryString, [id, _filter, k]);
        const results: Array<[TypeORMVectorStoreDocument, number]> = [];
        for (const doc of documents) {
            if (doc._distance != null && doc.pageContent != null) {
                const document = new TypeORMVectorStoreDocument(doc);
                document.id = doc.id;
                results.push([document, doc._distance]);
            }
        }
        return results;
    }

    private addMails = async (req: Request) => {
        try {
            const { tenant } = req;
            const { mails } = req.data;

            const parser = StructuredOutputParser.fromZodSchema(MAIL_INSIGHTS_SCHEMA);
            const formatInstructions = parser.getFormatInstructions();

            const prompt = new PromptTemplate({
                template: "Give insights about the incoming email.\n{format_instructions}\n{mail}",
                inputVariables: ["mail"],
                partialVariables: { format_instructions: formatInstructions }
            });

            const mailsInsights = await Promise.all(
                mails.map(async (mail: string) => {
                    const model = new BTPAzureOpenAILLM(tenant);
                    const input = await prompt.format({
                        mail
                    });
                    const response = await model.call(input);
                    const insights = await parser.parse(response);
                    return { mail, insights };
                })
            );

            // insert mails with insights
            const insertables = mailsInsights.reduce(
                (acc: { mails: any[]; facts: any[] }, { mail, insights }: { mail: string; insights: any }) => {
                    const mailId = uuidv4();
                    return {
                        mails: [
                            ...acc.mails,
                            {
                                ID: mailId,
                                subject: "",
                                body: mail,
                                sentiment: insights.sentiment,
                                urgency: insights.urgency,
                                category: insights.category,
                                translation: insights.translation,
                                response: insights.response
                            }
                        ],
                        facts: [
                            ...acc.facts,
                            ...insights.facts.map((fact: any) => ({
                                mail_ID: mailId,
                                fact: fact.fact,
                                factTitle: fact.factTitle,
                                value: fact.value
                            }))
                        ]
                    };
                },
                { mails: [], facts: [] }
            );
            cds.tx(async () => {
                const { Mails, Facts } = this.entities;
                await INSERT.into(Mails).entries(insertables.mails);
                await INSERT.into(Facts).entries(insertables.facts);
            });
            // embed mail bodies with IDs
            const typeormVectorStore = await getVectorStore(tenant);
            console.log(typeormVectorStore.toJSON());
            console.log(insertables.mails);
            await typeormVectorStore.addDocuments(
                insertables.mails.map((mail: any) => ({
                    pageContent: mail.body,
                    metadata: { id: mail.ID }
                }))
            );
            return mailsInsights[0];
        } catch (error: any) {
            console.error(`Error: ${error?.message}`);
        }
    };

    private userInfo = (req: Request) => {
        let results = {
            user: req.user.id,
            locale: req.locale,
            tenant: req.tenant,
            scopes: {
                authenticated: req.user.is("authenticated-user"),
                identified: req.user.is("identified-user"),
                Member: req.user.is("Member"),
                Admin: req.user.is("Admin"),
                ExtendCDS: req.user.is("ExtendCDS"),
                ExtendCDSdelete: req.user.is("ExtendCDSdelete")
            }
        };

        return results;
    };

    private inference = async (req: Request) => {
        try {
            const { tenant } = req;
            const { prompt } = req.data;
            const llm = new BTPAzureOpenAILLM(tenant);

            const template = `Question: {question}
            
            Answer: Let's think step by step.`;

            const promptTemplate = PromptTemplate.fromTemplate(template);
            const llmChain = new LLMChain({ llm: llm, prompt: promptTemplate });
            const response = await llmChain.call({ question: prompt });
            return response;
        } catch (error: any) {
            console.error(`Error: ${error?.message}`);
        }
    };

    private embed = async (req: Request) => {
        try {
            const { tenant } = req;
            const { texts } = req.data;

            const typeormVectorStore = await getVectorStore(tenant);

            await typeormVectorStore.addDocuments(
                texts.map((text: string, index: number) => ({ pageContent: text, metadata: { a: index } }))
            );

            return { success: true, error: "" };
        } catch (error: any) {
            console.error(`Error: ${error?.message}`);
            return { success: false, error: error?.message };
        }
    };

    private simSearch = async (req: Request) => {
        try {
            const { tenant } = req;
            const { text, k } = req.data;

            const typeormVectorStore = await getVectorStore(tenant);

            const result = await typeormVectorStore.similaritySearch(text, k);
            return { result };
        } catch (error: any) {
            console.error(`Error: ${error?.message}`);
            return { result: [] };
        }
    };

    private pgvalue = async (req: Request) => {
        try {
            // @ts-ignore
            const postgres: any = cds.env.requires?.postgres?.credentials;
            postgres ??
                (() => {
                    throw Error("PostgreSQL binding details missing");
                });

            const client = new pg.Client({
                host: postgres.hostname,
                database: postgres.dbname,
                user: postgres.username,
                password: postgres.password,
                port: postgres.port,
                ssl: false
            });

            await client
                .connect()
                .then(() => console.log("Connection Successful"))
                .catch((err: any) => {
                    throw err;
                });

            await queryDatabase()
                .then(() => req.reply("Query Successful"))
                .catch((err: any) => {
                    throw err;
                });

            async function queryDatabase() {
                const query = `DROP TABLE IF EXISTS test;
                    CREATE TABLE test (id serial PRIMARY KEY, name VARCHAR(50));
                    INSERT INTO test (name) VALUES ('john');
                    INSERT INTO test (name) VALUES ('doe');`;

                await client
                    .query(query)
                    .then(() => {
                        console.log("Table Created!");
                        client.end();
                    })
                    .catch((err: any) => console.log(err));
            }
        } catch (error: any) {
            console.error(`Error: ${error?.message}`);
            req.error("500", "Error: " + error?.message);
        }
    };
}

const getVectorStore = async (tenant: string) => {
    const embeddings = new BTPAzureOpenAIEmbedding(tenant);
    const args = getPostgresConnectionOptions(tenant);
    const typeormVectorStore = await TypeORMVectorStore.fromDataSource(embeddings, args);
    await typeormVectorStore.ensureTableInDatabase();
    return typeormVectorStore;
};

const getPostgresConnectionOptions = (tenant: string) => {
    // @ts-ignore
    const credentials = cds.env.requires?.postgres?.credentials;
    return {
        postgresConnectionOptions: {
            type: "postgres",
            host: credentials?.hostname,
            username: credentials?.username,
            database: credentials?.dbname,
            password: credentials?.password,
            port: credentials?.port,
            ssl: credentials?.sslcert
                ? {
                      cert: credentials?.sslcert,
                      ca: credentials?.sslrootcert
                  }
                : false
        } as DataSourceOptions,
        tableName: tenant ? `"${tenant}"` : "main"
    };
};
