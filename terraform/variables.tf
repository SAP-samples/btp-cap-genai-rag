variable "btp_username" {
  type        = string
  description = "SAP BTP username."
  // default     = ""
}

variable "btp_password" {
  type        = string
  description = "SAP BTP password."
  sensitive   = true
  // default     = ""
}

variable "globalaccount_id" {
  type        = string
  description = "The global account ID."
  // default     = ""
}

variable "subaccount_name" {
  type        = string
  description = "The subaccount name."
  default     = "GenAI Mail Insights"
}

variable "region" {
  type        = string
  description = "The region where the sub account shall be created in."
  default     = "ap10"
}

/* variable "cf_access_token" {
  type        = string
  sensitive   = true
  description = "OAuth token to authenticate with Cloud Foundry"
  // default     = ""
}

variable "cf_refresh_token" {
  type        = string
  sensitive   = true
  description = "Token to refresh the CF access token"
  // default     = ""
} */

variable "cf_api_url" {
  type        = string
  description = "Cloud Foundry Environment API Endpoint"
  default     = "https://api.cf.ap10.hana.ondemand.com"
}

variable "cf_user_origin" {
  type        = string
  description = "The identity provider for the UAA user"
  default     = "sap.ids"
}

variable "cf_space_name" {
  type        = string
  description = "Name of the Cloud Foundry space."
  default     = "dev"
}

variable "admins" {
  type        = list(string)
  description = "Defines the colleagues who are added to the subaccount as administrators."
  default     = []
}

variable "developers" {
  type        = list(string)
  description = "Defines the colleagues who are added to the subaccount as developers."
  default     = []
}

variable "hana_system_password" {
  type        = string
  description = "The password of the database 'superuser' DBADMIN."
  sensitive   = true
  // default     = ""

  # add validation to check if the password is at least 8 characters long
  validation {
    condition     = length(var.hana_system_password) > 7
    error_message = "The hana_system_password must be at least 8 characters long."
  }

  # add validation to check if the password contains at least one upper case
  validation {
    condition     = can(regex("[A-Z]", var.hana_system_password))
    error_message = "The hana_system_password must contain at least one upper case."
  }

  # add validation to check if the password contains at least two lower case characters that can occur on arbitrary places in the string (not necessarily in a row)
  validation {
    condition     = length(regexall("[a-z]", var.hana_system_password)) > 1
    error_message = "The hana_system_password must contain at least two lower case characters."
  }

  # add validation to check if the password contains at least one numeric character
  validation {
    condition     = can(regex("[0-9]", var.hana_system_password))
    error_message = "The hana_system_password must contain at least one numeric character."
  }
}
