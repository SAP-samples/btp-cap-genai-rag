import * as aiCore from "../ai-core-tooling";
import { Embeddings, EmbeddingsParams } from "langchain/embeddings/base";

export default class BTPAzureOpenAIEmbedding extends Embeddings {
    private tenant: string;

    constructor(tenant: string, params: EmbeddingsParams = {}) {
        super(params);
        this.tenant = tenant;
    }

    async embedDocuments(documents: string[]): Promise<number[][]> {
        return Promise.all(documents.map((doc: string) => this.embedQuery(doc)));
    }
    async embedQuery(text: string): Promise<number[]> {
        const result = await aiCore.embed(text, this.tenant);
        return result.embedding;
    }
}
