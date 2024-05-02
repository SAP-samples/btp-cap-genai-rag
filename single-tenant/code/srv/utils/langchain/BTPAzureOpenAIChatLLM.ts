import { ChatOpenAICallOptions } from "langchain/chat_models/openai";
import { type OpenAI as OpenAIClient } from "openai";

import { SimpleChatModel } from "langchain/chat_models/base";
import { BaseMessage } from "langchain/schema";
import { CallbackManagerForLLMRun } from "langchain/callbacks";
import cds from "@sap/cds";
import * as aiCore from "../ai-core";

interface BTPChatOpenAICallOptions extends ChatOpenAICallOptions {
    max_tokens?: number;
    temperature?: number;
    frequency_penalty?: number;
    presence_penalty?: number;
}

/**
 * A wrapper for SAP AI Core to handle interactions with the Azure OpenAI Chat API
 * @extends SimpleChatModel
 */
export default class BTPAzureBaseChatLLM extends SimpleChatModel<ChatOpenAICallOptions> {
    private params: BTPChatOpenAICallOptions = {
        max_tokens: 2000,
        temperature: 0.0,
        frequency_penalty: 0,
        presence_penalty: 0,
        stop: ["null"]
    };
    private config: aiCore.GenerativeAIHubConfig = <aiCore.GenerativeAIHubConfig>{};

    /**
     * Constructs a new instance of BTPAzureOpenAIChatLLM
     * @param {BTPIds} config - resourceGroupId, deploymentId and destination
     * @param {BTPChatOpenAICallOptions} params - Additional parameters for the OpenAI API
     */
    constructor({
        config = {},
        params = <BTPChatOpenAICallOptions>{}
    }: {
        config?: aiCore.GenerativeAIHubConfig;
        params?: BTPChatOpenAICallOptions;
    } = {}) {
        super({
            ...params
        });
        this.config = { ...this.config, ...config };
        this.params = { ...this.params, ...params };
    }

    /**
     * Handles call() function, handles interaction with OpenAI
     * @param {BaseMessage[]} messages - Prompt for GPT
     * @param {this} options - ?
     * @param {CallbackManagerForLLMRun} runManager - ?
     *
     * @return {string} - Response from OpenAI
     */
    async _call(
        messages: BaseMessage[],
        _options?: this["ParsedCallOptions"],
        _runManager?: CallbackManagerForLLMRun
    ): Promise<string> {
        const resourceGroupId = this.config?.resourceGroupId || aiCore.getAppName();
        const deploymentId =
            this.config?.deploymentId || (await aiCore.getDeploymentId(resourceGroupId, aiCore.Tasks.CHAT));
        if (deploymentId) {
            const aiCoreService = await cds.connect.to(this.config?.destination || aiCore.AI_CORE_DESTINATION);
            const payload: any = {
                messages: [
                    {
                        role: "system",
                        content: messages[0].content
                    },
                    {
                        role: "user",
                        content: messages[1].content
                    }
                ],
                ...this.params
            };
            const headers = { "Content-Type": "application/json", "AI-Resource-Group": resourceGroupId };
            const response: OpenAIClient.Chat.Completions.ChatCompletion = await aiCoreService.send({
                // @ts-ignore
                query: `POST /inference/deployments/${deploymentId}/chat/completions?api-version=${aiCore.API_VERSION}`,
                data: payload,
                headers: headers
            });
            return response?.choices[0].message?.content || "";
        } else {
            // @ts-ignore
            return null;
        }
    }

    _llmType(): string {
        return "SAP BTP Azure OpenAI Chat LLM Wrapper";
    }

    _combineLLMOutput(): any {}
}
