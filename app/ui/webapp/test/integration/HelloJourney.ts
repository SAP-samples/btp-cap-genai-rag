/* eslint-disable @typescript-eslint/no-floating-promises */
import opaTest from "sap/ui/test/opaQunit";
import MainPage from "./pages/MainPage";

const onTheMainPage = new MainPage();

QUnit.module("Sample Hello Journey");

opaTest("Should open the Hello dialog", function () {
	// Arrangements
	onTheMainPage.iStartMyUIComponent({
		componentConfig: {
			name: "ai.ui"
		}
	});

	// Actions
	onTheMainPage.iPressTheAddMailButton();

	// Assertions
	onTheMainPage.iShouldSeeTheHelloDialog();

	// Actions
	onTheMainPage.iPressTheCloseButtonInTheDialog();

	// Assertions
	onTheMainPage.iShouldNotSeeTheHelloDialog();

	// Cleanup
	onTheMainPage.iTeardownMyApp();
});
