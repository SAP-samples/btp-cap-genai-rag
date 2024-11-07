import DateFormat from "sap/ui/core/format/DateFormat";
import { FilterItem, ClosestMail } from "./entities";

export default {
	formatValue: (value: string) => {
		return value?.toUpperCase();
	},

	getAvatarInitial: (sender: string) => {
		return sender ? sender[0].toUpperCase() : null;
	},

	formatDate: (dateString: string) => {
		const dateFormatter = DateFormat.getDateTimeInstance({ pattern: "dd.MM.yyyy" });
		return dateString ? dateFormatter.format(new Date(dateString)) : null;
	},

	getUrgencyIcon: (value: number) => {
		if (value && value > 1) return "sap-icon://high-priority";
		else return null;
	},

	getUrgencyText: (urgencies: FilterItem[], value: number) => {
		if (value) {
			if (value < 1) return urgencies.find((urgency: FilterItem) => urgency.id === "00").label;
			else if (value == 1) return urgencies.find((urgency: FilterItem) => urgency.id === "01").label;
			else return urgencies.find((urgency: FilterItem) => urgency.id === "02").label;
		} else return null;
	},

	getUrgencyState: (value: number) => {
		if (value) {
			if (value < 1) return "Success";
			else if (value == 1) return "Warning";
			else return "Error";
		} else return null;
	},

	getSentimentIcon: (value: number) => {
		if (value) {
			if (value > 0) return "sap-icon://BusinessSuiteInAppSymbols/icon-face-happy";
			else if (value == 0) return "sap-icon://BusinessSuiteInAppSymbols/icon-face-neutral";
			else return "sap-icon://BusinessSuiteInAppSymbols/icon-face-bad";
		} else return null;
	},

	getSentimentText: (sentiments: FilterItem[], value: number) => {
		if (value) {
			if (value > 0) return sentiments.find((sentiment: FilterItem) => sentiment.id === "00").label;
			else if (value == 0) return sentiments.find((sentiment: FilterItem) => sentiment.id === "01").label;
			else return sentiments.find((sentiment: FilterItem) => sentiment.id === "02").label;
		} else return null;
	},

	getSentimentState: (value: number) => {
		if (value) {
			if (value > 0) return "Success";
			else if (value == 0) return "Warning";
			else return "Error";
		} else return null;
	},

	getSimilarity: (mail: ClosestMail) => {
		const maxSimilarity = 100;
		const minSimilarity = 50;
		return Math.round(((mail.similarity * 100 - minSimilarity) / (maxSimilarity - minSimilarity)) * 100) + "%";
	}
};
