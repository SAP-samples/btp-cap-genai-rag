import cds from "@sap/cds";
import express from "express";
import cors from "cors";
import cov2ap from "@sap/cds-odata-v2-adapter-proxy";
const cdsSwagger = require("cds-swagger-ui-express");

cds.on("bootstrap", (app: express.Application) => {
    app.use(cors());
    app.use(cdsSwagger({ basePath: "/docs", diagram: true }));
    app.use(cov2ap());
});

cds.on("served", async () => {
    const { "cds.xt.SaasProvisioningService": provisioning } = cds.services;

    // Add provisioning logic if only multitenancy is there
    if (provisioning) {
        let tenantProvisioning = require("./provisioning");
        provisioning.prepend(tenantProvisioning);
    } else {
        console.log("There is no service, therefore does not serve multitenancy!");
    }
});

module.exports = cds.server;
