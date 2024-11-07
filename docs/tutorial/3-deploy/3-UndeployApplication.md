# Undeploy the Application

If you want to undeploy the application and all related services and resources from your **Cloud Foundry** environment, please perform the following steps:

```md
$ cf login -a https://api.cf.<<region>>.hana.ondemand.com
$ cf undeploy ai(saas) --delete-services --delete-service-keys
```

> **Important** - Please make sure to have the latest version of the Cloud Foundry CLI installed and your **multiapps plugin** ([click here](https://help.sap.com/docs/btp/sap-business-technology-platform/install-multiapps-cli-plugin-in-cloud-foundry-environment)) is up-to-date. In older versions of the multiapps plugin, the option --delete-service-keys does not exist yet!

## Check successful undeployment

**Cloud Foundry**

Check within the SAP BTP Cockpit or using the Cloud Foundry CLI, whether all Applications, Services Instances and Service Bindings have been successfully removed from your Cloud Foundry landscape in your Provider Subaccount. If any artifacts remain, please delete them manually. Please delete them manually in the following order:

- Application instances
- Service keys
- Service instances

In case of failed deletions (e.g., XSUAA, Destination Service or SaaS-Registry), please check the **General** section below!

## Further Information

Please use the following links to find further information on the topics above:

- [SAP Help - Undeploy Content](https://help.sap.com/docs/BTP/65de2977205c403bbc107264b8eccf4b/fab96a603a004bd992822c83d4b01370.html?locale=en-US)
- [Cloud Foundry Documentation - Using the Cloud Foundry Command Line Interface (cf CLI)](https://docs.cloudfoundry.org/cf-cli/)
- [Cloud Foundry Documentation - CLI Reference Guide (v7)](https://cli.cloudfoundry.org/en-US/v7/)
- [Cloud Foundry Documentation - CLI Reference Guide (v8)](https://cli.cloudfoundry.org/en-US/v8/)
