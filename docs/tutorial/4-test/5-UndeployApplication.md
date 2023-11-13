# Undeploy the Application

If you want to undeploy the (multitenant) application and all related services and resources from your **Kmya Cluster** or **Cloud Foundry** environment, please follow the steps below. 

- [Undeploy the Application](#undeploy-the-application)
  - [Undeployment prerequisites (multitenant only)](#undeployment-prerequisites-multitenant-only)
  - [Undeploy the sample application](#undeploy-the-sample-application)
  - [Check successful undeployment](#check-successful-undeployment)
  - [Further Information](#further-information)

> **Important** - For the undeployment of a multitenant solution from your Kyma Cluster or Cloud Foundry Environment, it is **essential** that **SaaS API Service Bindings** and **Service Instances** are deleted from all **Subscriber Subaccounts**, followed by deleting all existing **SaaS subscriptions** in each Subaccount! Otherwise, existing credential clones (e.g., created by XSUAA during the dependency callbacks) will not be properly removed and corresponding Services Instances cannot be deleted without further ado!


## Undeployment prerequisites (multitenant only)

In a **multitenant** setup, please delete all API Service instances from the **Consumer Subaccounts** before undeploying the actual SaaS application from your Cloud Foundry landscape or Kyma Cluster. Next, please make sure you successfully unsubscribed from the SaaS application in all **Consumer Subaccounts** before starting the undeployment process. 

> **Hint** - You can check and also remove existing subscriptions using the Subscription Management Dashboard ([click here](https://help.sap.com/docs/btp/sap-business-technology-platform/using-subscription-management-dashboard) for details). 

Ensure that your API Service Broker is properly unregistered from all **Consumer Subaccounts**. The API Service may no longer appear in the Service selection or Marketplace menu of any subscriber account. 

> **Important** - We keep in reiterating this, but properly unsubscribing from each Consumer Subaccount (unregistering all Service Broker registrations) will save you a lot of painful manual work. 


## Undeploy the sample application 

**Kyma** 

Uninstall the Helm Release of your application from the Kyma Cluster of your **Provider Subaccount** by running the following command. 

```md
helm uninstall <ReleaseName> -n <Namespace>

# Example #
helm uninstall ai(saas) -n default
```

If you are using a dedicated PostgreSQL service instance, the undeployment will take a few minutes.  


**Cloud Foundry**

Undeploy the application from the Cloud Foundry environment of your **Provider Subaccount**. 

```md
$ cf login -a https://api.cf.<<region>>.hana.ondemand.com
$ cf undeploy ai(saas) --delete-services --delete-service-keys
```

> **Important** - Please make sure to have the latest version of the Cloud Foundry CLI installed and your **multiapps plugin** ([click here](https://help.sap.com/docs/btp/sap-business-technology-platform/install-multiapps-cli-plugin-in-cloud-foundry-environment)) is up-to-date. In older versions of the multiapps plugin, the option --delete-service-keys does not exist yet! 

If you are using a dedicated PostgreSQL service instance, the undeployment will take a few minutes.  


## Check successful undeployment

**Cloud Foundry**

Check within the SAP BTP Cockpit or using the Cloud Foundry CLI, whether all Applications, Services Instances and Service Bindings have been successfully removed from your Cloud Foundry landscape in your Provider Subaccount. If any artifacts remain, please delete them manually. Please delete them manually in the following order:

- Application instances
- Service keys
- Service instances

In case of failed deletions (e.g., XSUAA, Destination Service or SaaS-Registry), please check the **General** section below! 


**Kyma**

Check within your Kyma Cluster, whether all Service Bindings, Service Instances, Secrets and Deployments have been successfully removed. You can do so using the Kyma Dashboard or the kubectl command line tool. If there are any artifacts remaining in the Kyma Cluster of your Provider Subaccount, please delete them in the following order:

- Application workloads (Deployments, ReplicaSets, Jobs, Pods)
- SAP BTP Service Bindings
- SAP BTP Service Instances
- Remaining Objects (Secrets, ConfigMaps)

Also double-check if all Istio-related objects as well as Network Policies and Config Maps have been successfully removed. In case of failed deletions (e.g., XSUAA, Destination Service or SaaS-Registry), please check the **General** section below!  


**General**

In multitenant scenarios, you might face situations, in which the deletion of the **Authorization & Trust Management** (xsuaa), the **SaaS Provisioning** or **Destination Service** fails. This is likely to happen, if you **did not properly unsubscribe** all existing tenants or did not unregister all SaaS API Service Broker registrations in your Consumer Subaccounts. 

To unregister existing API Service Broker registrations, please re-deploy the application and unregister the remaining Service Broker registrations using e.g., the **SAP BTP CLI**. If existing Consumer Subaccount subscriptions have not been properly removed, you can follow the same approach and remove the subscriptions after re-deployment. 

Alternatively, you can also use the **Subscription Management Dashboard** and delete the remaining subscriptions by skipping the dependency callback. 


## Further Information

Please use the following links to find further information on the topics above:

* [SAP Help - Undeploy Content](https://help.sap.com/docs/BTP/65de2977205c403bbc107264b8eccf4b/fab96a603a004bd992822c83d4b01370.html?locale=en-US)
* [Cloud Foundry Documentation - Using the Cloud Foundry Command Line Interface (cf CLI)](https://docs.cloudfoundry.org/cf-cli/)
* [Cloud Foundry Documentation - CLI Reference Guide (v7)](https://cli.cloudfoundry.org/en-US/v7/)
* [Cloud Foundry Documentation - CLI Reference Guide (v8)](https://cli.cloudfoundry.org/en-US/v8/)