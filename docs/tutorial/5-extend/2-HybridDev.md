# Hybrid Development

In this chapter, you will learn how to set up a hybrid testing environment. Hybrid in this case means, consuming all backing services from SAP BTP, while your application logic is executed on your local development environment. This allows you to conduct more realistic debugging scenarios.

- [Hybrid Development](#hybrid-development)
  - [SAP BTP, Kyma Runtime](#sap-btp-kyma-runtime)
  - [SAP BTP, Cloud Foundry Runtime](#sap-btp-cloud-foundry-runtime)
  - [General Steps](#general-steps)

While the chapter appears to be quite comprehensive, please consider this is a one-time action, which does not need to be repeated once configured. Before starting, please ensure that you deployed and already subscribed to the GenAI Mail Insights application within a Subscriber Subaccount. 


## SAP BTP, Kyma Runtime

1. For starting the hybrid development, you must have installed the GenAI Mail Insights application on your Kyma Cluster using **helm install** as described in the previous tutorial steps.

2. Once the application is installed and all Service Instances are created please run the following commands, to create the respective **.cdsrc-private.json** files required for hybrid testing.

   **App Service**

   ```sh
   # Run in ./(multi/single)-tenant/code #

   # Single-Tenant 
   cds bind -2 <ReleaseName>-srv-destination,<ReleaseName>-srv-xsuaa,<ReleaseName>-srv-hana --on k8s --for hybrid
   cds bind postgresql-db -2 <ReleaseName>-srv-postgresql-db --kind postgresql-db --on k8s --for hybrid
   
   # Multitenant
   cds bind -2 <ReleaseName>-srv-destination,<ReleaseName>-srv-xsuaa --on k8s --for hybrid-app
   cds bind hana -2 <ReleaseName>-srv-hana --kind hana --on k8s --for hybrid-app
   cds bind sm-admin -2 <ReleaseName>-srv-sm-admin --kind service-manager --on k8s --for hybrid-app
   cds bind saas-registry -2 <ReleaseName>-srv-saas-registry --kind saas-registry --on k8s --for hybrid-app
   cds bind sm-container -2 <ReleaseName>-srv-sm-container --kind service-manager --on k8s --for hybrid-app
   cds bind postgresql-db -2 <ReleaseName>-srv-postgresql-db --kind postgresql-db --on k8s --for hybrid-app
   cds bind html5-apps-repo -2 <ReleaseName>-srv-html5-apps-repo --kind html5-apps-repo --on k8s --for hybrid-app
   ```

   **Application Router**

   ```sh
   # Run in ./(multi/single)-tenant/code #

   cds bind -2 <ReleaseName>-router-destination,<ReleaseName>-router-xsuaa --on k8s --for hybrid-router
   cds bind html5-apps-repo -2 <ReleaseName>-router-html5-apps-repo --kind html5-apps-repo --on k8s --for hybrid-router
   ```

   **HTML5 Deployer**

   If you would like to run the HTML5 Apps Deployer in a hybrid mode, please ensure the respective HTML5 Apps Repository binding is configured.

   ```sh
   # Run in ./(multi/single)-tenant/code #

   cds bind html5-apps-repo -2 <ReleaseName>-html5-apps-deployer-html5-apps-repo --kind html5-apps-repo --on k8s --for hybrid-html5
   ```

   **API Service** (Multitenant only)

   ```sh
   # Run in ./multi-tenant/code #

   cds bind -2 <ReleaseName>-api-destination,<ReleaseName>-api-xsuaa-api --on k8s --for hybrid-api
   cds bind sm-container -2 <ReleaseName>-api-sm-container --kind service-manager --on k8s --for hybrid-api
   cds bind postgresql-db -2 <ReleaseName>-api-postgresql-db --kind postgresql-db --on k8s --for hybrid-api
   cds bind saas-registry -2 <ReleaseName>-api-saas-registry --kind saas-registry --on k8s --for hybrid-api
   ```

   **API Service Broker** (Multitenant only)

   ```sh
   # Run in ./multi-tenant/code #

   cds bind -2 <ReleaseName>-api-xsuaa-api --on k8s --for hybrid-broker
   ```

3. Please ensure that you whitelisted your personal IP address in the settings of your **PostgreSQL** Service Instance, to allow hybrid testing. Check the **Post Deployment Actions** chapter to learn more ([click here](../3-deploy/4-PostDeployActions.md)). Below you can find a shell script, you might find useful for automating this process, assuming your personal IP address always is the last value in the list of whitelisted IPs (after your Kyma Cluster Egress IP values).

    ```sh
    #!/bin/bash

    INSTANCE_NAME="aisaas-postgresql-db" # Change to your Service Instance name
    NAMESPACE="dev" # Change to your Kyma namespace

    # Fetch current IP
    CURRENT_IP=$(curl -s https://ipinfo.io/ip)
    if [ -z "$CURRENT_IP" ]; then
        echo "Failed to fetch current IP."
        exit 1
    fi
    echo "Fetched Current IP: $CURRENT_IP"

    INSTANCE_DETAILS=$(kubectl get ServiceInstance $INSTANCE_NAME -n $NAMESPACE -o json)
    if [ -z "$INSTANCE_DETAILS" ]; then
        echo "Failed to fetch details for ServiceInstance $INSTANCE_NAME."
        exit 1
    fi

    # Extract current 'allow_access' values
    ALLOW_ACCESS=$(echo $INSTANCE_DETAILS | awk -F'"allow_access": "' '{print $2}' | sed 's/".*//')
    if [ -z "$ALLOW_ACCESS" ]; then
        echo "'allow_access' parameter does not yet"
        ALLOW_ACCESS=$CURRENT_IP
    else
        echo "Fetched 'allow_access' parameter: $ALLOW_ACCESS"
        # Check if current IP already exists in 'allow_access'
        if [[ $ALLOW_ACCESS == *"$CURRENT_IP"* ]]; then
            echo "Current IP $CURRENT_IP is already in the 'allow_access' parameter."
            exit 0
        fi

        # Check if ALLOW_ACCESS contains a comma
        if [[ $ALLOW_ACCESS == *","* ]]; then
            # Remove the last IP from 'ALLOW_ACCESS'
            ALLOW_ACCESS=$(echo $ALLOW_ACCESS | rev | cut -d',' -f2- | rev)
            # Append current IP to 'allow_access'
            ALLOW_ACCESS="$ALLOW_ACCESS,$CURRENT_IP"
        else
            # If there's no comma, just replace the whole thing with CURRENT_IP
            ALLOW_ACCESS=$CURRENT_IP
        fi
    fi
    echo "Set new 'allow_access' parameter: $ALLOW_ACCESS"

    # Update the ServiceInstance
    kubectl patch ServiceInstance $INSTANCE_NAME -n $NAMESPACE -p '{"spec":{"parameters":{"allow_access":"'$ALLOW_ACCESS'"}}}' --type=merge
    ```

4. This is it, you can now continue with the **General Section** which is equal for Kyma and Cloud Foundry environments.


## SAP BTP, Cloud Foundry Runtime

1. For starting the hybrid development, you must have installed the GenAI Mail Insights application in your Cloud Foundry Environment using **cf deploy** as described in the previous tutorial steps.

2. Once the application is installed and all Service Instances are created please run the following commands, to create the essential Service Keys in Cloud Foundry and the respective **.cdsrc-private.json** files required for hybrid testing. In contrast to Kyma, we are not using the existing Service Bindings but need to create dedicated Service Keys for the hybrid testing setup.

   > **Hint** - If you already executed the local development chapter, some of the service keys might already exist. Just ignore the respective system message.

   **Service Keys**
   
   ```sh
   # Single-Tenant 
   cf csk <Space>-ai-uaa <Space>-ai-uaa-key
   cf csk <Space>-ai-destination <Space>-ai-destination-key
   cf csk <Space>-ai-postgresql-db <Space>-ai-postgresql-db-key
   cf csk <Space>-ai-com-hdi-container <Space>-ai-com-hdi-container-key
   cf csk <Space>-ai-html5-repo-runtime <Space>-ai-html5-repo-runtime-key
   
   # Multitenant
   cf csk <Space>-aisaas-uaa <Space>-aisaas-uaa-key
   cf csk <Space>-aisaas-api-uaa <Space>-aisaas-api-uaa-key
   cf csk <Space>-aisaas-registry <Space>-aisaas-registry-key
   cf csk <Space>-aisaas-credstore <Space>-aisaas-credstore-key
   cf csk <Space>-aisaas-destination <Space>-aisaas-destination-key
   cf csk <Space>-aisaas-postgresql-db <Space>-aisaas-postgresql-db-key
   cf csk <Space>-aisaas-service-manager <Space>-aisaas-service-manager-key
   cf csk <Space>-aisaas-com-hdi-container <Space>-aisaas-com-hdi-container-key
   cf csk <Space>-aisaas-html5-repo-runtime <Space>-aisaas-html5-repo-runtime-key
   cf csk <Space>-aisaas-service-manager-admin <Space>-aisaas-service-manager-admin-key
   ```

   **App Service**

   ```sh
   # Run in ./(multi/single)-tenant/code #

   # Single-Tenant
   cds bind -2 <Space>-ai-destination,<Space>-ai-uaa,<Space>-ai-com-hdi-container --for hybrid
   cds bind postgresql-db -2 <Space>-ai-postgresql-db --kind postgresql-db --for hybrid

   # Multitenant
   cds bind -2 <Space>-aisaas-destination,<Space>-aisaas-uaa --for hybrid-app
   cds bind hana -2 <Space>-aisaas-com-hdi-container --kind hana --for hybrid-app
   cds bind credstore -2 <Space>-aisaas-credstore --kind credstore --for hybrid-app
   cds bind saas-registry -2 <Space>-aisaas-registry --kind saas-registry --for hybrid-app
   cds bind postgresql-db -2 <Space>-aisaas-postgresql-db --kind postgresql-db --for hybrid-app
   cds bind sm-container -2 <Space>-aisaas-service-manager --kind service-manager --for hybrid-app
   cds bind sm-admin -2 <Space>-aisaas-service-manager-admin --kind service-manager --for hybrid-app
   cds bind html5-apps-repo -2 <Space>-aisaas-html5-repo-runtime --kind html5-apps-repo --for hybrid-app
   ```

   **Application Router**

   ```sh
   # Run in ./(multi/single)-tenant/code #

   # Single-Tenant
   cds bind -2 <Space>-ai-destination,<Space>-ai-uaa --for hybrid-router
   cds bind html5-apps-repo -2 <Space>-ai-html5-repo-runtime --kind html5-apps-repo --for hybrid-router

   # Multitenant
   cds bind -2 <Space>-aisaas-destination,<Space>-aisaas-uaa --for hybrid-router
   cds bind html5-apps-repo -2 <Space>-aisaas-html5-repo-runtime --kind html5-apps-repo --for hybrid-router
   ```

   **HTML5 Deployer**

   ```sh
   # Run in ./(multi/single)-tenant/code #

   # Single-Tenant
   cf csk <Space>-ai-html5-repo-host <Space>-ai-html5-repo-host-key
   cds bind html5-apps-repo -2 <Space>-ai-html5-repo-host --kind html5-apps-repo --for hybrid-html5

   # Multitenant
   cf csk <Space>-aisaas-html5-repo-host <Space>-aisaas-html5-repo-host-key
   cds bind html5-apps-repo -2 <Space>-aisaas-html5-repo-host --kind html5-apps-repo --for hybrid-html5
   ```

   **API Service** (Multitenant only)

   ```sh
   # Run in ./multi-tenant/code #

   # Multitenant
   cds bind -2 <Space>-aisaas-destination,<Space>-aisaas-api-uaa --for hybrid-api
   cds bind saas-registry -2 <Space>-aisaas-registry --kind saas-registry --for hybrid-app
   cds bind postgresql-db -2 <Space>-aisaas-postgresql-db --kind postgresql-db --for hybrid-api
   cds bind sm-container -2 <Space>-aisaas-service-manager --kind service-manager --for hybrid-api
   ```

   **API Service Broker** (Multitenant only)

   ```sh
   # Run in ./multi-tenant/code #

   # Multitenant
   cds bind -2 <Space>-aisaas-api-uaa --for hybrid-broker
   ```

3. In Cloud Foundry, it is not (yet) possible to whitelist a personal IP address for your PostgreSQL Service Instance. Therefore, you must setup an SSH tunnel to an existing Cloud Foundry workload to connect to your PostgreSQL instance. To setup that tunnel please run the following commands in your development environment.

   **PostgreSQL SSH Tunnel**
   
   ```sh
   # Single-Tenant
   cf enable-ssh ai-srv-<Space>
   cf restart ai-srv-<Space>
   cf service-key <Space>-ai-postgresql-db <Space>-ai-postgresql-db-key

   # Grab the hostname and port from the created Service Key and open the tunnel
   cf ssh -L 63306:<hostname>:<port> ai-srv-<Space>

   # Multitenant
   cf enable-ssh aisaas-srv-<Space>
   cf restart aisaas-srv-<Space>
   cf service-key <Space>-aisaas-postgresql-db <Space>-aisaas-postgresql-db-key

   # Grab the hostname and port from the created Service Key and open the tunnel
   cf ssh -L 63306:<hostname>:<port> aisaas-srv-<Space>
   ```

4. Once the tunnel is up and running, please update the **.cdsrc-private.json** file in your **code** directory, by replacing the **port** and **hostname** as depicted below. All other properties **must** remain unchanged.

   **Update hybrid profile** <br>

   ```json
   "postgres": {
       "credentials": {
           "port": "63306", // Update to 63306
           "hostname": "127.0.0.1", // Update to 127.0.0.1
           "dbname": "...",
           "password": "...",
           "sslcert": "...",
           "sslrootcert": "...",
           "uri": "...",
           "username": "...",
       }
   }
   ```

5. This is it, you can now continue with the **General Section** which is equal for Kyma and Cloud Foundry environments.


## General Steps

After configuring your **.cdsrc-private.json** files and (if necessary) opening the SSH tunnel to your Cloud Foundry environment, you can run the application in hybrid mode, by executing the below commands. 

1. In a multitenant context, please ensure you already created a Subscriber Subaccount in your SAP BTP Global account and successfully subscribed to the GenAI Mail Insights application. 

2. If not done yet, please copy the **.env.sample** file in your **code** directory and rename it to **.env**. It will contain the configuration details for the HTML5 Repo Mock, to work properly and to recognize the **TENANT_HOST_PATTERN** in a **.localhost** context (multitenant scenario). Furthermore, the **.env** file contains the destinations to your local CAP App-Service backend as well as the UI5 Typescript app being continuously transpiled upon any change.

   > **Important** - In a Single-Tenant scenario, please remove the **TENANT_HOST_PATTERN** variable from the *.env* file. 

3. Ensure you installed the **@ui5/cli** npm package globally in your development environment and install the dependencies of the SAP UI5 component by executing the following commands. 

    ```sh
    # Run in ./(multi/single)-tenant/code #
    npm install --global @ui5/cli
    npm run ui5:init
    ```

4. Please run the following commands to start your App Service, the API Service (multitenant only), the HTML5 Repo Mock, as well as the SAP UI5 Typescript App in hybrid mode. 

    > **Hint** - Please ensure, that your PostgreSQL database is reachable either through the Cloud Foundry SSH tunnel or by whitelisting your current personal IP address in a Kyma setup! 

    ```sh
    # Run in ./(multi/single)-tenant/code #

    # App Service + API Service + HTML5 Repo Mock + UI5 App
    # Parallel start using same terminal
    npm run hybrid 

    # Single starts also possible
    npm run app:hybrid # App Service
    npm run mock:hybrid # Repo Mock
    npm run ui5:hybrid # SAPUI5 App
    npm run api:hybrid # API Service (Multitenant only)
    ```

5. You can now open the HTML5 Repo Mock application using the *localhost:5000* URL. In a multitenant context, please prefix the hostname it with the subdomain of your existing tenant like **tenant-xyz.localhost:5000**. This will redirect you to the XSUAA login page of the respective subaccount and back to the UI5 application which is constantly transpiled upon any change. 

6. To test the App Service without going through the HTML5 Repo Mock (mimicking an Application Router), you must request an XSUAA access token using the subdomain of the Subscriber Tenant and a Service Key of your SaaS XSUAA Service instance (application plan).

    > **Important** - **NEVER** share these credentials with your subscribers, as this will allow them to issue tokens for each subscriber subdomain!

7. To test the API Service, you must create a new API Service Instance in the Subscriber Subaccount, create a Service Binding and use the respective credentials to obtain a new Subscriber-specific access token from XSUAA. These details can be used in the provided **requests-hybrid.http** file ([click here](../../../code/test/http/requests-hybrid.http)) to test the SaaS API. 