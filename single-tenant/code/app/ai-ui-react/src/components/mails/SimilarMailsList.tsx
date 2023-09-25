import { useContext } from "react";
import { List, Panel, CustomListItem, Title, Text, FlexBox, ObjectStatus } from "@ui5/webcomponents-react";
import { ISimilarMail } from "../../models";

import { IMailContext, MailContext } from "../../context/MailContext";

const SimilarMailsList = () => {
    const { selectedMail, setSelectedMailId } = useContext<IMailContext>(MailContext);
    const mails = selectedMail.similarMails;
    return (
        <Panel headerText="Similar E-Mails" onToggle={() => console.log("hi")} fixed>
            <List style={{ height: "calc(100vh - 52px - 64px - 52px - 64px)" }}>
                {mails
                    ?.sort((a: ISimilarMail, b: ISimilarMail) => b.similarity - a.similarity)
                    .slice(0, 5)
                    .map((similarMail: ISimilarMail) => {
                        const mail = similarMail.mail;
                        return (
                            <CustomListItem
                                key={mail.ID}
                                onClick={() => setSelectedMailId(mail.ID)}
                                style={{ paddingTop: 8, paddingBottom: 8 }}
                            >
                                <FlexBox direction={"Column"}>
                                    <Title level="H5">{mail.subject}</Title>
                                    <Text>{mail.body.slice(0, 172) + (mail.body.length > 172 ? "..." : "")}</Text>

                                    <div style={{ marginTop: 8 }}>
                                        <FlexBox direction={"Column"}>
                                            <ObjectStatus state="Information">{`${Math.round(
                                                similarMail.similarity * 100
                                            )}% similarity`}</ObjectStatus>
                                            <ObjectStatus state="Information">{mail.category}</ObjectStatus>
                                            <ObjectStatus state="Information">{mail.sender}</ObjectStatus>
                                        </FlexBox>
                                    </div>
                                </FlexBox>
                            </CustomListItem>
                        );
                    })}
            </List>
        </Panel>
    );
};

export default SimilarMailsList;
