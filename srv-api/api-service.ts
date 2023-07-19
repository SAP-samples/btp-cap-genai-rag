import { ApplicationService } from "@sap/cds";
import log from "cf-nodejs-logging-support";

log.setLoggingLevel("info");

export default class ApiService extends ApplicationService {
    async init() {
        await super.init();
        const { Products } = this.entities;

        this.on("bulkInsertProducts", async (req) => {
            try {
                let upload = req.data.products;

                // Delete all existing purchase orders
                await DELETE.from(Products);

                // Insert uploaded products
                await INSERT.into(Products, upload);

                return "Records successfully uploaded!";
            } catch (error) {
                return req.error(404, `Error occured during upload": ${error}`);
            }
        });
    }
}
