const approuter = require('@sap/approuter');
const ar = approuter();

ar.first.use("/healthz", function myMiddleware(_, res) { res.end('Service available') });
ar.start();