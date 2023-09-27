import BaseController from "./BaseController";
import JSONModel from "sap/ui/model/json/JSONModel";
import Event from "sap/ui/base/Event";
import Button from "sap/m/Button";
import TextArea from "sap/m/TextArea";
import MessageToast from "sap/m/MessageToast";

import { EmailObject } from "../model/entities";

export default class EmailColumn extends BaseController {
	public async onTranslate(event: Event): Promise<void> {
		const localModel: JSONModel = this.getModel() as JSONModel;
		const button: Button = event.getSource();
		const emailObject: EmailObject = button.getBindingContext("api").getObject() as EmailObject;

		if (!emailObject.mail.languageMatch) {
			if (!localModel.getProperty("/translationActivated")) {
				if (localModel.getProperty("/responseBody") !== emailObject.mail.responseBody)
					MessageToast.show(this.getText("email.header.switchTranslation.message"), { duration: 5000 });
			} else {
				if (localModel.getProperty("/translatedResponseBody") !== emailObject.mail.translations[0].responseBody)
					MessageToast.show(this.getText("email.header.switchTranslation.message"), { duration: 5000 });
			}
		}

		localModel.setProperty("/translationActivated", !localModel.getProperty("/translationActivated"));
		button.setText(localModel.getProperty("/translationActivated") ?
			this.getText("email.header.translationButton.original") :
			this.getText("email.header.translationButton.translate"));
	}

	public onPressAction(): void {
		MessageToast.show("Not implemented!");
	}

	public onPressGenerate(): void {
		MessageToast.show("Not implemented!");
	}

	public onChangeResponse(event: Event): void {
		const value: string = (event.getSource() as TextArea).getValue();

		if (value.replace(/[^A-Z0-9]+/ig, '') === '') {
			const localModel: JSONModel = this.getModel() as JSONModel;
			localModel.setProperty(!localModel.getProperty("/translationActivated") ? "/responseBody" : "/translatedResponseBody", null);
		}
	}

	public onPressSend(event: Event): void {
		const localModel: JSONModel = this.getModel() as JSONModel;
		const button: Button = event.getSource();

		if (!localModel.getProperty("/translationActivated"))
			localModel.setProperty("/responseBody", button.getBindingContext("api").getProperty("mail/responseBody"));
		else localModel.setProperty("/translatedResponseBody", button.getBindingContext("api").getProperty("mail/translations/0/responseBody"));

		MessageToast.show("Not implemented!");
	}
}