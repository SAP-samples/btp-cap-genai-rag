import { createContext, useEffect, useState } from "react";
import { IBaseMail, IMail } from "../models";
import { addMail as addMailRequest, deleteMail as deleteMailRequest, getMail, getMails } from "../services";

export interface IMailContext {
    mails: Array<IMail>;
    selectedMail: IMail;
    setSelectedMailId: (id: string) => Promise<void>;
    deleteMail: (id: string) => Promise<void>;
    addMail: (mail: IBaseMail) => Promise<void>;
    isFetchingMail: boolean;
    isFetchingMails: boolean;
}

const MailContext = createContext<IMailContext>({} as IMailContext);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const MailProvider = ({ children }: any) => {
    const [mails, setMails] = useState<Array<IMail>>([]);
    const [selectedMail, setSelectedMail] = useState<IMail>({} as IMail);
    const [isFetchingMail, setIsFetchingMail] = useState<boolean>(false);
    const [isFetchingMails, setIsFetchingMails] = useState<boolean>(false);

    useEffect(() => {
        fetchMails();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const fetchMails = async () => {
        try {
            setIsFetchingMails(true);
            const mailsFromResponse = await getMails();
            if (mailsFromResponse.length > 0) {
                if (!selectedMail || !mailsFromResponse.find((mail: IMail) => mail.ID === selectedMail.ID)) {
                    setSelectedMailById(mailsFromResponse[0].ID);
                }
                setMails(mailsFromResponse);
            }
        } catch (e: unknown) {
            console.error((e as Error).message);
            setMails([]);
        } finally {
            setIsFetchingMails(false);
        }
    };

    const setSelectedMailById = async (id: string) => {
        try {
            setIsFetchingMail(true);
            const mail = await getMail(id);
            if (mail) {
                setSelectedMail(mail);
            }
        } catch (e: unknown) {
            console.error((e as Error).message);
        } finally {
            setIsFetchingMail(false);
        }
    };

    const deleteMail = async (id: string) => {
        try {
            const success = await deleteMailRequest(id);
            if (success) {
                await fetchMails();
            }
        } catch (e: unknown) {
            console.error((e as Error).message);
        }
    };

    const addMail = async (mail: IBaseMail) => {
        try {
            const success = await addMailRequest(mail);
            if (success) {
                await fetchMails();
            }
        } catch (e: unknown) {
            console.error((e as Error).message);
        }
    };

    return (
        <MailContext.Provider
            value={{
                mails,
                setSelectedMailId: setSelectedMailById,
                selectedMail,
                deleteMail,
                addMail,
                isFetchingMail,
                isFetchingMails
            }}
        >
            {children}
        </MailContext.Provider>
    );
};

export { MailProvider, MailContext };
