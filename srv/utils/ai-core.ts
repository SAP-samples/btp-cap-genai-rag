import xsenv from "@sap/xsenv";

import {
    ConfigurationApi,
    AiConfigurationCreationResponse,
    AiConfigurationBaseData,
    ResourceGroupApi,
    AiApiError,
    DeploymentApi,
    AiDeploymentCreationRequest,
    AiDeploymentCreationResponse
} from "@sap-ai-sdk/ai-api";

interface ResourceGroupHeader {
    "AI-Resource-Group": string;
}

/**
 * Checks and creates a default resource group if it doesn't exist.
 * Default resource groups are required for local and hybrid testing scenarios
 * @returns {Promise<void>}
 */
export const checkOrPrepareDeployments = async (resourceGroupId: string): Promise<void> => {
    try {
        const resourceGroups = await getResourceGroups();
        if (!resourceGroups.find((resourceGroup: any) => resourceGroup.resourceGroupId === resourceGroupId)) {
            // Create SAP AI Core Default Resource Group artifacts
            console.log("Info: SAP AI Core Default Resource Group artifacts will be created");

            // Create AI Core Default Resource Group
            console.log(`Info: SAP AI Core Default Resource Group ${resourceGroupId} will be created`);
            await createResourceGroup(resourceGroupId);
            await delay(10000);

            const header: ResourceGroupHeader = { "AI-Resource-Group": resourceGroupId };
            const configurations: Array<AiConfigurationCreationResponse> = await createConfigurations(header);
            await delay(10000);
            const deployments = await createDeployments(configurations, header);

            console.log(
                "Resource Group and Configurations created successfully. Models deployments have been started:",
                deployments
            );
        }
    } catch (e: any) {
        console.log("Error: " + e?.message);
    }
};

/**
 * Gets the application name
 * @returns {string} - The application identifier
 */
export const getAppName = (): string => {
    const xsuaaService = xsenv.getServices({ xsuaa: { tag: "xsuaa" } }).xsuaa as any;
    const appName = xsuaaService?.xsappname?.split("!t")[0];

    // Comply with SAP AI Core Resource Group naming requirements (only a-z and 0-9 and "-")
    return appName
        ?.toLowerCase()
        .replace(/[^a-z0-9-]/g, "")
        .replace(/^(-*)|(-*)$/g, "");
};

/**
 * Creates a new resource group in the AI core instance for the application
 * @param {string} resourceGroupId - The application's resource group id
 * @returns {Promise<any>} The response of creation
 * @throws {Error} If an error occurs during creation
 */
const createResourceGroup = async (resourceGroupId: string): Promise<any> => {
    try {
        const response = await ResourceGroupApi.kubesubmitV4ResourcegroupsCreate({
            resourceGroupId: resourceGroupId
        }).execute();
        //@ts-ignore
        return response;
    } catch (e: any) {
        console.error(`Error: ${e?.message}`);
    }
};

/**
 * Fetches all resource groups from the SAP AI core instance
 * @returns {Promise<Array<any>>} The response of fetching all resource groups
 * @throws {Error} If an error occurs during fetching
 */
const getResourceGroups = async (): Promise<Array<any>> => {
    try {
        const response = await ResourceGroupApi.kubesubmitV4ResourcegroupsGetAll().execute();
        return response.resources;
    } catch (e: any) {
        console.error(`Error: ${e?.message}`);
        return [];
    }
};

const createConfigurations = async (header: ResourceGroupHeader): Promise<Array<AiConfigurationCreationResponse>> => {
    try {
        // Create gpt-4o Configuration
        const requestBodyChatModel: AiConfigurationBaseData = {
            name: "gpt-4o",
            executableId: "azure-openai",
            scenarioId: "foundation-models",
            parameterBindings: [
                {
                    key: "modelName",
                    value: "gpt-4o"
                },
                {
                    key: "modelVersion",
                    value: "latest"
                }
            ],
            inputArtifactBindings: []
        };

        const responseDataChatModel = ConfigurationApi.configurationCreate(requestBodyChatModel, header).execute();

        // Create text-embedding-3-small Configuration
        const requestBodyEmbeddingModel: AiConfigurationBaseData = {
            name: "text-embedding-3-small",
            executableId: "azure-openai",
            scenarioId: "foundation-models",
            parameterBindings: [
                {
                    key: "modelName",
                    value: "text-embedding-3-small"
                },
                {
                    key: "modelVersion",
                    value: "latest"
                }
            ],
            inputArtifactBindings: []
        };

        const responseDataEmbeddingModel = ConfigurationApi.configurationCreate(
            requestBodyEmbeddingModel,
            header
        ).execute();

        const configurationResponses: Array<AiConfigurationCreationResponse> = await Promise.all([
            responseDataChatModel,
            responseDataEmbeddingModel
        ]);
        return configurationResponses;
    } catch (errorData) {
        const apiError = (errorData as any).response.data.error as AiApiError;
        console.error("Status code:", (errorData as any).response.status);
        throw new Error(`Configuration creation failed: ${apiError.message}`);
    }
};

const createDeployments = async (
    configurations: Array<AiConfigurationCreationResponse>,
    header: ResourceGroupHeader
): Promise<Array<AiDeploymentCreationResponse>> => {
    try {
        return await Promise.all(
            configurations.map((configuration: AiConfigurationCreationResponse) => {
                const requestBody: AiDeploymentCreationRequest = {
                    configurationId: configuration.id
                };
                return DeploymentApi.deploymentCreate(requestBody, header).execute();
            })
        );
    } catch (errorData) {
        const apiError = (errorData as any).response.data.error as AiApiError;
        console.error("Status code:", (errorData as any).response.status);
        throw new Error(`Deployment creation failed: ${apiError.message}`);
    }
};

/**
 * Pauses the execution for a specified time.
 *
 * @param {number} ms - The amount of time to delay in milliseconds.
 * @returns {Promise<void>} A promise that resolves after the specified delay.
 */
const delay = (ms: number): Promise<void> => new Promise((res: any) => setTimeout(res, ms));
