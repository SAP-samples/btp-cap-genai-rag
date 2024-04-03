import cds from "@sap/cds";
import xsenv from "@sap/xsenv";
import { HttpResponse } from "@sap-cloud-sdk/http-client";
import { executeHttpRequest } from "@sap-cloud-sdk/http-client";
import { decodeJwt } from "@sap-cloud-sdk/connectivity";
import { OpenAI as OpenAIClient } from "openai";
import { Service, Destination, DestinationSelectionStrategies } from "@sap-cloud-sdk/connectivity";

import { DeploymentApi, ResourceGroupApi, ConfigurationApi, ConfigurationBaseData } from "../vendor/AI_CORE_API";

interface AICoreApiHeaders extends Record<string, string> {
    "Content-Type": string;
    "AI-Resource-Group": string;
}

// SAP AI Core Destination to be used
const AI_CORE_DESTINATION = process.env["AI_CORE_DESTINATION"] || "PROVIDER_AI_CORE_DESTINATION_HUB";

// Azure OpenAI API version being used
const API_VERSION = process.env["AI_CORE_API_VERSION"] || "2023-05-15";

// SAP AI Core Artifact Details deployed in Resource Group
const SCENARIO_ID = process.env["AI_CORE_SCENARIO_ID"] || "foundation-models";
const EXECUTABLE_ID = process.env["AI_CORE_EXECUTABLE_ID"] || "azure-openai";
const VERSION_ID = process.env["AI_CORE_VERSION_ID"] || "0.0.1";
const CONFIGURATIONS = process.env["AI_CORE_CONFIGURATIONS"]
    ? JSON.parse(process.env["AI_CORE_CONFIGURATIONS"])
    : [
          {
              name: "gpt-4config",
              parameters: [
                  {
                      key: "modelName",
                      value: "gpt-4"
                  },
                  {
                      key: "modelVersion",
                      value: "0613"
                  }
              ]
          },
          {
              name: "text-embedding-ada-002-config",
              parameters: [
                  {
                      key: "modelName",
                      value: "text-embedding-ada-002"
                  },
                  {
                      key: "modelVersion",
                      value: "2"
                  }
              ]
          }
      ];

// SAP AI Core Configurations to be used for different Tasks
enum Tasks {
    CHAT = "gpt-4-config",
    COMPLETION = "gpt-4-config",
    EMBEDDING = "text-embedding-ada-002-config"
}

// ***********************************************************************************************
// COMPLETION & EMBED HANDLING
// ***********************************************************************************************

/**
 * Use the chat completion api from Azure OpenAI services to make a completion call
 * @param {string} prompt - The text to be completed
 * @param {Object} [LLMParams={}] - Additional parameters
 * @returns {Promise<string>} - The text completion
 */
export const completion = async (prompt: string, LLMParams: {} = {}): Promise<string> => {
    const resourceGroupId = getAppName();
    const deploymentId = await getDeploymentId(resourceGroupId, Tasks.COMPLETION);

    if (deploymentId) {
        const aiCoreService = await cds.connect.to(AI_CORE_DESTINATION);
        const payload: any = {
            messages: [{ role: "user", content: prompt }],
            max_tokens: 2000,
            temperature: 0.0,
            frequency_penalty: 0,
            presence_penalty: 0,
            stop: "null",
            ...LLMParams
        };
        const headers = { "Content-Type": "application/json", "AI-Resource-Group": resourceGroupId };
        const response: any = await aiCoreService.send({
            // @ts-ignore
            query: `POST /inference/deployments/${deploymentId}/chat/completions?api-version=${API_VERSION}`,
            data: payload,
            headers: headers
        });

        return response["choices"][0]?.message?.content;
    } else {
        return `No deployment found for the resource group ${resourceGroupId}`;
    }
};

/**
 * Use the chat completion api from Azure OpenAI services to make a completion call
 * @param {OpenAIClient.Chat.ChatCompletionCreateParamsNonStreaming} request - The messages for the chat completion
 * @param {Object} [LLMParams={}] - Additional parameters
 * @returns {Promise<OpenAIClient.Chat.Completions.ChatCompletion>} - The text completion
 */
