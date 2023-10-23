#  Build the components

Depending on your target runtime, different build and deployment steps are required. Please follow the corresponding instructions for your chosen runtime.

- [Build the components](#build-the-components)
  - [SAP BTP, Kyma Runtime](#sap-btp-kyma-runtime)
  - [SAP BTP, Cloud Foundry Runtime](#sap-btp-cloud-foundry-runtime)
    - [Single-Tenant](#single-tenant)
    - [Multitenant](#multitenant)


## SAP BTP, Kyma Runtime

In Kyma, you must build container images for the components of this sample scenario before. Please make sure you have the respective tools installed in your development environment such as **helm**, **Docker** and **kubectl**. 

> **Hint** - In this tutorial we assume a basic understanding of the Kyma deployment process. If you are not familiar with deployment of Kyma solutions, please refer to our [Multitenant SaaS Sample Scenario](https://github.com/SAP-samples/btp-cap-multitenant-saas/#readme) or follow the respective [SAP Developer Journey](https://learning.sap.com/learning-journey/deliver-side-by-side-extensibility-based-on-sap-btp-kyma-runtime) to learn the basics and get your setup ready.

1. If not done yet, please (fork and) clone the repository to your development environment. 

    ```sh
    git clone https://github.com/SAP-samples/btp-cap-genai-rag
    ```

2. Please switch to the *(single/multi)-tenant/deploy/kyma* directory. 

    ```sh
    cd single-tenant/deploy/kyma
    ```
    ```sh
    cd multi-tenant/deploy/kyma
    ```

3. Make sure you have the required TypeScript dependencies installed globally. 

    ```sh
    npm i -g typescript ts-node
    ```

4. Run the following command to build the CAP components of your application. 

    ```sh
    # Run in ./(single/multi)-tenant/deploy/kyma # 
    npm run build
    ```

5. Please run the following command to build the SAPUI5 app components. 

    ```sh
    # Run in ./(single/multi)-tenant/deploy/kyma # 
    npm run ui:apps
    ```

6. Please run the following command to build the Container Images. Please set your Container Image Prefix as depicted below. 

    > **Hint** - If you use e.g. DockerHub as a Container Registry, please put in your **username** (e.g., johndoe) as Container Image Prefix placeholder. If you use the GitHub Container Registry, the prefix will look similar to **ghcr.io/\<namespace>** (e.g. ghcr.io/johndoe). All generated Docker Images will be automatically prefixed with this label!

    > **Hint** - Using devices with ARM chips (e.g., Apple M1) the build process involving Cloud Native Buildpacks might take several minutes. Please do not immediately cancel the build if things appear to be stuck, but wait some time for the process to continue (especially while the SBOM is being generated)!

    ```sh
    # Run in ./(single/multi)-tenant/deploy/kyma # 
    npx cross-env IMAGE_PREFIX=<ContainerImagePrefix> npm run build:all

    # Example
    npx cross-env IMAGE_PREFIX=sap-demo npm run build:all
    ```

7. Once your Container Images are built, you can continue deploying your application. 



## SAP BTP, Cloud Foundry Runtime

### Single-Tenant

1. If not done yet, please (fork and) clone the repository to your development environment. 

    ```sh
    git clone https://github.com/SAP-samples/btp-cap-genai-rag
    ```

2. Please switch to the *single-tenant/deploy/cf* directory. 

    ```sh
    cd single-tenant/deploy/cf 
    ```

3. Make sure you have the required TypeScript dependencies installed globally. 

    ```sh
    npm i -g typescript ts-node
    ```

4. Run the following command to build the CAP components of your application. 

    ```sh
    # Run in ./single-tenant/deploy/cf # 
    npm run build
    ```

5. Please duplicate the **free-tier.mtaext** file in the **single-tenant/deploy/cf/mtaext** directory and add the **-private** suffix before the file name extension, so that you have a second file called **free-tier-private.mtaext**. Adding the **-private** suffix will ensure this file is not committed to GitHub. 

6. Please run the following command to build your **mtar** file. 

    ```sh
    # Run in ./single-tenant/deploy/cf # 
    npm run build:mbt
    ```

7. Once your Multi-Target Application Archive is built successfully, you can continue deploying your application. 



### Multitenant

1. If not done yet, please (fork and) clone the repository to your development environment. 

    ```sh
    git clone https://github.com/SAP-samples/btp-cap-genai-rag
    ```

2. Please switch to the *multi-tenant/deploy/cf* directory. 

    ```sh
    cd multi-tenant/deploy/cf
    ```

3. Make sure you have the required TypeScript dependencies installed globally. 

    ```sh
    npm i -g typescript ts-node
    ```

4. Run the following command to build the CAP components of your application. 

    ```sh
    # Run in ./multi-tenant/deploy/cf # 
    npm run build
    ```

5. Run the following command to generate unique Service Plan Ids for your Service Broker. 

    >**Hint** - Using the **-private** file name extension, these Ids will not be committed to GitHub. 

    ```sh
    # Run in ./multi-tenant/deploy/cf # 
    cp ../../code/broker/catalog.json ../../code/broker/catalog-private.json
    npx --yes -p @sap/sbf gen-catalog-ids ../../code/broker/catalog-private.json
    ```

6. Run the following password to create a new Service Broker password. Please copy the generated plaintext password and hashed credentials and store them in a secure place!

    ```sh
    # Run in ./multi-tenant/deploy/cf # 
    npx --yes -p @sap/sbf hash-broker-password -b
    ```

7. Please duplicate the **free-tier.mtaext** file in the **multi-tenant/deploy/cf/mtaext** directory and add the **-private** suffix before the file name extension, so that you have a second file called **free-tier-private.mtaext**. Adding the **-private** suffix will ensure this file is not committed to GitHub. 

8. Open the **free-tier-private.mtaext** file and replace the placeholder "\<paste your hash credentials here\>" with your **hashed credentials** value created a few steps ago. Your file should look similar to the following. 

    ```yaml
    ID: aisaas.freetier
    _schema-version: 3.2.0
    version: 1.0.0
    extends: aisaas

    modules:
      - name: aisaas-api-sb
        properties:
          SBF_BROKER_CREDENTIALS_HASH:  >
            {
              "broker-user": "sha256:0vsw3...bPwNwUc9WM=:5osh6/uiq...LcE9T0="
            }
    ```

9. Please run the following command to build your **mtar** file. 

    ```sh
    # Run in ./multi-tenant/deploy/cf # 
    npm run build:mbt
    ```

10. Once your Multi-Target Application Archive is built successfully, you can continue deploying your application. 

