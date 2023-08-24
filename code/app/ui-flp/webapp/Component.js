sap.ui.define([
    "sap/ui/core/UIComponent",
    "sap/ushell/services/Container"
],function (UIComponent) {
    "use strict";

    return UIComponent.extend("sap.aisaas.ui.flp.Component", {
        metadata: {
            manifest: "json"
        },

        init: function () {
            UIComponent.prototype.init.apply(this, arguments);

            this.getModel().getMetaModel().requestObject("/").then( function () {
                sap.ushell.bootstrap("local").then(function () {
                    sap.ushell.Container.createRenderer('fiori2', true).then(
                        function(oRenderer){ 
                            oRenderer.placeAt("content") 
                        }
                    );
                });
            }.bind(this));
        }
    });
});