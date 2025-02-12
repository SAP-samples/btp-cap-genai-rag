import BaseController from "./BaseController";
import JSONModel from "sap/ui/model/json/JSONModel";
import Event from "sap/ui/base/Event";
import Context from "sap/ui/model/odata/v4/Context";
import ODataListBinding from "sap/ui/model/odata/v4/ODataListBinding";
import ODataContextBinding from "sap/ui/model/odata/v4/ODataContextBinding";
import View from "sap/ui/core/mvc/View";
import Link from "sap/m/Link";
import List from "sap/m/List";
import ListItemBase from "sap/m/ListItemBase";
import Filter from "sap/ui/model/Filter";
import FilterOperator from "sap/ui/model/FilterOperator";
import FilterType from "sap/ui/model/FilterType";
import Sorter from "sap/ui/model/Sorter";
import { ObjectBindingInfo } from "sap/ui/base/ManagedObject";

import { EmailObject, FilterItem } from "../model/entities";
import EmailController from "./EmailDetails.controller";

export default class Main extends BaseController {
	protected readonly ACTIVE_CATEGORIES_PATH: string = "activeCategories";
	protected readonly ACTIVE_URGENCIES_PATH: string = "activeUrgencies";
	protected readonly ACTIVE_SENTIMENTS_PATH: string = "activeSentiments";
	protected readonly ACTIVE_REQUEST_STATES_PATH: string = "activeRequestStates";
	protected readonly EMAIL_CATEGORY_PATH: string = "category";
	protected readonly EMAIL_URGENCY_PATH: string = "urgency";
	protected readonly EMAIL_SENTIMENT_PATH: string = "sentiment";
	protected readonly EMAIL_SENDER_PATH: string = "sender";
	protected readonly EMAIL_SUBJECT_PATH: string = "subject";
	protected readonly EMAIL_BODY_PATH: string = "body";
	protected readonly EMAIL_TRANSLATED_SENDER_PATH: string = "translation/sender";
	protected readonly EMAIL_TRANSLATED_SUBJECT_PATH: string = "translation/subject";
	protected readonly EMAIL_TRANSLATED_BODY_PATH: string = "translation/body";
	protected readonly EMAIL_RESPONDED_PATH: string = "responded";
	protected readonly EMAIL_MODIFIED_AT_PATH: string = "modifiedAt";
	protected readonly EMAIL_ENTITY_PATH: string = "api>/getMail";
	protected readonly UPDATE_GROUP: string = "UPDATE_GROUP_" + Math.random().toString(36).substring(2);
	protected emailView: View = null;
	protected emailController: EmailController = null;

	public onInit(): void {
		super.onInit();
		this.getRouter().attachRouteMatched(this.onRouteMatched, this);

		const model: JSONModel = new JSONModel({
			busy: false,
			activeCategories: [],
			activeUrgencies: [],
			activeSentiments: [],
			activeRequestStates: [],
			searchKeyword: null,
			emailsCount: 0,
			sortDescending: false,
			sortText: null,
			activeEmailId: null,
			translationOn: false,
			additionalInfo: null,
			submittedResponsesIncluded: false,
			responseBody: null,
			translatedResponseBody: null,
			similarEmails: []
		});
		this.setModel(model);
	}

