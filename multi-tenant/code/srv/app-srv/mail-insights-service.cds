using {aisaas.db as db} from '../../db/data-model';

@(requires: [
    'Admin',
    'Member',
    'system-user'
])
service MailInsightsService @(
    path    : 'mail-insights',
    protocol: 'odata-v4'
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
        } ;
    } ;

    // Delete a single mail
    function deleteMail(id : UUID)                                                                              returns Boolean;
    // Add new mails
    action   addMails(mails : array of db.BaseMail, rag : Boolean null)                                         returns array of Mails;
    // Regenerate a single response
    action   regenerateResponse(id : UUID, rag : Boolean null, additionalInformation : String null)             returns Mails;
    // Regenerate insights of all mails
    action   regenerateInsights(rag : Boolean null)                                                             returns Boolean;
    // Translates response to original language
    action   translateResponse(id : UUID, response : String)                                                    returns String;
    // Submits response in working language
    action   submitResponse(id : UUID, response : String)                                                       returns Boolean;
};
