import BaseController from "./BaseController";
import JSONModel from "sap/ui/model/json/JSONModel";
import Event from "sap/ui/base/Event";
import ObjectPageLayout from "sap/uxap/ObjectPageLayout";
import ObjectPageSection from "sap/uxap/ObjectPageSection";
import List from "sap/m/List";
import ListItemBase from "sap/m/ListItemBase";
import CustomListItem from "sap/m/CustomListItem";
import Panel from "sap/m/Panel";
import HBox from "sap/m/HBox";
import VBox from "sap/m/VBox";
import Avatar from "sap/m/Avatar";
import Title from "sap/m/Title";
import Text from "sap/m/Text";
import Button from "sap/m/Button";
import TextArea from "sap/m/TextArea";
import MessageToast from "sap/m/MessageToast";

import { EmailObject, Mail, KeyFact, Action } from "../model/entities";
import Formatter from "../model/formatter";

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

	public createEmailHeaderContent(mail: Mail): void {
		const parentBox: HBox = this.byId("headerContent") as HBox;
		parentBox.removeAllItems();
		this.createElementsWithAndWithoutTranslation(parentBox, mail, false);

		if (mail.translations.length > 0) {
			const parentBox: HBox = this.byId("translatedHeaderContent") as HBox;
			parentBox.removeAllItems();
			this.createElementsWithAndWithoutTranslation(parentBox, mail, true);
		}
	}

	private createElementsWithAndWithoutTranslation(parentBox: HBox, mail: Mail, withTranslatedContent: boolean): void {
		const avatar: Avatar = new Avatar({
			displaySize: 'L',
			backgroundColor: 'Accent6',
			initials: Formatter.getAvatarInitial(mail.sender)
		});
		avatar.addStyleClass("sapUiMediumMarginEnd");
		parentBox.addItem(avatar);

		const vBox: VBox = new VBox();
		vBox.addStyleClass("sapUiTinyMarginTop sapUiMediumMarginEnd");

		const infoTitle: Title = new Title({ text: this.getText("email.header.customerInformation") });
		const senderText: Text = new Text({ text: !withTranslatedContent ? mail.sender : mail.translations[0].sender });
		const emailAddressText: Text = new Text({ text: mail.senderEmailAddress as string });
		vBox.addItem(infoTitle);
		vBox.addItem(senderText);
		vBox.addItem(emailAddressText);
		parentBox.addItem(vBox);

		const facts: KeyFact[] = !withTranslatedContent ? mail.keyFacts : mail.translations[0].keyFacts;
		facts?.map((factItem: KeyFact) => {
			const childBox: VBox = new VBox();
			childBox.addStyleClass("sapUiTinyMarginTop sapUiMediumMarginEnd");

			const title: Title = new Title({ text: factItem.keyfact });
			const text: Text = new Text({ text: factItem.keyfactcategory, wrapping: true, width: factItem.keyfactcategory?.length > 32 ? '12.5rem' : '100%' });
			childBox.addItem(title);
			childBox.addItem(text);

			parentBox.addItem(childBox);
		});
	}

	public createSuggestedActions(actions: Action[]): void {
		const hBox: HBox = this.byId("suggestedActionsBox") as HBox;
		hBox.removeAllItems();

		if (actions.length > 0) {
			actions.map((action: Action) => {
				const button: Button = new Button({
					text: action.value,
					press: this.onPressAction.bind(this)
				});
				button.addStyleClass("sapUiSmallMarginEnd");
				hBox.addItem(button);
			});
		} else {
			const text: Text = new Text({ text: this.getText("email.text.noActions") });
			hBox.addItem(text);
		}
	}

	public onTranslate(event: Event): void {
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