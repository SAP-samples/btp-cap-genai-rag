import { Embeddings, EmbeddingsParams } from "langchain/embeddings/base";
import cds from "@sap/cds";

import * as aiCore from "../ai-core";

/**
 * A wrapper for SAP AI Core to handle interactions with the Embedding Models
 * @extends Embeddings
 */
export default class BTPEmbedding extends Embeddings {
    /**
     * The parameters to be passed to the embed function.
     * @private
     */
    private EmbeddingParams: {};

    private config: aiCore.GenerativeAIHubConfig = <aiCore.GenerativeAIHubConfig>{};

    /**
     * Creates an instance of BTPEmbedding.
     * @param {function} embed - The function that transforms documents into embeddings.
     * @param {string} tenant - The tenant to be used for the embedding. Defaults to "main".
     * @param {Object} EmbeddingParams - The parameters to be passed to the embed function. Defaults to an empty object.
     * @param {EmbeddingsParams} params - The parameters for the super class. Defaults to an empty object.
     */
    constructor({
        config = {},
        params = {}
    }: { config?: aiCore.GenerativeAIHubConfig; params?: EmbeddingsParams } = {}) {
        super(params);
        this.config = { ...this.config, ...config };
        this.EmbeddingParams = { ...this.EmbeddingParams, ...params };
    }

    /**
     * Embeds the given documents.
     * @param {string[]} documents - The documents to embed.
     * @returns {Promise<number[][]>} The embeddings of the documents.
     */
    async embedDocuments(documents: string[]): Promise<number[][]> {
        const resourceGroupId = this.config?.resourceGroupId || aiCore.getAppName();
        const deploymentId =
            this.config?.deploymentId || (await aiCore.getDeploymentId(resourceGroupId, aiCore.Tasks.EMBEDDING));
        if (deploymentId) {
            const aiCoreService = await cds.connect.to(this.config?.destination || aiCore.AI_CORE_DESTINATION);
            const embeddings = await Promise.all(
                documents.map(async (text: string) => {
                    const payload: any = {
                        input: text,
                        ...this.EmbeddingParams
                    };
                    const headers = { "Content-Type": "application/json", "AI-Resource-Group": resourceGroupId };
                    const response: any = await aiCoreService.send({
                        // @ts-ignore
                        query: `POST /inference/deployments/${deploymentId}/embeddings?api-version=${aiCore.API_VERSION}`,
                        data: payload,
                        headers: headers
                    });

                    return response["data"][0]?.embedding;
                })
            );
            return embeddings;
        } else {
            return [];
        }
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
