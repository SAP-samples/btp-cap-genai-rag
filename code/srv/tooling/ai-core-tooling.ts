import xsenv from "@sap/xsenv";
import { HttpResponse } from "@sap-cloud-sdk/http-client";
import { executeHttpRequest } from "@sap-cloud-sdk/http-client";
import { decodeJwt } from "@sap-cloud-sdk/connectivity";
import { Service, Destination, DestinationSelectionStrategies } from "@sap-cloud-sdk/connectivity";
import { CreateChatCompletionRequest, CreateChatCompletionResponse, ChatCompletionRequestMessage } from "openai";
import { DeploymentApi, ResourceGroupApi, ConfigurationApi, ConfigurationBaseData } from "../vendor/AI_CORE_API";

enum Tasks {
    COMPLETION = "4aa2fc45-cd49-496e-b4a9-9ab8e49df4ab",
    CHAT = "",
    EMBEDDING = "90fb13c6-08f0-4e96-9dfb-ea872aa84e26"
}
interface AICoreApiHeaders extends Record<string, string> {
    "Content-Type": string;
    "AI-Resource-Group": string;
}

const AI_CORE_DESTINATION = "PROVIDER_AI_CORE_DESTINATION";
const SCENARIO_ID = "my-azure-openai-scenario";
const CONFIGURATION_NAME = "my-azure-openai-configuration";
const EXECUTABLE_ID = "my-azure-openai-proxy";
const VERSION_ID = "1.0";

const aiCoreDestination = xsenv.filterServices({ label: "aicore" })[0]
    ? {
          destinationName: xsenv.filterServices({ label: "aicore" })[0].name,
          serviceBindingTransformFn: aicoreBindingToDestination
      }
    : { selectionStrategy: DestinationSelectionStrategies.alwaysProvider, destinationName: AI_CORE_DESTINATION };

/**
 * Use the chat completion api from Azure OpenAI services to make a completion call
 *
 * @param prompt the text to be completed
 * @param tenant the tenant for which the completion is being made
 * @returns the text completion
 */
export const completion = async (prompt: string, tenant: string, LLMParams: {} = {}) => {
    const appName = getAppName();
    const resourceGroupId = tenant ? `${tenant}-${appName}` : "default";
    const deploymentId = await getDeploymentId(resourceGroupId);
    if (deploymentId) {
        const aiCoreService = await cds.connect.to(AI_CORE_DESTINATION);
        const payload: any = {
            messages: [{ role: "user", content: prompt }],
            max_tokens: 1000,
            temperature: 0.0,
            frequency_penalty: 0,
            presence_penalty: 0,
            stop: "null",
            ...LLMParams
        };
        const headers = { "Content-Type": "application/json", "AI-Resource-Group": resourceGroupId };
        const response: any = await aiCoreService.send({
            // @ts-ignore
            query: `POST /inference/deployments/${deploymentId}/v1/predict`,
            data: payload,
            headers: headers
        });

        return response["choices"][0]?.message?.content;
    } else {
        return `No deployment found for this tenant (${tenant})`;
    }
};

/**
 * Use the chat completion api from Azure OpenAI services to make a completion call
 *
 * @param messages the messages for the chat completion
 * @param tenant the tenant for which the completion is being made
 * @returns the text completion
 */
export const chatCompletion = async (
    request: CreateChatCompletionRequest,
    tenant: string
): Promise<CreateChatCompletionResponse> => {
    const appName = getAppName();
    const resourceGroupId = tenant ? `${tenant}-${appName}` : "default";
    const deploymentId = await getDeploymentId(resourceGroupId);
    if (deploymentId) {
        const aiCoreService = await cds.connect.to(AI_CORE_DESTINATION);
        const payload: any = {
            messages: request.messages.map((value: ChatCompletionRequestMessage) => ({
                role: value.role,
                content: value.content
            })),
            max_tokens: 100,
            temperature: 0.0,
            frequency_penalty: 0,
            presence_penalty: 0,
            stop: "null"
        };
        const headers = { "Content-Type": "application/json", "AI-Resource-Group": resourceGroupId };
        const response: any = await aiCoreService.send({
            // @ts-ignore
            query: `POST /inference/deployments/${deploymentId}/v1/predict`,
            data: request,
            headers: headers
        });
        return response;
    } else {
        return null;
    }
};

