import BaseController from "./BaseController";
import JSONModel from "sap/ui/model/json/JSONModel";
import Event from "sap/ui/base/Event";
import Button from "sap/m/Button";
import TextArea from "sap/m/TextArea";
import MessageToast from "sap/m/MessageToast";

export default class EmailColumn extends BaseController {
	public onTranslate(event: Event): void {
		const localModel: JSONModel = this.getModel() as JSONModel;
		const button: Button = event.getSource();

		localModel.setProperty("/translationActivated", !localModel.getProperty("/translationActivated"));
		button.setText(localModel.getProperty("/translationActivated") ?
			this.getText("email.header.translationButton.original") :
			this.getText("email.header.translationButton.translate"));
	}

	public onPressGenerate(): void {
		MessageToast.show("not implemented!");
	}

	public onChangeResponse(event: Event): void {
		const value: string = (event.getSource() as TextArea).getValue();

		if (value.replace(/[^A-Z0-9]+/ig, '') === '') {
			const localModel: JSONModel = this.getModel() as JSONModel;
			localModel.setProperty(!localModel.getProperty("/translationActivated") ? "/responseBody" : "/translatedResponseBody", null);
		}
	}

	public onPressSubmit(event: Event): void {
		const localModel: JSONModel = this.getModel() as JSONModel;
		const button: Button = event.getSource();

		if (!localModel.getProperty("/translationActivated"))
			localModel.setProperty("/responseBody", button.getBindingContext("api").getProperty("mail/responseBody"));
		else localModel.setProperty("/translatedResponseBody", button.getBindingContext("api").getProperty("mail/translations/0/responseBody"));

		MessageToast.show("not implemented!");
	}
}