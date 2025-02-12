##########
### Local setup
##########
resource "random_string" "gen" {
  length  = 20
  lower   = true
  upper   = false
  special = false
}

locals {
  subaccount_domain = random_string.gen.result
  subaccount_cf_org = local.subaccount_domain
}


##########
### Subaccount
##########
resource "btp_subaccount" "pbc_workshop" {
  name      = var.subaccount_name
  subdomain = local.subaccount_domain
  region    = lower(var.region)
}


##########
### Entitlements
##########
resource "btp_subaccount_entitlement" "cloud_foundry_quota" {
  subaccount_id = btp_subaccount.pbc_workshop.id
  service_name  = "APPLICATION_RUNTIME"
  plan_name     = "MEMORY"
  amount        = 1
}

resource "btp_subaccount_entitlement" "bas" {
  subaccount_id = btp_subaccount.pbc_workshop.id
  service_name  = "sapappstudio"
  plan_name     = "standard-edition"
}

resource "btp_subaccount_entitlement" "build_workzone_standard" {
  subaccount_id = btp_subaccount.pbc_workshop.id
  service_name  = "SAPLaunchpad"
  plan_name     = "standard"
}

resource "btp_subaccount_entitlement" "ai_launchpad" {
  subaccount_id = btp_subaccount.pbc_workshop.id
  service_name  = "ai-launchpad"
  plan_name     = "standard"
}

resource "btp_subaccount_entitlement" "ai_core" {
  subaccount_id = btp_subaccount.pbc_workshop.id
  service_name  = "aicore"
  plan_name     = "extended"
}

resource "btp_subaccount_entitlement" "integration_suite" {
  subaccount_id = btp_subaccount.pbc_workshop.id
  service_name  = "integrationsuite"
  plan_name     = "standard_edition"
  amount        = 1
}

resource "btp_subaccount_entitlement" "event_mesh_client" {
  subaccount_id = btp_subaccount.pbc_workshop.id
  service_name  = "event-mesh-message-client"
  plan_name     = "message-client"
  amount        = 1
}

resource "btp_subaccount_entitlement" "destination" {
  subaccount_id = btp_subaccount.pbc_workshop.id
  service_name  = "destination"
  plan_name     = "lite"
}

resource "btp_subaccount_entitlement" "hana_cloud_tools" {
  subaccount_id = btp_subaccount.pbc_workshop.id
  service_name  = "hana-cloud-tools"
  plan_name     = "tools"
}

resource "btp_subaccount_entitlement" "hana_cloud" {
  subaccount_id = btp_subaccount.pbc_workshop.id
  service_name  = "hana-cloud"
  plan_name     = "hana"
}

resource "btp_subaccount_entitlement" "hana_hdi_shared" {
  subaccount_id = btp_subaccount.pbc_workshop.id
  service_name  = "hana"
  plan_name     = "hdi-shared"
}


##########
### Environment
##########
# Creation of Cloud Foundry environment
resource "btp_subaccount_environment_instance" "cloudfoundry" {
  subaccount_id    = btp_subaccount.pbc_workshop.id
  name             = local.subaccount_cf_org
  environment_type = "cloudfoundry"
  service_name     = "cloudfoundry"
  plan_name        = "standard"
  parameters = jsonencode({
    instance_name = local.subaccount_cf_org
  })
}

resource "cloudfoundry_space" "cf_space" {
  org  = btp_subaccount_environment_instance.cloudfoundry.platform_id
  name = var.cf_space_name
}


##########
### Services Subscriptions
##########
resource "btp_subaccount_subscription" "integration_suite" {
  subaccount_id = btp_subaccount.pbc_workshop.id
  app_name      = btp_subaccount_entitlement.integration_suite.service_name
  plan_name     = btp_subaccount_entitlement.integration_suite.plan_name
}

resource "btp_subaccount_subscription" "ai_launchpad" {
  subaccount_id = btp_subaccount.pbc_workshop.id
  app_name      = btp_subaccount_entitlement.ai_launchpad.service_name
  plan_name     = btp_subaccount_entitlement.ai_launchpad.plan_name
}

resource "btp_subaccount_subscription" "build_workzone_standard" {
  subaccount_id = btp_subaccount.pbc_workshop.id
  app_name      = btp_subaccount_entitlement.build_workzone_standard.service_name
  plan_name     = btp_subaccount_entitlement.build_workzone_standard.plan_name
}

# Create app subscription to SAP Build Apps (depends on entitlement)
resource "btp_subaccount_subscription" "bas" {
  subaccount_id = btp_subaccount.pbc_workshop.id
  app_name      = btp_subaccount_entitlement.bas.service_name
  plan_name     = btp_subaccount_entitlement.bas.plan_name
}