export const chatCompletion = async (
    request: OpenAIClient.Chat.ChatCompletionCreateParamsNonStreaming,
    LLMParams: {} = {}
): Promise<OpenAIClient.Chat.Completions.ChatCompletion> => {
    const resourceGroupId = getAppName();
    const deploymentId = await getDeploymentId(resourceGroupId, Tasks.CHAT);
    if (deploymentId) {
        const aiCoreService = await cds.connect.to(AI_CORE_DESTINATION);
        const payload: any = {
            messages: request.messages,
            max_tokens: 2000,
            temperature: 0.0,
            frequency_penalty: 0,
            presence_penalty: 0,
            stop: "null",
            ...LLMParams
        };
        const headers = { "Content-Type": "application/json", "AI-Resource-Group": resourceGroupId };
        const response: OpenAIClient.Chat.Completions.ChatCompletion = await aiCoreService.send({
            // @ts-ignore
            query: `POST /inference/deployments/${deploymentId}/chat/completions?api-version=${API_VERSION}`,
            data: payload,
            headers: headers
        });

        return response;
    } else {
        // @ts-ignore
        return null;
    }
};

/**
 * Use the embedding api from Azure OpenAI services to generate embeddings
 * @param {Array<string>} texts - The texts to embed
 * @param {Object} [EmbeddingParams={}] - Additional parameters
 * @returns {Promise<number[][]>} - The embeddings
 */
export const embed = async (texts: Array<string>, EmbeddingParams: {} = {}): Promise<number[][]> => {
    const resourceGroupId = getAppName();
    const deploymentId = await getDeploymentId(resourceGroupId, Tasks.EMBEDDING);
    if (deploymentId) {
        const aiCoreService = await cds.connect.to(AI_CORE_DESTINATION);

        const embeddings = await Promise.all(
            texts.map(async (text: string) => {
                const payload: any = {
                    input: text,
                    ...EmbeddingParams
                };
                const headers = { "Content-Type": "application/json", "AI-Resource-Group": resourceGroupId };
                const response: any = await aiCoreService.send({
                    // @ts-ignore
                    query: `POST /inference/deployments/${deploymentId}/embeddings?api-version=${API_VERSION}`,
                    data: payload,
                    headers: headers
                });

                return response["data"][0]?.embedding;
            })
        );
        return embeddings;
    } else {
        return [];
    }
};

/**
 * Checks and creates a default resource group if it doesn't exist.
 * e.g., default-aisaas-dev-sap-demo (Cloud Foundry) or default-aisaas-default-a1b2c3 (Kyma)
 * Default resource groups are required for local and hybrid testing scenarios
 * @returns {Promise<void>}
 */
export const checkDefaultResourceGroup = async (): Promise<void> => {
    try {
        // Comply with SAP AI Core Resource Group naming requirements
        const resourceGroupId = getAppName();

        if (
            !(await getResourceGroups())?.find(
                (resourceGroup: any) => resourceGroup.resourceGroupId === resourceGroupId
            )
        ) {
            // Create SAP AI Core Default Resource Group artifacts
            console.log("Info: SAP AI Core Default Resource Group artifacts will be created");

            // Create AI Core Default Resource Group
            console.log(`Info: SAP AI Core Default Resource Group ${resourceGroupId} will be created`);
            await createResourceGroup(resourceGroupId);
            await delay(10000);

            const headers = { "Content-Type": "application/json", "AI-Resource-Group": resourceGroupId };

            // Create AI Core Default Resource Group Configurations
            const responseConfigurationCreation = await createConfigurations({}, headers);

            // Create AI Core Default Resource Group Deployments
            await Promise.all(
                responseConfigurationCreation.map(async (configuration) => {
                    if (configuration.id) {
                        await delay(10000);
                        await createDeployment(configuration.id, headers);
                    }
                })
            );

            console.log("Success: SAP AI Core Default Resource Group artifacts created!");
        }
    } catch (e: any) {
        console.log(`Error: Error during SAP AI Core Default Resource Group artifact creation.`);
        console.log(`Error: Check XSUAA and Destination Service Binding as well as SAP AI Core Destination.`);
        console.log(`Error: Restart CAP service to try again or create the Default Resource Group manually.`);
        console.log("Error: " + e?.message);
    }
};

/**
 * Gets the application name
 * @returns {string} - The application identifier
 */
