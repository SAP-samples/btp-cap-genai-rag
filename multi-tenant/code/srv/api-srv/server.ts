import cds from "@sap/cds";
import express from "express";

// List of services to disable
const SERVICES_TO_DISABLE = [
    "toggles",
    "extensibility",
    "cds.xt.ModelProviderService",
    "cds.xt.DeploymentService",
    "cds.xt.SaasProvisioningService",
    "cds.xt.ExtensibilityService",
  ];
  
// Disable all services in the list
SERVICES_TO_DISABLE.forEach((service) => {
    cds.env.requires[service] = false;
});
  
/**
 * Event listener for bootstrap event.
 * Adds a health check endpoint to the application.
 * @param {express.Application} app - The express application.
 */
cds.on('bootstrap', async (app : express.Application) => {
    app.get('/healthz', (_: express.Request, res: express.Response) => res.status(200).send(''))
});

export default cds.server;