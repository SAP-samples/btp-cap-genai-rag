import Opa5 from "sap/ui/test/Opa5";
import Press from "sap/ui/test/actions/Press";
import I18NText from "sap/ui/test/matchers/I18NText";

const viewName = "ai.ui.view.Main";

export default class MainPage extends Opa5 {
	// Actions
	iPressTheAddMailButton() {
		this.waitFor({
			id: "addMail",
			viewName: "ai.ui.view.App",
			actions: new Press(),
			errorMessage: "Did not find the 'Say Hello With Dialog' button on the Main view"
		});
	}

	iPressTheCloseButtonInTheDialog() {
		this.waitFor({
			controlType: "sap.m.Button",
			searchOpenDialogs: true,
			viewName,
			matchers: new I18NText({
				propertyName: "text",
				key: "buttons.close"
			}),
			actions: new Press(),
			errorMessage: "Did not find the 'Close' button in the Dialog"
		});
	}

	// Assertions
	iShouldSeeTheHelloDialog() {
		this.waitFor({
			controlType: "sap.m.Dialog",
			success: function () {
				// we set the view busy, so we need to query the parent of the app
				Opa5.assert.ok(true, "The dialog is open");
			},
			errorMessage: "Did not find the dialog control"
		});
	}

	iShouldNotSeeTheHelloDialog() {
		this.waitFor({
			controlType: "sap.m.App", // dummy, I just want a check function, where I can search the DOM. Probably there is a better way for a NEGATIVE test (NO dialog).
			check: function () {
				return document.querySelectorAll(".sapMDialog").length === 0;
			},
			success: function () {
				Opa5.assert.ok(true, "No dialog is open");
			}
		});
	}
}
