import cds from "@sap/cds";
import xsenv from "@sap/xsenv";
import { Request } from "@sap/cds/apis/services";
import { DestinationSelectionStrategies } from "@sap-cloud-sdk/connectivity";
import { ResourceGroupApi } from "./vendor/AI_CORE_API";
import Automator from "./utils/automator";

const AI_CORE_DESTINATION = "PROVIDER_AI_CORE_DESTINATION";

export default (service: any) => {
    console.log("INITIALIZING SUBSCRIPTION SERVICE");
    service.on("UPDATE", "tenant", subscribe);
    service.on("DELETE", "tenant", unsubscribe);
    service.on("upgradeTenant", upgradeTenant);
    service.on("dependencies", getDependencies);
    console.log("INITIALIZED SUBSCRIPTION SERVICE");
};

const subscribe = async (req: Request, next: Function) => {
    console.log("Subscription data:", JSON.stringify(req.data));

    const { subscribedSubdomain: subdomain, subscribedTenantId: tenant, subscribedZoneId: _zone } = req.data;
    const tenantURL = `https://${subdomain}${process.env.tenantSeparator}${process.env.appDomain}`;

    await next();

    // Trigger tenant broker deployment on background
    //cds.spawn({ tenant: tenant }, async (_tx) => {
    try {
        let automator = new Automator();
        await automator.deployTenantArtifacts(tenant, subdomain);

        // Create AI Core Resource Group for tenant
        const resourceGroupCreationResponse = await createResourceGroup(tenant);
        console.log(
            `Resource Group ${resourceGroupCreationResponse?.resourceGroupId} on tenant ${resourceGroupCreationResponse?.tenantId} in zone ${resourceGroupCreationResponse?.zoneId} has been created successfully.`
        );
        const resourceGroups = await getResourceGroups();
        console.log(`Resource Groups: ${JSON.stringify(resourceGroups)}`);

        console.log("Success: Onboarding completed!");
    } catch (error: any) {
        console.error("Error: Automation skipped because of error during subscription");
        console.error(`Error: ${error.message}`);
    }
    //});
    return tenantURL;
};

const unsubscribe = async (req: Request, next: Function) => {
    console.log("Unsubscribe Data: ", JSON.stringify(req.data));

    const { subscribedSubdomain: subdomain, subscribedTenantId: tenant } = req.data;

    await next();

    try {
        let automator = new Automator();
        await automator.undeployTenantArtifacts(tenant, subdomain);

        // Delete AI Core Resource Group for tenant
        await deleteResourceGroup(tenant);
        console.log(`Resource Group ${tenant} deleted successfully.`);
        let resourceGroups = await getResourceGroups();
        console.log("Resource Groups: " + JSON.stringify(resourceGroups));

        console.log("Success: Unsubscription completed!");
    } catch (error: any) {
        console.error("Error: Automation skipped because of error during unsubscription");
        console.error(`Error: ${error?.message}`);
    }
    return tenant;
};

const upgradeTenant = async (req: Request, next: Function) => {
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
const getDependencies = async (_req: Request, next: Function) => {
    const dependencies: Array<{ xsappname: string }> = await next();
    const services = xsenv.getServices({
        html5Runtime: { tag: "html5-apps-repo-rt" },
        destination: { tag: "destination" }
    });
    dependencies.concat([
        // @ts-ignore
        { xsappname: services.html5Runtime.uaa.xsappname },
        // @ts-ignore
        { xsappname: services.destination.xsappname }
    ]);

    console.log("SaaS Dependencies:", JSON.stringify(dependencies));
    return dependencies;
};

/**
 * creates a new resource group in the ai core instance with the id of the zone
 * @param {*} resourceGroupId: the zoneId of the subscriber (subscribedZoneId)
 * @returns response of creation
 */
const createResourceGroup = async (resourceGroupId: string) => {
    try {
        const response = await ResourceGroupApi.kubesubmitV4ResourcegroupsCreate({
            resourceGroupId: resourceGroupId
        })
            .skipCsrfTokenFetching()
            .execute({
                selectionStrategy: DestinationSelectionStrategies.alwaysProvider,
                destinationName: AI_CORE_DESTINATION
            });
        //@ts-ignore
        return response;
    } catch (e: any) {
        console.log(e.message);
    }
};

/**
 * deletes the resource group in the ai core instance with the id of the zone
 * @param {*} resourceGroupId
 * @returns response of deletion
 */
const deleteResourceGroup = async (resourceGroupId: string) => {
    try {
        const response = await ResourceGroupApi.kubesubmitV4ResourcegroupsDelete(resourceGroupId)
            .skipCsrfTokenFetching()
            .execute({
                selectionStrategy: DestinationSelectionStrategies.alwaysProvider,
                destinationName: AI_CORE_DESTINATION
            });
        return response;
    } catch (e: any) {
        console.log(e.message);
    }
};

/**
 * fetches all resource groups from the ai core instance
 * @returns response of fetching all resource groups
 */
const getResourceGroups = async () => {
    try {
        const response = await ResourceGroupApi.kubesubmitV4ResourcegroupsGetAll().skipCsrfTokenFetching().execute({
            destinationName: AI_CORE_DESTINATION,
            selectionStrategy: DestinationSelectionStrategies.alwaysProvider
        });
        return response.data;
    } catch (e: any) {
        console.log(e.message);
    }
};
