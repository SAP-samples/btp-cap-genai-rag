import BaseController from "./BaseController";
import JSONModel from "sap/ui/model/json/JSONModel";
import Event from "sap/ui/base/Event";
import Button from "sap/m/Button";
import TextArea from "sap/m/TextArea";
import List from "sap/m/List";
import Context from "sap/ui/model/odata/v4/Context";
import View from "sap/ui/core/mvc/View";
import MainController from "./Main.controller";

import { EmailObject } from "../model/entities";

export default class EmailColumn extends BaseController {
	public onTranslate(event: Event): void {
		const localModel: JSONModel = this.getModel() as JSONModel;
		const button: Button = event.getSource();

		localModel.setProperty("/translationActivated", !localModel.getProperty("/translationActivated"));
		button.setText(localModel.getProperty("/translationActivated") ?
			this.getText("email.header.translationButton.original") :
			this.getText("email.header.translationButton.translate"));
	}

	public onChangeAdditionalInfo(event: Event): void {
		const value: string = (event.getSource() as TextArea).getValue();
		if (value.replace(/[^A-Z0-9]+/ig, '') === '') {
			const localModel: JSONModel = this.getModel() as JSONModel;
			localModel.setProperty("/additionalInfo", null);
		}
	}

	public onChangeResponse(event: Event): void {
		const value: string = (event.getSource() as TextArea).getValue();
		if (value.replace(/[^A-Z0-9]+/ig, '') === '') {
			const localModel: JSONModel = this.getModel() as JSONModel;
			localModel.setProperty("/potentialResponse", null);
		}
	}

	public async onSelectSimilarEmail(event: Event): Promise<void> {
		const emailObject: EmailObject = this.getView().getBindingContext("api").getObject() as EmailObject;
		const similarEmailsList: List = event.getSource() as List;
		const selectedEmailContext: Context = similarEmailsList.getSelectedItem().getBindingContext() as Context;
		const selectedId: string = selectedEmailContext.getProperty("mail/ID");

		const localModel: JSONModel = this.getModel() as JSONModel;
		if (localModel.getProperty("/potentialResponse") !== emailObject.mail.potentialResponse) {
			await this.openConfirmationDialog(this.getText("confirmationDialog.message"), () => this.selectSimilarEmail(selectedId));
			similarEmailsList.removeSelections(true);
		} else this.selectSimilarEmail(selectedId);
	}

	public selectSimilarEmail(id: string): void {
		const parentView: View = this.getView().getParent().getParent().getParent() as View;
		const parentController: MainController = parentView.getController() as MainController;

		parentController.clearAllFilters();
		parentController.setActiveEmail(id);
	}
}