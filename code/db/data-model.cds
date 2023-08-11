using {
      cuid,
      managed
} from '@sap/cds/common';

context aisaas.db {
      entity Mails : cuid, managed {
            subject     : String;
            body        : LargeString;
            sentiment   : Integer;
            urgency     : Integer;
            category    : String;
            translation : LargeString;
            response    : LargeString;
            facts       : Composition of many Facts
                                on facts.mail = $self;
      }

      entity Facts {
            key mail      : Association to Mails;
            key fact      : String;
                factTitle : String;
                value     : String;
      }
}
