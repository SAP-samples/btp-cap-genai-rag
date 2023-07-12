using { sap, cuid } from '@sap/cds/common';

context susaas.common {
    @cds.persistence.exists
    entity Shared : cuid {
        value  : String;
    }
}

@cds.persistence.exists
extend sap.common.Countries {} 

@cds.persistence.exists
extend sap.common.Currencies {} 

@cds.persistence.exists
extend sap.common.Languages {} 