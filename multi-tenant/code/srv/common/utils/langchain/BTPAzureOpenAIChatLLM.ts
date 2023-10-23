import { ChatOpenAI, ChatOpenAICallOptions } from "langchain/chat_models/openai";
import { OpenAICoreRequestOptions } from "langchain/dist/types/openai-types";
import { type ClientOptions, OpenAI as OpenAIClient } from "openai";

export default class BTPAzureOpenAIChatLLM extends ChatOpenAI<ChatOpenAICallOptions> {
    private chatCompletion: (
        request: OpenAIClient.Chat.ChatCompletionCreateParamsNonStreaming,
        tenant?: string
    ) => Promise<OpenAIClient.Chat.Completions.ChatCompletion>;
    private tenant: string;

    constructor(
        chatCompletion: (
            request: OpenAIClient.Chat.ChatCompletionCreateParamsNonStreaming,
            tenant?: string
        ) => Promise<OpenAIClient.Chat.Completions.ChatCompletion>,
        tenant: string = "_main",
        params: ChatOpenAICallOptions = {}
    ) {
        super({
            ...params,
            openAIApiKey: "dummy-key",
            streaming: false
            // azureOpenAIpi* need to be set since otherwise an error will be thrown
            /*azureOpenAIApiKey: "azureOpenAIApiKey",
            azureOpenAIApiDeploymentName: "azureOpenAIApiDeploymentName",
            azureOpenAIApiInstanceName: "azureOpenAIApiInstanceName",
            azureOpenAIApiVersion: "azureOpenAIApiVersion"
            */
        });
        this.chatCompletion = chatCompletion;
        this.tenant = tenant;
    }

    _llmType(): string {
        return "SAP BTP Azure OpenAI Chat LLM Wrapper";
    }

    // @ts-ignore
    async completionWithRetry(
        request: OpenAIClient.Chat.ChatCompletionCreateParamsNonStreaming,
        options?: OpenAICoreRequestOptions
    ): Promise<OpenAIClient.Chat.Completions.ChatCompletion> {
        return await this.chatCompletion(request, this.tenant);
    }
}
