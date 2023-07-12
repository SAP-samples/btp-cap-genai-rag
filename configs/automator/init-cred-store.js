const args = process.argv.slice(2);
let binding = new Object()
const fetch = require('node-fetch');
const jose = require('node-jose');
const fs = require('fs');
const path = require("path")

/**************************************************************
This module is written to be called from ./init-cred-store.sh
with relevant parameters.
init-cred-store.sh is called by BTP Automator.
**************************************************************
arg 0-> Service Broker Password
*/

let rawJsonServiceKey = fs.readFileSync(path.resolve(__dirname,"binding.json"));
binding = JSON.parse(rawJsonServiceKey).credentials;
fs.unlinkSync(path.resolve(__dirname,"binding.json"));
function checkStatus(response) {
    if (!response.ok) {
        throw Error('checkStatus: ' + response.status + ' ' + response.statusText);
    }
    return response;
}
async function decryptPayload(privateKey, payload) {
    const key = await jose.JWK.asKey(
        `-----BEGIN PRIVATE KEY-----${privateKey}-----END PRIVATE KEY-----`,
        'pem',
        { alg: "RSA-OAEP-256", enc: "A256GCM" }
    );
    const decrypt = await jose.JWE.createDecrypt(key).decrypt(payload);
    const result = decrypt.plaintext.toString();
    return result;
}
function headers(binding, namespace, init) {
    const result = new fetch.Headers(init);
    result.set('Authorization', `Basic ${Buffer.from(`${binding.username}:${binding.password}`).toString('base64')}`);
    result.set('sapcp-credstore-namespace', namespace);
    return result;
}
async function fetchAndDecrypt(privateKey, url, method, headers, body) {
    const result = await fetch(url, { method, headers, body })
        .then(checkStatus)
        .then(response => response.text())
        .then(payload => decryptPayload(privateKey, payload))
        .then(JSON.parse);
    return result;
}
async function writeCredential(binding, namespace, type, credential) {
    return fetchAndDecrypt(
        binding.encryption.client_private_key,
        `${binding.url}/${type}`,
        "post",
        headers(binding, namespace, { "Content-Type": "application/jose" }),
        await encryptPayload(binding.encryption.server_public_key, JSON.stringify(credential))
    );
}
async function encryptPayload(publicKey, payload) {
    const key = await jose.JWK.asKey(`-----BEGIN PUBLIC KEY-----${publicKey}-----END PUBLIC KEY-----`,
        "pem",
        { alg: "RSA-OAEP-256" }
    );
    const options = {
        contentAlg: "A256GCM",
        compact: true,
        fields: { "iat": Math.round(new Date().getTime() / 1000) }
    };
    return jose.JWE.createEncrypt(options, key).update(Buffer.from(payload, "utf8")).final();
}
async function createBrokerCredential() {
    let brokerpass = args[0];
    let password = {
        name: "susaas-broker-credentials",
        value: brokerpass,
        username: "broker-user",
    };
    await writeCredential(binding, 'susaas', 'password', password)
    console.log("[INFO] BTP Admin credential has been generated successfully!")
    return;
}
async function createAdminCredential() {
    if(!process.env.BTP_ADMIN_USER || !process.env.BTP_ADMIN_PASSWORD){
      console.log("[WARNING] BTP_ADMIN_USER BTP_ADMIN_PASSWORD environment variables are not provided with parameters.json, therefore credential for admin user is not created.\nThis step should be manually completed as described here:https://github.com/SAP-samples/btp-cf-cap-multitenant-susaas/tree/main/docu/2-basic/3-build-deploy-saas-application#2-setup-the-credential-store")
      return;
    }
    let password = {
        name: 'btp-admin-user',
        value: process.env.BTP_ADMIN_PASSWORD,
        username: process.env.BTP_ADMIN_USER,
    };
    await writeCredential(binding, 'susaas', 'password', password)
    console.log("[INFO] Broker credential has been generated successfully!")
    return;
}
createBrokerCredential();
createAdminCredential();