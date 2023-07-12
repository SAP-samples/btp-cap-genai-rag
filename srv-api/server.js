const cds = require('@sap/cds');

cds.env.requires['toggles']=false
cds.env.requires['extensibility']=false

module.exports = (config) => {
    return cds.server(config);
}
