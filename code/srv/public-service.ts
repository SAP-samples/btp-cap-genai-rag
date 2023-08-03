import { ApplicationService } from "@sap/cds";
import { Request } from "@sap/cds/apis/services";

import * as aiCore from "./ai-core-tooling";
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
        const { tenant } = req;
        const prompt = "";
        return aiCore.completion(prompt, tenant);
    };
}
