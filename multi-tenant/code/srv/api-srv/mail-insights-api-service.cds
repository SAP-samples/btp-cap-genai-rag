using {aisaas.db} from '../../db/data-model';

@(requires: ['system-user'])
service MailInsightsApiService @(
     path    : 'api/mail-insights',
     protocol: 'rest'
) {
    entity Mails as projection on db.Mails;
    // Get all mails (compact)
    function getMails()                                                                                        returns array of Mails;

    // Get single mail incl. closest mails
    function getMail(id : UUID)                                                                                returns {
        mail : Association to Mails;
        closestMails : array of {
            similarity : Double;
            mail : Association to Mails;
        };
    };

    // Delete a single mail
    function deleteMail(id : UUID)                                                                             returns Boolean;
    // Add new mails
    action   addMails(mails : array of db.BaseMail, rag : Boolean null)                                        returns array of Mails;
}
