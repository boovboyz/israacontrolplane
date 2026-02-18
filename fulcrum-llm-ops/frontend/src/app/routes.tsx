import { createBrowserRouter, Outlet } from "react-router-dom";
import { AppSidebar } from "@/components/AppSidebar";

import { LiveRuns } from "@/pages/LiveRuns";
import { RunDetails } from "@/pages/RunDetails";
import { MLflowDetails } from "@/pages/MLflowDetails";
import { ReplayStudio } from "@/pages/ReplayStudio";
import { Metrics } from "@/pages/Metrics";
import { ComparePage } from "@/pages/Compare";
import { EvaluationsPage } from "@/pages/Evaluations";
import { GuardrailsPage } from "@/pages/Guardrails";
import { PromptLibrary } from "@/pages/PromptLibrary";
import { AlertsPage } from "@/pages/Alerts";
import { ExportsPage } from "@/pages/Exports";
import { AdminPage } from "@/pages/Admin";

import { ChatPage } from "@/pages/ChatPage";

function Layout() {
    return (
        <div className="flex h-screen bg-background text-foreground font-sans antialiased overflow-hidden">
            <AppSidebar />
            <div className="flex-1 ml-[240px] h-full flex flex-col overflow-hidden">
                <main className="flex-1 overflow-hidden relative">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}

export const router = createBrowserRouter([
    {
        path: "/",
        element: <Layout />,
        children: [
            { index: true, element: <ChatPage /> },
            { path: "chat", element: <ChatPage /> },
            { path: "runs", element: <LiveRuns /> },
            { path: "runs/:runId", element: <RunDetails /> },
            { path: "runs/:runId/details", element: <MLflowDetails /> },
            { path: "replay", element: <ReplayStudio /> },
            { path: "compare", element: <ComparePage /> },
            { path: "prompts", element: <PromptLibrary /> },
            { path: "evaluations", element: <EvaluationsPage /> },
            { path: "policies", element: <GuardrailsPage /> },
            { path: "metrics", element: <Metrics /> },
            { path: "alerts", element: <AlertsPage /> },
            { path: "exports", element: <ExportsPage /> },
            { path: "admin", element: <AdminPage /> },
        ],
    },
]);
