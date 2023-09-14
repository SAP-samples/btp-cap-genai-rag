import { createHashRouter } from "react-router-dom";
import App from "../App";
import MailInsights from "../pages/MailInsights";
import ErrorPage from "../pages/ErrorPage";

export const router = createHashRouter([
    {
        element: <App />,
        errorElement: <ErrorPage />,
        children: [{ path: "/", element: <MailInsights /> }]
    }
]);
