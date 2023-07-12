const cds = require('@sap/cds');
const debug = require('debug')('srv:api-service');
const log = require('cf-nodejs-logging-support');
log.setLoggingLevel('info');

class ApiService extends cds.ApplicationService {
  async init() {
    const {
      Products
    } = this.entities;
  
  
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
  
    // ensure to call super.init()
    await super.init() 
  }
}
module.exports = { ApiService }