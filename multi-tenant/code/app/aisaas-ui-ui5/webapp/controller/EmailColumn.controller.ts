import BaseController from "./BaseController";
import JSONModel from "sap/ui/model/json/JSONModel";
import Event from "sap/ui/base/Event";
import ObjectPageLayout from "sap/uxap/ObjectPageLayout";
import ObjectPageSection from "sap/uxap/ObjectPageSection";
import List from "sap/m/List";
import ListItemBase from "sap/m/ListItemBase";
import CustomListItem from "sap/m/CustomListItem";
import Panel from "sap/m/Panel";
import Button from "sap/m/Button";
import TextArea from "sap/m/TextArea";
import MessageToast from "sap/m/MessageToast";

import { EmailObject } from "../model/entities";

export default class EmailColumn extends BaseController {
	public resetEmailPageState(): void {
		this.scrollToFirstSection();
		this.resetSimilarEmailsListState();
	}

	private scrollToFirstSection(): void {
		const page: ObjectPageLayout = this.byId("emailPage") as ObjectPageLayout;
		const suggestedResponseSection: ObjectPageSection = this.byId("suggestedResponseSection") as ObjectPageSection;
		const incomingMessageSection: ObjectPageSection = this.byId("incomingMessageSection") as ObjectPageSection;

		setTimeout(() => { //to correct the scrolling
			page.setSelectedSection(suggestedResponseSection);
			page.setSelectedSection(incomingMessageSection);
		}, 300);
	}

	private resetSimilarEmailsListState(): void {
		const similarEmailsList: List = this.byId("similarEmailsList") as List;
		similarEmailsList.removeSelections(true);
		similarEmailsList.getItems().map((listItem: ListItemBase) => ((listItem as CustomListItem).getContent()[0] as Panel).setExpanded(false));
	}

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