import cds from "@sap/cds";
import express from "express";
import cors from "cors";

/**
 * This event handler is triggered on application bootstrap.
 * It configures the Express application to use CORS and sets up a simple health check endpoint.
 */
cds.on("bootstrap", (app: express.Application) => {
    app.use(cors());
    app.get("/healthz", (_: express.Request, res: express.Response) => res.status(200).send(""));
});
