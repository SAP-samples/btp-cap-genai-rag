output "subaccount_id" {
  value       = btp_subaccount.pbc_workshop.id
  description = "The ID of the subaccount."
}

output "cf_api_url" {
  value       = jsondecode(btp_subaccount_environment_instance.cloudfoundry.labels)["API Endpoint"]
  description = "The Cloudfoundry API endpoint."
}

output "cf_landscape_label" {
  value       = btp_subaccount_environment_instance.cloudfoundry.landscape_label
  description = "The Cloudfoundry landscape label."
}

output "cf_org_id" {
  value       = jsondecode(btp_subaccount_environment_instance.cloudfoundry.labels)["Org ID"]
  description = "The Cloudfoundry org id."
}

output "hana_cloud_tools_url" {
  value = btp_subaccount_subscription.hana_cloud_tools.subscription_url
}
