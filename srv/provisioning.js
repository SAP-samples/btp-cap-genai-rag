const cds = require("@sap/cds");
const xsenv = require("@sap/xsenv");
const AlertNotification = require("./utils/alertNotification");
const Automator = require("./utils/automator");
const destinationSelectionStrategies = require("@sap-cloud-sdk/connectivity").DestinationSelectionStrategies;

const { ResourceGroupApi } = require("./vendor/AI_CORE_API");
const AI_CORE_DESTINATION = "PROVIDER_AI_CORE_DESTINATION";

module.exports = (service) => {
  service.on("UPDATE", "tenant", async (req, next) => {
    console.log("Subscription data:", JSON.stringify(req.data));

    const { subscribedSubdomain: subdomain, subscribedTenantId: tenant, subscribedZoneId: zone } = req.data;
    const tenantURL = `https://${subdomain}${process.env.tenantSeparator}${process.env.appDomain}`;

    const resourceGroups = await getResourceGroups();
    console.log(JSON.stringify(resourceGroups));

    await next();

    // Trigger tenant broker deployment on background
    cds.spawn({ tenant: tenant, subdomain: subdomain }, async (tx) => {
      try {
        let automator = new Automator();
        await automator.deployTenantArtifacts(tenant, subdomain);

        await createResourceGroup(zone);
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

    const { subscribedSubdomain: subdomain, subscribedTenantId: tenant } = req.data;

    await next();

    try {
      let automator = new Automator();
      await automator.undeployTenantArtifacts(tenant, subdomain);

      await deleteResourceGroup(zone);
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
      destination: { tag: "destination" }
    });

    dependencies.push({ xsappname: services.html5Runtime.uaa.xsappname });
    dependencies.push({ xsappname: services.destination.xsappname });

    console.log("SaaS Dependencies:", JSON.stringify(dependencies));

    return dependencies;
  });

  /**
   * creates a new resource group in the ai core instance with the id of the zone
   * @param {*} resourceGroupId: the zoneId of the subscriber (subscribedZoneId)
   * @returns response of creation
   */
  const createResourceGroup = async (resourceGroupId) => {
    try {
      const response = await ResourceGroupApi.kubesubmitV4ResourcegroupsCreate({
        resourceGroupId: resourceGroupId,
        // subscriber relevant labels could be worthful for future use cases
        labels: [],
      }).execute( { selectionStrategy: destinationSelectionStrategies.alwaysProvider, destinationName: AI_CORE_DESTINATION });
      return response.data;
    } catch (e) {
      console.log(e);
    }
  };

  /**
   * deletes the resource group in the ai core instance with the id of the zone
   * @param {*} resourceGroupId
   * @returns response of deletion
   */
  const deleteResourceGroup = async (resourceGroupId) => {
    try {
      const response = await ResourceGroupApi.kubesubmitV4ResourcegroupsDelete(
        resourceGroupId
      ).execute({ selectionStrategy: destinationSelectionStrategies.alwaysProvider, destinationName: AI_CORE_DESTINATION });
      return response.data;
    } catch (e) {
      console.log(e);
    }
  };

  /**
   * fetches all resource groups from the ai core instance
   * @returns response of fetching all resource groups
   */
  const getResourceGroups = async () => {
    try {
      const response =
        await ResourceGroupApi.kubesubmitV4ResourcegroupsGetAll().execute({
          destinationName: AI_CORE_DESTINATION,
          selectionStrategy: destinationSelectionStrategies.alwaysProvider
        });
      return response.data;
    } catch (e) {
      console.log(e.message);
    }
  };
};
