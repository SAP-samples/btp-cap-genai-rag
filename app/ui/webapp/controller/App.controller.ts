import BaseController, { CAP_BASE_URL } from "./BaseController";
import Fragment from "sap/ui/core/Fragment";
import Dialog from "sap/m/Dialog";
import Button from "sap/m/Button";
import JSONModel from "sap/ui/model/json/JSONModel";
import MessageToast from "sap/m/MessageToast";
import ODataModel from "sap/ui/model/odata/v4/ODataModel";

const MAIL_ANSWERED_FRAGMENT_NAME = "ai.ui.view.AddMailDialog";
const ID_ADD_MAIL_DIALOG = "addMailDialog";

/**
 * @namespace ui.controller
 */
export default class App extends BaseController {
	private addMailDialog: Dialog;
	private mailToAddState: JSONModel;

	public onInit(): void {
		// apply content density mode to root view
		this.getView().addStyleClass(this.getOwnerComponent().getContentDensityClass());
	}

	public async openAddMailDialog(): Promise<void> {
		if (!this.addMailDialog) {
			await this.initAddMailDialog();
		}
		this.initMailToAddState();
		this.addMailDialog.setModel(this.mailToAddState, "state");
		this.addMailDialog.open();
	}

	public async initAddMailDialog(): Promise<void> {
		this.addMailDialog = (await Fragment.load({
			id: ID_ADD_MAIL_DIALOG,
			name: MAIL_ANSWERED_FRAGMENT_NAME,
			controller: this
		})) as Dialog;
		const dialog = this.addMailDialog as Dialog;
		this.getView().addDependent(this.addMailDialog);
		const closeButton = new Button({ text: this.getText("buttons.close"), press: () => dialog.close() });
		dialog.setEndButton(closeButton);
	}

	public initMailToAddState() {
		this.mailToAddState = new JSONModel({ senderAddress: "", subject: "", body: "" });
	}

	public async onAddMail(): Promise<void> {
		const {
			senderAddress,
			subject,
			body: emailBody
		}: { senderAddress: string; subject: string; body: string } = this.mailToAddState.getObject("/");
		try {
			const model = this.getModel("api") as ODataModel;
			const httpHeaders = model.getHttpHeaders();
			// endpoint addMails expects always an array of mails
			const body = {
				mails: [{ senderEmailAddress: senderAddress, subject: subject, body: emailBody }]
			};
			this.addMailDialog.setBusy(true);
			const response = await fetch(`${CAP_BASE_URL}/addMails`, {
				method: "POST",
				headers: {
					// @ts-ignore
					"X-CSRF-Token": httpHeaders["X-CSRF-Token"],
					"Content-Type": "application/json"
				},
				body: JSON.stringify(body)
			});
			if (response.ok) {
				this.addMailDialog.close();
				this.getModel("api").refresh();
			} else {
				MessageToast.show(this.getText("email.texts.genericErrorMessage"));
			}
		} catch (error) {
			console.log(error);
			MessageToast.show(this.getText("email.texts.genericErrorMessage"));
		} finally {
			this.addMailDialog.setBusy(false);
		}
	}
}
