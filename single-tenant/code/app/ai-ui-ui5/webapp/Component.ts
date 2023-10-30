import UIComponent from "sap/ui/core/UIComponent";
import models from "./model/models";
import Device from "sap/ui/Device";
import IconPool from "sap/ui/core/IconPool";

/**
 * @namespace ui
 */
export default class Component extends UIComponent {
    public static metadata = {
        manifest: "json"
    };

    private contentDensityClass: string;

    public init(): void {
        // call the base component's init function
        super.init();

        // create the device model
        this.setModel(models.createDeviceModel(), "device");

        // create the views based on the url/hash
        this.getRouter().initialize();

        // register "SAP Business Suite" font family to the icon pool
        IconPool.registerFont({
            fontFamily: "BusinessSuiteInAppSymbols",
            fontURI: sap.ui.require.toUrl("sap/ushell/themes/base/fonts/")
        });
    }

    /**
     * This method can be called to determine whether the sapUiSizeCompact or sapUiSizeCozy
     * design mode class should be set, which influences the size appearance of some controls.
     * @public
     * @returns css class, either 'sapUiSizeCompact' or 'sapUiSizeCozy' - or an empty string if no css class should be set
     */
    public getContentDensityClass(): string {
        if (this.contentDensityClass === undefined) {
            // check whether FLP has already set the content density class; do nothing in this case
            if (
                document.body.classList.contains("sapUiSizeCozy") ||
                document.body.classList.contains("sapUiSizeCompact")
            ) {
                this.contentDensityClass = "";
            } else if (!Device.support.touch) {
                // apply "compact" mode if touch is not supported
                this.contentDensityClass = "sapUiSizeCompact";
            } else {
                // "cozy" in case of touch support; default for most sap.m controls, but needed for desktop-first controls like sap.ui.table.Table
                this.contentDensityClass = "sapUiSizeCozy";
            }
        }
        return this.contentDensityClass;
    }
}
