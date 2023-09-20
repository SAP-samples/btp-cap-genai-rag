import { ChatOpenAI, BaseChatModelParams } from "langchain/chat_models";
import * as aiCore from "../ai-core-tooling";
import { CreateChatCompletionRequest, CreateChatCompletionResponse } from "openai";

export default class BTPAzureOpenAIChatLLM extends ChatOpenAI {
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

    override async completionWithRetry(
        request: CreateChatCompletionRequest,
        options?: any
    ): Promise<CreateChatCompletionResponse> {
        return await aiCore.chatCompletion(request, this.tenant);
    }
}