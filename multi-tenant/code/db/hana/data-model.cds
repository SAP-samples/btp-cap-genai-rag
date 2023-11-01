using { cuid } from '@sap/cds/common';

context aisaas.common {
    @cds.persistence.exists
    entity Shared : cuid {
        value  : String;
    }
}