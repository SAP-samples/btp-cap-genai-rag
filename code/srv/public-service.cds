using {aisaas.db as db} from '../db/data-model';

@path: '/catalog/PublicService'
service PublicService {
    entity Products as projection on db.Products excluding {
        createdAt,
        createdBy,
        modifiedAt,
        modifiedBy
    }

    action   inference(prompt : String)            returns {
        text : String
    };

    action   embed(texts : array of String)        returns {
        success : Boolean;
        error : String;
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
