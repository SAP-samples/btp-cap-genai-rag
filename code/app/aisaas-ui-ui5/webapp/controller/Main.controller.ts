import BaseController from "./BaseController";
import JSONModel from "sap/ui/model/json/JSONModel";
import Event from "sap/ui/base/Event";
import List from "sap/m/List";

interface Email {
    ID: string,
	category: string,
	sender: string,
	modifiedAt: Date,
	urgency: number,
	subject: string,
	body: string
}

export default class Main extends BaseController {
	protected readonly EMAIL_MODEL: string = "emailModel";

	public onInit(): void {
		const emailModel = new JSONModel({
			ID: null,
			category: null,
			sender: null,
			modifiedAt: null,
			urgency: null,
			subject: null,
			body: null
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
		emailModel.setProperty("/subject", email ? email.subject : null);
		emailModel.setProperty("/body", email ? email.body : null);
	}

	public onPressItem(event: Event): void {
		const selectedEmail = (event.getSource() as List).getSelectedItem().getBindingContext("api");
		const emailModel: JSONModel = this.getModel(this.EMAIL_MODEL) as JSONModel;

		if (selectedEmail.getProperty("ID") !== emailModel.getProperty("/ID")) {
			this.setEmailModel({
				ID: selectedEmail.getProperty("ID"),
				category: selectedEmail.getProperty("category"),
				sender: selectedEmail.getProperty("sender"),
				modifiedAt: selectedEmail.getProperty("modifiedAt"),
				urgency: selectedEmail.getProperty("urgency"),
				subject: selectedEmail.getProperty("subject"),
				body: selectedEmail.getProperty("body")
			});
		}
		console.log(emailModel.getData());
	}
}
