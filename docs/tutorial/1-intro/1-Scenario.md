# Scenario

This part of the tutorial offers a comprehensive overview of the scenario addressed in this step-by-step guide, along with key technical highlights of our sample scenario.

## Introduction

The provided code samples showcase a **GenAI Mail Insights** sample scenario designed for the SAP Business Technology Platform (SAP BTP). It has been created by a potential SAP partner or customer and is specifically designed to enhance customer support within a travel agency through the use of advanced email analysis and automation.

In this scenario, the application employs **Large Language Models (LLMs)** to examine incoming emails, providing **key insights** such as **categorization**, **sentiment analysis**, and **urgency** assessment. Additionally, it offers more advanced features, including the extraction of essential information such as the **location** or **traveler type**.

One particularly innovative aspect is the use of **embeddings** to identify historical emails that are similar to the current ones, helping to understand how similar requests were handled in the past. This promotes consistent and efficient customer service. The code also demonstrates the ability to **summarize** and **translate** both the subject and body of emails, making it easier to understand and work with content in different languages.

Moreover, the application takes automation to the next level by **generating potential responses** to customer inquiries. This response generation process is influenced by **configurable actions and services**, leading to improved response accuracy and speed. Additionally, the system can seamlessly **integrate with SAP systems** like **SAP Concur**, adding an enterprise dimension and facilitating the integration of processes and data.

While initially designed for a travel agency, this code can be adapted to suit various industries, making it a versatile solution for enhancing customer support with data-driven insights and automation. If needed, there is also a **single-tenant** version of the application available in the corresponding directory of the repository.

## Application Concept

1. New mails are added to the GenAI Mail Insights Application either using the API endpoint or the in-app **Add Mail** feature. 
    - The API endpoint allows the processing of multiple mails in parallel
    - The in-app feature only allows users to add one mail at a time.
  
        [<img src="./images/FL_PushAPI.png" height="150"/>](./images/FL_PushAPI.png?raw=true)
        [<img src="./images/FL_InAppAdd.png" height="150"/>](./images/FL_InAppAdd.png?raw=true)

