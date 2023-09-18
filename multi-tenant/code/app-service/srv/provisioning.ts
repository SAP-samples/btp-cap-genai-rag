import cds from "@sap/cds";
import xsenv from "@sap/xsenv";
import { Request } from "@sap/cds/apis/services";

import Automator from "./utils/automator";
import * as aiCore from "./tooling/ai-core-tooling";

const delay = (ms: number) => new Promise((res: any) => setTimeout(res, ms));

abstract class Provisioning {
    
    public register = (service: any) => {
        service.on("UPDATE", "tenant", this.subscribe);
        service.on("DELETE", "tenant", this.unsubscribe);
        service.on("upgradeTenant", this.upgradeTenant);
        service.on("dependencies", this.getDependencies);
    };

    private subscribe = async (req: Request, next: Function) => {
        console.log("Subscription data:", JSON.stringify(req.data));

        const {
            subscriptionAppName: appName,
            subscribedSubdomain: subdomain,
            subscribedTenantId: tenant,
            subscriptionParams: params = {}
        } = req.data;

        console.log("Subscription Params: " + params);

        const { custSubdomain: custdomain = null } = params;
        const tenantURL = this.getTenantUrl(subdomain, custdomain);

        await next();

        try {
            let automator = new Automator(tenant, subdomain, custdomain);
            await automator.deployTenantArtifacts();

            //@ts-ignore
            if (cds.env.requires.aicore?.createResourceGroups){
                console.log("Info: AI Core Resource Groups will be created");
                // Create AI Core Resource Group for tenant
                const resourceGroupId = `${tenant}-${appName}`;
                const resourceGroupCreationResponse = await aiCore.createResourceGroup(resourceGroupId);
                console.log(
                    `Resource Group ${resourceGroupCreationResponse?.resourceGroupId} for tenant ${resourceGroupCreationResponse?.tenantId} has been created successfully.`
                );

                await delay(10000);
                const headers = { "Content-Type": "application/json", "AI-Resource-Group": resourceGroupId };
                const responseConfigurationCreation = await aiCore.createConfiguration({}, headers);
                if (responseConfigurationCreation.id) {
                    await delay(5000);
                    await aiCore.createDeployment(responseConfigurationCreation.id, headers);
                    console.log("Success: Onboarding completed!");
                } else {
                    console.log("Failed: Error during onboarding - Configuration not created well!");
                }
            }else{
                console.log("Info: AI Core Resource Groups will not be created");
                console.log("Success: Onboarding completed!");
            }
        } catch (error: any) {
            console.error("Error: Automation skipped because of error during subscription");
            console.error(`Error: ${error.message}`);
        }

        return tenantURL;
    };

    private unsubscribe = async (req: Request, next: Function) => {
        console.log("Unsubscribe Data: ", JSON.stringify(req.data));

        const { subscriptionAppName: appName, subscribedSubdomain: subdomain, subscribedTenantId: tenant } = req.data;

        await next();

        try {
            let automator = new Automator(tenant, subdomain);
            await automator.undeployTenantArtifacts();

            //@ts-ignore
            if (cds.env.requires.aicore?.createResourceGroups){
                // Delete AI Core Resource Group for tenant
                const resourceGroupId = `${tenant}-${appName}`;
                const response = await aiCore.deleteResourceGroup(resourceGroupId);
                console.log(`Resource Group ${resourceGroupId} deleted successfully.`, response);
            }

            console.log("Success: Unsubscription completed!");
        } catch (error: any) {
            console.error("Error: Automation skipped because of error during unsubscription");
            console.error(`Error: ${error?.message}`);
        }
        return tenant;
    };

    private upgradeTenant = async (req: Request, next: Function) => {
        await next();
        const { instanceData, deploymentOptions } = cds.context.http?.req?.body || {};
        console.log(
            "UpgradeTenant:",
            req.data.subscribedTenantId,
            req.data.subscribedSubdomain,
            instanceData,
            deploymentOptions
        );
    };

    private getDependencies = async (_req: Request, next: Function) => {
        const initialDependencies: Array<any> = (await next()) || [];
        const services = xsenv.getServices({
            destination: { tag: "destination" },
            html5Runtime: { tag: 'html5-apps-repo-rt' }
        });
        const dependencies = initialDependencies.concat([
            // @ts-ignore
            { xsappname: services.destination.xsappname },
            // @ts-ignore
            { xsappname: services.html5Runtime.uaa.xsappname }
        ]);

        console.log("SaaS Dependencies:", JSON.stringify(dependencies));
        return dependencies;
    };

    protected abstract getTenantUrl(subdomain: String, custdomain?: String): string;
}

class Kyma extends Provisioning {
    protected getTenantUrl = (subdomain: String, custdomain: String) => {
        if (custdomain && custdomain !== "") {
            console.log(`Custom subdomain - ${custdomain} - used for tenant Url!`);
            return "https://" + `${custdomain}.${process.env["CLUSTER_DOMAIN"]}`;
        } else {
            return (
                "https://" +
                `${subdomain}-${process.env["ROUTER_NAME"]}-${process.env["KYMA_NAMESPACE"]}.${process.env["CLUSTER_DOMAIN"]}`
            );
        }
    };
}

class CloudFoundry extends Provisioning {
    protected getTenantUrl = (subdomain: String) => {
        return `https://${subdomain}${process.env.tenantSeparator}${process.env.appDomain}`;
    };
}

const handleTenantSubscription = process.env.VCAP_APPLICATION ? new CloudFoundry().register : new Kyma().register;
export { handleTenantSubscription };
