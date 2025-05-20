import BaseController, { CAP_BASE_URL } from "./BaseController";
import JSONModel from "sap/ui/model/json/JSONModel";
import ODataModel from "sap/ui/model/odata/v4/ODataModel";
import ContextV4 from "sap/ui/model/odata/v4/Context";
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
import PageSection from "sap/uxap/ObjectPageSection";
import Fragment from "sap/ui/core/Fragment";
import Dialog from "sap/m/Dialog";

import { Mail, KeyFact, Action, ClosestMail } from "../model/entities";
import Formatter from "../model/formatter";

const MAIL_ANSWERED_FRAGMENT_NAME = "ai.ui.view.MailAnsweredDialog";
const ID_MAIL_ANSWERED_DIALOG = "mailAnsweredDialog";
const ID_TEXTAREA_OL = "areaOL";
const ID_TEXTAREA_WL = "areaWL";
var activeEmail: Mail;

export default class EmailDetails extends BaseController {
	private mailAnsweredDialog: Dialog;

	public resetEmailPageState(): void {
		this.scrollToFirstSection();
		this.resetSimilarEmailsListState();
	}

	private scrollToFirstSection(): void {
		const page: ObjectPageLayout = this.byId("emailPage") as ObjectPageLayout;
		const summarySection = this.byId("summarySection") as ObjectPageSection;
		page.scrollToSection(summarySection.getId(), 800);
	}

	private resetSimilarEmailsListState(): void {
		const similarEmailsList: List = this.byId("similarEmailsList") as List;
		similarEmailsList.removeSelections(true);
		similarEmailsList
			.getItems()
			.map((listItem: ListItemBase) => ((listItem as CustomListItem).getContent()[0] as Panel).setExpanded(false));
	}

	public createEmailHeaderContent(mail: Mail): void {
		const contentBox: HBox = this.byId("headerContent") as HBox;
		contentBox.removeAllItems();
		this.createHeaderElements(contentBox, mail, false);

		const translatedContentBox: HBox = this.byId("headerTranslatedContent") as HBox;
		translatedContentBox.removeAllItems();
		this.createHeaderElements(translatedContentBox, mail, true);
	}

