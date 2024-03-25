using {
      cuid,
      managed
} from '@sap/cds/common';

context ai.db {

      type KeyFact {
            fact     : String;
            category : String;
      }

      type Action {
            type          : String;
            value         : String;
            virtual descr : String
      }

      type BaseMail {
            subject            : String;
            body               : String;
            senderEmailAddress : String;
      }

      entity Translations : cuid {
            sender            :      String;
            subject           :      String;
            body              :      LargeString;
            summary           :      String;
            responseBody      :      LargeString;
            keyFacts          : many KeyFact;
            requestedServices : many String;
      }

      entity Mails : managed, cuid {
            subject                :      String;
            body                   :      LargeString;
            senderEmailAddress     :      String;
            sender                 :      String;
            responded              :      Boolean default false;
            category               :      String;
            sentiment              :      Integer;
            urgency                :      Integer;
            summary                :      String;
            responseBody           :      LargeString;
            languageNameDetermined :      String;
            languageMatch          :      Boolean;
            embedding              :      Vector(1536);
            translation            :      Composition of Translations;
            requestedServices      : many String;
            suggestedActions       : many Action;
            keyFacts               : many KeyFact;
      }
}