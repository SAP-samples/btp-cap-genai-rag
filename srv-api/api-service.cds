using { susaas.db, sap.common } from '../db/data-model';

annotate sap.common.Countries with @cds.autoexpose: false @cds.persistence.exists;
annotate sap.common.Languages with @cds.autoexpose: false @cds.persistence.exists;
annotate sap.common.Currencies with @cds.autoexpose: false @cds.persistence.exists;

@path : '/rest/api' 
service ApiService  {

     // Sample entities for CREATE, READ, UPDATE, DELETE
     entity Products as select * from db.Products;

     
     // Sample actions for bulk DELETE and consecutive INSERT
     action bulkInsertProducts( products : many Products ) returns String;

     // Sample action for bulk UPDATE
     action bulkUpdateProducts( products : many Products ) returns String;

}