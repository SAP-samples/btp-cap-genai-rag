using {
    cuid,
    managed
} from '@sap/cds/common';

context db {

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
    }
}
