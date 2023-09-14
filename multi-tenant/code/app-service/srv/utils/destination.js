const axios = require( 'axios');
const xsenv = require( '@sap/xsenv');
const TokenUtils = require( './token-utils.js');

let ds = new Object()

if (cds.env.profiles.find( p =>  p.includes("hybrid") || p.includes("production"))) {
    ds = xsenv.getServices({ ds: { tag: 'destination' } }).ds;
}

class Destination {

    constructor(subdomain){
        this.subdomain = subdomain;
    }

    async createDestination(destinationConfig) {
        try {
            let tokenEndpoint = this.#createTokenEndpoint();
            let token = await TokenUtils.getTokenWithClientCreds(tokenEndpoint, ds.clientid, ds.clientsecret);
            let dptions = {
                method: 'POST',
                headers: {
                    Authorization: 'Bearer ' + token
                },
                url: ds.uri + '/destination-configuration/v1/subaccountDestinations',
                data: destinationConfig
            }
            let response = await axios(dptions);
            let destination = JSON.parse(response.config.data);
    
            console.log("Destination successfully created.")
            return destination;
        } catch (error) {
            console.error("Error: Destination can not be created.")
            console.error(`Error: ${error.message}`);
            throw error;
        }
    }
    
    async deleteDestination(name) {
        try {
            let nameEnc = encodeURIComponent(name);
            let tokenEndpoint = this.#createTokenEndpoint();
            let token = await TokenUtils.getTokenWithClientCreds(tokenEndpoint, ds.clientid, ds.clientsecret);
            let dptions = {
                method: 'DELETE',
                headers: {
                    Authorization: 'Bearer ' + token
                },
                url: ds.uri + `/destination-configuration/v1/subaccountDestinations/${nameEnc}`,
            }
            let response = await axios(dptions);
    
            console.log("Destination successfully deleted.")
            return response;
        } catch (error) {
            console.error("Error: Destination can not be deleted.")
            console.error(`Error: ${error.message}`);
            throw error;
        }
    }
    
    async getDestination(name){
        try {
            let nameEnc = encodeURIComponent(name);
            let tokenEndpoint = this.#createTokenEndpoint();
            let token = await TokenUtils.getTokenWithClientCreds(tokenEndpoint, ds.clientid, ds.clientsecret);
            let dptions = {
                method: 'GET',
                headers: {
                    Authorization: 'Bearer ' + token
                },
                url: ds.uri + `/destination-configuration/v1/subaccountDestinations/${nameEnc}`,
            }
            let response = await axios(dptions);
    
            console.log("Destination successfully retrieved.")
            return response.data;
        } catch (error) {
            console.error("Error: Destination can not be retrieved.")
            console.error(`Error: ${error.message}`);
        }
    }

    #createTokenEndpoint() {
        let url = ds.url + '/oauth/token?grant_type=client_credentials';
        return url.replace(/(^https:\/\/)([^.]+)(\..+$)/, '$1' + this.subdomain + '$3');
    }
}


module.exports = Destination 