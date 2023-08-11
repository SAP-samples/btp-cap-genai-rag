import * as aiCore from "../ai-core-tooling";
import { Embeddings, EmbeddingsParams } from "langchain/embeddings/base";

export default class BTPAzureOpenAIEmbedding extends Embeddings {
    private tenant: string;

    constructor(tenant: string, params: EmbeddingsParams = {}) {
        super(params);
        this.tenant = tenant;
    }

    async embedDocuments(documents: string[]): Promise<number[][]> {
        const embeddings = await aiCore.embed(documents, this.tenant);
        return embeddings;
    }
    async embedQuery(text: string): Promise<number[]> {
        const embeddings = await this.embedDocuments([text]);
        return embeddings[0];
    }
}
