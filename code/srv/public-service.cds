using {aisaas.db as db} from '../db/data-model';

@path: '/catalog/PublicService'
service PublicService {

    entity Mails as projection on db.Mails;
    type IMail : db.Mails {};
    type IFact : db.Facts {};

    type Fact {
        fact      : String;
        factTitle : String;
        value     : String;
    }

    function getMail(id : UUID)                    returns {
        mail : IMail;
        closestMails : array of {
            similarity : Double;
            mail : IMail;
        };
    };

    function getMails()                            returns array of IMail;


    action   addMails(mails : array of String)     returns array of {
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
