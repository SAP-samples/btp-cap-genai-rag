import BaseController from "./BaseController";
import JSONModel from "sap/ui/model/json/JSONModel";
import XMLView from "sap/ui/core/mvc/XMLView";
import ObjectPageLayout from "sap/uxap/ObjectPageLayout";
import ObjectPageSection from "sap/uxap/ObjectPageSection";
import Event from "sap/ui/base/Event";
import Context from "sap/ui/model/odata/v4/Context";
import List from "sap/m/List";
import Link from "sap/m/Link";
import ODataListBinding from "sap/ui/model/odata/v4/ODataListBinding";
import ListItemBase from "sap/m/ListItemBase";
import Filter from "sap/ui/model/Filter";
import FilterOperator from "sap/ui/model/FilterOperator";
import FilterType from "sap/ui/model/FilterType";

import { Email, FilterItem } from "../model/entities";

export default class Main extends BaseController {
	protected readonly ACTIVE_CATEGORIES_PATH: string = "activeCategories";
	protected readonly ACTIVE_URGENCIES_PATH: string = "activeUrgencies";
	protected readonly ACTIVE_SENTIMENTS_PATH: string = "activeSentiments";
	protected readonly EMAIL_MODEL: string = "emailModel";
	protected readonly EMAIL_CATEGORY_PATH: string = "category";
	protected readonly EMAIL_URGENCY_PATH: string = "urgency";
	protected readonly EMAIL_SENTIMENT_PATH: string = "sentiment";
	protected readonly EMAIL_SENDER_PATH: string = "sender";
	protected readonly EMAIL_SUBJECT_PATH: string = "subject";
	protected readonly EMAIL_BODY_PATH: string = "body";

	public onInit(): void {
		this.getRouter().attachRouteMatched(this.onRouteMatched, this);

		const model: JSONModel = new JSONModel({
			activeCategories: [],
			activeUrgencies: [],
			activeSentiments: [],
			searchKeyword: null,
			emailsCount: 0,
			translationActivated: false
		});
		this.setModel(model);

		const emailModel: JSONModel = new JSONModel({
			ID: null,
			category: null,
			sender: null,
			modifiedAt: null,
			urgency: null,
			sentiment: null,
			subject: null,
			body: null,
			translationSubject: null,
			translationBody: null
		});
		this.setModel(emailModel, this.EMAIL_MODEL);
	}

	protected onRouteMatched(): void {
		this.setTopEmail();
	}

	public onUpdateEmailsList(event: Event): void {
		const binding: ODataListBinding = event.getSource() as ODataListBinding;
		const localModel: JSONModel = this.getModel() as JSONModel;
		localModel.setProperty("/emailsCount", binding.getCount());

		const filteredEmails: Email[] = this.getFilteredEmails();
		if (filteredEmails.length > 0) {
			if (!this.isAnyFilteredEmailSelected(filteredEmails)) this.setTopEmail();
			else (this.byId("emailsList") as List).scrollToIndex(this.getSelectedEmailIndex(filteredEmails));
		} else this.setEmailModel();
	}

	private getFilteredEmails(): Email[] {
		const binding: ODataListBinding = (this.byId("emailsList") as List).getBinding("items") as ODataListBinding;
		const currentContexts: Context[] = binding.getAllCurrentContexts();

		const emails: Email[] = [];
		currentContexts.map((context: Context) => emails.push(context.getObject()));
		return emails
	}

	private isAnyFilteredEmailSelected(filteredEmails: Email[]): boolean {
		const emailModel: JSONModel = this.getModel(this.EMAIL_MODEL) as JSONModel;
		return filteredEmails.some((email: Email) => email.ID === emailModel.getProperty("/ID"))
	}

	private getSelectedEmailIndex(filteredEmails: Email[]): number {
		const emailModel: JSONModel = this.getModel(this.EMAIL_MODEL) as JSONModel;
		return filteredEmails.indexOf(filteredEmails.find((email: Email) => email.ID === emailModel.getProperty("/ID")))
	}

	private setTopEmail(): void {
		this.setEmailModel(this.getFilteredEmails()[0]);
	}

	public onSearch(): void {
		this.applyFilter();
	}

	public onSelectFilter(event: Event): void {
		const localModel: JSONModel = this.getModel() as JSONModel;
		const list: List = event.getSource() as List;

		const selectedListItems: ListItemBase[] = list.getSelectedItems();
		const selectedIds: string[] = [];
		selectedListItems.map((selectedListItem: ListItemBase) => selectedIds.push(selectedListItem.getBindingContext("filters").getProperty("id")));
		localModel.setProperty(`/${this.getActivePath(list.getId())}`, selectedIds);

		this.applyFilter();
	}

	public onClearFilter(event: Event): void {
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
			activeCategories.map((id: string) => orFilter.push(this.getKeywordFilter(filtersModel.getProperty("/categories").find((category: FilterItem) => category.id === id).label, this.EMAIL_CATEGORY_PATH)));
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

	public onPressItem(event: Event): void {
		const selectedEmail: Context = (event.getSource() as List).getSelectedItem().getBindingContext("api") as Context;
		const emailView: XMLView = this.byId("emailColumn") as XMLView;
		const emailPage: ObjectPageLayout = emailView.byId("emailPage") as ObjectPageLayout;
		const incomingMessageSection: ObjectPageSection = emailView.byId("incomingMessageSection") as ObjectPageSection;

		this.setEmailModel({
			ID: selectedEmail.getProperty("ID"),
			category: selectedEmail.getProperty("category"),
			sender: selectedEmail.getProperty("sender"),
			modifiedAt: selectedEmail.getProperty("modifiedAt"),
			urgency: selectedEmail.getProperty("urgency"),
			sentiment: selectedEmail.getProperty("sentiment"),
			subject: selectedEmail.getProperty("subject"),
			body: selectedEmail.getProperty("body"),
			translationSubject: selectedEmail.getProperty("translationSubject"),
			translationBody: selectedEmail.getProperty("translationBody")
		});

		emailPage.setSelectedSection(incomingMessageSection);

		console.log(selectedEmail.getObject());
	}

	private setEmailModel(email: Email = null): void {
		const emailModel: JSONModel = this.getModel(this.EMAIL_MODEL) as JSONModel;
		emailModel.setProperty("/ID", email ? email.ID : null);
		emailModel.setProperty("/category", email ? email.category : null);
		emailModel.setProperty("/sender", email ? email.sender : null);
		emailModel.setProperty("/modifiedAt", email ? email.modifiedAt : null);
		emailModel.setProperty("/urgency", email ? email.urgency : null);
		emailModel.setProperty("/sentiment", email ? email.sentiment : null);
		emailModel.setProperty("/subject", email ? email.subject : null);
		emailModel.setProperty("/body", email ? email.body : null);
		emailModel.setProperty("/translationSubject", email ? email.translationSubject : null);
		emailModel.setProperty("/translationBody", email ? email.translationBody : null);
	}
}