import BaseController from "./BaseController";
import JSONModel from "sap/ui/model/json/JSONModel";
import ResourceModel from "sap/ui/model/resource/ResourceModel";
import ResourceBundle from "sap/base/i18n/ResourceBundle";
import Event from "sap/ui/base/Event";
import Button from "sap/m/Button";

export default class EmailColumn extends BaseController {
	public onTranslate(event: Event): void {
		const localModel: JSONModel = this.getModel() as JSONModel;
		const button: Button = event.getSource();

		localModel.setProperty("/translationActivated", !localModel.getProperty("/translationActivated"));
		button.setText(localModel.getProperty("/translationActivated") ? 
			((this.getModel("i18n") as ResourceModel).getResourceBundle() as ResourceBundle).getText("email.header.translationButton.original") : 
			((this.getModel("i18n") as ResourceModel).getResourceBundle() as ResourceBundle).getText("email.header.translationButton.translate") );
	}
}