using {aisaas.db as db} from '../db/data-model';

@path: '/catalog/PublicService'
service PublicService {
    entity Products as projection on db.Products excluding {
        createdAt,
        createdBy,
        modifiedAt,
        modifiedBy
    }

    function inference() returns {};
};
