import { ChatOpenAI } from "langchain/chat_models/openai";
import { BaseChatModelParams } from "langchain/chat_models/base";
import * as aiCore from "../ai-core-tooling";
import { OpenAI as OpenAIClient } from "openai";

export default class BTPAzureOpenAIChatLLM extends ChatOpenAI  {
    private tenant: string;

    constructor(tenant: string, params: BaseChatModelParams = {}) {
        super({
            ...params,
            openAIApiKey: "dummy-key"
            // azureOpenAIpi* need to be set since otherwise an error will be thrown
            /*azureOpenAIApiKey: "azureOpenAIApiKey",
            azureOpenAIApiDeploymentName: "azureOpenAIApiDeploymentName",
            azureOpenAIApiInstanceName: "azureOpenAIApiInstanceName",
            azureOpenAIApiVersion: "azureOpenAIApiVersion"
            */
        });
        this.tenant = tenant;
    }

    _llmType(): string {
        return "SAP BTP Azure OpenAI Chat LLM Wrapper";
    }

    async completionWithRetry(
        request: OpenAIClient.Chat.ChatCompletionCreateParamsStreaming,
        options?: any
      ): Promise<AsyncIterable<OpenAIClient.Chat.Completions.ChatCompletionChunk>>;
    
      async completionWithRetry(
        request: OpenAIClient.Chat.ChatCompletionCreateParamsNonStreaming,
        options?: any
      ): Promise<OpenAIClient.Chat.Completions.ChatCompletion>;
    
      async completionWithRetry(
        request:
          | OpenAIClient.Chat.ChatCompletionCreateParamsStreaming
          | OpenAIClient.Chat.ChatCompletionCreateParamsNonStreaming,
        options?: any
      ): Promise<
        | AsyncIterable<OpenAIClient.Chat.Completions.ChatCompletionChunk>
        | OpenAIClient.Chat.Completions.ChatCompletion
      > {
        return await aiCore.chatCompletion(request, this.tenant);
      }
    
}