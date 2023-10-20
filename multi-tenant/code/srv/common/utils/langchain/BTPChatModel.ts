import { CallbackManagerForLLMRun } from "langchain/dist/callbacks";
import { BaseMessage, ChatResult } from "langchain/dist/schema";
import * as aiCore from "../ai-core";
import { BaseChatModel, BaseChatModelCallOptions } from "langchain/dist/chat_models/base";

export default class BTPChatModel extends BaseChatModel {
    private chatCompletion: (messages: BaseMessage[], tenant?: string) => Promise<ChatResult>;
    private tenant: string;

    constructor(
        chatCompletion: (messages: BaseMessage[], tenant?: string) => Promise<ChatResult>,
        tenant: string,
        params: BaseChatModelCallOptions = {}
    ) {
        super(params);
        this.chatCompletion = chatCompletion;
        this.tenant = tenant;
    }

    _combineLLMOutput?(...llmOutputs: (Record<string, any> | undefined)[]): Record<string, any> | undefined {
        throw new Error("Method not implemented.");
    }
    _llmType(): string {
        return "SAP BTP Chat LLM Wrapper";
    }

    async _generate(
        messages: BaseMessage[],
        options: this["ParsedCallOptions"],
        runManager?: CallbackManagerForLLMRun | undefined
    ): Promise<ChatResult> {
        return await this.chatCompletion(messages, this.tenant);
    }
}