	private createHeaderElements(parentBox: HBox, mail: Mail, inTranslatedLanguage: boolean): void {
		const avatar: Avatar = new Avatar({
			displaySize: "L",
			backgroundColor: "Accent6",
			initials: Formatter.getAvatarInitial(mail.sender)
		});
		avatar.addStyleClass("sapUiMediumMarginEnd");
		parentBox.addItem(avatar);

		const infoBox: VBox = new VBox();
		infoBox.addStyleClass("sapUiTinyMarginTop sapUiMediumMarginEnd");
		const infoTitle: Title = new Title({ text: this.getText("email.titles.customerInformation") });
		const senderText: Text = new Text({ text: !inTranslatedLanguage ? mail.sender : mail.translation.sender });
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

		const facts: KeyFact[] = !inTranslatedLanguage ? mail.keyFacts : mail.translation.keyFacts;
		facts?.map((factItem: KeyFact) => {
			const childBox: VBox = new VBox();
			childBox.addStyleClass("sapUiTinyMarginTop sapUiMediumMarginEnd");

			const title: Title = new Title({ text: factItem.category });
			const text: Text = new Text({
				text: factItem.fact,
				wrapping: true,
				width: factItem.fact?.length > 32 ? "12.5rem" : "100%"
			});
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
					press: () => this.openMessageDialog(action.value, action.descr)
				});
				button.addStyleClass("sapUiSmallMarginEnd");
				hBox.addItem(button);
			});
		} else {
			const text: Text = new Text({ text: this.getText("email.texts.noActions") });
			hBox.addItem(text);
		}
	}

	public async openMailAnsweredDialog(responseOL: string, responseWL: string): Promise<void> {
		if (!this.mailAnsweredDialog) {
			await this.initMailAnsweredDialog();
		}
		const flexItems = (this.mailAnsweredDialog.getContent()[0] as VBox).getItems();
		const areaOL = flexItems.find(
			(item) => item.getId() === ID_MAIL_ANSWERED_DIALOG + "--" + ID_TEXTAREA_OL
		) as TextArea;
		areaOL.setValue(responseOL);

		const areaWL = flexItems.find(
			(item) => item.getId() === ID_MAIL_ANSWERED_DIALOG + "--" + ID_TEXTAREA_WL
		) as TextArea;
		areaWL.setValue(responseWL);

		this.mailAnsweredDialog.open();
	}

	public async initMailAnsweredDialog(): Promise<void> {
		this.mailAnsweredDialog = (await Fragment.load({
			id: ID_MAIL_ANSWERED_DIALOG,
			name: MAIL_ANSWERED_FRAGMENT_NAME,
			controller: this
		})) as Dialog;
		const dialog = this.mailAnsweredDialog as Dialog;
		this.getView().addDependent(dialog);
		const closeButton = new Button({ text: this.getText("buttons.close"), press: () => dialog.close() });
		dialog.setBeginButton(closeButton);
	}

	public onPressAction(): void {
		MessageToast.show("Not implemented!");
	}

	public onChangeAdditionalInfo(event: Event): void {
		const value: string = (event.getSource() as TextArea).getValue();
		if (value.replace(/[^A-Z0-9]+/gi, "") === "") {
			const localModel: JSONModel = this.getModel() as JSONModel;
			localModel.setProperty("/additionalInfo", null);
		}
	}

	public setEmailObj(mail: Mail): void {
		activeEmail = mail;
	}

	public async gov_generation(event: Event): Promise<void> {
		const evaluationSource = (event.getSource() as Button).getCustomData()[0].getValue();
		const isInputEvaluation: Boolean = evaluationSource === "input"; 
		//const oDataModel = this.getModel("api") as ODataModel;
		const localModel: JSONModel = this.getModel() as JSONModel;
	

		const contextEmails = localModel.getData().similarEmails.map((mail: ClosestMail) =>  mail.mail.responseBody);
			const govResponseSection = this.byId(isInputEvaluation ? "govResponseSectionInput" : "govResponseSectionOutput") as PageSection;
			govResponseSection.setBusy(true);
		
		try {
			const responseWorkingLanguage = localModel.getProperty("/responseBody") as string;
			let raw;
			if(isInputEvaluation) {
				raw = JSON.stringify({
					"question": activeEmail.subject + " " + activeEmail.body,
					"context1": contextEmails[0],
					"context2": contextEmails[1],
					"context3": contextEmails[2]
				});
			} else {
				raw = JSON.stringify({
					"question": activeEmail.subject + " " + activeEmail.body,
					"generated_text" : responseWorkingLanguage,
					"context1": contextEmails[0],
					"context2": contextEmails[1],
					"context3": contextEmails[2]
				});
			}
	
			const response = await fetch('https://<sap gov evaluation cfapps hostname>/evaluate', {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"access-control-allow-origin": "*"
				},
				body: raw
			});
	
			if (response.ok) {
				const result = await response.json();
				const pii_input_entities = result.entity.values.pii_input_entities;
				const pii_entities = result.entity.values.pii_entities;

				//this.onPressRegenerate();
				if(isInputEvaluation) {
					const inputEval = {
						"pii_input_entities": pii_input_entities
					}
					localModel.setProperty("/watsonxgovresponseinput", JSON.stringify(inputEval));
				} else {
					const outputEval = {
						"pii_entities": pii_entities,
						"answer_relevance": result.entity.values.answer_relevance,
						"context_relevance": result.entity.values.context_relevance,
						"context_relevances": {
							[result.entity.values.context_relevances.context_columns[0]]: result.entity.values.context_relevances.context_relevances[0],
							[result.entity.values.context_relevances.context_columns[1]]: result.entity.values.context_relevances.context_relevances[1],
							[result.entity.values.context_relevances.context_columns[2]]: result.entity.values.context_relevances.context_relevances[2]
						}
					}
					localModel.setProperty("/watsonxgovresponseoutput", JSON.stringify(outputEval));
				}
				MessageToast.show(this.getText("email.texts.generateResponseMessage"));
			} else {
				console.error("Failed to fetch response:", response.status, response.statusText);
			}
		} catch (error) {
			console.error("Error in gov_generation:", error);
		} finally {
			localModel.setProperty("/busy", false);
			govResponseSection.setBusy(false);
		}
	}

	public async onPressRegenerate(): Promise<void> {
		const oDataModel = this.getModel("api") as ODataModel;
		const localModel: JSONModel = this.getModel() as JSONModel;

		const responsePreparation = this.byId("responsePreparationSection") as PageSection;
		responsePreparation.setBusy(true);
		const httpHeaders: any = oDataModel.getHttpHeaders();

		try {
			const piiEntities = localModel.getProperty("/watsonxgovresponseinput") as string;
			const requestBody = {
				id: localModel.getData().activeEmailId,
				rag: localModel.getProperty("/submittedResponsesIncluded"),
				additionalInformation: localModel.getProperty("/additionalInfo"),
				piiEntities : piiEntities
			  };
  
			console.log('Request Body:', JSON.stringify(requestBody));
			const response = await fetch(`${CAP_BASE_URL}/regenerateResponse`, {
				method: "POST",
				headers: {
					"X-CSRF-Token": httpHeaders["X-CSRF-Token"],
					"Content-Type": "application/json"
				},
				body: JSON.stringify(requestBody)
			});
			console.log(response);
			
			if (response.ok) {
				const result = (await response.json()) as Mail;
				localModel.setProperty("/responseBody", result.responseBody);
				localModel.setProperty(
					"/translatedResponseBody",
					!result.languageMatch ? result.translation.responseBody : result.responseBody
				);
				localModel.setProperty("/busy", false);
				MessageToast.show(this.getText("email.texts.generateResponseMessage"));
			}
		} catch (error) {
			console.log(error);
		} finally {
			responsePreparation.setBusy(false);
		}
	}

	public onChangeResponse(event: Event): void {
		const value: string = (event.getSource() as TextArea).getValue();
		if (value.replace(/[^A-Z0-9]+/gi, "") === "") {
			const localModel: JSONModel = this.getModel() as JSONModel;
			localModel.setProperty(
				!localModel.getProperty("/translationOn") ? "/responseBody" : "/translatedResponseBody",
				null
			);
		}
	}

	/* To submit response for finalization */
	public async onPressSend(): Promise<void> {
		const localModel: JSONModel = this.getModel() as JSONModel;
		const responseWorkingLanguage = localModel.getProperty("/translatedResponseBody") as string;
		const idMail = localModel.getProperty("/activeEmailId") as string;

		const oDataModel = this.getModel("api") as ODataModel;
		const httpHeaders = oDataModel.getHttpHeaders();
		const suggestedResponse = this.byId("suggestedResponseSection") as PageSection;
		suggestedResponse.setBusy(true);
		try {
			const response = await fetch(`${CAP_BASE_URL}/submitResponse`, {
				method: "POST",
				headers: {
					// @ts-ignore
					"X-CSRF-Token": httpHeaders["X-CSRF-Token"],
					"Content-Type": "application/json"
				},
				body: JSON.stringify({ id: idMail, response: responseWorkingLanguage })
			});
			if (response.ok) {
				const data = await response.json();
				const success = data.value as boolean;
				if (success) {
					this.getModel("api").refresh();
					// hope that bindings are refreshed by now. there is no async version of
					// refresh function on model level
					const responseOriginalLanguage = (
						await (this.getView().getBindingContext("api") as ContextV4).requestObject()
					).mail.responseBody;
					this.openMailAnsweredDialog(responseOriginalLanguage, responseWorkingLanguage).catch(console.log);
				}
			} else {
				MessageToast.show(this.getText("email.texts.genericErrorMessage"));
			}
		} catch (error) {
			console.log(error);
			MessageToast.show(this.getText("email.texts.genericErrorMessage"));
		} finally {
			suggestedResponse.setBusy(false);
		}
	}

	public async onRevokeResponse(): Promise<void> {
		try {
			const oDataModel = this.getModel("api") as ODataModel;
			const httpHeaders = oDataModel.getHttpHeaders();
			const localModel: JSONModel = this.getModel() as JSONModel;
			const response = await fetch(`${CAP_BASE_URL}/revokeResponse`, {
				method: "POST",
				headers: {
					// @ts-ignore
					"X-CSRF-Token": httpHeaders["X-CSRF-Token"],
					"Content-Type": "application/json"
				},
				body: JSON.stringify({
					id: localModel.getProperty("/activeEmailId")
				})
			});
			if (response.ok) {
				MessageToast.show(this.getText("email.texts.revoked"));
				this.getModel("api").refresh();
			} else {
				MessageToast.show(this.getText("email.texts.genericErrorMessage"));
			}
		} catch (error) {
			console.log(error);
			MessageToast.show(this.getText("email.texts.genericErrorMessage"));
		}
	}

	public async onDeleteMail(): Promise<void> {
		try {
			const oDataModel = this.getModel("api") as ODataModel;
			const httpHeaders = oDataModel.getHttpHeaders();
			const localModel: JSONModel = this.getModel() as JSONModel;
			const response = await fetch(`${CAP_BASE_URL}/deleteMail`, {
				method: "POST",
				headers: {
					// @ts-ignore
					"X-CSRF-Token": httpHeaders["X-CSRF-Token"],
					"Content-Type": "application/json"
				},
				body: JSON.stringify({
					id: localModel.getProperty("/activeEmailId")
				})
			});
			if (response.ok) {
				MessageToast.show(this.getText("email.texts.deleted"));
				this.getModel("api").refresh();
			} else {
				MessageToast.show(this.getText("email.texts.genericErrorMessage"));
			}
		} catch (error) {
			console.log(error);
			MessageToast.show(this.getText("email.texts.genericErrorMessage"));
		}
	}
}
