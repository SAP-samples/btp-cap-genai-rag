import { FlexBox, FlexBoxAlignItems, FlexBoxJustifyContent, Text } from "@ui5/webcomponents-react";

const Footer = () => {
    return (
        <div
            style={{
                position: "fixed",
                height: 52,
                left: 0,
                bottom: 0,
                width: "100%",
                backgroundColor: "white",
                borderTop: "solid",
                borderTopColor: "#f1f1f1",
                borderTopWidth: 2
            }}
        >
            <FlexBox
                direction="Row"
                alignItems={FlexBoxAlignItems.Center}
                justifyContent={FlexBoxJustifyContent.SpaceBetween}
                style={{ height: "100%" }}
            >
                <div style={{ marginLeft: 32 }}>
                    <Text>{"© 2023 SAP T&I Platform Adoption & Advisory"}</Text>
                </div>
                <div>
                    <FlexBox
                        direction="Row"
                        alignItems={FlexBoxAlignItems.Center}
                        justifyContent={FlexBoxJustifyContent.SpaceBetween}
                        style={{ height: "100%" }}
                    >
                        <Text style={{ color: "#666", fontWeight: 700 }}>{"brought to you by"}</Text>
                        <div style={{ marginLeft: 8, marginRight: 32 }}>
                            <a href={"https://url.sap/paa/"} target="_blank">
                                <img src="/paa-full-logo.png" alt={"PAA Logo"} style={{ height: 48, width: "auto" }} />
                            </a>
                        </div>
                    </FlexBox>
                </div>
            </FlexBox>
        </div>
    );
};

export default Footer;
