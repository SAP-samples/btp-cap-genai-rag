import BaseController from "./BaseController";
import JSONModel from "sap/ui/model/json/JSONModel";
import ResourceBundle from "sap/base/i18n/ResourceBundle";
import Event from "sap/ui/base/Event";
import Button from "sap/m/Button";
import List from "sap/m/List";
import Context from "sap/ui/model/odata/v4/Context";
import XMLView from "sap/ui/core/mvc/XMLView";
import MainController from "./Main.controller";

export default class EmailColumn extends BaseController {
	public onTranslate(event: Event): void {
		const localModel: JSONModel = this.getModel() as JSONModel;
		const resourceBundle: ResourceBundle = this.getResourceBundle() as ResourceBundle;
		const button: Button = event.getSource();

		localModel.setProperty("/translationActivated", !localModel.getProperty("/translationActivated"));
		button.setText(localModel.getProperty("/translationActivated") ?
			resourceBundle.getText("email.header.translationButton.original") :
			resourceBundle.getText("email.header.translationButton.translate"));
	}

	public onSelectSimilarEmail(event: Event): void {
		const selectedEmail: Context = (event.getSource() as List).getSelectedItem().getBindingContext() as Context;
		const parentView: XMLView = this.getView().getParent().getParent().getParent() as XMLView;
		const parentController: MainController = parentView.getController() as MainController;

		parentController.clearAllFilters();
		parentController.setActiveEmail(selectedEmail.getProperty("mail/ID"));
	}
}