import cds from "@sap/cds";
import { OpenAI as OpenAIClient } from "openai";
import { ResourceGroupApi } from "../vendor/AI_CORE_API";

interface AICoreApiHeaders extends Record<string, string> {
    "Content-Type": string;
    "AI-Resource-Group": string;
}

const AI_CORE_DESTINATION = "GENERATIVE_AI_HUB";
const RESOURCE_GROUP_ID = cds.env.requires["GENERATIVE_AI_HUB"]["RESOURCE_GROUP_ID"];
const API_VERSION = "2023-05-15";
enum DEPLOYMENTS {
    CHAT_COMPLETION = cds.env.requires["GENERATIVE_AI_HUB"]["DEPLOYMENTS"]["CHAT_COMPLETION"],
    EMBEDDING = cds.env.requires["GENERATIVE_AI_HUB"]["DEPLOYMENTS"]["EMBEDDING"]
}

// ***********************************************************************************************
// CHAT COMPLETION & EMBED HANDLING
// ***********************************************************************************************

/**
 * Use the chat completion api from Azure OpenAI services to make a completion call
 * @param {OpenAIClient.Chat.ChatCompletionCreateParamsNonStreaming} request - The messages for the chat completion
 * @param {Object} [LLMParams={}] - Additional parameters
 * @returns {Promise<OpenAIClient.Chat.Completions.ChatCompletion>} - The text completion
 */
export const chatCompletion = async (
    request: OpenAIClient.Chat.ChatCompletionCreateParamsNonStreaming,
    LLMParams: {} = {}
): Promise<OpenAIClient.Chat.Completions.ChatCompletion> => {
    const aiCoreService = await cds.connect.to(AI_CORE_DESTINATION);
    const payload: any = {
        messages: request.messages,
        max_tokens: 2000,
        temperature: 0.0,
        frequency_penalty: 0,
        presence_penalty: 0,
        stop: "null",
        ...LLMParams
    };
    const headers: AICoreApiHeaders = { "Content-Type": "application/json", "AI-Resource-Group": RESOURCE_GROUP_ID };
    const response: OpenAIClient.Chat.Completions.ChatCompletion = await aiCoreService.send({
        // @ts-ignore
        query: `POST /inference/deployments/${DEPLOYMENTS.CHAT_COMPLETION}/chat/completions?api-version=${API_VERSION}`,
        data: payload,
        headers: headers
    });

    return response;
};

/**
 * Use the embedding api from Azure OpenAI services to generate embeddings
 * @param {Array<string>} texts - The texts to embed
 * @param {Object} [EmbeddingParams={}] - Additional parameters
 * @returns {Promise<number[][]>} - The embeddings
 */
export const embed = async (texts: Array<string>, EmbeddingParams: {} = {}): Promise<number[][]> => {
    const aiCoreService = await cds.connect.to(AI_CORE_DESTINATION);
    const embeddings = await Promise.all(
        texts.map(async (text: string) => {
            const payload: any = {
                input: text,
                ...EmbeddingParams
            };
            const headers: AICoreApiHeaders = {
                "Content-Type": "application/json",
                "AI-Resource-Group": RESOURCE_GROUP_ID
            };
            const response: any = await aiCoreService.send({
                // @ts-ignore
                query: `POST /inference/deployments/${DEPLOYMENTS.EMBEDDING}/embeddings?api-version=${API_VERSION}`,
                data: payload,
                headers: headers
            });

            return response["data"][0]?.embedding;
        })
    );
    return embeddings;
};

/**
 * Checks and creates a default resource group if it doesn't exist.
 * e.g., default-ai-dev-sap-demo (Cloud Foundry) or default-ai-default-a1b2c3 (Kyma)
 * Default resource groups are required for local and hybrid testing scenarios
 * @returns {Promise<void>}
 */
export const checkDefaultResourceGroup = async (): Promise<void> => {
    try {
        const existingResourceGroups = await getResourceGroups();
        if (
            !existingResourceGroups?.find((resourceGroup: any) => resourceGroup.resourceGroupId === RESOURCE_GROUP_ID)
        ) {
            // Create SAP AI Core Default Resource Group artifacts
            console.log("Info: SAP AI Core Default Resource Group artifacts will be created");

            // Create AI Core Default Resource Group
            console.log(`Info: SAP AI Core Default Resource Group ${RESOURCE_GROUP_ID} will be created`);
            await createResourceGroup(RESOURCE_GROUP_ID);

            console.log(`Success: SAP AI Core Resource Group ${RESOURCE_GROUP_ID} artifacts created!`);
        }
    } catch (e: any) {
        console.log(`Error: Error during SAP AI Core Default Resource Group artifact creation.`);
        console.log(`Error: Check XSUAA and Destination Service Binding as well as SAP AI Core Destination.`);
        console.log(`Error: Restart CAP service to try again or create the Default Resource Group manually.`);
        console.log("Error: " + e?.message);
    }
};

/**
 * Fetches all resource groups from the SAP AI core instance
 * @returns {Promise<Array<any>>} The response of fetching all resource groups
 * @throws {Error} If an error occurs during fetching
 */
const getResourceGroups = async (): Promise<Array<any>> => {
    try {
        const response = await ResourceGroupApi.kubesubmitV4ResourcegroupsGetAll()
            .skipCsrfTokenFetching()
            .execute({ destinationName: AI_CORE_DESTINATION });
        return response.resources;
    } catch (e: any) {
        console.error(`Error: ${e?.message}`);
        return [];
    }
};

/**
 * Creates a new resource group in the AI core instance with the tenant id of the subscriber
 * @param {string} resourceGroupId - The resource group id of the subscriber
 * @returns {Promise<any>} The response of creation
 * @throws {Error} If an error occurs during creation
 */
const createResourceGroup = async (resourceGroupId: string): Promise<any> => {
    try {
        const response = await ResourceGroupApi.kubesubmitV4ResourcegroupsCreate({
            resourceGroupId: resourceGroupId
        })
            .skipCsrfTokenFetching()
            .execute({ destinationName: AI_CORE_DESTINATION });
        //@ts-ignore
        return response;
    } catch (e: any) {
        console.error(`Error: ${e?.message}`);
    }
};