export const getAppName = (): string => {
    const services = xsenv.filterServices((svc) => svc.label === "saas-registry" || svc.name === "saas-registry");
    // @ts-ignore
    const appName =
        services[0]?.credentials?.appName ||
        (xsenv.getServices({ xsuaa: { tag: "xsuaa" } }).xsuaa as any)?.xsappname?.split("!t")[0];

    // Comply with SAP AI Core Resource Group naming requirements (only a-z and 0-9 and "-")
    return appName
        ?.toLowerCase()
        .replace(/[^a-z0-9-]/g, "")
        .replace(/^(-*)|(-*)$/g, "");
};

// ***********************************************************************************************
// SAP AI CORE API
// ***********************************************************************************************

/**
 * Get the running deploymentId for the resource group
 * @param {string} resourceGroupId - The resource group id
 * @param {Tasks} [task=Tasks.COMPLETION] - The task (default is "Tasks.COMPLETION")
 * @returns {Promise<any>} The deployment id
 * @throws {Error} If an error occurs during the process
 */
export const getDeploymentId = async (resourceGroupId: string, task: Tasks = Tasks.COMPLETION): Promise<any> => {
    try {
        const headers = { "Content-Type": "application/json", "AI-Resource-Group": resourceGroupId };
        const responseConfigurationQuery = await ConfigurationApi.configurationQuery()
            .skipCsrfTokenFetching()
            .addCustomHeaders(headers)
            .execute({ destinationName: AI_CORE_DESTINATION });

        const configuration = responseConfigurationQuery.resources?.find(
            (configuration: any) => configuration.name === task
        );

        const responseDeploymentQuery = await DeploymentApi.deploymentQuery({
            scenarioId: configuration.scenarioId,
            status: "RUNNING",
            configurationId: configuration.id,
            $top: 1
        })
            .skipCsrfTokenFetching()
            .addCustomHeaders(headers)
            .execute({ destinationName: AI_CORE_DESTINATION });

        return responseDeploymentQuery.count > 0 ? responseDeploymentQuery.resources[0].id : null;
    } catch (e: any) {
        console.error(`Error: ${e?.message}`);
    }
};

/**
 * Creates a new resource group in the AI core instance for the application
 * @param {string} resourceGroupId - The resource group id of the subscriber
 * @returns {Promise<any>} The response of creation
 * @throws {Error} If an error occurs during creation
 */
export const createResourceGroup = async (resourceGroupId: string): Promise<any> => {
    try {
        const response = await ResourceGroupApi.kubesubmitV4ResourcegroupsCreate({
            resourceGroupId: resourceGroupId
        })
            .skipCsrfTokenFetching()
            .execute(aiCoreDestination);
        //@ts-ignore
        return response;
    } catch (e: any) {
        console.error(`Error: ${e?.message}`);
    }
};

/**
 * Deletes the resource group in the AI core instance for the application
 * @param {string} resourceGroupId - The resource group id of the subscriber
 * @returns {Promise<any>} The response of deletion
 * @throws {Error} If an error occurs during deletion
 */
