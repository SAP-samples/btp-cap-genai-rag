using ApiService as ApiService from './api-service';

annotate ApiService with @(
    requires: 'authenticated-user',
    impl: 'srv/api-service'
);
