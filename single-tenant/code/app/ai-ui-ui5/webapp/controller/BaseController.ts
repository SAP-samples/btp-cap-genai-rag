import Controller from "sap/ui/core/mvc/Controller";
import UIComponent from "sap/ui/core/UIComponent";
import AppComponent from "../Component";
import Model from "sap/ui/model/Model";
import ResourceModel from "sap/ui/model/resource/ResourceModel";
import ResourceBundle from "sap/base/i18n/ResourceBundle";
import Router from "sap/ui/core/routing/Router";
import History from "sap/ui/core/routing/History";
import Dialog from "sap/m/Dialog";
import Text from "sap/m/Text";
import Button from "sap/m/Button";

import ConfirmationDialog from "./ConfirmationDialog";

export const CAP_BASE_URL = "api/odata/v4/mail-insights";

/**
 * @namespace ui.controller
 */
export default abstract class BaseController extends Controller {
    private resourceBundle: ResourceBundle;
    private confirmationDialog: ConfirmationDialog;

    public onInit(): void {
        this.confirmationDialog = new ConfirmationDialog(this.getView());
    }

    /**
     * Convenience method for accessing the component of the controller's view.
     * @returns The component of the controller's view
     */
    public getOwnerComponent(): AppComponent {
        return super.getOwnerComponent() as AppComponent;
    }

    /**
     * Convenience method to get the components' router instance.
     * @returns The router instance
     */
    public getRouter(): Router {
        return UIComponent.getRouterFor(this);
    }

    /**
     * Convenience method for getting the i18n resource bundle of the component.
     * @returns The i18n resource bundle of the component
     */
    private getResourceBundle(): ResourceBundle {
        const oModel: ResourceModel = this.getOwnerComponent().getModel("i18n") as ResourceModel;
        return oModel.getResourceBundle() as ResourceBundle;
    }
    public getText(sKey: string, aArgs?: any[], bIgnoreKeyFallback?: boolean): string {
        if (!this.resourceBundle) {
            this.resourceBundle = this.getResourceBundle();
        }
        return this.resourceBundle.getText(sKey, aArgs, bIgnoreKeyFallback);
    }

    /**
     * Convenience method for getting the view model by name in every controller of the application.
     * @param [sName] The model name
     * @returns The model instance
     */
    public getModel(sName?: string): Model {
        return this.getView().getModel(sName);
    }

    /**
     * Convenience method for setting the view model in every controller of the application.
     * @param oModel The model instance
     * @param [sName] The model name
     * @returns The current base controller instance
     */
    public setModel(oModel: Model, sName?: string): BaseController {
        this.getView().setModel(oModel, sName);
        return this;
    }

    /**
     * Convenience method for triggering the navigation to a specific target.
     * @public
     * @param sName Target name
     * @param [oParameters] Navigation parameters
     * @param [bReplace] Defines if the hash should be replaced (no browser history entry) or set (browser history entry)
     */
    public navTo(sName: string, oParameters?: object, bReplace?: boolean): void {
        this.getRouter().navTo(sName, oParameters, undefined, bReplace);
    }

    /**
     * Convenience event handler for navigating back.
     * It there is a history entry we go one step back in the browser history
     * If not, it will replace the current entry of the browser history with the main route.
     */
    public onNavBack(): void {
        const sPreviousHash = History.getInstance().getPreviousHash();
        if (sPreviousHash !== undefined) {
            window.history.go(-1);
        } else {
            this.getRouter().navTo("main", {}, undefined, true);
        }
    }

    public async openConfirmationDialog(message: string, onConfirm: () => void, onCancel?: () => void): Promise<void> {
        await this.confirmationDialog.open(message, onConfirm, onCancel);
    }

    /* To open a generic message dialog */
    public openMessageDialog(title: string, body: string) {
        const content = new Text({ text: body });
        content.addStyleClass("sapUiTinyMarginTop");
        content.addStyleClass("sapUiSmallMarginBeginEnd");

        const dialog = new Dialog({ title: title, content: content, contentWidth: "40%" });
        const closeButton = new Button({ text: this.getText("buttons.close"), press: () => dialog.close() });
        dialog.setBeginButton(closeButton);

        dialog.open();
    }
}
