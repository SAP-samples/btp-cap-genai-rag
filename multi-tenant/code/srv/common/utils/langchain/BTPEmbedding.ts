import { Embeddings, EmbeddingsParams } from "langchain/embeddings/base";

export default class BTPAzureOpenAIEmbedding extends Embeddings {
    private embed: (documents: string[], tenant?: string, EmbeddingParams?: {}) => Promise<number[][]>;
    private tenant: string;
    private EmbeddingParams: {};

    constructor(
        embed: (documents: string[], tenant?: string) => Promise<number[][]>,
        tenant: string = "_main",
        EmbeddingParams: {} = {},
        params: EmbeddingsParams = {}
    ) {
        super(params);
        this.embed = embed;
        this.tenant = tenant;
        this.EmbeddingParams = EmbeddingParams;
    }

    async embedDocuments(documents: string[]): Promise<number[][]> {
        const embeddings = await this.embed(documents, this.tenant, this.EmbeddingParams);
        return embeddings;
    }
    async embedQuery(text: string): Promise<number[]> {
        const embeddings = await this.embedDocuments([text]);
        return embeddings[0];
    }
}
