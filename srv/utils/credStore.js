/*
    Based on SAP Help document
    https://help.sap.com/docs/CREDENTIAL_STORE/601525c6e5604e4192451d5e7328fa3c/decad8fa526c40138d2a6843fb6a82bb.html
*/

const debug = require('debug')('srv:credStore');
const fetch = require('node-fetch');
const jose = require('node-jose');
const xsenv = require('@sap/xsenv');

let credStore = new Object(); 

if (cds.env.profiles.find( p =>  p.includes("hybrid") || p.includes("production"))) {
    credStore = xsenv.getServices({ credStore: { tag: 'credstore' }}).credStore;
}

function checkStatus(response) {
    debug('credStore.checkStatus:', response.status, response.statusText, response.url);
    if (!response.ok) {
        throw Error('checkStatus: ' + response.status + ' ' + response.statusText);
    }
    return response;
}

async function decryptPayload(privateKey, payload) {
    const key = await jose.JWK.asKey(
        `-----BEGIN PRIVATE KEY-----${privateKey}-----END PRIVATE KEY-----`, 
        'pem', 
        {alg: "RSA-OAEP-256", enc: "A256GCM"}
    );
    const decrypt = await jose.JWE.createDecrypt(key).decrypt(payload);
    const result = decrypt.plaintext.toString();
    return result;
}

function headers(credStore, namespace, init) {
    const result = new fetch.Headers(init);
    result.set('Authorization', `Basic ${Buffer.from(`${credStore.username}:${credStore.password}`).toString('base64')}`);
    result.set('sapcp-credstore-namespace', namespace);
    return result;
}

async function fetchAndDecrypt(privateKey, url, method, headers, body) {
    const result = await fetch(url, {method, headers, body})
        .then(checkStatus)
        .then(response => response.text())
        .then(payload => decryptPayload(privateKey, payload))
        .then(JSON.parse);
    return result;
}

async function fetchAndDecryptValue(privateKey, url, method, headers, body) {
    const result = await fetch(url, {method, headers, body})
        .then(checkStatus)
        .then(response => response.text())
        .then(payload => decryptPayload(privateKey, payload))
        .then(JSON.parse);
    return result.value;
}

async function readCredential(namespace, type, name) {
    return fetchAndDecrypt(
        credStore.encryption.client_private_key,
        `${credStore.url}/${type}?name=${encodeURIComponent(name)}`, 
        "get", 
        headers(credStore, namespace)
    );
}

async function readCredentialValue(namespace, type, name) {
    return fetchAndDecryptValue(
        credStore.encryption.client_private_key,
        `${credStore.url}/${type}?name=${encodeURIComponent(name)}`, 
        "get", 
        headers(credStore, namespace)
    );
}

async function writeCredential(credStore, namespace, type, credential) {
    return fetchAndDecrypt(
        credStore.encryption.client_private_key,
        `${credStore.url}/${type}`,
        "post",
        headers(credStore, namespace, { "Content-Type": "application/jose" }),
        await encryptPayload(credStore.encryption.server_public_key, JSON.stringify(credential))
    );
}

async function deleteCredential(credStore, namespace, type, name) {
    await fetch(
        `${credStore.url}/${type}?name=${encodeURIComponent(name)}`,
        {
            method: "delete",
            headers: headers(credStore, namespace)
        }
    ).then(checkStatus);
}

module.exports = {
    readCredential: readCredential,
    readCredentialValue: readCredentialValue,
    writeCredential: writeCredential,
    deleteCredential: deleteCredential
};