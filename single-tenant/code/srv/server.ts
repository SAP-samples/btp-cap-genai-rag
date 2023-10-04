import cds from "@sap/cds";
import express from "express";
import cors from "cors";

cds.on("bootstrap", (app: express.Application) => {
    app.use(cors());
    app.get("/healthz", (_: express.Request, res: express.Response) => res.status(200).send("OK"));
});