	protected onRouteMatched(): void {
		const localModel: JSONModel = this.getModel() as JSONModel;
		localModel.setProperty("/sortText", this.getText("inbox.link.newest"));

		this.emailView = this.byId("emailDetails") as View;
		this.emailController = this.emailView.getController() as EmailController;
		this.applyFilter();
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
			} else this.scrollToActiveEmail();
		} else this.setActiveEmail();
	}

	private setTopEmail(): void {
		const filteredEmailsIds: string[] = this.getFilteredEmailsIds();
		if (filteredEmailsIds.length > 0) this.setActiveEmail(filteredEmailsIds[0]);
	}

	private isActiveEmailInFilteredEmails(): boolean {
		const localModel: JSONModel = this.getModel() as JSONModel;
		return this.getFilteredEmailsIds().some((id: string) => id === localModel.getProperty("/activeEmailId"));
	}

	private scrollToActiveEmail(index: number = null): void {
		const emailsList: List = this.byId("emailsList") as List;
		if (!index) {
			const localModel: JSONModel = this.getModel() as JSONModel;
			const filteredEmailsIds: string[] = this.getFilteredEmailsIds();
			const activeEmailIndex: number = filteredEmailsIds.indexOf(
				filteredEmailsIds.find((id: string) => id === localModel.getProperty("/activeEmailId"))
			);
			emailsList.scrollToIndex(activeEmailIndex);
		} else emailsList.scrollToIndex(index);
	}

	private getFilteredEmailsIds(): string[] {
		const binding: ODataListBinding = (this.byId("emailsList") as List).getBinding("items") as ODataListBinding;
		const currentContexts: Context[] = binding.getAllCurrentContexts();
		const ids: string[] = [];

		currentContexts.map((context: Context) => ids.push(context.getObject().ID));
		return ids;
	}

	public setActiveEmail(id: string = null): void {
		const localModel: JSONModel = this.getModel() as JSONModel;
		localModel.setProperty("/activeEmailId", id);

		if (id) {
			const bindingInfo: ObjectBindingInfo = {
				path: `${this.EMAIL_ENTITY_PATH}(id=${id})`,
				parameters: { $$updateGroupId: this.UPDATE_GROUP },
				events: {
					dataReceived: (event: Event) => this.onUpdateEmailDetailsBinding(event)
				}
			};
			this.emailView.bindElement(bindingInfo);
			this.emailController.resetEmailPageState();
		}
	}

	private onUpdateEmailDetailsBinding(event: Event): void {
		const localModel: JSONModel = this.getModel() as JSONModel;
		const emailObject: EmailObject = (event.getSource() as ODataContextBinding)
			.getBoundContext()
			.getObject() as EmailObject;

		this.emailController.createEmailHeaderContent(emailObject.mail);
		this.emailController.createSuggestedActions(emailObject.mail.suggestedActions);
		localModel.setProperty("/additionalInfo", null);
		localModel.setProperty("/submittedResponsesIncluded", true);
		localModel.setProperty("/responseBody", emailObject.mail.responseBody);
		localModel.setProperty("/translatedResponseBody", emailObject.mail.translation.responseBody);
		localModel.setProperty("/similarEmails", emailObject.closestMails);
	}

	public async onSearch(): Promise<void> {
		if (this.hasResponseChanged()) {
			await this.openConfirmationDialog(
				this.getText("confirmationDialog.texts.triggerFilterMessage"),
				this.applyFilter.bind(this),
				() => this.restoreSearchFilter()
			);
		} else this.applyFilter();
	}

	private restoreSearchFilter(): void {
		const localModel: JSONModel = this.getModel() as JSONModel;
		const binding: ODataListBinding = (this.byId("emailsList") as List).getBinding("items") as ODataListBinding;
		let previousSearchKeyword: string = null;

		if (binding.getFilters(FilterType.Application).length > 0) {
			const currentFilters: Filter[] = binding.getFilters(FilterType.Application)[0].getFilters();
			currentFilters.map(
				(filter: Filter) =>
					(previousSearchKeyword = filter
						.getFilters()
						.find((innerFilter: Filter) => innerFilter.getPath() === this.EMAIL_SUBJECT_PATH)
						?.getValue1())
			);
		}

		localModel.setProperty("/searchKeyword", previousSearchKeyword);
		this.applyFilter();
	}

	public async onSelectFilter(event: Event): Promise<void> {
		const localModel: JSONModel = this.getModel() as JSONModel;
		const list: List = event.getSource() as List;
		const selectedListItems: ListItemBase[] = list.getSelectedItems();
		const selectedIds: string[] = [];
		selectedListItems.map((selectedListItem: ListItemBase) =>
			selectedIds.push(selectedListItem.getBindingContext("filters").getProperty("id"))
		);

		if (this.hasResponseChanged()) {
			await this.openConfirmationDialog(
				this.getText("confirmationDialog.texts.triggerFilterMessage"),
				() => this.applySelectedFilter(this.getActivePath(list.getId()), selectedIds),
				() => this.restoreFilter(list.getId())
			);
		} else {
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
			if (selectedIds?.includes((item.getBindingContext("filters").getObject() as FilterItem).id))
				list.setSelectedItem(item);
		});
	}

	public onPressClear(event: Event): void {
		const localModel: JSONModel = this.getModel() as JSONModel;
		const link: Link = event.getSource() as Link;

		localModel.setProperty(`/${this.getActivePath(link.getId())}`, []);
		this.applyFilter();
	}

	private getActivePath(componentId: string): string {
		if (componentId.includes("category")) return this.ACTIVE_CATEGORIES_PATH;
		else if (componentId.includes("urgency")) return this.ACTIVE_URGENCIES_PATH;
		else if (componentId.includes("sentiment")) return this.ACTIVE_SENTIMENTS_PATH;
		else if (componentId.includes("requestStates")) return this.ACTIVE_REQUEST_STATES_PATH;
	}

	private applyFilter(): void {
		const localModel: JSONModel = this.getModel() as JSONModel;
		const filtersModel: JSONModel = this.getModel("filters") as JSONModel;
		const binding: ODataListBinding = (this.byId("emailsList") as List).getBinding("items") as ODataListBinding;
		const andFilter: Filter[] = [];

		const activeRequestStates: string[] = localModel.getProperty(`/${this.ACTIVE_REQUEST_STATES_PATH}`);
		if (activeRequestStates.length > 0) {
			const orFilter: Filter[] = [];
			activeRequestStates.map((id: string) =>
				orFilter.push(this.getRequestStatesFilter(id, this.EMAIL_RESPONDED_PATH))
			);
			andFilter.push(new Filter({ filters: orFilter, and: false }));
		}

		const activeCategories: string[] = localModel.getProperty(`/${this.ACTIVE_CATEGORIES_PATH}`);
		if (activeCategories.length > 0) {
			const orFilter: Filter[] = [];
			activeCategories.map((id: string) =>
				orFilter.push(
					this.getKeywordFilter(
						filtersModel.getProperty("/categories").find((category: FilterItem) => category.id === id)
							.label,
						this.EMAIL_CATEGORY_PATH
					)
				)
			);
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
			orFilter.push(
				this.getKeywordFilter(
					keyword,
					localModel.getProperty("/translationOn")
						? this.EMAIL_TRANSLATED_SENDER_PATH
						: this.EMAIL_SENDER_PATH
				)
			);
			orFilter.push(
				this.getKeywordFilter(
					keyword,
					localModel.getProperty("/translationOn")
						? this.EMAIL_TRANSLATED_SUBJECT_PATH
						: this.EMAIL_SUBJECT_PATH
				)
			);
			orFilter.push(
				this.getKeywordFilter(
					keyword,
					localModel.getProperty("/translationOn") ? this.EMAIL_TRANSLATED_BODY_PATH : this.EMAIL_BODY_PATH
				)
			);
			andFilter.push(new Filter({ filters: orFilter, and: false }));
		}

		binding.filter(new Filter({ filters: andFilter, and: true }), FilterType.Application);
		binding.refresh();
	}

	private getRequestStatesFilter(id: string, filterPath: string): Filter {
		if (id === "00") return new Filter(filterPath, FilterOperator.EQ, false);
		else return new Filter(filterPath, FilterOperator.EQ, true);
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
		if (id === "00") return new Filter(filterPath, FilterOperator.LT, 1);
		else if (id === "01") return new Filter(filterPath, FilterOperator.EQ, 1);
		else return new Filter(filterPath, FilterOperator.GT, 1);
	}

	private getSentimentFilter(id: string, filterPath: string): Filter {
		if (id === "00") return new Filter(filterPath, FilterOperator.GT, 0);
		else if (id === "01") return new Filter(filterPath, FilterOperator.EQ, 0);
		else return new Filter(filterPath, FilterOperator.LT, 0);
	}

	public onSortEmailsList(): void {
		const localModel: JSONModel = this.getModel() as JSONModel;
		localModel.setProperty("/sortDescending", !localModel.getProperty("/sortDescending"));
		localModel.setProperty(
			"/sortText",
			localModel.getProperty("/sortText") === this.getText("inbox.link.newest")
				? this.getText("inbox.link.oldest")
				: this.getText("inbox.link.newest")
		);

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
			const activeListItem: ListItemBase = emailsList
				.getItems()
				.find(
					(item: ListItemBase) =>
						item.getBindingContext("api").getProperty("ID") === localModel.getProperty("/activeEmailId")
				);
			emailsList.setSelectedItem(activeListItem);
			await this.openConfirmationDialog(this.getText("confirmationDialog.texts.selectEmailMessage"), () =>
				this.setActiveEmail(selectedId)
			);
		} else this.setActiveEmail(selectedId);
	}

	private hasResponseChanged(): boolean {
		const localModel: JSONModel = this.getModel() as JSONModel;
		const emailObject: EmailObject = this.emailView.getBindingContext("api").getObject() as EmailObject;

		if (
			localModel.getProperty("/translatedResponseBody") !== emailObject.mail.translation.responseBody &&
			localModel.getProperty("/emailsCount") > 0
		)
			return true;
		else return false;
	}
}
