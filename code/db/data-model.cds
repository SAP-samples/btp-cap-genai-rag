using {
      managed,
      cuid,
      Currency,
      Country,
      Language
} from '@sap/cds/common';
//using { sap.common.Countries, sap.common.Currencies, sap.common.Languages } from '@sap/cds-common-content';

context aisaas.db {

      entity Products {
            key ID            : String(10);
                typeCode      : String(2);
                category      : String(40);
                supplierId    : String(10);
                taxTarifCode  : Integer;
                measureUnit   : String(3);
                weightMeasure : Decimal(15, 3) @Measures.ISOCurrency: weightUnit;
                weightUnit    : String(3);
                price         : Decimal(10, 3) @Measures.ISOCurrency: currency_code;
                text          : String(255);
                language      : Language;
                currency      : Currency
      }
}
