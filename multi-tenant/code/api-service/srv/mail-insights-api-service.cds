using {aisaas.db} from '../../db/data-model';

@(requires: ['system-user'])
service ApiService @(
     path    : 'api/mail-insights',
     protocol: 'rest',
     impl    : 'srv/mail-insights-api-service'
) {
     type IBaseMail {
          sender  : String;
          subject : String;
          body    : String;
     }

     entity Mails        as projection on db.Mails;
     entity CustomFields as projection on db.CustomFields;

     function getMails()                                                          returns array of Mails;
     function getMail(id : UUID)                                                  returns {
          mail : Association to Mails;
          closestMails : array of {
               similarity : Double;
               mail : Association to Mails;
          };
     };
     function deleteMail(id : UUID)                                               returns Boolean;

     action   addMails(mails : array of IBaseMail)                                returns array of Mails;
     action   recalculateInsights()                                               returns Boolean;
     action   recalculateResponse(id : UUID, additionalInformation : String null) returns Boolean;
}
