import { ChatOpenAI, ChatOpenAICallOptions } from "langchain/chat_models/openai";
import { OpenAICoreRequestOptions } from "langchain/dist/types/openai-types";
import { type OpenAI as OpenAIClient } from "openai";

/**
 * A wrapper for SAP AI Core to handle interactions with the Azure OpenAI Chat API
 * @extends ChatOpenAI
 */
export default class BTPAzureOpenAIChatLLM extends ChatOpenAI<ChatOpenAICallOptions> {
    private chatCompletion: (
        request: OpenAIClient.Chat.ChatCompletionCreateParamsNonStreaming
    ) => Promise<OpenAIClient.Chat.Completions.ChatCompletion>;

    /**
     * Constructs a new instance of BTPAzureOpenAIChatLLM
     * @param {Function} chatCompletion - A function to generate chat completions
     * @param {ChatOpenAICallOptions} params - Additional parameters for the OpenAI API
     */
    constructor(
        chatCompletion: (
            request: OpenAIClient.Chat.ChatCompletionCreateParamsNonStreaming
        ) => Promise<OpenAIClient.Chat.Completions.ChatCompletion>,
        tenant: string = "main",
        params: ChatOpenAICallOptions = {}
    ) {
        super({
            ...params,
            openAIApiKey: "dummy-key",
            streaming: false
        });
        this.chatCompletion = chatCompletion;
    }

    /**
     * Returns the type of this LLM instance
     * @returns {string} The type of the LLM
     */
    _llmType(): string {
        return "SAP BTP Azure OpenAI Chat LLM Wrapper";
    }

    /**
     * Provides chat completions with retry functionality
     * @param {OpenAIClient.Chat.ChatCompletionCreateParamsNonStreaming} request - The chat completion request
     * @param {OpenAICoreRequestOptions} options - Additional options for the request
     * @returns {Promise<OpenAIClient.Chat.Completions.ChatCompletion>} A promise that resolves to the chat completion
     */
    // @ts-ignore
    async completionWithRetry(
        request: OpenAIClient.Chat.ChatCompletionCreateParamsNonStreaming,
        options?: OpenAICoreRequestOptions
    ): Promise<OpenAIClient.Chat.Completions.ChatCompletion> {
        return await this.chatCompletion(request);
    }
}
