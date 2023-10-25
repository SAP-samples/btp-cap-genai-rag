# Scenario

This part of the tutorial offers a comprehensive overview of the scenario addressed in this step-by-step guide, along with key technical highlights of our sample scenario.

## Introduction

The provided code samples showcase a **GenAI Mail Insights** sample scenario designed for the SAP Business Technology Platform (SAP BTP). It has been created by a potential SAP partner or customer and is specifically designed to enhance customer support within a travel agency through the use of advanced email analysis and automation.

In this scenario, the application employs **Large Language Models (LLMs)** to examine incoming emails, providing **key insights** such as **categorization**, **sentiment analysis**, and **urgency** assessment. Additionally, it offers more advanced features, including the extraction of essential information such as the **location** or **traveler type**.

One particularly innovative aspect is the use of **embeddings** to identify historical emails that are similar to the current ones, helping to understand how similar requests were handled in the past. This promotes consistent and efficient customer service. The code also demonstrates the ability to **summarize** and **translate** both the subject and body of emails, making it easier to understand and work with content in different languages.

Moreover, the application takes automation to the next level by **generating potential responses** to customer inquiries. This response generation process is influenced by **configurable actions and services**, leading to improved response accuracy and speed. Additionally, the system can seamlessly **integrate with SAP systems** like **SAP Concur**, adding an enterprise dimension and facilitating the integration of processes and data.

While initially designed for a travel agency, this code can be adapted to suit various industries, making it a versatile solution for enhancing customer support with data-driven insights and automation. 

If needed, there is also a **single-tenant** version of the application available in the corresponding directory of the repository.


## Technical Highlights

The standout feature that distinguishes our GenAI Mail Insights sample scenario from existing SAP BTP sample scenarios is its utilization of the generative AI hub within SAP AI Core. This application extends its functionality to both single-tenant and multi-tenant scenarios. In this concise introduction, we aim to explain the unique aspects that set it apart from standard CAP-based multi-tenant SAPUI5 applications.

> **Insight:** If the concept of multitenancy in SAP BTP is new to you, we strongly suggest perusing the following GitHub repository to gain a deeper understanding of deploying a CAP-based multitenant application in the SAP BTP, Kyma Runtime, as well as the SAP BTP, Cloud Foundry Runtime.
> 
> [Explore the development of a multitenant Software as a Service application in SAP BTP using CAP](https://github.com/SAP-samples/btp-cap-multitenant-saas)

**Vector Store**

Within this sample scenario, a Vector database plays a pivotal role, serving as the repository for embeddings generated from incoming emails. These embeddings, in turn, facilitate a similarity search for identifying analogous emails when generating novel response suggestions. In the absence of native support for storing vectors or embeddings in SAP HANA Cloud, we employ a PostgreSQL database for this purpose. The integration into the application is seamless, using features provided by LangChain.

**SAP AI Core**

SAP AI Core is a service within the SAP Business Technology Platform that is designed to manage the execution and operations of your AI assets in a standardized, scalable, and cloud-agnostic manner. Beyond its compatibility with third-party offerings, such as the OpenAI Large Language Model services, SAP AI Core offers the flexibility to deploy custom workloads. 

**generative AI hub**

A fundamental component of the SAP AI Core offering, the generative AI hub empowers customers and partners to leverage generative AI solutions provided by SAP, Large Language Models hosted by Azure (OpenAI), and other reputable third-party vendors. Please note that, as of the present, there is no free tier offering available for the generative AI hub service plan, and charges are incurred based on the tokens consumed.

**SAP AI Launchpad**

The SAP AI Launchpad provides a user-friendly graphical interface for seamless interaction with SAP AI Core offerings, including the generative AI hub. Users can conveniently create the necessary configurations and deployments directly within the SAP AI Launchpad. Alternatively, the corresponding SAP AI Core APIs, integral to our multi-tenant setup, are also at your disposal.

**Resource Groups**

SAP AI Core introduces the concept of "Resource Groups", used for tenant segregation within our sample setup. Future releases of SAP AI Core have plans to introduce a metering feature based on resource-groups (subject to change — please consult the official roadmap). While in a single-tenant scenario, a default resource group suffices, in a multitenant context, unique resource groups are used for each tenant. Configurations and Deployments are automatically generated within a new resource group upon tenant subscription.
