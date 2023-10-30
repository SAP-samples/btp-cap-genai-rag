# Local Development

In this chapter, you will learn how to set up a local environment. Local in this case means your application logic is executed on your local development environment, while only the Large Language Model is consumed through a SAP BTP Destination (requiring an XSUAA and Destination Service Binding).

- [Local Development](#local-development)
  - [SAP BTP, Cloud Foundry Runtime](#sap-btp-cloud-foundry-runtime)
  - [SAP BTP, Kyma Runtime](#sap-btp-kyma-runtime)
  - [General Steps](#general-steps)


## SAP BTP, Cloud Foundry Runtime

Even though we are in a local development setup, the **generative AI hub** access cannot be "mocked" locally, so you still require access to your destination pointing to the **generative AI hub in SAP AI Core**. The same applies for the XSUAA instance, required to issue a token for accessing the Destination Service. 

1. For starting the local development, you will at least need a Destination Service instance, as well as an XSUAA instance in your SAP BTP Cloud Foundry environment. Therefore, we suggest to install the GenAI Mail Insights application to your Cloud Foundry Space using **cf deploy** as described in the previous tutorial steps. 

2. Once the application is installed and all Service Instances are created please run the following commands, to create the respective **.cdsrc-private.json** files required for local testing. 

    ```sh
    # Run in ./(multi/single)-tenant/code #

    # Single-Tenant
    cf csk <Space>-ai-uaa <Space>-ai-uaa-key
    cf csk <Space>-ai-destination <Space>-ai-destination-key
    
    cds bind -2 <Space>-ai-destination --for development
    cds bind auth -2 <Space>-ai-uaa --kind basic --for development


    # Multitenant
    cf csk <Space>-aisaas-uaa <Space>-aisaas-uaa-key
    cf csk <Space>-aisaas-destination <Space>-aisaas-destination-key

    cds bind -2 <Space>-aisaas-destination --for development
    cds bind auth -2 <Space>-aisaas-uaa --kind basic --for development
    cds bind -2 <Space>-aisaas-destination --for local-with-mtx
    cds bind auth -2 <Space>-aisaas-uaa --kind basic --for local-with-mtx
    ```

3. Continue with the **General** steps described below, which are the same for Cloud Foundry and/or Kyma setups. 


## SAP BTP, Kyma Runtime

Even though we are in a local development setup, the **generative AI hub** access cannot be "mocked" locally, so you still require access to your destination pointing to the **generative AI hub in SAP AI Core**. The same applies for the XSUAA instance, required to issue a token for accessing the Destination Service. 

1. For starting the local development, you will at least need a Destination Service instance, as well as an XSUAA instance in your SAP BTP Kyma cluster. Therefore, we suggest to install the GenAI Mail Insights application to your Kyma Cluster using **helm install** as described in the previous tutorial steps. 

2. Once the application is installed and all Service Instances are created please run the following commands, to create the respective **.cdsrc-private.json** file required for local testing. Please ensure that you are connected to the correct Kyma cluster by running **kubectl cluster-info**.

    > **Hint** - We are creating two profiles in the multitenant case. **development** for local scenarios without **multitenancy** and **local-with-mtx** for local scenarios with **multitenancy**. 

    ```sh
    # Run in ./(multi/single)-tenant/code #

    # Single-Tenant
    cds bind -2 <ReleaseName>-srv-destination --on k8s --for development
    cds bind auth -2 <ReleaseName>-srv-xsuaa --kind basic --on k8s --for development

    # Multitenant
    cds bind -2 <ReleaseName>-srv-destination --on k8s --for development
    cds bind auth -2 <ReleaseName>-srv-xsuaa --kind basic --on k8s --for development
    cds bind -2 <ReleaseName>-srv-destination --on k8s --for local-with-mtx
    cds bind auth -2 <ReleaseName>-srv-xsuaa --kind basic --on k8s --for local-with-mtx
    ```

3. Continue with the **General** steps described below ([click here](#general-steps)), which are the same for Cloud Foundry and/or Kyma setups. 


## General Steps

After finishing the **.cdsrc-private.json** setup in Kyma or Cloud Foundry, please continue with the following steps to start your application in a local development mode (w/ or w/o multitenancy).

1. To use a local PostgreSQL database, please either install a respective instance in your development environment using the installers provided on the official PostgreSQL website ([click here](https://www.postgresql.org/download/)). Alternatively, you can spin up a PostgreSQL instance using a pre-build Docker Image for this purpose. Just run the following command from the **code** directory. 

    ```sh
    # Run in ./(multi/single)-tenant/code #
    docker compose up -d
    ```

2. Once the local PostgreSQL database is up and running, please go to the **.cdsrc.json** file in the **code** directory containing your **development** and the **local-with-mtx** profile. Please update the **credentials** section according to your local PostgreSQL setup. When using the **docker compose** command, you do not have to change anything, as the default values match the PostgreSQL Docker instance. 
   
    > **Hint** - The **local-with-mtx** profile is not available in single-tenant scenarios. 
   
    > **Important** - If you are using a dedicated PostgreSQL database with confidential login details, please make use of a **.env file**, mitigating the risk of an accidental GitHub commit of your credentials ([click here](https://cap.cloud.sap/docs/guides/databases-postgres#in-project-env-files) for further details).

    ```json
    "[local-with-mtx/development]": {
        "postgres": {
            "kind": "postgres",
            "credentials": {
                "hostname": "localhost",
                "port": 5432,
                "username": "postgres",
                "password": "postgres",
                "dbname": "postgres"
            }
        }
    }
    ```

3. Deploy the CDS data model to a local SQLite database by running the following command from your **code** directory. This will create a **db.sqlite** file in the **code** directory, which can be accessed by your **App** and **Api** service. 

    ```sh
    # Run in ./(multi/single)-tenant/code #
    npm run deploy

    ...
    /> successfully deployed to db.sqlite 
    ```

4. Ensure you installed the **@ui5/cli** npm package globally in your development environment and install the dependencies of the SAP UI5 component by executing the following commands. 

    ```sh
    # Run in ./(multi/single)-tenant/code #
    npm install --global @ui5/cli
    npm run ui5:init
    ```

5. This is it, now you can run the following commands to start your App Service or API Service. 

    > **Hint** - Please ensure, that your PostgreSQL database is up and running before starting the application locally! 

    > **Important** - In multitenant scenarios, please make sure to subscribe a tenant in the **mtx** (multitenancy) scenario using the respective **cds subscribe** command after starting the application using **npm run cap:mtx**. 


    ```sh
    # Run in ./(multi/single)-tenant/code #

    ---- Single- and Multitenant ----

    # local w/o multitenancy
    npm run cap:dev 

    ---- Multitenant only ----

    # local w/ multitenancy
    npm run cap:mtx 

    # Subscribe tenant in new Terminal
    cds subscribe t1 --to http://localhost:4004 -u alice: 
    ```

6. If you also want to run the UI5 Typescript application, please run the following command in a new Terminal window. This will automatically open the UI5 Typescript app on **localhost:8081** and you can interact with your CAP services. Use the default user e.g., **alice** to login once requested - no password is required so just hit Enter. 
   
   > **Hint** - UI5 will forward the requests to your local CAP backend using the **ui5-middleware-simpleproxy** middleware.

    ```sh
    # Run in ./(multi/single)-tenant/code #
    npm run ui5:dev 
    ```

7. An alternative option is running the following npm script to run the App-Service as well as the UI5 app in parallel. 
   
   > **Hint** - Your backend might take longer than the UI5 app to start, so please wait until both components are running before using the UI.

    ```sh
    # Run in ./(multi/single)-tenant/code #

    ---- Single- and Multitenant ----

    # Start w/o multitenancy
    npm run dev

    ---- Multitenant only ----

    # Start w/ multitenancy
    npm run mtx 

    # Subscribe tenant in new Terminal
    cds subscribe t1 --to http://localhost:4004 -u alice:
    ```

8. Please be aware that (as of today) the search feature is not working in the local development/test scenario. 