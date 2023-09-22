using {
      cuid,
      managed
} from '@sap/cds/common';

context aisaas.db {

      type KeyFacts {
            keyfact         : String;
            keyfactcategory : String;
      }

      type CustomField {
            title : String;
            value : String
      }

      type Translation {
            sender            :      String;
            subject           :      String;
            body              :      LargeString;
            summary           :      String;
            responseBody      :      LargeString;
            customFields      : many CustomField;
            keyFacts          : many KeyFacts;
            requestedServices : many String;
      }

      entity Mails : cuid, managed {
            sender                 :      String;
            senderEmailAddress     :      String;
            subject                :      String;
            body                   :      LargeString;
            category               :      String;
            sentiment              :      Integer;
            urgency                :      Integer;
            summary                :      String;
            responseBody           :      LargeString;
            languageNameDetermined :      String;
            languageMatch          :      Boolean;
            requestedServices      : many String;
            suggestedActions       : many String;
            customFields           : many CustomField;
            keyFacts               : many KeyFacts;
            translations           : many Translation;
      }

      entity CustomFields {
            title       : String;
            isNumber    : Boolean;
            description : String;
      };
}
