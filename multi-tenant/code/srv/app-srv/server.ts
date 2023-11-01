import cds from "@sap/cds";
import express from "express";
import cors from "cors";
import xsenv from "@sap/xsenv";

import { handleTenantSubscription } from "./provisioning";
import * as aiCore from "../common/utils/ai-core";

const delay = (ms: number) => new Promise((res: any) => setTimeout(res, ms));

cds.on("bootstrap", (app: express.Application) => {
    app.use(cors());
    app.get("/healthz", (_: express.Request, res: express.Response) => res.status(200).send("OK"));
});


cds.on("served", async () => {
    const { "cds.xt.SaasProvisioningService": provisioning } = cds.services;
    // Add provisioning logic if only multitenancy is there
    if (provisioning) {
        console.log("Provisioning service is available, serving multitenancy!");
        provisioning.prepend(handleTenantSubscription);
    } else {
        console.log("There is no service, therefore does not serve multitenancy!");
    }

    try {
        const appName = aiCore.getAppName();
        const defaultGroupExists = (await aiCore.getResourceGroups()).find((resourceGroup : any ) => resourceGroup.resourceGroupId = `default-${appName}`);

        if (!defaultGroupExists){
            // Create AI Core Resource Group for tenant
            console.log("Info: AI Core Default Resource Group will be created");
            const resourceGroupId = `default-${appName}`;
            
            await aiCore.createResourceGroup(resourceGroupId);
            await delay(10000);

            const headers = { "Content-Type": "application/json", "AI-Resource-Group": resourceGroupId };
            const responseConfigurationCreation = await aiCore.createConfigurations({}, headers);
            
            await Promise.all(
                responseConfigurationCreation.map(async(configuration) => {
                    if (configuration.id) {
                        await delay(5000);
                        await aiCore.createDeployment(configuration.id, headers);
                    }
                })
            )

            console.log("Success: Default Resource Group Onboarding completed!");

        }
    }catch(error : any){
        console.log("Failed: Error during Default Resource Group Creation!");
        console.log("Error: " + error.message);
    }
});

