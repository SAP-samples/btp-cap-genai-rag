using {susaas.db as db} from '../db/data-model';

service PublicService @(path : '/catalog/PublicService') {
  entity Products as projection on db.Products excluding {
    createdAt,createdBy,modifiedAt,modifiedBy
  }
};
