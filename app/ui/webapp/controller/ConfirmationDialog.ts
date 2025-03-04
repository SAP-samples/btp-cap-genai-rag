import ManagedObject from "sap/ui/base/ManagedObject";
import View from "sap/ui/core/mvc/View";
import Fragment from "sap/ui/core/Fragment";
import Label from "sap/m/Label";
import Dialog from "sap/m/Dialog";
import Control from "sap/ui/core/Control";

export default class ConfirmationDialog extends ManagedObject {
	private parentView: View;
	private onConfirm: () => void;
	private onCancel: () => void;
	private readonly FRAGMENT_NAME: string = "ai.ui.view.ConfirmationDialog";
	private readonly DIALOG_ID: string = "confirmationDialog";
	private readonly MESSAGE_ID: string = "messageLabel";

	constructor(parentView: View) {
		super();
		this.parentView = parentView;
	}

	public async open(message: string, onConfirm: () => void, onCancel: () => void): Promise<void> {
		if (!this.parentView.byId(this.DIALOG_ID)) {
			await Fragment.load({
				id: this.parentView.getId(),
				name: this.FRAGMENT_NAME,
				controller: this
			}).then((dialogs: Control | Control[]) =>
				this.parentView.addDependent(Array.isArray(dialogs) ? dialogs[0] : dialogs)
			);
		}

		(this.parentView.byId(this.MESSAGE_ID) as Label).setText(message);
		this.onConfirm = onConfirm;
		this.onCancel = onCancel;

		(this.parentView.byId(this.DIALOG_ID) as Dialog).open();
	}

	public onConfirmPress(): void {
		(this.parentView.byId(this.DIALOG_ID) as Dialog).close();
		if (this.onConfirm) this.onConfirm();
	}

	public onCancelPress(): void {
		(this.parentView.byId(this.DIALOG_ID) as Dialog).close();
		if (this.onCancel) this.onCancel();
	}
}
