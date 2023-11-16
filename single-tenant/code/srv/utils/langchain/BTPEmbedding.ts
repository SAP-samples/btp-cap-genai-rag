import { Embeddings, EmbeddingsParams } from "langchain/embeddings/base";

/**
 * A wrapper for SAP AI Core to handle interactions with the Embedding Models
 * @extends Embeddings
 */
export default class BTPEmbedding extends Embeddings {
    /**
     * The embed function that transforms documents into embeddings.
     * @private
     */
    private embed: (documents: string[], tenant?: string, EmbeddingParams?: {}) => Promise<number[][]>;
    /**
     * The tenant to be used for the embedding.
     * @private
     */
    private tenant: string;
    /**
     * The parameters to be passed to the embed function.
     * @private
     */
    private EmbeddingParams: {};

    /**
     * Creates an instance of BTPEmbedding.
     * @param {function} embed - The function that transforms documents into embeddings.
     * @param {string} tenant - The tenant to be used for the embedding. Defaults to "main".
     * @param {Object} EmbeddingParams - The parameters to be passed to the embed function. Defaults to an empty object.
     * @param {EmbeddingsParams} params - The parameters for the super class. Defaults to an empty object.
     */
    constructor(
        embed: (documents: string[], tenant?: string) => Promise<number[][]>,
        tenant: string = "main",
        EmbeddingParams: {} = {},
        params: EmbeddingsParams = {}
    ) {
        super(params);
        this.embed = embed;
        this.tenant = tenant;
        this.EmbeddingParams = EmbeddingParams;
    }

    /**
     * Embeds the given documents.
     * @param {string[]} documents - The documents to embed.
     * @returns {Promise<number[][]>} The embeddings of the documents.
     */
    async embedDocuments(documents: string[]): Promise<number[][]> {
        const embeddings = await this.embed(documents, this.tenant, this.EmbeddingParams);
        return embeddings;
    }

    /**
     * Embeds the given text.
     * @param {string} text - The text to embed.
     * @returns {Promise<number[]>} The embedding of the text.
     */
    async embedQuery(text: string): Promise<number[]> {
        const embeddings = await this.embedDocuments([text]);
        return embeddings[0];
    }
}
