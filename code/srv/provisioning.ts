import cds from "@sap/cds";
import xsenv from "@sap/xsenv";
import { Request } from "@sap/cds/apis/services";
import { DestinationSelectionStrategies } from "@sap-cloud-sdk/connectivity";

import { ConfigurationApi, ConfigurationBaseData, DeploymentApi, ResourceGroupApi } from "./vendor/AI_CORE_API";
import Automator from "./utils/automator";

const AI_CORE_DESTINATION = "PROVIDER_AI_CORE_DESTINATION";

const SCENARIO_ID = "my-azure-openai-scenario";
const CONFIGURATION_NAME = "my-azure-openai-configuration";
const EXECUTABLE_ID = "my-azure-openai-proxy";
const VERSION_ID = "1.0";

interface AICoreApiHeaders extends Record<string, string> {
    "Content-Type": string;
    "AI-Resource-Group": string;
}

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

            // Create AI Core Resource Group for tenant
            const resourceGroupId = `${tenant}-${appName}`;
            const resourceGroupCreationResponse = await createResourceGroup(resourceGroupId);
            console.log(
                `Resource Group ${resourceGroupCreationResponse?.resourceGroupId} for tenant ${resourceGroupCreationResponse?.tenantId} has been created successfully.`
            );

            const headers = { "Content-Type": "application/json", "AI-Resource-Group": resourceGroupId };
            const responseConfigurationCreation = await createConfiguration(
                {
                    name: CONFIGURATION_NAME,
                    executableId: EXECUTABLE_ID,
                    scenarioId: SCENARIO_ID,
                    versionId: VERSION_ID
                },
                headers
            );
            if (responseConfigurationCreation.id) {
                await createDeployment(responseConfigurationCreation.id, headers);
                console.log("Success: Onboarding completed!");
            } else {
                console.log("Failed: Error during onboarding - Configuration not created well!");
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

            // Delete AI Core Resource Group for tenant
            const resourceGroupId = `${tenant}-${appName}`;
            const response = await deleteResourceGroup(resourceGroupId);
            console.log(`Resource Group ${resourceGroupId} deleted successfully.`, response);

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
            destination: { tag: "destination" }
        });
        const dependencies = initialDependencies.concat([
            // @ts-ignore
            { xsappname: services.destination.xsappname }
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

/**
 * creates a new resource group in the ai core instance with the id of the zone
 * @param {*} resourceGroupId: the zoneId of the subscriber (subscribedZoneId)
 * @returns response of creation
 */
const createResourceGroup = async (resourceGroupId: string) => {
    try {
        // CREATE RESOURCE GROUP
        const response = await ResourceGroupApi.kubesubmitV4ResourcegroupsCreate({
            resourceGroupId: resourceGroupId
        })
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

/**
 * CREATE CONFIGURATION IN RESOURCE GROUP
 * @param configurationId
 * @param headers
 */
const createConfiguration = async (configuration: ConfigurationBaseData, headers: AICoreApiHeaders) => {
    //{ id: '2363ebb7-1649-4de1-aa4d-bddec257c100', message: 'Configuration created' }
    const responseConfigurationCreation = await ConfigurationApi.configurationCreate({
        ...configuration,
        parameterBindings: [
            {
                key: "azureDeploymentURL",
                value: "https://paa-gpt-01.openai.azure.com/openai/deployments/BTP-AUDIT-LOG/chat/completions?api-version=2023-05-15"
            }
        ]
    })
        .skipCsrfTokenFetching()
        .addCustomHeaders(headers)
        .execute({ destinationName: AI_CORE_DESTINATION });
    return responseConfigurationCreation;
};

const createDeployment = async (configurationId: string, headers: AICoreApiHeaders) => {
    const responseDeploymentCreation = await DeploymentApi.deploymentCreate({
        configurationId: configurationId
    })
        .skipCsrfTokenFetching()
        .addCustomHeaders(headers)
        .execute({ destinationName: AI_CORE_DESTINATION });
    console.log("Deployment creation response:", responseDeploymentCreation);

    const responseDeploymentQuery = await DeploymentApi.deploymentQuery({
        scenarioId: SCENARIO_ID,
        //    status: "RUNNING",
        $top: 1
    })
        .skipCsrfTokenFetching()
        .addCustomHeaders(headers)
        .execute({ destinationName: AI_CORE_DESTINATION });
    console.log("Deployment query resp:", responseDeploymentQuery);
    return responseDeploymentCreation;
};
