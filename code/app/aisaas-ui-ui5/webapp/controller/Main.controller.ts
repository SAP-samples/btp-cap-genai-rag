import BaseController from "./BaseController";
import JSONModel from "sap/ui/model/json/JSONModel";
import ResourceModel from "sap/ui/model/resource/ResourceModel";
import ResourceBundle from "sap/base/i18n/ResourceBundle";
import Event from "sap/ui/base/Event";
import List from "sap/m/List";
import Button from "sap/m/Button";
import Context from "sap/ui/model/odata/v4/Context";

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

	public onPressItem(event: Event): void {
		const selectedEmail: Context = (event.getSource() as List).getSelectedItem().getBindingContext("api") as Context;
		const emailModel: JSONModel = this.getModel(this.EMAIL_MODEL) as JSONModel;

		if (selectedEmail.getProperty("ID") !== emailModel.getProperty("/ID")) {
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
		}
		
		console.log(selectedEmail.getObject());
	}

	public onTranslate(event: Event): void {
		const localModel: JSONModel = this.getModel() as JSONModel;
		const button: Button = event.getSource();

		localModel.setProperty("/translationActivated", !localModel.getProperty("/translationActivated"));
		button.setText(localModel.getProperty("/translationActivated") ? 
			((this.getModel("i18n") as ResourceModel).getResourceBundle() as ResourceBundle).getText("email.header.translationButton.original") : 
			((this.getModel("i18n") as ResourceModel).getResourceBundle() as ResourceBundle).getText("email.header.translationButton.translate") );
	}
}