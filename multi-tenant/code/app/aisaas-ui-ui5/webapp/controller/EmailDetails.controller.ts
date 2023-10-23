import BaseController from "./BaseController";
import JSONModel from "sap/ui/model/json/JSONModel";
import ODataModel from "sap/ui/model/odata/v4/ODataModel"; 
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

export default class EmailDetails extends BaseController {
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
		}, 400);
	}

	private resetSimilarEmailsListState(): void {
		const similarEmailsList: List = this.byId("similarEmailsList") as List;
		similarEmailsList.removeSelections(true);
		similarEmailsList.getItems().map((listItem: ListItemBase) => ((listItem as CustomListItem).getContent()[0] as Panel).setExpanded(false));
	}

	public createEmailHeaderContent(mail: Mail): void {
		const parentBox: HBox = this.byId("headerContent") as HBox;
		parentBox.removeAllItems();
		this.createHeaderElements(parentBox, mail, false);

		if (!mail.languageMatch) {
			const parentBox: HBox = this.byId("translatedHeaderContent") as HBox;
			parentBox.removeAllItems();
			this.createHeaderElements(parentBox, mail, true);
		}
	}

	private createHeaderElements(parentBox: HBox, mail: Mail, inTranslatedLanguage: boolean): void {
		const avatar: Avatar = new Avatar({
			displaySize: 'L',
			backgroundColor: 'Accent6',
			initials: Formatter.getAvatarInitial(mail.sender)
		});
		avatar.addStyleClass("sapUiMediumMarginEnd");
		parentBox.addItem(avatar);

		const infoBox: VBox = new VBox();
		infoBox.addStyleClass("sapUiTinyMarginTop sapUiMediumMarginEnd");
		const infoTitle: Title = new Title({ text: this.getText("email.titles.customerInformation") });
		const senderText: Text = new Text({ text: !inTranslatedLanguage ? mail.sender : mail.translations[0].sender });
		const emailAddressText: Text = new Text({ text: mail.senderEmailAddress as string });
		infoBox.addItem(infoTitle);
		infoBox.addItem(senderText);
		infoBox.addItem(emailAddressText);
		parentBox.addItem(infoBox);

		const languageBox: VBox = new VBox();
		languageBox.addStyleClass("sapUiTinyMarginTop sapUiMediumMarginEnd");
		const languageTitle: Title = new Title({ text: this.getText("email.titles.originalLanguage") });
		const languageText: Text = new Text({ text: mail.languageNameDetermined });
		languageBox.addItem(languageTitle);
		languageBox.addItem(languageText);
		parentBox.addItem(languageBox);

		const facts: KeyFact[] = !inTranslatedLanguage ? mail.keyFacts : mail.translations[0].keyFacts;
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
			const text: Text = new Text({ text: this.getText("email.texts.noActions") });
			hBox.addItem(text);
		}
	}

	public onTranslate(event: Event): void {
		const localModel: JSONModel = this.getModel() as JSONModel;
		const button: Button = event.getSource();
		const emailObject: EmailObject = button.getBindingContext("api").getObject() as EmailObject;

		if (!emailObject.mail.languageMatch) {
			if (localModel.getProperty("/responseBody") !== emailObject.mail.responseBody ||
				localModel.getProperty("/translatedResponseBody") !== emailObject.mail.translations[0].responseBody) {
				MessageToast.show(this.getText("email.texts.switchTranslationMessage"), { duration: 5000 });
			}
		}

		localModel.setProperty("/translationOn", !localModel.getProperty("/translationOn"));
		button.setText(localModel.getProperty("/translationOn") ?
			this.getText("email.buttons.original") :
			this.getText("email.buttons.translate"));
	}

	public onPressAction(): void {
		MessageToast.show("Not implemented!");
	}

	public onChangeAdditionalInfo(event: Event): void {
		const value: string = (event.getSource() as TextArea).getValue();
		if (value.replace(/[^A-Z0-9]+/ig, '') === '') {
			const localModel: JSONModel = this.getModel() as JSONModel;
			localModel.setProperty("/additionalInfo", null);
		}
	}

	public async onPressGenerate(event: Event): Promise<void> {
		const oDataModel = this.getModel('api') as ODataModel;
		const localModel: JSONModel = this.getModel() as JSONModel;
		const httpHeaders: any = oDataModel.getHttpHeaders();
		
		localModel.setProperty("/busy", true);

		await fetch("api/odata/v4/mail-insights/regenerateResponse", {
			method: "POST",
			headers: {
				"X-CSRF-Token": httpHeaders["X-CSRF-Token"],
				"Content-Type": "application/json"
			},
			body: JSON.stringify({
				id: localModel.getProperty("/activeEmailId"),
				rag: localModel.getProperty("/submittedResponsesIncluded"),
				additionalInformation: localModel.getProperty("/additionalInfo")
			})
		})
			.then((response: Response) => { return response.json() })
			.then((result: Mail) => {
				localModel.setProperty("/responseBody", result.responseBody);
				!result.languageMatch && localModel.setProperty("/translatedResponseBody", result.translations[0].responseBody);

				localModel.setProperty("/busy", false);
				MessageToast.show(this.getText("email.texts.generateResponseMessage"));
			}).catch((error: Error) => console.log(error))
	}

	public onChangeResponse(event: Event): void {
		const value: string = (event.getSource() as TextArea).getValue();
		if (value.replace(/[^A-Z0-9]+/ig, '') === '') {
			const localModel: JSONModel = this.getModel() as JSONModel;
			localModel.setProperty(!localModel.getProperty("/translationOn") ? "/responseBody" : "/translatedResponseBody", null);
		}
	}

	public onPressSend(event: Event): void {
		const localModel: JSONModel = this.getModel() as JSONModel;
		const button: Button = event.getSource();

		if (!localModel.getProperty("/translationOn"))
			localModel.setProperty("/responseBody", button.getBindingContext("api").getProperty("mail/responseBody"));
		else localModel.setProperty("/translatedResponseBody", button.getBindingContext("api").getProperty("mail/translations/0/responseBody"));

		MessageToast.show("Not implemented!");
	}
}