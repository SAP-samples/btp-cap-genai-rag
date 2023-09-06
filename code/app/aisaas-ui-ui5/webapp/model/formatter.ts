import DateFormat from "sap/ui/core/format/DateFormat";
import { FilterItem } from "./entities";

export default {
	formatValue: (value: string) => {
		return value?.toUpperCase();
	},

	getAvatarInitial: (sender: string) => {
		return (sender) ? sender[0].toUpperCase() : null;
	},

	formatDate: (dateString: string) => {
		const dateFormatter = DateFormat.getDateTimeInstance({pattern: "dd.MM.yyyy"});
		return (dateString) ? dateFormatter.format(new Date(dateString)) : null;
	},

	getUrgencyText: (urgencies: FilterItem[], value: number) => {
		if (value) {
			if (value < 4) return urgencies.find((urgency: FilterItem) => urgency.id === "00").label
			if (value < 7) return urgencies.find((urgency: FilterItem) => urgency.id === "01").label
			else return urgencies.find((urgency: FilterItem) => urgency.id === "02").label
		} else return null
	},

	getUrgencyState: (value: number) => {
		if (value) {
			if (value < 4) return "Success"
			if (value < 7) return "Warning"
			else return "Error"
		} else return null
	},

	getSentimentIcon: (value: number) => {
		if (value) {
			if (value > 5) return "sap-icon://BusinessSuiteInAppSymbols/icon-face-happy"
			if (value >= 0) return "sap-icon://BusinessSuiteInAppSymbols/icon-face-neutral"
			else return "sap-icon://BusinessSuiteInAppSymbols/icon-face-bad"
		} else return null
	},

	getSentimentText: (sentiments: FilterItem[], value: number) => {
		if (value) {
			if (value > 5) return sentiments.find((sentiment: FilterItem) => sentiment.id === "00").label
			if (value >= 0) return sentiments.find((sentiment: FilterItem) => sentiment.id === "01").label
			else return sentiments.find((sentiment: FilterItem) => sentiment.id === "02").label
		} else return null
	},

	getSentimentState: (value: number) => {
		if (value) {
			if (value > 5) return "Success"
			if (value >= 0) return "Warning"
			else return "Error"
		} else return null
	}
};
