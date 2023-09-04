import BaseController from "./BaseController";
import JSONModel from "sap/ui/model/json/JSONModel";
import XMLView from "sap/ui/core/mvc/XMLView";
import ObjectPageLayout from "sap/uxap/ObjectPageLayout";
import ObjectPageSection from "sap/uxap/ObjectPageSection";
import Event from "sap/ui/base/Event";
import Context from "sap/ui/model/odata/v4/Context";
import List from "sap/m/List";

interface Email {
    ID: string,
	category: string,
	sender: string,
	modifiedAt: Date,
	urgency: number,
	sentiment: string,
	subject: string,
	body: string,
	translationSubject: string,
	translationBody: string
}

export default class Main extends BaseController {
	protected readonly EMAIL_MODEL: string = "emailModel";

	public onInit(): void {
		const model: JSONModel = new JSONModel({
			translationActivated: false
		});
		this.setModel(model);

		const emailModel: JSONModel = new JSONModel({
			ID: null,
			category: null,
			sender: null,
			modifiedAt: null,
			urgency: null,
			sentiment: null,
			subject: null,
			body: null,
			translationSubject: null,
			translationBody: null
		});
		this.setModel(emailModel, this.EMAIL_MODEL);
	}

	public onPressItem(event: Event): void {
		const selectedEmail: Context = (event.getSource() as List).getSelectedItem().getBindingContext("api") as Context;
		const emailView: XMLView = this.byId("emailColumn") as XMLView;
		const emailPage: ObjectPageLayout = emailView.byId("emailPage") as ObjectPageLayout;
		const incomingMessageSection: ObjectPageSection = emailView.byId("incomingMessageSection") as ObjectPageSection;

		this.setEmailModel({
			ID: selectedEmail.getProperty("ID"),
			category: selectedEmail.getProperty("category"),
			sender: selectedEmail.getProperty("sender"),
			modifiedAt: selectedEmail.getProperty("modifiedAt"),
			urgency: selectedEmail.getProperty("urgency"),
			sentiment: selectedEmail.getProperty("sentiment"),
			subject: selectedEmail.getProperty("subject"),
			body: selectedEmail.getProperty("body"),
			translationSubject: selectedEmail.getProperty("translationSubject"),
			translationBody: selectedEmail.getProperty("translationBody")
		});

		emailPage.setSelectedSection(incomingMessageSection);
		
		console.log(selectedEmail.getObject());
	}

	private setEmailModel(email: Email = null): void {
		const emailModel: JSONModel = this.getModel(this.EMAIL_MODEL) as JSONModel;
		emailModel.setProperty("/ID", email ? email.ID : null);
		emailModel.setProperty("/category", email ? email.category : null);
		emailModel.setProperty("/sender", email ? email.sender : null);
		emailModel.setProperty("/modifiedAt", email ? email.modifiedAt : null);
		emailModel.setProperty("/urgency", email ? email.urgency : null);
		emailModel.setProperty("/sentiment", email ? email.sentiment : null);
		emailModel.setProperty("/subject", email ? email.subject : null);
		emailModel.setProperty("/body", email ? email.body : null);
		emailModel.setProperty("/translationSubject", email ? email.translationSubject : null);
		emailModel.setProperty("/translationBody", email ? email.translationBody : null);
	}
}