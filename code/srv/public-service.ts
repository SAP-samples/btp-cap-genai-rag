import { ApplicationService } from "@sap/cds";
import { Request } from "@sap/cds/apis/services";

import { PromptTemplate } from "langchain/prompts";
import BTPAzureOpenAILLM from "./langchain/BTPAzureOpenAILLM";
import { LLMChain } from "langchain";
export class PublicService extends ApplicationService {
    async init() {
        await super.init();

        this.on("userInfo", this.userInfo);
        this.on("inference", this.inference);
    }

    private userInfo = (req: Request) => {
        let results = {
            user: req.user.id,
            locale: req.locale,
            tenant: req.tenant,
            scopes: {
                authenticated: req.user.is("authenticated-user"),
                identified: req.user.is("identified-user"),
                Member: req.user.is("Member"),
                Admin: req.user.is("Admin"),
                ExtendCDS: req.user.is("ExtendCDS"),
                ExtendCDSdelete: req.user.is("ExtendCDSdelete")
            }
        };

        return results;
    };

    private inference = async (req: Request) => {
        try {
            const { tenant } = req;
            const { prompt } = req.data;
            const llm = new BTPAzureOpenAILLM(tenant);

            const template = `Question: {question}
            
            Answer: Let's think step by step.`;

            const promptTemplate = PromptTemplate.fromTemplate(template);
            const llmChain = new LLMChain({ llm: llm, prompt: promptTemplate });
            const response = await llmChain.call({ question: prompt });
            return response;
        } catch (error: any) {
            console.error(`Error: ${error?.message}`);
        }
    };
}
