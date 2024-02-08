using {sample.db as db} from '../db/schema';

@requires: 'authenticated-user'
service SampleService {
    entity Documents as
        projection on db.Documents
        excluding {
            embedding
        };

    entity DocumentWithSimilarity {
        document   : Association to Documents;
        similarity : Double;
    }

    action embed(text : String)            returns Boolean;
    action search(text : String)           returns array of DocumentWithSimilarity;
    action chatCompletion(prompt : String) returns String;
};
