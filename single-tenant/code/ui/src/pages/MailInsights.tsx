import {
    BusyIndicator,
    FlexBox,
    FlexBoxAlignItems,
    FlexBoxJustifyContent,
    Grid,
    Title
} from "@ui5/webcomponents-react";
import MailList from "../components/mails/MailList";
import { useContext } from "react";
import MailDetails from "../components/mails/MailDetails";
import SimilarMailsList from "../components/mails/SimilarMailsList";
import { IMailContext, MailContext } from "../context/MailContext";

const MailInsights = () => {
    const { mails, isFetchingMails } = useContext<IMailContext>(MailContext);

    return (
        <>
            {!isFetchingMails ? (
                mails.length > 0 ? (
                    <div style={{ margin: 32 }}>
                        <Grid>
                            <div data-layout-span="XL3 L3 M3 S12">
                                <MailList />
                            </div>
                            <div data-layout-span="XL7 L7 M7 S12">
                                <MailDetails />
                            </div>
                            <div data-layout-span="XL2 L2 M2 S12">
                                <SimilarMailsList />
                            </div>
                        </Grid>
                    </div>
                ) : (
                    <FlexBox
                        style={{ height: "calc(100vh - 52px - 64px - 52px - 64px)" }}
                        direction="Row"
                        justifyContent={FlexBoxJustifyContent.Center}
                        alignItems={FlexBoxAlignItems.Center}
                    >
                        <Title>No Mails available</Title>
                    </FlexBox>
                )
            ) : (
                <FlexBox
                    style={{ height: "calc(100vh - 52px - 64px - 52px - 64px)" }}
                    direction="Row"
                    justifyContent={FlexBoxJustifyContent.Center}
                    alignItems={FlexBoxAlignItems.Center}
                >
                    <BusyIndicator active delay={0} />
                </FlexBox>
            )}
        </>
    );
};

export default MailInsights;
