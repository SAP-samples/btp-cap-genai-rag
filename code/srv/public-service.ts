import { ApplicationService } from "@sap/cds";
import { Request } from "@sap/cds/apis/services";

import { PromptTemplate } from "langchain/prompts";
import { LLMChain } from "langchain/chains";
import { TypeORMVectorStore } from "langchain/vectorstores/typeorm";
import { DataSourceOptions } from "typeorm";

import BTPAzureOpenAILLM from "./langchain/BTPAzureOpenAILLM";
import BTPAzureOpenAIEmbedding from "./langchain/BTPAzureOpenAIEmbedding";

const VECTOR_DB_TABLE_NAME = "test";
export class PublicService extends ApplicationService {
    async init() {
        await super.init();

        this.on("userInfo", this.userInfo);
        this.on("inference", this.inference);
        this.on("embed", this.embed);
        this.on("simSearch", this.simSearch);
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
            const postgresConnectionOptions = cds.env.requires.postgres;

            const embeddings = new BTPAzureOpenAIEmbedding(tenant);
            const args = {
                postgresConnectionOptions: {
                    type: postgresConnectionOptions?.kind,
                    ...postgresConnectionOptions?.credentials
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
            const postgresConnectionOptions = cds.env.requires.postgres;

            const embeddings = new BTPAzureOpenAIEmbedding(tenant);
            const args = {
                postgresConnectionOptions: {
                    type: postgresConnectionOptions?.kind,
                    ...postgresConnectionOptions?.credentials
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
}
