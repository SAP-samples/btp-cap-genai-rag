import cds from "@sap/cds";
import express from "express";
import cors from "cors";

import { handleTenantSubscription } from "./provisioning";

/**
 * This event handler is triggered on application bootstrap.
 * It configures the Express application to use CORS and sets up a simple health check endpoint.
 */
cds.on("bootstrap", (app: express.Application) => {
    app.use(cors());
    app.get("/healthz", (_: express.Request, res: express.Response) => res.status(200).send(""));
});

/**
 * This event handler is triggered when the application has been served.
 * It checks for the presence of the SaasProvisioningService and adds provisioning logic if it exists.
 */
cds.on("served", async () => {
    // Add provisioning logic if only multitenancy is there
    const { "cds.xt.SaasProvisioningService": provisioning } = cds.services;
    if (provisioning) {
        console.log("Provisioning service is available, serving multitenancy!");
        provisioning.prepend(handleTenantSubscription);
    } else {
        console.log("There is no service, therefore does not serve multitenancy!");
    }
});