export const deleteResourceGroup = async (resourceGroupId: string): Promise<any> => {
    try {
        const response = await ResourceGroupApi.kubesubmitV4ResourcegroupsDelete(resourceGroupId)
            .skipCsrfTokenFetching()
            .execute(aiCoreDestination);
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
export const getResourceGroups = async (): Promise<Array<any>> => {
    try {
        const response = await ResourceGroupApi.kubesubmitV4ResourcegroupsGetAll()
            .skipCsrfTokenFetching()
            .execute(aiCoreDestination);
        return response.resources;
    } catch (e: any) {
        console.error(`Error: ${e?.message}`);
        return [];
    }
};

/**
 * Creates configurations in SAP AI Core resource group
 * @param {ConfigurationBaseData} configuration - SAP AI Core configuration details
 * @param {AICoreApiHeaders} headers - SAP AI Core request headers
 * @returns {Promise<Array<any>>} The response of configuration creation
 * @throws {Error} If an error occurs during creation
 */
export const createConfigurations = async (
    configuration: ConfigurationBaseData,
    headers: AICoreApiHeaders
): Promise<Array<any>> => {
    const responseConfigurationCreation = Promise.all(
        CONFIGURATIONS.map((config: any) => {
            return ConfigurationApi.configurationCreate({
                // @ts-ignore
                name: config.name,
                // @ts-ignore
                executableId: EXECUTABLE_ID,
                // @ts-ignore
                scenarioId: SCENARIO_ID,
                versionId: VERSION_ID,
                ...configuration,
                parameterBindings: config.parameters
            })
                .skipCsrfTokenFetching()
                .addCustomHeaders(headers)
                .execute(aiCoreDestination);
        })
    );

    return responseConfigurationCreation;
};

/**
 * Creates a deployment using the provided configuration ID and SAP AI Core headers.
 *
 * @param {string} configurationId - The ID for the configuration to be used.
 * @param {AICoreApiHeaders} headers - The SAP AI Core headers to be included in the request.
 * @returns {Promise<any>} The response from the deployment creation.
 */
export const createDeployment = async (configurationId: string, headers: AICoreApiHeaders): Promise<any> => {
    const responseDeploymentCreation = await DeploymentApi.deploymentCreate({
        configurationId: configurationId
    })
        .skipCsrfTokenFetching()
        .addCustomHeaders(headers)
        .execute(aiCoreDestination);

    console.log("Deployment creation response:", responseDeploymentCreation);

    await DeploymentApi.deploymentQuery({
        scenarioId: SCENARIO_ID,
        $top: 1
    })
        .skipCsrfTokenFetching()
        .addCustomHeaders(headers)
        .execute(aiCoreDestination);
    return responseDeploymentCreation;
};

// ***********************************************************************************************
// DESTINATION HANDLING
// ***********************************************************************************************

/**
 * This function is used to find the destination for AI core services. If the AI core services
 * are found in the environmental variables, it sets the destination name and the transformation function.
 * If the AI core services are not found, it sets a fallback selection strategy and default destination name.
 *
 * @returns {Object} An object containing the destination name and either a service binding transform function
 * or a selection strategy.
 */
const aiCoreDestination = xsenv.filterServices({ label: "aicore" })[0]
    ? {
          destinationName: xsenv.filterServices({ label: "aicore" })[0].name,
          serviceBindingTransformFn: aiCoreBindingToDestination
      }
    : { selectionStrategy: DestinationSelectionStrategies.alwaysProvider, destinationName: AI_CORE_DESTINATION };

/**
 * Converts an SAP AI Core Service binding to a destination.
 *
 * @param {Service} service - The service to convert.
 * @returns {Promise<Destination>} The converted destination.
 */
async function aiCoreBindingToDestination(service: Service): Promise<Destination> {
    const data = new URLSearchParams({
        grant_type: "client_credentials",
        client_id: service.credentials.clientid,
        client_secret: service.credentials.clientsecret
    });

    const token: HttpResponse = await executeHttpRequest(
        { url: service.credentials.url + "/oauth/token" },
        {
            url: service.credentials.url + "/oauth/token",
            method: "post",
            data: data,
            headers: {
                "Content-Type": "application/x-www-form-urlencoded"
            }
        },
        { fetchCsrfToken: false }
    );

    return buildClientCredentialsDestination(
        token.data.access_token,
        service.credentials.serviceurls.AI_API_URL + "/v2",
        service.name
    );
}

/**
 * Builds a destination using client credentials.
 *
 * @param {string} token - The token to be used for authentication.
 * @param {string} url - The URL for the destination.
 * @param {string} name - The name for the destination.
 * @returns {Object} The created destination.
 */
function buildClientCredentialsDestination(token: string, url: string, name: string): any {
    const expirationTime = decodeJwt(token).exp;
    const expiresIn = expirationTime ? Math.floor((expirationTime * 1000 - Date.now()) / 1000).toString(10) : undefined;
    return {
        url,
        name,
        authentication: "OAuth2ClientCredentials",
        authTokens: [
            {
                value: token,
                type: "bearer",
                expiresIn,
                http_header: { key: "Authorization", value: `Bearer ${token}` },
                error: null
            }
        ]
    };
}

/**
 * Pauses the execution for a specified time.
 *
 * @param {number} ms - The amount of time to delay in milliseconds.
 * @returns {Promise<void>} A promise that resolves after the specified delay.
 */
const delay = (ms: number): Promise<void> => new Promise((res: any) => setTimeout(res, ms));