# Create app subscription to SAP HANA Cloud Tools
resource "btp_subaccount_subscription" "hana_cloud_tools" {
  subaccount_id = btp_subaccount.pbc_workshop.id
  app_name      = btp_subaccount_entitlement.hana_cloud_tools.service_name
  plan_name     = btp_subaccount_entitlement.hana_cloud_tools.plan_name
}


##########
### Services Instances
##########

### Setup AI Core ###
# Get plan for SAP AI Core service
data "btp_subaccount_service_plan" "ai_core" {
  subaccount_id = btp_subaccount.pbc_workshop.id
  offering_name = btp_subaccount_entitlement.ai_core.service_name
  name          = btp_subaccount_entitlement.ai_core.plan_name
}

# Create service instance for SAP AI Core
resource "btp_subaccount_service_instance" "ai_core" {
  subaccount_id  = btp_subaccount.pbc_workshop.id
  serviceplan_id = data.btp_subaccount_service_plan.ai_core.id
  name           = "pbc-ai-core"
}

# Create service binding to SAP AI Core (exposed for a specific user group)
resource "btp_subaccount_service_binding" "ai_core_binding" {
  subaccount_id       = btp_subaccount.pbc_workshop.id
  service_instance_id = btp_subaccount_service_instance.ai_core.id
  name                = "pbc-ai-core-key"
}


### Setup Destination ###
# Get plan for destination service
data "btp_subaccount_service_plan" "destination" {
  subaccount_id = btp_subaccount.pbc_workshop.id
  offering_name = btp_subaccount_entitlement.destination.service_name
  name          = btp_subaccount_entitlement.destination.plan_name
}

# Create service instance for Destination
resource "btp_subaccount_service_instance" "destination" {
  subaccount_id  = btp_subaccount.pbc_workshop.id
  serviceplan_id = data.btp_subaccount_service_plan.destination.id
  name           = "destination"
  depends_on     = [btp_subaccount_service_binding.ai_core_binding]
  parameters = jsonencode({
    HTML5Runtime_enabled = true
    init_data = {
      subaccount = {
        existing_destinations_policy = "update"
        destinations = [
          # This is the destination to the ai-core binding
          {
            Description                = "[Do not delete] PROVIDER_AI_CORE_DESTINATION_HUB"
            Type                       = "HTTP"
            clientId                   = "${jsondecode(btp_subaccount_service_binding.ai_core_binding.credentials)["clientid"]}"
            clientSecret               = "${jsondecode(btp_subaccount_service_binding.ai_core_binding.credentials)["clientsecret"]}"
            "HTML5.DynamicDestination" = true
            "HTML5.Timeout"            = 5000
            Authentication             = "OAuth2ClientCredentials"
            Name                       = "PROVIDER_AI_CORE_DESTINATION_HUB"
            tokenServiceURL            = "${jsondecode(btp_subaccount_service_binding.ai_core_binding.credentials)["url"]}/oauth/token"
            ProxyType                  = "Internet"
            URL                        = "${jsondecode(btp_subaccount_service_binding.ai_core_binding.credentials)["serviceurls"]["AI_API_URL"]}/v2"
            tokenServiceURLType        = "Dedicated"
          }
        ]
      }
    }
  })
}

### Setup HANA Cloud ###
# Get plan for SAP HANA Cloud
data "btp_subaccount_service_plan" "hana_cloud" {
  subaccount_id = btp_subaccount.pbc_workshop.id
  offering_name = btp_subaccount_entitlement.hana_cloud.service_name
  name          = btp_subaccount_entitlement.hana_cloud.plan_name
}

# Create service instance for HANA Cloud
resource "btp_subaccount_service_instance" "hana_cloud" {
  subaccount_id  = btp_subaccount.pbc_workshop.id
  serviceplan_id = data.btp_subaccount_service_plan.hana_cloud.id
  name           = "pbc-hana-cloud"
  parameters = jsonencode({
    "data" : {
      "memory" : 32,
      "storage" : 120,
      "vcpu" : 2,
      "additionalWorkers" : 0,
      "systempassword" : "${var.hana_system_password}",
      "edition" : "cloud",
      "disasterRecoveryMode" : "no_disaster_recovery",
      "enabledservices" : {
        "scriptserver" : false,
        "docstore" : false,
        "dpserver" : false,
        "pal" : false,
        "nlp" : false
      },
      "slaLevel" : "standard",
      "allow_all" : false,
      "whitelistIPs" : [],
      "databaseMappings" : [{
        "platform" : "cloudfoundry",
        "organization_guid" : "${btp_subaccount_environment_instance.cloudfoundry.platform_id}",
        "space_guid" : "${cloudfoundry_space.cf_space.id}"
      }]
    }
  })
  depends_on = [
    cloudfoundry_space_role.cf_space_manager,
    btp_subaccount_role_collection_assignment.hana_cloud_admin
  ]
  timeouts = {
    create = "45m"
    update = "45m"
    delete = "45m"
  }
}

