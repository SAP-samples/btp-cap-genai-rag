import cds from "@sap/cds";

cds.env.requires["toggles"] = false;
cds.env.requires["extensibility"] = false;

module.exports = (config: any) => {
    return cds.server(config);
};
