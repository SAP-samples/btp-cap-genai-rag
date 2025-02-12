terraform {
  required_providers {
    cloudfoundry = {
      source  = "cloudfoundry/cloudfoundry"
      version = "~>1.2.0"
    }
    btp = {
      source  = "SAP/btp"
      version = "~>1.9.0"
    }
  }
}

// See documentation: https://registry.terraform.io/providers/SAP/btp/latest
provider "btp" {
  globalaccount = var.globalaccount_id
  username      = var.btp_username
  password      = var.btp_password
}

// See documentation: https://registry.terraform.io/providers/cloudfoundry/cloudfoundry/latest
provider "cloudfoundry" {
  api_url  = var.cf_api_url
  user     = var.btp_username
  password = var.btp_password
  // access_token  = var.cf_access_token
  // refresh_token = var.cf_refresh_token
}
