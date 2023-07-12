using { susaas.db, PublicService, sap } from 'susaas';
namespace x_susaas.extension;

@cds.autoexpose
define entity x_Priority as select key priority.code : String, priority.name : String from (
    select 'Low' as code, 'Low' as name from db.Dummy union
    select 'Medium' as code, 'Medium' as name from db.Dummy union
    select 'High' as code, 'High' as name from db.Dummy
) as priority;

@cds.autoexpose
define entity x_Status as select key status.code : String, status.name : String from (
    select 'Initial' as code, 'Initial' as name from db.Dummy union
    select 'Open' as code, 'Open' as name from db.Dummy union
    select 'Final' as code, 'Final' as name from db.Dummy
) as status;


extend db.Assessments with  {
  x_status      : Association to one x_Status @title: '{i18n>status}' @Common.Text : x_status.name  @Common.TextArrangement : #TextOnly;
  x_priority    : Association to one x_Priority @title: '{i18n>priority}' @Common.Text : x_priority.name  @Common.TextArrangement : #TextOnly;
  x_contact     : Association to one db.Users  @title: '{i18n>contact}' @Common.Text : x_contact.fullName  @Common.TextArrangement : #TextOnly;
  x_validFrom   : Date @title: '{i18n>validFrom}';
  x_validTo     : Date @title: '{i18n>validTo}';
  x_notes       : String @title: '{i18n>notes}';
}
