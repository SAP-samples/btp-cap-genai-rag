const axios = require('axios');
const xsenv = require('@sap/xsenv');
const tokenUtils = require('./token-utils')
let services = new Object()

if (cds.env.profiles.find( p =>  p.includes("hybrid") || p.includes("production"))) {
    services = xsenv.getServices({ destination: { tag: 'destination' } });
}

async function createDestination(subdomain, destinationConfig) {
    try {
        let tokenEndpoint = createTokenEndpoint(subdomain);
        let token = await tokenUtils.getTokenWithClientCreds(tokenEndpoint, services.destination.clientid, services.destination.clientsecret);
        let options = {
            method: 'POST',
            headers: {
                Authorization: 'Bearer ' + token
            },
            url: services.destination.uri + '/destination-configuration/v1/subaccountDestinations',
            data: destinationConfig
        }
        let response = await axios(options);
        let destination = JSON.parse(response.config.data);
        console.log("Destination successfully created")
        return destination;
    } catch (err) {
        console.error("Error: Destination can not be created")
        console.error(`Error: ${err}`);
        throw error;
    }
}
async function deleteDestination(subdomain, name) {
    try {
        let nameEnc = encodeURIComponent(name);
        let tokenEndpoint = createTokenEndpoint(subdomain);
        let token = await tokenUtils.getTokenWithClientCreds(tokenEndpoint, services.destination.clientid, services.destination.clientsecret);
        let dptions = {
            method: 'DELETE',
            headers: {
                Authorization: 'Bearer ' + token
            },
            url: services.destination.uri + `/destination-configuration/v1/subaccountDestinations/${nameEnc}`,
        }
        let response = await axios(dptions);
        console.log("Destination successfully deleted")
        return response;
    } catch (error) {
        console.error("Error: Destination can not be deleted")
    }
}

async function getDestination(subdomain,name){
    try {
        let nameEnc = encodeURIComponent(name);
        let tokenEndpoint = createTokenEndpoint(subdomain);
        let token = await tokenUtils.getTokenWithClientCreds(tokenEndpoint, services.destination.clientid, services.destination.clientsecret);
        let dptions = {
            method: 'GET',
            headers: {
                Authorization: 'Bearer ' + token
            },
            url: services.destination.uri + `/destination-configuration/v1/subaccountDestinations/${nameEnc}`,
        }
        let response = await axios(dptions);
        console.log("Destination retrieved")
        return response.data;
    } catch (error) {
        console.error("Error: Destination can not be retrieved")
    }
}

function createTokenEndpoint(subdomain) {
    let url = services.destination.url + '/oauth/token?grant_type=client_credentials';
    return url.replace(/(^https:\/\/)([^.]+)(\..+$)/, '$1' + subdomain + '$3');
}

module.exports = {
    subscriberCreate: createDestination,
    subscriberDelete: deleteDestination,
    get: getDestination,
}