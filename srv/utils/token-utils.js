
const axios = require('axios')

module.exports = {
    getTokenWithClientCreds: getTokenWithClientCreds
};

async function getTokenWithClientCreds(tokenEndpoint, clientid, clientsecret) {
    try {
        let authOptions = {
            method: 'POST',
            url: tokenEndpoint,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                Authorization: 'Basic ' + Buffer.from(clientid + ':' + clientsecret).toString('base64')
            },
            data: new URLSearchParams({
                grant_type: 'client_credentials',
                response_type: 'token'
            }).toString()
        };
        let response = await axios(authOptions);
        return response.data.access_token;
    } catch (error) {
        console.error("Error: Token can not be retrieved!")
        throw (error.response.status);
    }
}