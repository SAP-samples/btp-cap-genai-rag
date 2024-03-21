import cds from "@sap/cds";
import xsenv from "@sap/xsenv";
import { Request } from "@sap/cds/apis/services";

//@ts-ignore
import Automator from "../common/utils/automator";

/**
 * Abstract class Provisioning
 * Used to add custom logic to the Subscriber Tenant Provisioning Process
 * Extended by runtime specific classes Kyma and CloudFoundry
 */
abstract class Provisioning {
    /**
     * Register service events
     * @param {any} service - The service object
     */
    public register = (service: any) => {
        service.on("UPDATE", "tenant", this.subscribe);
        service.on("DELETE", "tenant", this.unsubscribe);

        service.on("upgradeTenant", this.upgradeTenant);
        service.on("dependencies", this.getDependencies);
    };

    /**
     * Subscribe to a tenant
     * @param {Request} req - The request object
     * @param {Function} next - The next middleware function
     * @returns {Promise<string>} The tenant URL
     */
    private subscribe = async (req: Request, next: Function) => {
        console.log("Subscription data:", JSON.stringify(req.data));

        const {
            subscribedSubdomain: subdomain,
            subscribedTenantId: tenant,
            subscriptionParams: params = {}
        } = req.data;

        console.log("Subscription Params: " + params);

        const { custSubdomain: custdomain = null } = params;
        const tenantURL = this.getTenantUrl(subdomain, custdomain);

        await next();

        try {
            const automator = new Automator(tenant, subdomain, custdomain);

            // Create Service Broker Registration, Destination, API Rule, Cloud Foundry Routes, ...
            await automator.deployTenantArtifacts();

            // Create AI Core Resource Group for tenant
            console.log("Info: SAP AI Core Resource Groups artifacts will be created for tenant");
        } catch (error: any) {
            console.error("Error: Automation skipped because of error during subscription");
            console.error(`Error: ${error.message}`);
        }
        return tenantURL;
    };

    /**
     * Unsubscribe from a tenant
     * @param {Request} req - The request object
     * @param {Function} next - The next middleware function
     * @returns {Promise<string>} The tenant ID
     */
    private unsubscribe = async (req: Request, next: Function) => {
        console.log("Unsubscribe Data: ", JSON.stringify(req.data));

        const { subscribedSubdomain: subdomain, subscribedTenantId: tenant } = req.data;
        await next();

        try {
            const automator = new Automator(tenant, subdomain);
            await automator.undeployTenantArtifacts();

            console.log("Success: Unsubscription completed!");
        } catch (error: any) {
            console.error("Error: Automation skipped because of error during unsubscription");
            console.error(`Error: ${error?.message}`);
        }
        return tenant;
    };

    /**
     * Upgrade a tenant
     * @param {Request} req - The request object
     * @param {Function} next - The next middleware function
     */
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

    /**
     * Get dependencies
     * @param {Request} req - The request object
     * @param {Function} next - The next middleware function
     * @returns {Promise<Array<any>>} The dependencies array
     */
    private getDependencies = async (_req: Request, next: Function) => {
        const initialDependencies: Array<any> = (await next()) || [];
        const services = xsenv.getServices({
            destination: { tag: "destination" },
            html5Runtime: { tag: "html5-apps-repo-rt" }
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

    /**
     * Abstract method to get tenant URL
     * @param {string} subdomain - The tenant subdomain
     * @param {string} [custdomain] - The tenant custom domain
     * @returns {string} The tenant URL
     */
    protected abstract getTenantUrl(subdomain: String, custdomain?: String): string;
}

/**
 * Pauses the execution for a specified time.
 *
 * @param {number} ms - The amount of time to delay in milliseconds.
 * @returns {Promise<void>} A promise that resolves after the specified delay.
 */
const delay = (ms: number) => new Promise((res: any) => setTimeout(res, ms));

/**
 * Kyma class extends Provisioning
 * Runtime specific methods and overwrites for SAP BTP, Kyma Runtime
 * @extends Provisioning
 */
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

/**
 * Cloud Foundry class extends Provisioning
 * Runtime specific methods and overwrites for SAP BTP, Cloud Foundry Runtime
 * @extends Provisioning
 */
class CloudFoundry extends Provisioning {
    protected getTenantUrl = (subdomain: String) => {
        return `https://${subdomain}${process.env.tenantSeparator}${process.env.appDomain}`;
    };
}

// Instantiate Provisioning/Subscription handler depending on Runtime Environment
// VCAP_APPLICATION environment variable only set in SAP BTP, Cloud Foundry Runtime
const handleTenantSubscription = process.env.VCAP_APPLICATION ? new CloudFoundry().register : new Kyma().register;

export { handleTenantSubscription };
