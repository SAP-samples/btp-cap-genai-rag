using {aisaas.db} from '../../db/data-model';

@requires: 'authenticated-user'
service ApiService @(
     path    : 'api',
     protocol: 'rest',
     impl    : 'srv/api-service'
) {
     entity Mails as projection on db.Mails;
     entity Facts as projection on db.Facts;

     function getMail(id : UUID)                   returns {
          mail : Association to Mails;
          closestMails : array of {
               similarity : Double;
               mail : Association to Mails;
          };
     };

     function getMails()                           returns array of Mails;
     action   recalculateInsights()                returns Boolean;
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
}
