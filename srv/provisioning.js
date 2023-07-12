const cds = require("@sap/cds");
const xsenv = require("@sap/xsenv");
const AlertNotification = require("./utils/alertNotification");
const Automator = require("./utils/automator");
const executeHttpRequest =
  require("@sap-cloud-sdk/http-client").executeHttpRequest;
const destinationSelectionStrategies =
  require("@sap-cloud-sdk/connectivity").DestinationSelectionStrategies;

const { ResourceGroupApi } = require("./vendor/AI_CORE_API");
const AI_CORE_DESTINATION = "PROVIDER_AI_CORE_DESTINATION";

module.exports = (service) => {
  service.on("UPDATE", "tenant", async (req, next) => {
    console.log("Subscription data:", JSON.stringify(req.data));

    const { subscribedSubdomain: subdomain, subscribedTenantId: tenant } =
      req.data;
    const tenantURL = `https://${subdomain}${process.env.tenantSeparator}${process.env.appDomain}`;

    await next();

    // Trigger tenant broker deployment on background
    cds.spawn({ tenant: tenant, subdomain: subdomain }, async (tx) => {
      try {
        let automator = new Automator();
        await automator.deployTenantArtifacts(tenant, subdomain);

        // Get Resource groups
        try {
          const response = await executeHttpRequest(
            {
              destinationName: "AI_CORE_API",
              selectionStrategy: destinationSelectionStrategies.alwaysProvider,
            },
            { method: "get", url: `/admin/resourceGroups`, params: {} }
          );
          console.log(JSON.stringify(response));
        } catch (error) {
          console.log(`Error message: ${error.message}`);
        }

        console.log("Success: Onboarding completed!");
      } catch (error) {
        const alertNotification = new AlertNotification();

        // Send generic alert using Alert Notification
        alertNotification.sendEvent({
          type: "GENERIC",
          data: {
            subject:
              "Error: Automation skipped because of error during subscription",
            body: JSON.stringify(error.message),
            eventType: "alert.app.generic",
            severity: "FATAL",
            category: "ALERT",
          },
        });
        console.error(
          "Error: Automation skipped because of error during subscription"
        );
        console.error(`Error: ${error.message}`);
      }
    });
    return tenantURL;
  });

  service.on("DELETE", "tenant", async (req, next) => {
    console.log("Unsubscribe Data: ", JSON.stringify(req.data));

    const { subscribedSubdomain: subdomain, subscribedTenantId: tenant } =
      req.data;

    await next();

    try {
      let automator = new Automator();
      await automator.undeployTenantArtifacts(tenant, subdomain);

      console.log("Success: Unsubscription completed!");
    } catch (error) {
      const alertNotification = new AlertNotification();

      // Send generic alert using Alert Notification if service binding exists
      alertNotification.bindingExists
        ? alertNotification.sendEvent({
            type: "GENERIC",
            data: {
              subject:
                "Error: Automation skipped because of error during unsubscription!",
              body: JSON.stringify(error.message),
              eventType: "alert.app.generic",
              severity: "FATAL",
              category: "ALERT",
            },
          })
        : "";

      console.error(
        "Error: Automation skipped because of error during unsubscription"
      );
      console.error(`Error: ${error.message}`);
    }
    return tenant;
  });

  service.on("upgradeTenant", async (req, next) => {
    await next();

    const { instanceData, deploymentOptions } = cds.context.req.body;
    console.log(
      "UpgradeTenant: ",
      req.data.subscribedTenantId,
      req.data.subscribedSubdomain,
      instanceData,
      deploymentOptions
    );
  });

  service.on("dependencies", async (req, next) => {
    let dependencies = await next();

    const services = xsenv.getServices({
      html5Runtime: { tag: "html5-apps-repo-rt" },
      destination: { tag: "destination" },
      aicore: { label: "aicore" },
    });

    dependencies.push({ xsappname: services.html5Runtime.uaa.xsappname });
    dependencies.push({ xsappname: services.destination.xsappname });
    dependencies.push({ xsappname: services.aicore.appname });

    console.log("SaaS Dependencies:", JSON.stringify(dependencies));

    return dependencies;
  });

  /**
   *
   * @param {*} resourceGroupId: the zoneId of the subscriber (subscribedZoneId)
   * @returns response of creation
   */
  const createResourceGroup = async (resourceGroupId) => {
    try {
      const response = await ResourceGroupApi.kubesubmitV4ResourcegroupsCreate({
        resourceGroupId: resourceGroupId,
        // subscriber relevant labels could be worthful for future use cases
        labels: [
          {
            key: "timestamp",
            value: new Date().toISOString(),
          },
        ],
      }).execute({ destinationName: AI_CORE_DESTINATION });
      return response.data;
    } catch (e) {
      console.log(e);
    }
  };

  /**
   * @param {*} resourceGroupId
   */
  const deleteResourceGroup = async (resourceGroupId) => {
    try {
      const response = await ResourceGroupApi.kubesubmitV4ResourcegroupsDelete(
        resourceGroupId
      ).execute({ destinationName: AI_CORE_DESTINATION });
      return response.data;
    } catch (e) {
      console.log(e);
    }
  };

  const getResourceGroups = async () => {
    try {
      const response =
        await ResourceGroupApi.kubesubmitV4ResourcegroupsGetAll().execute({
          destinationName: AI_CORE_DESTINATION,
        });
      return response.data;
    } catch (e) {
      console.log(e);
    }
  };
};

/**
 {

    "subscriptionAppName": "susaas-dev-tfe-saas-ai-dev-srumi98b",
    "subscriptionAppId": "susaas-dev!t245397",
    "subscribedTenantId": "043145ac-5713-4eb6-9c60-c5dcc90324f9",
    "subscribedSubaccountId": "043145ac-5713-4eb6-9c60-c5dcc90324f9",
    "providerSubaccountId": "3feb0790-498e-45c1-bcc6-2d1350ef6563",
    "subscriptionGUID": "8c0c6573-73cb-4e1c-b13c-40b6c3e91e9c",
    "subscribedZoneId": "043145ac-5713-4eb6-9c60-c5dcc90324f9",
    "subscribedSubdomain": "tfe-saas-ai-tenant-scfwxz2z",
    "subscribedLicenseType": "DEVELOPER",
    "subscriptionAppPlan": "default",
    "userId": "martin.frick@sap.com",
    "userInfo": {
        "userId": "martin.frick@sap.com",
        "userGuid": "53eb858d-7e26-49a7-8e2c-40190d2013cb",
        "userName": "martin.frick@sap.com",
        "email": "martin.frick@sap.com",
        "subIdp": "I521672",
        "sub": "53eb858d-7e26-49a7-8e2c-40190d2013cb"
    },
    "additionalInformation": {
        "tenantMetadataUrl": "https://tfe-saas-ai-tenant-scfwxz2z.authentication.eu10.hana.ondemand.com/saml/metadata"
    },
    "globalAccountGUID": "4c28a87c-ca19-45be-b884-ec6a6b3a1226",
    "eventType": "CREATE"
}
 */
