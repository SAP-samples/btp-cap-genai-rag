const cds = require('@sap/cds');
const debug = require('debug')('srv:api-service');
const log = require('cf-nodejs-logging-support');
log.setLoggingLevel('info');

class ApiService extends cds.ApplicationService {
  async init() {
    const {
      Products,
      SalesOrders,
      RecyclingCountries,
      RecyclingMaterials
    } = this.entities;
    
    // register your event handlers...
    this.on("bulkInsertSalesOrders", async (req) => {
      try {
        let upload = req.data.salesOrders;
  
        // Delete all existing purchase orders
        await DELETE.from (SalesOrders);
  
        // Insert uploaded purchase orders
        await INSERT.into (SalesOrders, upload);
        
        return "Records successfully uploaded!" 
  
      } catch(error){
        return req.error(404,`Error occured during upload": ${error}`)
      }
    });
  
  
    this.on("bulkInsertProducts", async (req) => {
      try {
        let upload = req.data.products;
  
        // Delete all existing purchase orders
        await DELETE.from (Products);
  
        // Insert uploaded products
        await INSERT.into (Products, upload);
  
        return "Records successfully uploaded!" 
  
      } catch(error){
        return req.error(404,`Error occured during upload": ${error}`)
      }
    });
  
  
    this.on("bulkUpdateProducts", async (req) => {
      try {
        let upload = req.data.products;
  
        upload.forEach(async(product) => {
          await UPDATE (Products, product.ID) .with (product)
        });
  
        return "Records successfully updated!" 
  
        } catch(error){
          return req.error(404,`Error occured during upload": ${error}`)
        }
    });
  
  
    this.on("bulkInsertRecyclingCountries", async (req) => {
      try {
        let upload = req.data.recyclingCountries;
        
        // Delete all existing recycling countries
        await DELETE.from (RecyclingCountries);
  
        // Insert uploaded recycling countries
        await INSERT.into (RecyclingCountries, upload);
        
        return "Records successfully uploaded!" 
  
      } catch(error){
        return req.error(404,`Error occured during upload": ${error}`)
      }
    });
  
  
    this.on("bulkInsertRecyclingMaterials", async (req) => {
      try {
        let upload = req.data.recyclingMaterials;
        
        // Delete all existing recycling materials
        await DELETE.from (RecyclingMaterials);
  
        // Insert uploaded recycling materials
        await INSERT.into (RecyclingMaterials, upload);
        
        return "Records successfully uploaded!" 
  
      } catch(error){
        return req.error(404,`Error occured during upload": ${error}`)
      }
    });

    this.on("bulkUpsertSalesOrders", async (req) => {
      try {
        let upload = JSON.stringify(req.data);
        res = await cds.run(`CALL SUSAAS_DB_UPSERT_SALES_ORDERS(salesOrders => ?, result => ?)`, [upload]);
        
        return "Records successfully uploaded!" 
  
      } catch(error){
        return req.error(404,`Error occured during upload": ${error}`)
      }
    });

    // ensure to call super.init()
    await super.init() 
  }
}
module.exports = { ApiService }