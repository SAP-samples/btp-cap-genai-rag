const approuter = require('@sap/approuter');
const ar = approuter();

ar.first.use("/healthz", (_, res) => res.end(''));
ar.start();