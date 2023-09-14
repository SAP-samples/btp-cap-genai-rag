import { useState } from "react";
import { Avatar, ShellBar, ShellBarItem } from "@ui5/webcomponents-react";
import { Outlet, useNavigate } from "react-router-dom";

import Footer from "./components/Footer";
import { regenerateInsights } from "./services";
import AddMailPopup from "./components/mails/AddMailPopup";

function App() {
    const nav = useNavigate();
    const [addMailDialogOpen, setAddMailDialogOpen] = useState<boolean>(false);

    return (
        <>
            <ShellBar
                logo={<img src="/paa-logo.png" alt={"PAA Logo"} style={{ height: 32, width: "auto" }} />}
                onMenuItemClick={() => nav("/")}
                primaryTitle={"GenAI Mail Insights"}
                profile={<Avatar initials={"KS"} />}
            >
                <ShellBarItem onClick={regenerateInsights} icon="activate" text="regenerate insights" />
                <ShellBarItem onClick={() => setAddMailDialogOpen(true)} icon="add" text="add mail" />
            </ShellBar>
            <AddMailPopup open={addMailDialogOpen} closeDialog={() => setAddMailDialogOpen(false)} />
            <Outlet />
            <Footer />
        </>
    );
}

export default App;
