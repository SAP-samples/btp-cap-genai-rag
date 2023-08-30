import DateFormat from "sap/ui/core/format/DateFormat";

export default {
	formatValue: (value: string) => {
		return value?.toUpperCase();
	},

	formatDate: (dateString: string) => {
		const dateFormatter = DateFormat.getDateTimeInstance({pattern: "dd.MM.yyyy"});
		return (dateString) ? dateFormatter.format(new Date(dateString)) : null;
	},

	getUrgencyState: (level: number) => {
		if (level) {
			if (level < 4) return "Success"
			if (level < 7) return "Warning"
			else return "Error"
		} else return null 
	}
};
