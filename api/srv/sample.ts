import cds, { ApplicationService } from "@sap/cds";
import { Request } from "@sap/cds/apis/services";
import {
    ChatPromptTemplate,
    HumanMessagePromptTemplate,
    PromptTemplate,
    SystemMessagePromptTemplate
} from "langchain/prompts";
import { LLMChain } from "langchain/chains";

import * as aiCore from "./utils/ai-core";
import BTPEmbedding from "./utils/langchain/BTPEmbedding";
import BTPAzureOpenAIChatLLM from "./utils/langchain/BTPAzureOpenAIChatLLM";

let array2VectorBuffer = (data: Array<number>): Buffer => {
    const sizeFloat = 4;
    const sizeDimensions = 4;
    const bufferSize = data.length * sizeFloat + sizeDimensions;

    const buffer = Buffer.allocUnsafe(bufferSize);
    // write size into buffer
    buffer.writeUInt32LE(data.length, 0);
    data.forEach((value: number, index: number) => {
        buffer.writeFloatLE(value, index * sizeFloat + sizeDimensions);
    });
    return buffer;
};

export default class SampleService extends ApplicationService {
    async init(): Promise<void> {
        await super.init();
        await aiCore.checkDefaultResourceGroup();
        this.on("embed", this.onEmbed);
        this.on("search", this.onSearch);
        this.on("chatCompletion", this.onChatCompletion);
    }

    private onEmbed = async (req: Request): Promise<any> => {
        const { text } = req.data;
        const { Documents } = this.entities;
        const embedder = new BTPEmbedding(aiCore.embed);
        const embeddings = await embedder.embedDocuments([text]);
        if (embeddings.length > 0) {
            const document = {
                text: text,
                embedding: array2VectorBuffer(embeddings[0])
            };
            const success = await INSERT.into(Documents).entries([document]);
            if (success) {
                return true;
            }
        }
        return false;
    };

    private onSearch = async (req: Request): Promise<any> => {
        const { text } = req.data;
        const embedder = new BTPEmbedding(aiCore.embed);
        const embeddings = await embedder.embedDocuments([text]);
        if (embeddings.length > 0) {
            const documents = await cds.run(
                `SELECT ID, TEXT, COSINE_SIMILARITY(EMBEDDING, TO_REAL_VECTOR('[${embeddings[0].toString()}]')) as "similarity"
                FROM "SAMPLE_DB_DOCUMENTS"
                ORDER BY "similarity" DESC LIMIT ?`,
                [2]
            );
            if (documents) {
                return documents.map((document: any) => ({
                    document: { ID: document.ID, text: document.TEXT },
                    similarity: document.similarity
                }));
            }
        }
        return [];
    };

    private onChatCompletion = async (req: Request): Promise<any> => {
        const { prompt } = req.data;
        const llm = new BTPAzureOpenAIChatLLM(aiCore.chatCompletion);
        const systemPrompt = new PromptTemplate({
            template: "Answer and talk like Sheldon Cooper\n",
            inputVariables: []
        });
        const systemMessagePrompt = new SystemMessagePromptTemplate({ prompt: systemPrompt });
        const humanMessagePrompt = HumanMessagePromptTemplate.fromTemplate("{prompt}");
        const chatPrompt = ChatPromptTemplate.fromMessages([systemMessagePrompt, humanMessagePrompt]);

        const chain = new LLMChain({
            llm: llm,
            prompt: chatPrompt,
            outputKey: "text"
        });

        const response = await chain.call({ prompt });
        return response.text;
    };
}