2. The mails are being pre-processed using the capabilities of a Large Language Model (1-6):
    - Insights such as the urgency, a mail summary, the tone, key facts as well as potential actions are being extracted
    - A preliminary response is being generated in the original mail language and the user's working language
    - The features of zod (https://github.com/colinhacks/zod) are used to simplify the structured prompt response (6)
    - An embedding vector is created from the incoming mail, which can be used for similarity search (7)
    - Embeddings are stored in a PostgreSQL database and insights are stored in a SAP HANA Cloud Database 
    - The results of the processing process are returned back to the user or API caller (8)

        [<img src="./images/FL_AddMail01.png" height="150"/>](./images/FL_AddMail01.png?raw=true)
        [<img src="./images/FL_AddMail02.png" height="150"/>](./images/FL_AddMail02.png?raw=true)

        [<img src="./images/FL_AddMail03.png" height="150"/>](./images/FL_AddMail03.png?raw=true)
        [<img src="./images/FL_AddMail04.png" height="150"/>](./images/FL_AddMail04.png?raw=true)
        [<img src="./images/FL_AddMail05.png" height="150"/>](./images/FL_AddMail05.png?raw=true)

        [<img src="./images/FL_AddMail06.png" height="150"/>](./images/FL_AddMail06.png?raw=true)
        [<img src="./images/FL_AddMail07.png" height="150"/>](./images/FL_AddMail07.png?raw=true)

3. The user can now review the latest mails in the UI using the following features (1-8):
    - Filtering and sorting the mails by various criteria such as urgency or created at date
    - Switching from "working language" to the original language of the mail 
    - Checking the summaries or even the whole e-mail content 
    - Validating potential actions after checking the extracted details 
    - Reviewing similar mail enquiries listed for each processed mail
    
        [<img src="./images/FL_App01.png" height="150"/>](./images/FL_App01.png?raw=true)
        [<img src="./images/FL_App02.png" height="150"/>](./images/FL_App02.png?raw=true)

        [<img src="./images/FL_App03.png" height="150"/>](./images/FL_App03.png?raw=true)
        [<img src="./images/FL_App04.png" height="150"/>](./images/FL_App04.png?raw=true)

        [<img src="./images/FL_App05.png" height="150"/>](./images/FL_App05.png?raw=true)

4. Once the user has understood the customer's problem, the answer can be finalized (1-4):
    - The user can accept the auto-generated initial answer generated by the LLM
    - Alternatively, the user can re-generate an answer by adding additional context
    - If similar enquiries exist, the user can leverage them to auto-generate a new response
  
        [<img src="./images/FL_App06.png" height="150"/>](./images/FL_App06.png?raw=true)
        [<img src="./images/FL_App07.png" height="150"/>](./images/FL_App07.png?raw=true)

        [<img src="./images/FL_App08.png" height="150"/>](./images/FL_App08.png?raw=true)
        [<img src="./images/FL_App09.png" height="150"/>](./images/FL_App09.png?raw=true)

5. Being satisfied with a potential response, the user can submit the response to the customer
    - This will - if necessary - translate the response into the original mail language using LLM capabilities
    - The user will see the final response sent to the customer in a popup incl. a translation 
    - The answer will be stored in the backend together with the translated response
    - For future mails, the answer can be considered for similarity search to create new responses

        [<img src="./images/FL_Answer01.png" height="150"/>](./images/FL_Answer01.png?raw=true)
        [<img src="./images/FL_Answer02.png" height="150"/>](./images/FL_Answer02.png?raw=true)

        [<img src="./images/FL_Answer03.png" height="150"/>](./images/FL_Answer03.png?raw=true)
        [<img src="./images/FL_Answer04.png" height="150"/>](./images/FL_Answer04.png?raw=true)


## Technical Highlights

The standout feature that distinguishes our GenAI Mail Insights sample scenario from existing SAP BTP sample scenarios is its utilization of the generative AI hub within SAP AI Core. This application extends its functionality to both single-tenant and multi-tenant scenarios. In this concise introduction, we aim to explain the unique aspects that set it apart from standard CAP-based multi-tenant SAPUI5 applications.

> **Insight:** If the concept of multitenancy in SAP BTP is new to you, we strongly suggest perusing the following GitHub repository to gain a deeper understanding of deploying a CAP-based multitenant application in the SAP BTP, Kyma Runtime, as well as the SAP BTP, Cloud Foundry Runtime. <br>[Explore the development of a multitenant Software as a Service application in SAP BTP using CAP](https://github.com/SAP-samples/btp-cap-multitenant-saas)

### Vector Store

Within this sample scenario, a Vector database plays a pivotal role, serving as the repository for embeddings generated from incoming emails. These embeddings, in turn, facilitate a similarity search for identifying analogous emails when generating novel response suggestions. In the absence of native support for storing vectors or embeddings in SAP HANA Cloud, we employ a PostgreSQL database for this purpose. The integration into the application is seamless, using features provided by LangChain.

### SAP AI Core

SAP AI Core is a service within the SAP Business Technology Platform that is designed to manage the execution and operations of your AI assets in a standardized, scalable, and cloud-agnostic manner. Beyond its compatibility with third-party offerings, such as the OpenAI Large Language Model services, SAP AI Core offers the flexibility to deploy custom workloads. 

### generative AI hub

A fundamental component of the SAP AI Core offering, the generative AI hub empowers customers and partners to leverage generative AI solutions provided by SAP, Large Language Models hosted by Azure (OpenAI), and other reputable third-party vendors. Please note that, as of the present, there is no free tier offering available for the generative AI hub service plan, and charges are incurred based on the tokens consumed.

### Resource Groups

SAP AI Core introduces the concept of "Resource Groups", used for tenant separation within our sample setup. Future releases of SAP AI Core have plans to introduce a metering feature based on resource groups (subject to change — please consult the official roadmap). While in a single-tenant scenario, a default resource group suffices, in a multitenant context, unique resource groups are used for each tenant. Configurations and Deployments are automatically generated within a new resource group upon tenant subscription.

In the sample scenario, the required resource groups are instantiated programmatically. A default resource group is created (if non existent) upon startup of the CAP service. In a single-context this default resource group is used for all requests to SAP AI Core. In a multitenant setup, the default resource group is required for local testing without a tenant context. For multitenant deployments, a new resource group is provisioned during the subscription process for each tenant based on the unique tenant GUID. 

> **Important** - To comply with the SAP AI Core naming requirements, the resulting resource group names are converted to lower letters. In addition, only characters from a-z and numbers from 0-9 as well as dashes (except as first and last character) are allowed. Other characters will be removed from the resulting resource group name.

**Multitenant Setup Resource Groups**

- Kyma - **default/\<TenantGuid>-aisaas-\<Namespace>-\<ShootName>**
  > **Sample** - 63c57b07-59c0-468d-a547-32fe121da998-aisaas-dev-a1b2c3
- Cloud Foundry - **default/\<TenantGuid>-aisaas-\<Space>-\<Org>**
  > **Sample** - 001f7b54-990a-43e3-8add-0fc41ddf0639-aisaas-dev-sap-demo

**Single-Tenant Setup Resource Groups**

- Kyma - **default-ai-\<Namespace>-\<ShootName>**
  > **Sample** - ai-dev-a1b2c3
- Cloud Foundry - **default-ai-\<Space>-\<Org>**
  > **Sample** - ai-dev-sap-demo
