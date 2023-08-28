(function() {
  "use strict";
  
  window["sap-ushell-config"] = {
    defaultRenderer: "fiori2",
    renderers: {
      fiori2: {
        componentData: {
          config: {
            search: "hidden",
            enableSearch: false
          },
        },
      },
    },
    services: {
      LaunchPage: {
        adapter: {
          config: {
            catalogs: [],
            groups: [
              {
                id: "MyHome",
                title: "My Home",
                isPreset: false,
                isVisible: true,
                isGroupLocked: false,
                tiles: []
              },
              {
                id: "EmailInsights",
                title: "Email Insights",
                isPreset: false,
                isVisible: true,
                isGroupLocked: false,
                tiles: [
                  {
                    id: "ViewInsights",
                    tileType: "sap.ushell.ui.tile.StaticTile",
                    properties: {
                      title: "View Insights",
                      targetURL: "#Insights-view",
                      icon: "sap-icon://collaborate"
                    }
                  },
                  {
                    id: "ManageSettings",
                    tileType: "sap.ushell.ui.tile.StaticTile",
                    properties: {
                      title: "Manage Settings",
                      targetURL: "#Settings-manage",
                      icon: "sap-icon://simulate"
                    }
                  }
                ]
              }
            ]
          }
        }
      },
      NavTargetResolution: {
        config: {
          enableClientSideTargetResolution: true
        }
      },
      ClientSideTargetResolution: {
        adapter: {
          config: {
            inbounds: {
              ViewInsights: {
                semanticObject: "Insights",
                action: "view",
                title: "View Insights",
                navigationMode: "embedded",
                signature: {
                  parameters: {},
                  additionalParameters: "allowed"
                },
                resolutionResult: {
                  applicationType: "SAPUI5",
                  url: "/sapaisaasuiemailinsights/"
                }
              },
              ManageSettings: {
                semanticObject: "Settings",
                action: "manage",
                title: "Manage Settings",
                navigationMode: "embedded",
                signature: {
                  parameters: {},
                  additionalParameters: "allowed"
                },
                resolutionResult: {
                  applicationType: "SAPUI5",
                  url: "/sapaisaasuiemailsettings/"
                }
              }
            }
          }
        }
      }
    }
  };
}());