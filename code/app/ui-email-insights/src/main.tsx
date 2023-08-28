import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import "@ui5/webcomponents-icons/dist/AllIcons";
import "@ui5/webcomponents-react/dist/Assets.js";
import { ThemeProvider } from "@ui5/webcomponents-react";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { setTheme } from "@ui5/webcomponents-base/dist/config/Theme";

import { MailProvider } from "./context/MailContext";
import { router } from "./routes";
import "./index.css";

setTheme("sap_horizon");

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
    <React.StrictMode>
        <MailProvider>
            <ThemeProvider>
                <RouterProvider router={router} />
            </ThemeProvider>
        </MailProvider>
    </React.StrictMode>
);
