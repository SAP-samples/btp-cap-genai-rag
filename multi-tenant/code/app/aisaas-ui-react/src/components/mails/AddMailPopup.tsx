import { useContext, useState } from "react";
import {
    Bar,
    BusyIndicator,
    Button,
    Dialog,
    FlexBox,
    FlexBoxAlignItems,
    Input,
    InputDomRef,
    Label,
    TextArea,
    TextAreaDomRef,
    Ui5CustomEvent
} from "@ui5/webcomponents-react";
import "./AddMailPopup.css";
import { IMailContext, MailContext } from "../../context/MailContext";

const AddMailPopup = ({ open, closeDialog }: { open: boolean; closeDialog: () => void }) => {
    const [sender, setSender] = useState<string>("");
    const [subject, setSubject] = useState<string>("");
    const [body, setBody] = useState<string>("");
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

    const { addMail } = useContext<IMailContext>(MailContext);

    return (
        <>
            <Dialog
                headerText="Add new Mail"
                open={open}
                onAfterClose={closeDialog}
                style={{ width: 700 }}
                footer={
                    <Bar
                        design="Footer"
                        endContent={
                            <>
                                <Button disabled={isSubmitting} onClick={closeDialog}>
                                    Close
                                </Button>
                                <Button
                                    disabled={isSubmitting || !(sender && subject && body)}
                                    design="Emphasized"
                                    onClick={async () => {
                                        setIsSubmitting(true);
                                        await addMail({ sender, subject, body });
                                        setIsSubmitting(false);
                                        closeDialog();
                                    }}
                                >
                                    Submit
                                </Button>
                            </>
                        }
                    />
                }
            >
                <>
                    <BusyIndicator active={isSubmitting} style={{ width: "100%" }}>
                        <FlexBox style={{ flexGrow: 1 }} direction="Column" alignItems={FlexBoxAlignItems.Center}>
                            <div className="input-container">
                                <div>
                                    <Label for="sender">Sender</Label>
                                </div>
                                <div>
                                    <Input
                                        accessibleName="sender"
                                        type="Email"
                                        value={sender}
                                        onChange={(event: Ui5CustomEvent<InputDomRef, never>) =>
                                            setSender(event.target.value || sender)
                                        }
                                        placeholder="kay.schmitteckert@sap.com"
                                        className="full-width"
                                    />
                                </div>
                            </div>
                            <div className="input-container">
                                <div>
                                    <Label for="subject">Subject</Label>
                                </div>
                                <div>
                                    <Input
                                        accessibleName="subject"
                                        value={subject}
                                        onChange={(event: Ui5CustomEvent<InputDomRef, never>) =>
                                            setSubject(event.target.value || subject)
                                        }
                                        placeholder="Request regarding my booking #1234"
                                        className="full-width"
                                    />
                                </div>
                            </div>
                            <div className="input-container">
                                <div>
                                    <Label for="body">Body</Label>
                                </div>
                                <div>
                                    <TextArea
                                        accessibleName="body"
                                        rows={8}
                                        value={body}
                                        onInput={(event: Ui5CustomEvent<TextAreaDomRef, never>) =>
                                            setBody(event.target.value || body)
                                        }
                                    />
                                </div>
                            </div>
                        </FlexBox>
                    </BusyIndicator>
                </>
            </Dialog>
        </>
    );
};

export default AddMailPopup;
