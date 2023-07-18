const cds = require('@sap/cds');
const log = require('cf-nodejs-logging-support');
log.setLoggingLevel('info');

module.exports = cds.service.impl(async function () {

    this.on('userInfo', req => {
        let results = {};
        results.user = req.user.id;
        let username = req.req.authInfo.getGivenName();
        if (req.user.hasOwnProperty('locale')) {
            results.locale = req.user.locale;
        }
        if (username) {
            results.givenName = username;
        }
        results.scopes = {};
        results.scopes.identified = req.user.is('identified-user');
        results.scopes.authenticated = req.user.is('authenticated-user');
        results.scopes.Member = req.user.is('Member');
        results.scopes.Admin = req.user.is('Admin');
        results.tenant = req.user.tenant;
        results.scopes.ExtendCDS = req.user.is('ExtendCDS');
        results.scopes.ExtendCDSdelete = req.user.is('ExtendCDSdelete');
        return results;
    });
});