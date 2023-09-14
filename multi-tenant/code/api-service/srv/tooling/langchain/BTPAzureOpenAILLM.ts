import { BaseLLMParams, LLM } from "langchain/llms/base";
import * as aiCore from "../ai-core-tooling";

export default class BTPAzureOpenAILLM extends LLM {
    private tenant: string;

    constructor(tenant: string, params: BaseLLMParams = {}) {
        super(params);
        this.tenant = tenant;
    }

    _llmType(): string {
        return "SAP BTP Azure OpenAI LLM Wrapper";
    }

    async _call(prompt: string): Promise<string> {
        const result = await aiCore.completion(prompt, this.tenant);
        // metering would be possible here
        return result.text;
    }
}
