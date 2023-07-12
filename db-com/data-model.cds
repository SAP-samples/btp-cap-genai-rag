
using {
      cuid,
      Country,
      Currency,
      Language
} from '@sap/cds/common';

context susaas.common {
    entity Shared : cuid {
        value : String;
    };
}


@cds.persistence.exists
entity Languages {
    Language : Language
};

@cds.persistence.exists
entity Currencies {
    Currency : Currency
};

@cds.persistence.exists
entity Countries {
    Country : Country
};