using { cuid } from '@sap/cds/common';

using {
    sap.common.Languages as Languages,
    sap.common.Currencies as Currencies,
    sap.common.Countries as Countries
} from '@sap/cds-common-content';

context susaas.common {
    entity Shared : cuid {
        value : String;
    };
}

@cds.persistence.skip: false
extend Languages {}


@cds.persistence.skip: false
extend Currencies {}


@cds.persistence.skip: false
extend Countries {}
