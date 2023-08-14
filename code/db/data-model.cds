using {
      cuid,
      managed
} from '@sap/cds/common';

context aisaas.db {

      type Fact : {
            fact      : String;
            factTitle : String;
            value     : String;
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

      entity Mails : cuid, managed, Mail  {
            facts       : Composition of many Facts
                                on facts.mail = $self;
      }

      entity Facts : Fact {
            key mail      : Association to Mails;
            key fact      : String;
      }
}