# Create service binding to SAP HANA Cloud
resource "btp_subaccount_service_binding" "hana_cloud" {
  subaccount_id       = btp_subaccount.pbc_workshop.id
  service_instance_id = btp_subaccount_service_instance.hana_cloud.id
  name                = "pbc-hana-cloud-key"
}


##########
### Roles
##########
resource "cloudfoundry_space_role" "cf_space_manager" {
  space    = cloudfoundry_space.cf_space.id
  origin   = var.cf_user_origin
  type     = "space_manager"
  for_each = toset(var.admins)
  username = each.value
}

resource "cloudfoundry_space_role" "cf_space_developer" {
  space    = cloudfoundry_space.cf_space.id
  origin   = var.cf_user_origin
  type     = "space_developer"
  for_each = toset(var.developers)
  username = each.value
}

resource "btp_subaccount_role_collection_assignment" "subaccount_admin" {
  subaccount_id        = btp_subaccount.pbc_workshop.id
  role_collection_name = "Subaccount Administrator"
  for_each             = toset(var.admins)
  user_name            = each.value
}

resource "btp_subaccount_role_collection_assignment" "subaccount_viewer" {
  subaccount_id        = btp_subaccount.pbc_workshop.id
  role_collection_name = "Subaccount Viewer"
  for_each             = toset(var.developers)
  user_name            = each.value
}

resource "btp_subaccount_role_collection_assignment" "hana_cloud_admin" {
  subaccount_id        = btp_subaccount_subscription.hana_cloud_tools.subaccount_id
  role_collection_name = "SAP HANA Cloud Administrator"
  for_each             = toset(var.admins)
  user_name            = each.value
}

resource "btp_subaccount_role_collection_assignment" "build_workzone_standard_admin" {
  subaccount_id        = btp_subaccount_subscription.build_workzone_standard.subaccount_id
  role_collection_name = "Launchpad_Admin"
  for_each             = toset(var.admins)
  user_name            = each.value
}

resource "btp_subaccount_role_collection_assignment" "bas_admin" {
  subaccount_id        = btp_subaccount_subscription.bas.subaccount_id
  role_collection_name = "Business_Application_Studio_Administrator"
  for_each             = toset(var.admins)
  user_name            = each.value
}

resource "btp_subaccount_role_collection_assignment" "bas_dev" {
  subaccount_id        = btp_subaccount_subscription.bas.subaccount_id
  role_collection_name = "Business_Application_Studio_Developer"
  for_each             = toset(var.developers)
  user_name            = each.value
}

resource "btp_subaccount_role_collection_assignment" "integration_suite_admin" {
  subaccount_id        = btp_subaccount_subscription.integration_suite.subaccount_id
  role_collection_name = "Integration_Provisioner"
  for_each             = toset(var.admins)
  user_name            = each.value
}

resource "btp_subaccount_role_collection_assignment" "ailaunchpad_genai_manager" {
  subaccount_id        = btp_subaccount_subscription.ai_launchpad.subaccount_id
  role_collection_name = "ailaunchpad_genai_manager"
  for_each             = toset(var.admins)
  user_name            = each.value
}

resource "btp_subaccount_role_collection_assignment" "ailaunchpad_allow_all_resourcegroups" {
  subaccount_id        = btp_subaccount_subscription.ai_launchpad.subaccount_id
  role_collection_name = "ailaunchpad_allow_all_resourcegroups"
  for_each             = toset(var.admins)
  user_name            = each.value
}

resource "btp_subaccount_role_collection_assignment" "ailaunchpad_connections_editor" {
  subaccount_id        = btp_subaccount_subscription.ai_launchpad.subaccount_id
  role_collection_name = "ailaunchpad_connections_editor"
  for_each             = toset(var.admins)
  user_name            = each.value
}

resource "btp_subaccount_role_collection_assignment" "ailaunchpad_mloperations_editor" {
  subaccount_id        = btp_subaccount_subscription.ai_launchpad.subaccount_id
  role_collection_name = "ailaunchpad_mloperations_editor"
  for_each             = toset(var.admins)
  user_name            = each.value
}

resource "btp_subaccount_role_collection_assignment" "ailaunchpad_aicore_admin_editor" {
  subaccount_id        = btp_subaccount_subscription.ai_launchpad.subaccount_id
  role_collection_name = "ailaunchpad_aicore_admin_editor"
  for_each             = toset(var.admins)
  user_name            = each.value
}

resource "btp_subaccount_role_collection_assignment" "ailaunchpad_functions_explorer_editor_v2" {
  subaccount_id        = btp_subaccount_subscription.ai_launchpad.subaccount_id
  role_collection_name = "ailaunchpad_functions_explorer_editor_v2"
  for_each             = toset(var.admins)
  user_name            = each.value
}
