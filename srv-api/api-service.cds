using { susaas.db, sap.common } from '../db/data-model';

annotate sap.common.Countries with @cds.autoexpose: false @cds.persistence.exists;
annotate sap.common.Languages with @cds.autoexpose: false @cds.persistence.exists;
annotate sap.common.Currencies with @cds.autoexpose: false @cds.persistence.exists;

@path : '/odata/api'
service ApiService  {

     // Sample entities for CREATE, READ, UPDATE, DELETE
     entity Products as select * from db.Products;
     entity SalesOrders as select * from db.SalesOrders;
     entity RecyclingCountries as select * from db.RecyclingCountries;
     entity RecyclingMaterials as select * from db.RecyclingMaterials;
     
     // Sample actions for bulk DELETE and consecutive INSERT
     action bulkInsertProducts( products : many Products ) returns String;
     action bulkInsertSalesOrders( salesOrders : many SalesOrders ) returns String;
     action bulkInsertRecyclingCountries( recyclingCountries : many RecyclingCountries ) returns String;
     action bulkInsertRecyclingMaterials( recyclingMaterials : many RecyclingMaterials ) returns String;

     // Sample action for bulk UPDATE
     action bulkUpdateProducts( products : many Products ) returns String;

     // Sample action for bulk UPSERT using HANA stored procedure
     // Not working during local development using sqlite!
     action bulkUpsertSalesOrders( salesOrders : many SalesOrders ) returns String;
}