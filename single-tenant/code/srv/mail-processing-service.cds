using {db} from '../db/schema';

@requires: 'authenticated-user'
service MailInsightsService {
    entity Mails as projection on db.Mails;
    function getMails()                           returns array of Mails;

    function getMail(id : UUID)                   returns {
        mail : Association to Mails;
        closestMails : array of {
            similarity : Double;
            mail : Association to Mails;
        };
    };

    function deleteMail(id : UUID)                returns Boolean;

    type IBaseMail {
        sender  : String;
        subject : String;
        body    : String;
    }

    action   addMails(mails : array of IBaseMail) returns array of {
        id : String;
        mail : String;
        insights : {
            sentiment : Integer;
            urgency : Integer;
            category : String;
            translationSubject : String;
            translationBody : LargeString;
            summary : String;
            response : String;
        }
    };

    action   recalculateInsights()                returns Boolean;
}
