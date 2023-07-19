import { ApplicationService } from "@sap/cds";
import { Request } from "@sap/cds/apis/services";

export class PublicService extends ApplicationService {
    async init() {
        await super.init();

        this.on("userInfo", this.userInfo);
    }

    private userInfo = (req: Request) => {
        let results = {
            user: req.user.id,
            // @ts-ignore
            givenName: req?.req?.authInfo?.getGivenName() || "",
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
}
