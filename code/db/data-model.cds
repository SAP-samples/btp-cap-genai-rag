using {
      cuid,
      managed
} from '@sap/cds/common';

context aisaas.db {

      entity Mails : cuid, managed, Mail {
            facts : Composition of many Facts
                          on facts.mail = $self;
      }

      type Mail : {
            subject     : String;
            body        : LargeString;
            sentiment   : Integer;
            urgency     : Integer;
            category    : String;
            translation : LargeString;
            response    : LargeString;
            facts       : array of Fact;
      }

      entity Facts : Fact {
            key mail : Association to Mails;
            key fact : String;
      }

      type Fact : {
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
