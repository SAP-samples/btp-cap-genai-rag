import DateFormat from "sap/ui/core/format/DateFormat";

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

	getSentimentIcon: (level: number) => {
		if (level) {
			if (level < 0) return "sap-icon://BusinessSuiteInAppSymbols/icon-face-bad"
			if (level < 6) return "sap-icon://BusinessSuiteInAppSymbols/icon-face-neutral"
			else return "sap-icon://BusinessSuiteInAppSymbols/icon-face-very-happy"
		} else return null 
	},

	getSentimentState: (level: number) => {
		if (level) {
			if (level < 0) return "Error"
			if (level < 6) return "Warning"
			else return "Success"
		} else return null 
	},

	getSentimentText: (level: number) => {
		if (level) {
			if (level < 0) return "Angry"
			if (level < 6) return "Skeptical"
			else return "Happy"
		} else return null 
	},

	getUrgencyState: (level: number) => {
		if (level) {
			if (level < 4) return "Success"
			if (level < 7) return "Warning"
			else return "Error"
		} else return null 
	},

	getUrgencyText: (level: number) => {
		if (level) {
			if (level < 4) return "Not Urgent"
			if (level < 7) return "Urgent"
			else return "Very Urgent"
		} else return null 
	}
};
