using {
      cuid,
      managed
} from '@sap/cds/common';

context aisaas.db {

      entity Mails : cuid, managed {
            sender             : String;
            subject            : String;
            body               : LargeString;
            category           : String;
            sentiment          : Integer;
            urgency            : Integer;
            summary            : String;
            translationSubject : String;
            translationBody    : LargeString;
            translationSummary : String;
            potentialResponse  : LargeString;
            facts              : Composition of many Facts
                                       on facts.mail = $self;
      }

      entity Facts {
            key mail      : Association to Mails;
                fact      : String;
                factTitle : String;
                value     : String;
      }

      entity CustomFields : cuid, managed {
            title       : String;
            isNumber    : Boolean;
            description : String;
      }
}
