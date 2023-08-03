import { Request } from "@sap/cds/apis/services";
import xsenv from "@sap/xsenv";
import { HttpResponse } from "@sap-cloud-sdk/http-client";
import { executeHttpRequest } from "@sap-cloud-sdk/http-client";
import { decodeJwt } from "@sap-cloud-sdk/connectivity";
import { Service, Destination, DestinationSelectionStrategies } from "@sap-cloud-sdk/connectivity";
import { DeploymentApi, ResourceGroupApi, ConfigurationApi, ConfigurationBaseData } from "./vendor/AI_CORE_API";

interface AICoreApiHeaders extends Record<string, string> {
    "Content-Type": string;
    "AI-Resource-Group": string;
}

const AI_CORE_DESTINATION = "PROVIDER_AI_CORE_DESTINATION";
const SCENARIO_ID = "my-azure-openai-scenario";

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
export const completion = async (prompt: string, tenant: string) => {
    const services = xsenv.getServices({ registry: { label: "saas-registry" } });
    // @ts-ignore
    const appName = services?.registry?.appName;
    // Create AI Core Resource Group for tenant
    const resourceGroupId = `${tenant}-${appName}`; //"043145ac-5713-4eb6-9c60-c5dcc90324f9-aisaas-dev-tfe-saas-ai-dev-srumi98b";
    const deploymentId = await getDeploymentId(resourceGroupId);
    if (deploymentId) {
    }
    const aiCoreService = await cds.connect.to(AI_CORE_DESTINATION);
    const payload: any = {
        messages: [
            {
                role: "system",
                content:
                    'Assistant is an intelligent chatbot designed to help users answer their tax related questions.\n\nInstructions:\n- Only answer questions related to taxes.\n- If you\'re unsure of an answer, you can say "I don\'t know" or "I\'m not sure" and recommend users go to the IRS website for more information.'
            },
            { role: "user", content: prompt }
        ],
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
        data: payload,
        headers: headers
    });
    return { text: response["choices"][0]?.message?.content };
};

/**
 * get the running deploymentId for the resource group
 * @returns deploymentId
 */
export const getDeploymentId = async (resourceGroupId: string) => {
    try {
        const headers = { "Content-Type": "application/json", "AI-Resource-Group": resourceGroupId };

        const responseDeploymentQuery = await DeploymentApi.deploymentQuery({
            scenarioId: SCENARIO_ID,
            status: "RUNNING",
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
