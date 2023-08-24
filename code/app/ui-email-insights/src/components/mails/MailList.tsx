import { useContext } from "react";
import { StandardListItem, List, GroupHeaderListItem, Panel } from "@ui5/webcomponents-react";
import { CategorizedMails, IMail } from "../../models";
import { IMailContext, MailContext } from "../../context/MailContext";

const MailList = () => {
    const { mails, setSelectedMailId, selectedMail } = useContext<IMailContext>(MailContext);
    const categorizedMails: CategorizedMails = {};
    mails.forEach((val: IMail) => {
        if (!categorizedMails[val.category]) {
            categorizedMails[val.category] = new Array<IMail>();
        }
        return {
            ...categorizedMails,
            [val.category]: categorizedMails[val.category].push(val)
        };
    });

    return (
        <Panel headerText="E-Mails" onToggle={() => console.log("hi")} fixed>
            <List style={{ height: "calc(100vh - 52px - 64px - 52px - 64px)" }}>
                {Object.entries(categorizedMails).map(([category, mails]: [string, IMail[]], index: number) => {
                    return (
                        <div key={index}>
                            <GroupHeaderListItem>{category}</GroupHeaderListItem>
                            {mails.map((mail: IMail) => (
                                <StandardListItem
                                    key={mail.ID}
                                    onClick={() => setSelectedMailId(mail.ID)}
                                    selected={mail.ID === selectedMail.ID}
                                >
                                    {mail.subject}
                                </StandardListItem>
                            ))}
                        </div>
                    );
                })}
            </List>
        </Panel>
    );
};

export default MailList;
