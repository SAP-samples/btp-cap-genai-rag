using {aisaas.db as db} from '../../db/data-model';

service PublicService  @(
     path    : '/catalog/PublicService',
     protocol: 'odata-v4',
     impl    : 'srv/public-service'
) {

    entity Mails as projection on db.Mails;

    function getMail(id : UUID)                    returns {
        mail : db.Mail;
        closestMails : array of {
            similarity : Double;
            mail : db.Mail
        };
    };

    function getMails()                            returns array of db.Mail;


    action   addMails(mails : array of String)     returns array of {
        id : String;
        mail : String;
        insights : {
            sentiment : Integer;
            urgency : Integer;
            category : String;
            translation : String;
            response : String;
            facts : array of db.Fact;
        }
    };

    action   inference(prompt : String)            returns {
        text : String;
    };

    action   embed(texts : array of String)        returns {
        success : Boolean;
        error : String;
    };

    action   simSearch(text : String, k : Integer) returns {
        result : array of {
            pageContent : String;
            metadata : {
                a : Integer;
            }
        }
    };

    function pgvalue()                             returns String;
};
