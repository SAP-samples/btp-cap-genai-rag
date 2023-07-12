sap.ui.define([
        "./BaseController"
],function (Controller) {
        "use strict";

        return Controller.extend("sap.susaas.ui.demo.controller.MainView", {
            onInit: function () {
                this.oView = this.getView();
            }
        });
    }
);

