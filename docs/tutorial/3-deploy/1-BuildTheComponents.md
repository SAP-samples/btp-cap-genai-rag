# Build the components

In the following steps, you will build a multi-target application which can be deployed to your SAP BTP, Cloud Foundry Runtime:

1. If not done yet, please (fork and) clone the repository to your development environment.

   ```sh
   git clone https://github.com/SAP-samples/btp-cap-genai-rag
   ```

2. Make sure you have the required TypeScript dependencies installed globally.

   ```sh
   npm i -g typescript ts-node tsx
   ```

3. Make sure you have the Cloud MTA Build Tool (MBT) installed globally.

   ```sh
   npm i -g mbt
   ```

4. Please run the following command to build your **mtar** file.

   ```sh
   # Run in project's root folder #
   npm run build:mbt
   ```

5. Once your Multi-Target Application Archive is built successfully, you can continue deploying your application ([click here](../3-deploy/2-DeployTheApplication.md)).
