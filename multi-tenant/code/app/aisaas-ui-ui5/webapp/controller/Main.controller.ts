import BaseController from "./BaseController";
import JSONModel from "sap/ui/model/json/JSONModel";
import Event from "sap/ui/base/Event";
import Context from "sap/ui/model/odata/v4/Context";
import ODataListBinding from "sap/ui/model/odata/v4/ODataListBinding";
import ODataContextBinding from "sap/ui/model/odata/v4/ODataContextBinding";
import View from "sap/ui/core/mvc/View";
import ObjectPageLayout from "sap/uxap/ObjectPageLayout";
import ObjectPageSection from "sap/uxap/ObjectPageSection";
import Link from "sap/m/Link";
import List from "sap/m/List";
import ListItemBase from "sap/m/ListItemBase";
import CustomListItem from "sap/m/CustomListItem";
import Button from "sap/m/Button";
import HBox from "sap/m/HBox";
import VBox from "sap/m/VBox";
import Avatar from "sap/m/Avatar";
import Title from "sap/m/Title";
import Text from "sap/m/Text";
import Panel from "sap/m/Panel";
import Filter from "sap/ui/model/Filter";
import FilterOperator from "sap/ui/model/FilterOperator";
import FilterType from "sap/ui/model/FilterType";
import Sorter from "sap/ui/model/Sorter";
import { ObjectBindingInfo } from "sap/ui/base/ManagedObject";

import { EmailObject, Mail, KeyFact, Action, FilterItem } from "../model/entities";
import Formatter from "../model/formatter";
import EmailController from "./EmailColumn.controller";

export default class Main extends BaseController {
	protected readonly ACTIVE_CATEGORIES_PATH: string = "activeCategories";
	protected readonly ACTIVE_URGENCIES_PATH: string = "activeUrgencies";
	protected readonly ACTIVE_SENTIMENTS_PATH: string = "activeSentiments";
	protected readonly EMAIL_CATEGORY_PATH: string = "category";
	protected readonly EMAIL_URGENCY_PATH: string = "urgency";
	protected readonly EMAIL_SENTIMENT_PATH: string = "sentiment";
	protected readonly EMAIL_SENDER_PATH: string = "sender";
	protected readonly EMAIL_SUBJECT_PATH: string = "subject";
	protected readonly EMAIL_BODY_PATH: string = "body";
	protected readonly EMAIL_MODIFIED_AT_PATH: string = "modifiedAt";
	protected readonly EMAIL_ENTITY_PATH: string = "api>/getMail";
	protected readonly UPDATE_GROUP: string = "UPDATE_GROUP_" + Math.random().toString(36).substring(2);

	public onInit(): void {
		super.onInit();
		this.getRouter().attachRouteMatched(this.onRouteMatched, this);

		const model: JSONModel = new JSONModel({
			activeCategories: [],
			activeUrgencies: [],
			activeSentiments: [],
			searchKeyword: null,
			emailsCount: 0,
			sortDescending: false,
			sortText: null,
			activeEmailId: null,
			translationActivated: false,
			additionalInfo: null,
			responseBody: null,
			translatedResponseBody: null,
			similarEmails: []
		});
		this.setModel(model);
	}

	protected onRouteMatched(): void {
		const localModel: JSONModel = this.getModel() as JSONModel;
		localModel.setProperty("/sortText", this.getText("inbox.sort.label.newest"));
	}

	public onUpdateEmailsList(event: Event): void {
		const binding: ODataListBinding = event.getSource() as ODataListBinding;
		const localModel: JSONModel = this.getModel() as JSONModel;
		localModel.setProperty("/emailsCount", binding.getCount());

		const emailsList: List = this.byId("emailsList") as List;
		if (emailsList.getItems().length > 0) {
			if (!this.isActiveEmailInFilteredEmails()) {
				this.setTopEmail();
				this.scrollToActiveEmail(0);
			}
			else this.scrollToActiveEmail();
		} else this.setActiveEmail();
	}

	private setTopEmail(): void {
		if (this.getFilteredEmailIds().length > 0) this.setActiveEmail(this.getFilteredEmailIds()[0]);
	}

	private isActiveEmailInFilteredEmails(): boolean {
		const localModel: JSONModel = this.getModel() as JSONModel;
		const filteredEmailIds: string[] = this.getFilteredEmailIds();

		return filteredEmailIds.some((id: string) => id === localModel.getProperty("/activeEmailId"))
	}

