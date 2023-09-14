import { ODATA_BASE } from "../constants";
import { IBaseMail, IMail } from "../models";

export const regenerateInsights = async () => {
    await fetch(`${ODATA_BASE}/mail-insights/recalculateInsights`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        }
    });
};

export const getMails = async () => {
    const response = await fetch(`${ODATA_BASE}/mail-insights/getMails()`);
    if (response.ok) {
        const data = await response.json();
        const mailsFromResponse = data.value;
        return mailsFromResponse || [];
    } else {
        throw new Error("Error fetching mails from backend");
    }
};

export const getMail = async (id: string) => {
    if (id !== "") {
        const response = await fetch(`${ODATA_BASE}/mail-insights/getMail(id=${id})`);
        if (response.ok) {
            const data = await response.json();
            if (data.mail) {
                const mail: IMail = data.mail;
                mail.similarMails = data.closestMails;
                return mail;
            }
            throw new Error(`Error parsing mail with ID ${id}`);
        } else {
            throw new Error(`Error fetching mail with ID ${id} from backend`);
        }
    }
};

export const addMail = async (mail: IBaseMail) => {
    const response = await fetch(`${ODATA_BASE}/mail-insights/addMails`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            mails: [mail]
        })
    });
    if (response.ok) {
        const data = await response.json();
        console.log(data);
    }
    return response.ok;
};

export const deleteMail = async (id: string) => {
    if (id !== "") {
        const response = await fetch(`${ODATA_BASE}/mail-insights/deleteMail(id=${id})`);
        if (response.ok) {
            const data = await response.json();
            return !!data.value || false;
        } else {
            throw new Error(`Error fetching mail with ID ${id} from backend`);
        }
    }
};
