# Scenario

This part of the tutorial contains a general introduction to the scenario covered by this step-by-step tutorial as well as some technical highlights of our sample scenario. 


## Introduction

The provided code samples showcase a **GenAI Mail Insights** sample scenario designed for the SAP Business Technology Platform (SAP BTP). It has been created by a potential SAP partner or customer and is specifically designed to enhance customer support within a travel agency through the use of advanced email analysis and automation.

In this scenario, the application employs **Large Language Models (LLMs)** to examine incoming emails, providing **key insights** such as **categorization**, **sentiment analysis**, and **urgency** assessment. Additionally, it offers more advanced features, including the extraction of essential information such as the **location** or **traveler type**.

One particularly innovative aspect is the use of **embeddings** to identify historical emails that are similar to the current ones, helping to understand how similar requests were handled in the past. This promotes consistent and efficient customer service. The code also demonstrates the ability to **summarize** and **translate** both the subject and body of emails, making it easier to understand and work with content in different languages.

Moreover, the application takes automation to the next level by **generating potential responses** to customer inquiries. This response generation process is influenced by **configurable actions and services**, leading to improved response accuracy and speed. Additionally, the system can seamlessly **integrate with SAP systems** like **SAP Concur**, adding an enterprise dimension and facilitating the integration of processes and data.

While initially designed for a travel agency, this code can be adapted to suit various industries, making it a versatile solution for enhancing customer support with data-driven insights and automation. 

If needed, there is also a **single-tenant** version of the application available in the corresponding directory of the repository.


## Technical Highlights

The major highlight differentiating our GenAI Mail Insights sample scenario from existing SAP BTP sample scenarios consists in the usage of the generative AI hub in SAP AI Core. This applies for the single-tenant as well as the multitenant scenario. In this short intro, we will highlight the use-specifics that go beyond a standard CAP-based multitenant SAPUI5 application. 

> **Hint** If you are new to the topic of multitenancy in SAP BTP, we highly suggest to check the following GitHub repository, to learn more about deploying a CAP-based multitenant application in the SAP BTP, Kyma Runtime as well as the SAP BTP, Cloud Foundry Runtime. 
> 
>[Develop a multitenant Software as a Service application in SAP BTP using CAP](https://github.com/SAP-samples/btp-cap-multitenant-saas) 

**Vector Store**

In this sample scenario, a Vector database is required to store so-called embeddings generated from the incoming emails. Those **embeddings** allow a similarity search to identify similar emails when generating new response suggestions. Until a native support for storing vectors/embeddings in SAP HANA Cloud, a PostgreSQL database is used to store the respective embeddings. The integration within the app is handled via features provided by LangChain, making the process a breeze. 

**generative AI hub**

The generative AI hub is part of the SAP AI Core offering and allows customer and partners to use generative AI offerings provided by SAP or Large Language Models hosted by Azure (OpenAI) and other third party vendors. 