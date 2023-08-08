import { ApplicationService } from "@sap/cds";
import pg from "pg";
import { Request } from "@sap/cds/apis/services";

import { PromptTemplate } from "langchain/prompts";
import { LLMChain } from "langchain/chains";
import { TypeORMVectorStore } from "langchain/vectorstores/typeorm";
import { DataSourceOptions } from "typeorm";

import BTPAzureOpenAILLM from "./langchain/BTPAzureOpenAILLM";
import BTPAzureOpenAIEmbedding from "./langchain/BTPAzureOpenAIEmbedding";

const VECTOR_DB_TABLE_NAME = "test";

interface DbConfig extends Record<string, string | number> {
    hostname: string;
    username: string;
    dbname: string;
    password: string;
    port: number;
}

export class PublicService extends ApplicationService {
    async init() {
        await super.init();

        this.on("userInfo", this.userInfo);
        this.on("inference", this.inference);
        this.on("embed", this.embed);
        this.on("simSearch", this.simSearch);
        this.on("pgvalue", this.pgvalue);
    }

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

            // @ts-ignore
            const pgCreds = cds.env.requires?.postgres?.credentials;

            const embeddings = new BTPAzureOpenAIEmbedding(tenant);
            const args = {
                postgresConnectionOptions: {
                    type: "postgres",
                    host: pgCreds?.hostname,
                    username: pgCreds?.username,
                    database: pgCreds?.dbname,
                    password: pgCreds?.password,
                    port: pgCreds?.port,
                    ssl: pgCreds?.sslcert ? {
                        cert: pgCreds?.sslcert,
                        ca: pgCreds?.sslrootcert
                    } : false
                } as DataSourceOptions,
                tableName: VECTOR_DB_TABLE_NAME
            };

            const typeormVectorStore = await TypeORMVectorStore.fromDataSource(embeddings, args);
            await typeormVectorStore.ensureTableInDatabase();
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


            // @ts-ignore
            const pgCreds = cds.env.requires?.postgres?.credentials;

            const embeddings = new BTPAzureOpenAIEmbedding(tenant);
            const args = {
                postgresConnectionOptions: {
                    type: "postgres",
                    host: pgCreds?.hostname,
                    username: pgCreds?.username,
                    database: pgCreds?.dbname,
                    password: pgCreds?.password,
                    port: pgCreds?.port,
                    ssl: pgCreds?.sslcert ? {
                        cert: pgCreds?.sslcert,
                        ca: pgCreds?.sslrootcert
                    } : false
                } as DataSourceOptions,
                tableName: VECTOR_DB_TABLE_NAME
            };

            const typeormVectorStore = await TypeORMVectorStore.fromDataSource(embeddings, args);
            await typeormVectorStore.ensureTableInDatabase();

            const result = await typeormVectorStore.similaritySearch(text, k);
            return { result };
        } catch (error: any) {
            console.error(`Error: ${error?.message}`);
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
