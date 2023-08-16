using {aisaas.db} from '../../db/data-model';

service ApiService @(
     path    : '/rest/api',
     protocol: 'rest',
     requires: 'authenticated-user',
     impl    : 'srv/api-service'
) {

     // Sample entities for CREATE, READ, UPDATE, DELETE

}
