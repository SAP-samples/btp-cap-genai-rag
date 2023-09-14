import cds from "@sap/cds";
import express from "express";
import cors from "cors";
import cov2ap from "@sap/cds-odata-v2-adapter-proxy";
import { handleTenantSubscription } from "./provisioning";

cds.on("bootstrap", (app: express.Application) => {
    app.use(cors());
    app.get("/healthz", (_: express.Request, res: express.Response) => res.status(200).send("OK"));
    app.use(cov2ap());
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
});

