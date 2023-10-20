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

import { Mail, KeyFact, Action } from "../model/entities";
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

        setTimeout(() => {
            //to correct the scrolling
            page.setSelectedSection(suggestedResponseSection);
            page.setSelectedSection(incomingMessageSection);
        }, 400);
    }

    private resetSimilarEmailsListState(): void {
        const similarEmailsList: List = this.byId("similarEmailsList") as List;
        similarEmailsList.removeSelections(true);
        similarEmailsList
            .getItems()
            .map((listItem: ListItemBase) =>
                ((listItem as CustomListItem).getContent()[0] as Panel).setExpanded(false)
            );
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
        // const senderText: Text = new Text({ text: !inTranslatedLanguage ? mail.sender : mail.translation.sender });
        const senderText: Text = new Text({ text: mail.sender });
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

        // const facts: KeyFact[] = !inTranslatedLanguage ? mail.keyFacts : mail.translation.keyFacts;
        const facts: KeyFact[] = mail.keyFacts;
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
                    press: () =>
                        this.openMessageDialog(
                            action.value,
                            "verbose descrition for '" + action.value + "' (still to come)"
                        )
                });
                button.addStyleClass("sapUiSmallMarginEnd");
                hBox.addItem(button);
            });
        } else {
            const text: Text = new Text({ text: this.getText("email.texts.noActions") });
            hBox.addItem(text);
        }
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

    public async onPressRegenerate(): Promise<void> {
        const localModel: JSONModel = this.getModel() as JSONModel;
        localModel.setProperty("/busy", true);

        await fetch("api/odata/v4/mail-insights/regenerateResponse", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                id: localModel.getProperty("/activeEmailId"),
                rag: localModel.getProperty("/submittedResponsesIncluded"),
                additionalInformation: localModel.getProperty("/additionalInfo")
            })
        })
            .then((response: Response) => {
                return response.json();
            })
            .then((result: Mail) => {
                localModel.setProperty("/responseBody", result.responseBody);
                // localModel.setProperty("/translatedResponseBody", !result.languageMatch ? result.translation.responseBody : result.responseBody);
                localModel.setProperty("/translatedResponseBody", result.responseBody);

                localModel.setProperty("/busy", false);
                MessageToast.show(this.getText("email.texts.generateResponseMessage"));
            })
            .catch((error: Error) => console.log(error));
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

    public onPressSend(): void {
        const localModel: JSONModel = this.getModel() as JSONModel;
        if (!localModel.getProperty("/translationOn"))
            localModel.setProperty(
                "/responseBody",
                this.getView().getBindingContext("api").getProperty("mail/responseBody")
            );
        // else localModel.setProperty("/translatedResponseBody", this.getView().getBindingContext("api").getProperty("mail/translation/responseBody"));
        else
            localModel.setProperty(
                "/translatedResponseBody",
                this.getView().getBindingContext("api").getProperty("mail/responseBody")
            );

        MessageToast.show("Not implemented!");
    }
}