export const embed = async (texts: Array<string>, tenant: string, EmbeddingParams: {} = {}): Promise<number[][]> => {
    const appName = getAppName();
    const resourceGroupId = tenant ? `${tenant}-${appName}` : "default";
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
                    query: `POST /inference/deployments/${deploymentId}/v1/predict`,
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

const getAppName = () => {
    const services = xsenv.filterServices((svc) => svc.label === "saas-registry" || svc.name === "saas-registry");
    // @ts-ignore
    const appName = services?.registry?.appName;
    return appName;
};

/**
 * get the running deploymentId for the resource group
 * @returns deploymentId
 */
export const getDeploymentId = async (resourceGroupId: string, task: Tasks = Tasks.COMPLETION) => {
    try {
        const headers = { "Content-Type": "application/json", "AI-Resource-Group": resourceGroupId };

        // TODO: loop through deployments and check for particular configurationName to get "embedding" or "completion" deployment
        /*
        const testResp = await DeploymentApi.deploymentQuery({ status: "RUNNING" })
            .skipCsrfTokenFetching()
            .addCustomHeaders(headers)
            .execute({ destinationName: AI_CORE_DESTINATION });
        console.log("Deployments:", testResp);
        */

        const responseDeploymentQuery = await DeploymentApi.deploymentQuery({
            scenarioId: SCENARIO_ID,
            status: "RUNNING",
            configurationId: task,
            $top: 1
        })
            .skipCsrfTokenFetching()
            .addCustomHeaders(headers)
            .execute({ destinationName: AI_CORE_DESTINATION });
        console.log("Deployment query resp:", responseDeploymentQuery);
        return responseDeploymentQuery.count > 0 ? responseDeploymentQuery.resources[0].id : null;
    } catch (e: any) {
        console.log(e.message);
    }
};

/**
 * creates a new resource group in the ai core instance with the id of the zone
 * @param {*} resourceGroupId: the zoneId of the subscriber (subscribedZoneId)
 * @returns response of creation
 */
export const createResourceGroup = async (resourceGroupId: string) => {
    try {
        const response = await ResourceGroupApi.kubesubmitV4ResourcegroupsCreate({
            resourceGroupId: resourceGroupId
        })
            .skipCsrfTokenFetching()
            .execute(aiCoreDestination);
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
export const deleteResourceGroup = async (resourceGroupId: string) => {
    try {
        const response = await ResourceGroupApi.kubesubmitV4ResourcegroupsDelete(resourceGroupId)
            .skipCsrfTokenFetching()
            .execute(aiCoreDestination);
        return response;
    } catch (e: any) {
        console.log(e.message);
    }
};

/**
 * fetches all resource groups from the ai core instance
 * @returns response of fetching all resource groups
 */
export const getResourceGroups = async () => {
    try {
        const response = await ResourceGroupApi.kubesubmitV4ResourcegroupsGetAll()
            .skipCsrfTokenFetching()
            .execute(aiCoreDestination);
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
export const createConfiguration = async (configuration: ConfigurationBaseData, headers: AICoreApiHeaders) => {
    //{ id: '2363ebb7-1649-4de1-aa4d-bddec257c100', message: 'Configuration created' }
    const responseConfigurationCreation = await ConfigurationApi.configurationCreate({
        name: CONFIGURATION_NAME,
        executableId: EXECUTABLE_ID,
        scenarioId: SCENARIO_ID,
        versionId: VERSION_ID,
        ...configuration,
        parameterBindings: [
            {
                key: "azureDeploymentUrl",
                value: "https://paa-gpt-01.openai.azure.com/openai/deployments/BTP-AUDIT-LOG/chat/completions?api-version=2023-05-15"
            }
        ]
    })
        .skipCsrfTokenFetching()
        .addCustomHeaders(headers)
        .execute(aiCoreDestination);
    return responseConfigurationCreation;
};

export const createDeployment = async (configurationId: string, headers: AICoreApiHeaders) => {
    const responseDeploymentCreation = await DeploymentApi.deploymentCreate({
        configurationId: configurationId
    })
        .skipCsrfTokenFetching()
        .addCustomHeaders(headers)
        .execute(aiCoreDestination);
    console.log("Deployment creation response:", responseDeploymentCreation);

    const responseDeploymentQuery = await DeploymentApi.deploymentQuery({
        scenarioId: SCENARIO_ID,
        //    status: "RUNNING",
        $top: 1
    })
        .skipCsrfTokenFetching()
        .addCustomHeaders(headers)
        .execute(aiCoreDestination);
    console.log("Deployment query resp:", responseDeploymentQuery);
    return responseDeploymentCreation;
};

/**
 * CREATE DESTINATION FROM AI CORE SERVICE BINDING
 * @param service
 * @param options
 */
async function aicoreBindingToDestination(service: Service): Promise<Destination> {
    /*
    // serviceToken function fails due to 403 CSRF error
    const transformedService = { ...service, credentials: { ...service.credentials } };
    const token = await serviceToken(transformedService);
    */

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
 * BUILD CLIENT CREDENTIALS FOR DESTINATION
 * @param token
 * @param url
 * @param name
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
