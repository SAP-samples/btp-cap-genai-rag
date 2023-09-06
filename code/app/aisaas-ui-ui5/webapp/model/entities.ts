export interface Email {
    ID: string,
	category: string,
	sender: string,
	modifiedAt: Date,
	urgency: number,
	sentiment: string,
	subject: string,
	body: string,
	translationSubject: string,
	translationBody: string
}

export interface FilterItem {
    id: string,
	label: string
}