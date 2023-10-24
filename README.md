# Develop a CAP-based (multitenant) application using GenAI and RAG on SAP BTP

[![REUSE status](https://api.reuse.software/badge/github.com/SAP-samples/btp-cap-genai-rag)](https://api.reuse.software/info/github.com/SAP-samples/btp-cap-genai-rag)

> [!NOTE]  
> Repo is under active development (targeting TechEd 2023)

Welcome to our dedicated **GenAI Mail Insights** GitHub repository, designed to provide valuable support to developers, partners and customers aiming to create advanced **GenAI** solutions on **SAP Business Technology Platform (SAP BTP)**. 

Inside, you'll find a carefully crafted example that follows SAP BTP's respected Golden Path development approach. We've covered both [single-tenant and multitenant (Software as a Service, SaaS) versions](#versions) to suit different needs. Discover how to smoothly integrate different **Large Language Models (LLMs)** via the generative AI hub in SAP AI Core, make the most of LangChain in CAP and use advanced techniques like output parsing according a custom schema or **Retrieval Augmented Generation (RAG)** through embeddings and a vector database to achieve even higher value for your use case. Notably, our repository supports two runtimes, Cloud Foundry and Kyma, offering flexibility in your journey to harness GenAI on SAP BTP.


<p align="center">
    <img src="./docs/architecture/multitenant-target.png" alt="Target Architecture" />
    <em>Target Architecture: Multitenant SaaS application with LLM Access</em>
</p>

<details>
<summary>Further architectures (current, single tenant)</summary>
<p align="center">
    <img src="./docs/architecture/multitenant-current.png" alt="Current Architecture" />
    <em>Multitenant SaaS application (current)</em>
</p>
<p align="center">
    <img src="./docs/architecture/singletenant-target.png" alt="Target Singletenant Architecture" />
    <em>Single tenant application (target)</em>
</p>
<p align="center">
    <img src="./docs/architecture/singletenant-current.png" alt="Current Singletenant Architecture" />
    <em>Single tenant application (current)</em>
</p>
</details>


## Business Use Case of the Reference Application

The [provided code sample](./multi-tenant) presents a multitenant application crafted by a potential SAP partner or customer, tailored for SAP Business Technology Platform (SAP BTP). This scenario presents a comprehensive SaaS solution for enhancing customer support within a travel agency, utilizing advanced email insights and automation. The system analyzes incoming emails using Large Language Models (LLMs) to offer core insights such as categorization, sentiment analysis and urgency assessment. It goes beyond basic analysis by extracting key facts and customizable fields like location, managed through a dedicated configuration page.

One innovative feature involves utilizing email embeddings to identify similar historical emails, aiding in understanding how similar requests were handled previously. This fosters consistent and efficient customer service. The code also demonstrates the capabilities of summarizing and translating both email subject and body, enabling streamlined comprehension across languages.

Furthermore, the system takes automation to the next level by generating potential responses for customer inquiries. This response generation is influenced by configurable actions and services, enhancing response accuracy and speed. The flexibility to connect with SAP systems like SAP Concur adds an enterprise dimension, allowing seamless integration of processes and data.

Though initially tailored for a travel agency, the code can be adapted to suit various industries, making it a versatile solution for augmenting customer support with data-driven insights and automation.

The business scenario is also available as [single-tenant version](./single-tenant) in the respective directory of this repository. 

## Getting started

This sample scenario comes with a step-by-step tutorial for a deployment in your own SAP BTP landscape. Check the following chapters and setup the scenario step-by-step in your own environment. The guide covers the deployment of the single-tenant as well as the multitenant version of the application. 

1. [Scenario Introduction](./docs/tutorial/1-intro/README.md)
2. [Landscape Setup](./docs/tutorial/2-setup/README.md)
3. [Scenario Deployment](./docs/tutorial/3-deploy/README.md)
4. [Application Testing](./docs/tutorial/4-test/README.md)
5. [Extend the solution](./docs/tutorial/5-extend/README.md)

Depending on your scenario (single- vs multitenant), please ensure to skip steps which are only relevant for multitenant setups. This will be mentioned in the documentation accordingly. 

## How to obtain support

[Create an issue](https://github.com/SAP-samples/btp-cap-genai-rag/issues) in this repository if you find a bug or have questions about the content.

For additional support, [ask a question in SAP Community](https://answers.sap.com/questions/ask.html).

## Open Tasks and Additional Details
Currently no open or additional tasks. 

## Contributing

If you wish to contribute code, offer fixes or improvements, please send a pull request. Due to legal reasons, contributors will be asked to accept a DCO when they create the first pull request to this project. This happens in an automated fashion during the submission process. SAP uses [the standard DCO text of the Linux Foundation](https://developercertificate.org/).

## License

Copyright (c) 2023 SAP SE or an SAP affiliate company. All rights reserved. This project is licensed under the Apache Software License, version 2.0 except as noted otherwise in the [LICENSE](LICENSE) file.
