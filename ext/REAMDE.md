# Getting Started

> **Important** - More information on how to extend your SaaS application from a consumer perspective will be covered as part of the **Expert Scope** soon! 

Welcome to your extension project of `Sustainable SaaS`.

It contains these folders and files, following our recommended project layout:

| File or Folder | Purpose                        |
|----------------|--------------------------------|
| `app/`         | all extensions content is here |
| `i18n/`        | text/translation files         |
| `package.json` | project configuration          |
| `REAMDE.md`    | this getting started guide     |


## Next Steps

- `cds pull` latest models from your base application
- edit [`./app/extensions.cds`](./app/extensions.cds) to add your extensions
- edit [`./app/fiori.cds`](./app/fiori.cds) to add your annotations
- `cds watch` your extension in local test-drives
- `cds build && cds push` your extension to **test** tenant
- `cds build && cds push` your extension to **prod** tenant


## Learn More

Learn more at https://cap.cloud.sap/docs/guides/extensibility/customization.