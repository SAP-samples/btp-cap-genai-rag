using { aisaas.db, sap.common } from '../db/data-model';

annotate sap.common.Countries with @cds.autoexpose: false;
annotate sap.common.Languages with @cds.autoexpose: false;
annotate sap.common.Currencies with @cds.autoexpose: false;

service ApiService @(path : '/rest/api', protocol:'rest', requires: 'authenticated-user', impl: 'srv/api-service' ){

     // Sample entities for CREATE, READ, UPDATE, DELETE
     entity Products as select * from db.Products;
}