	private scrollToActiveEmail(index: number = null): void {
		const emailsList: List = this.byId("emailsList") as List;

		if (!index) {
			const localModel: JSONModel = this.getModel() as JSONModel;
			const filteredEmailIds: string[] = this.getFilteredEmailIds();
			const activeEmailIndex: number = filteredEmailIds.indexOf(filteredEmailIds.find((id: string) => id === localModel.getProperty("/activeEmailId")));
			emailsList.scrollToIndex(activeEmailIndex);
		} else emailsList.scrollToIndex(index);
	}

	private getFilteredEmailIds(): string[] {
		const binding: ODataListBinding = (this.byId("emailsList") as List).getBinding("items") as ODataListBinding;
		const currentContexts: Context[] = binding.getAllCurrentContexts();
		const ids: string[] = [];

		currentContexts.map((context: Context) => ids.push(context.getObject().ID));
		return ids
	}

	public setActiveEmail(id: string = null): void {
		const localModel: JSONModel = this.getModel() as JSONModel;
		const emailView: View = this.byId("emailColumn") as View;
		const emailPage: ObjectPageLayout = emailView.byId("emailPage") as ObjectPageLayout;
		const incomingMessageSection: ObjectPageSection = emailView.byId("incomingMessageSection") as ObjectPageSection;
		const similarEmailsList: List = emailView.byId("similarEmailsList") as List;

		localModel.setProperty("/activeEmailId", id);
		emailPage.setSelectedSection(incomingMessageSection);
		similarEmailsList.removeSelections(true);
		similarEmailsList.getItems().map((listItem: ListItemBase) => ((listItem as CustomListItem).getContent()[0] as Panel).setExpanded(false));

		if (id) {
			const bindingInfo: ObjectBindingInfo = {
				path: `${this.EMAIL_ENTITY_PATH}(id=${id})`,
				parameters: { $$updateGroupId: this.UPDATE_GROUP },
				events: {
					dataReceived: (event: Event) => this.onUpdateEmailColumnBinding(event)
				}
			};
			emailView.bindElement(bindingInfo);

			const translationButton: Button = emailView.byId("translationButton") as Button;
			translationButton.setText(this.getText("email.header.translationButton.translate"));
			localModel.setProperty("/translationActivated", false);
		}
	}

	private onUpdateEmailColumnBinding(event: Event): void {
		const localModel: JSONModel = this.getModel() as JSONModel;
		const emailObject: EmailObject = (event.getSource() as ODataContextBinding).getBoundContext().getObject() as EmailObject;

		this.createEmailHeaderContent(emailObject.mail);
		this.createSuggestedActions(emailObject.mail.suggestedActions);
		localModel.setProperty("/additionalInfo", null);
		localModel.setProperty("/responseBody", emailObject.mail.responseBody);
		localModel.setProperty("/translatedResponseBody", emailObject.mail.translations.length > 0 && emailObject.mail.translations[0].responseBody);
		localModel.setProperty("/similarEmails", emailObject.closestMails);

		console.log(emailObject.mail);
	}

