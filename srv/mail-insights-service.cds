using {ai.db as db} from '../db/data-model';

@(requires: [
    'Member',
    'Admin',
    'system-user'
])
service MailInsightsService @(
    path    : 'mail-insights',
    protocol: 'odata-v4'
) {
    entity Mails as
        projection on db.Mails
        excluding {
            embedding
        };

    // Get all mails (compact)
    function getMails()                                                                             returns array of Mails;

    // Get single mail incl. closest mails
    function getMail(id : UUID)                                                                     returns {
        mail : Association to Mails;
        closestMails : array of {
            similarity : Double;
            mail : Association to Mails;
        };
    };

    // Delete a single mail
    action   deleteMail(id : UUID)                                                                  returns Boolean;
    // Add new mails
    action   addMails(mails : array of db.BaseMail, rag : Boolean null)                             returns array of Mails;
    // Regenerate a single response
    action   regenerateResponse(id : UUID, rag : Boolean null, additionalInformation : String null) returns Mails;
    // Submits response in working language
    action   submitResponse(id : UUID, response : String)                                           returns Boolean;
    // Revoke answered status
    action   revokeResponse(id : UUID)                                                              returns Boolean;
};
