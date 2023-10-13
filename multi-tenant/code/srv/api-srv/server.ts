import cds from "@sap/cds";
import express from "express";

cds.env.requires["toggles"] = false;
cds.env.requires["extensibility"] = false;
cds.env.requires["cds.xt.ModelProviderService"] = false;
cds.env.requires["cds.xt.DeploymentService"] = false;
cds.env.requires["cds.xt.SaasProvisioningService"] = false;
cds.env.requires["cds.xt.ExtensibilityService"] = false;

cds.on('bootstrap', async (app : express.Application) => {
    app.get('/healthz', (_, res) => { res.status(200).send('OK') })
    app.use(express.json({ limit: '50MB' }))
});

export default cds.server;