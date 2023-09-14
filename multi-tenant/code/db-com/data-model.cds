using { cuid } from '@sap/cds/common';

context aisaas.common {
    entity Shared : cuid {
        value : String;
    };
}