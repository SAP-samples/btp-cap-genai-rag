using {aisaas.db as db} from '../db/data-model';

@path: '/catalog/PublicService'
service PublicService {

    entity Mails as projection on db.Mails;
    type IMails : db.Mails {};

    action   inference(prompt : String)            returns {
        text : String
    };

    action   embed(texts : array of String)        returns {
        success : Boolean;
        error : String;
    };

    function getMail(id : UUID)                    returns {
        mail : IMails;
        closestMails : array of {
            similarity : Double;
            mail : IMails
        };
    };

    action   addMails(mails : array of String) returns array of {
        id : String;
        mail : String;
        insights : {
            sentiment : Integer;
            urgency : Integer;
            category : String;
            translation : String;
            response : String;
            facts : array of Fact;
        } 
    };

    type Fact {
        fact      : String;
        factTitle : String;
        value     : String;
    };


    action   simSearch(text : String, k : Integer) returns {
        result : array of {
            pageContent : String;
            metadata : {
                a : Integer
            }
        }
    };

    function pgvalue()                             returns String;
};
