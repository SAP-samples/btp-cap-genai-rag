import { BaseLLMParams, LLM } from "langchain/llms/base";

export default class BTPLLM extends LLM {
    private tenant: string;
    private completion: (prompt: string, tenant?: string, LLMParams?: {}) => Promise<string>;
    private LLMParams: {};

    constructor(
        completion: (prompt: string, tenant?: string) => Promise<string>,
        tenant?: string,
        LLMParams: {} = {},
        params: BaseLLMParams = {}
    ) {
        super(params);
        this.completion = completion;
        //@ts-ignore
        this.tenant = tenant;
        this.LLMParams = LLMParams;
    }

    _llmType(): string {
        return "SAP BTP LLM Wrapper";
    }

    async _call(prompt: string): Promise<string> {
        const result = await this.completion(prompt, this.tenant, this.LLMParams);
        // metering would be possible here
        return result;
    }
}