	private createEmailHeaderContent(mail: Mail): void {
		const parentBox: HBox = (this.byId("emailColumn") as View).byId("headerContent") as HBox;
		parentBox.removeAllItems();
		this.createElementsWithAndWithoutTranslation(parentBox, mail, false);

		if (mail.translations.length > 0) {
			const parentBox: HBox = (this.byId("emailColumn") as View).byId("translatedHeaderContent") as HBox;
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

	private createSuggestedActions(actions: Action[]): void {
		const hBox: HBox = (this.byId("emailColumn") as View).byId("suggestedActionsBox") as HBox;
		hBox.removeAllItems();

		if (actions.length > 0) {
			const emailController: EmailController = (this.byId("emailColumn") as View).getController() as EmailController;
			actions.map((action: Action) => {
				const button: Button = new Button({
					text: action.value,
					press: emailController.onPressAction.bind(this)
				});
				button.addStyleClass("sapUiSmallMarginEnd");
				hBox.addItem(button);
			});
		} else {
			const text: Text = new Text({ text: this.getText("email.text.noActions") });
			hBox.addItem(text);
		}
	}

	public async onSearch(): Promise<void> {
		if (this.hasResponseChanged()) {
			await this.openConfirmationDialog(this.getText("confirmationDialog.message.mayBeLost"), this.applyFilter.bind(this), () => this.restoreSearchFilter());
		} else this.applyFilter();
	}

	private restoreSearchFilter(): void {
		const localModel: JSONModel = this.getModel() as JSONModel;
		const binding: ODataListBinding = (this.byId("emailsList") as List).getBinding("items") as ODataListBinding;
		let previousSearchKeyword: string = null;

		if (binding.getFilters(FilterType.Application).length > 0) {
			const currentFilters: Filter[] = binding.getFilters(FilterType.Application)[0].getFilters();
			currentFilters.map((filter: Filter) =>
				previousSearchKeyword = filter.getFilters().find((innerFilter: Filter) =>
					innerFilter.getPath() === this.EMAIL_SUBJECT_PATH)?.getValue1());
		}

		localModel.setProperty("/searchKeyword", previousSearchKeyword);
		this.applyFilter();
	}

	public async onSelectFilter(event: Event): Promise<void> {
		const localModel: JSONModel = this.getModel() as JSONModel;
		const list: List = event.getSource() as List;
		const selectedListItems: ListItemBase[] = list.getSelectedItems();
		const selectedIds: string[] = [];
		selectedListItems.map((selectedListItem: ListItemBase) => selectedIds.push(selectedListItem.getBindingContext("filters").getProperty("id")));

		if (this.hasResponseChanged()) {
			await this.openConfirmationDialog(
				this.getText("confirmationDialog.message.mayBeLost"),
				() => this.applySelectedFilter(this.getActivePath(list.getId()), selectedIds),
				() => this.restoreFilter(list.getId())
			);
		}
		else {
			localModel.setProperty(`/${this.getActivePath(list.getId())}`, selectedIds);
			this.applyFilter();
		}
	}

	private applySelectedFilter(propertyName: string, ids: string[]): void {
		const localModel: JSONModel = this.getModel() as JSONModel;

		localModel.setProperty(`/${propertyName}`, ids);
		this.applyFilter();
	}

	private restoreFilter(listId: string): void {
		const list: List = this.byId(listId) as List;
		const localModel: JSONModel = this.getModel() as JSONModel;
		const selectedIds: string[] = localModel.getProperty(`/${this.getActivePath(listId)}`);

		list.removeSelections(true);
		list.getItems().map((item: ListItemBase) => {
			if (selectedIds?.includes((item.getBindingContext("filters").getObject() as FilterItem).id)) list.setSelectedItem(item);
		});
	}

	public onPressClear(event: Event): void {
		const localModel: JSONModel = this.getModel() as JSONModel;
		const link: Link = event.getSource() as Link;

		localModel.setProperty(`/${this.getActivePath(link.getId())}`, []);
		this.applyFilter();
	}

	private getActivePath(componentId: string): string {
		if (componentId.includes("category")) return this.ACTIVE_CATEGORIES_PATH
		else if (componentId.includes("urgency")) return this.ACTIVE_URGENCIES_PATH
		else if (componentId.includes("sentiment")) return this.ACTIVE_SENTIMENTS_PATH
	}

	private applyFilter(): void {
		const localModel: JSONModel = this.getModel() as JSONModel;
		const filtersModel: JSONModel = this.getModel("filters") as JSONModel;
		const binding: ODataListBinding = (this.byId("emailsList") as List).getBinding("items") as ODataListBinding;
		const andFilter: Filter[] = [];

		const activeCategories: string[] = localModel.getProperty(`/${this.ACTIVE_CATEGORIES_PATH}`);
		if (activeCategories.length > 0) {
			const orFilter: Filter[] = [];
			activeCategories.map((id: string) =>
				orFilter.push(this.getKeywordFilter(filtersModel.getProperty("/categories").find((category: FilterItem) =>
					category.id === id).label, this.EMAIL_CATEGORY_PATH)));
			andFilter.push(new Filter({ filters: orFilter, and: false }));
		}

		const activeUrgencies: string[] = localModel.getProperty(`/${this.ACTIVE_URGENCIES_PATH}`);
		if (activeUrgencies.length > 0) {
			const orFilter: Filter[] = [];
			activeUrgencies.map((id: string) => orFilter.push(this.getUrgencyFilter(id, this.EMAIL_URGENCY_PATH)));
			andFilter.push(new Filter({ filters: orFilter, and: false }));
		}

		const activeSentiments: string[] = localModel.getProperty(`/${this.ACTIVE_SENTIMENTS_PATH}`);
		if (activeSentiments.length > 0) {
			const orFilter: Filter[] = [];
			activeSentiments.map((id: string) => orFilter.push(this.getSentimentFilter(id, this.EMAIL_SENTIMENT_PATH)));
			andFilter.push(new Filter({ filters: orFilter, and: false }));
		}

		const keyword: string = localModel.getProperty("/searchKeyword");
		if (keyword) {
			const orFilter: Filter[] = [];
			orFilter.push(this.getKeywordFilter(keyword, this.EMAIL_SENDER_PATH));
			orFilter.push(this.getKeywordFilter(keyword, this.EMAIL_SUBJECT_PATH));
			orFilter.push(this.getKeywordFilter(keyword, this.EMAIL_BODY_PATH));
			andFilter.push(new Filter({ filters: orFilter, and: false }));
		}

		binding.filter(new Filter({ filters: andFilter, and: true }), FilterType.Application);
		binding.refresh();
	}

	private getKeywordFilter(keyword: string, filterPath: string): Filter {
		return new Filter({
			path: filterPath,
			operator: FilterOperator.Contains,
			value1: keyword,
			caseSensitive: false
		});
	}

	private getUrgencyFilter(id: string, filterPath: string): Filter {
		if (id === "00") return new Filter(filterPath, FilterOperator.LT, 4)
		else if (id === "01") return new Filter(filterPath, FilterOperator.BT, 4, 6)
		else return new Filter(filterPath, FilterOperator.GT, 6)
	}

	private getSentimentFilter(id: string, filterPath: string): Filter {
		if (id === "00") return new Filter(filterPath, FilterOperator.GT, 5)
		else if (id === "01") return new Filter(filterPath, FilterOperator.BT, 0, 5)
		else return new Filter(filterPath, FilterOperator.LT, 0)
	}

	public onSortEmailsList(): void {
		const localModel: JSONModel = this.getModel() as JSONModel;
		localModel.setProperty("/sortDescending", !localModel.getProperty("/sortDescending"));
		localModel.setProperty("/sortText", localModel.getProperty("/sortText") === this.getText("inbox.sort.label.newest") ?
			this.getText("inbox.sort.label.oldest") :
			this.getText("inbox.sort.label.newest"));

		const sorter = new Sorter(this.EMAIL_MODIFIED_AT_PATH, localModel.getProperty("/sortDescending"));
		const binding: ODataListBinding = (this.byId("emailsList") as List).getBinding("items") as ODataListBinding;
		binding.sort(sorter);
	}

	public async onSelectEmail(event: Event): Promise<void> {
		const emailsList: List = event.getSource() as List;
		const selectedEmailContext: Context = emailsList.getSelectedItem().getBindingContext("api") as Context;
		const selectedId: string = selectedEmailContext.getProperty("ID");
		const localModel: JSONModel = this.getModel() as JSONModel;

		if (this.hasResponseChanged()) {
			const activeListItem: ListItemBase = emailsList.getItems().find((item: ListItemBase) => item.getBindingContext("api").getProperty("ID") === localModel.getProperty("/activeEmailId"));
			emailsList.setSelectedItem(activeListItem);
			await this.openConfirmationDialog(this.getText("confirmationDialog.message.willBeLost"), () => this.setActiveEmail(selectedId));
		} else this.setActiveEmail(selectedId);
	}

	private hasResponseChanged(): boolean {
		const localModel: JSONModel = this.getModel() as JSONModel;
		const emailObject: EmailObject = this.byId("emailColumn").getBindingContext("api").getObject() as EmailObject;

		if (!localModel.getProperty("/translationActivated")) {
			if (localModel.getProperty("/responseBody") !== emailObject.mail.responseBody && localModel.getProperty("/emailsCount") > 0) return true
			else return false
		} else {
			if (localModel.getProperty("/translatedResponseBody") !== emailObject.mail.translations[0].responseBody && localModel.getProperty("/emailsCount") > 0) return true
			else return false
		}
	}
}