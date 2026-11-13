import { createBrowserRouter, type RouteObject } from "react-router-dom";
import { AdminLayout } from "../components/layout/AdminLayout";
import { MainLayout } from "../components/layout/MainLayout";
import { AboutPage } from "../pages/AboutPage";
import { ConfirmationPage } from "../pages/ConfirmationPage";
import { ContactPage } from "../pages/ContactPage";
import { ElectionDetailPage } from "../pages/ElectionDetailPage";
import { ElectionsPage } from "../pages/ElectionsPage";
import { HomePage } from "../pages/HomePage";
import { LoginPage } from "../pages/LoginPage";
import { NotFoundPage } from "../pages/NotFoundPage";
import { ProfilePage } from "../pages/ProfilePage";
import { ResultsPage } from "../pages/ResultsPage";
import { VotePage } from "../pages/VotePage";
import { AdminAnnouncementsPage } from "../pages/admin/AdminAnnouncementsPage";
import { AdminAuditLogPage } from "../pages/admin/AdminAuditLogPage";
import { AdminDashboardPage } from "../pages/admin/AdminDashboardPage";
import { AdminElectionsPage } from "../pages/admin/AdminElectionsPage";
import { AdminMessagesPage } from "../pages/admin/AdminMessagesPage";
import { AdminOrganizationsPage } from "../pages/admin/AdminOrganizationsPage";
import { AdminStudentsPage } from "../pages/admin/AdminStudentsPage";
import { AdminVoterListsPage } from "../pages/admin/AdminVoterListsPage";
import { AdminRoute } from "./AdminRoute";
import { ProtectedRoute } from "./ProtectedRoute";

/** Route table (docs/ARCHITECTURE.md §8). Exported separately so tests can build a memory router. */
export const routes: RouteObject[] = [
  {
    element: <MainLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: "elections", element: <ElectionsPage /> },
      { path: "elections/:id", element: <ElectionDetailPage /> },
      { path: "elections/:id/results", element: <ResultsPage /> },
      {
        element: <ProtectedRoute />,
        children: [
          { path: "elections/:id/vote", element: <VotePage /> },
          { path: "elections/:id/confirmation", element: <ConfirmationPage /> },
          { path: "profile", element: <ProfilePage /> },
        ],
      },
      { path: "login", element: <LoginPage /> },
      { path: "about", element: <AboutPage /> },
      { path: "contact", element: <ContactPage /> },
      {
        path: "admin",
        element: <AdminRoute />,
        children: [
          {
            element: <AdminLayout />,
            children: [
              { index: true, element: <AdminDashboardPage /> },
              { path: "elections", element: <AdminElectionsPage /> },
              { path: "elections/:id", element: <AdminElectionsPage /> },
              { path: "students", element: <AdminStudentsPage /> },
              { path: "voter-lists", element: <AdminVoterListsPage /> },
              { path: "organizations", element: <AdminOrganizationsPage /> },
              { path: "announcements", element: <AdminAnnouncementsPage /> },
              { path: "messages", element: <AdminMessagesPage /> },
              { path: "audit-log", element: <AdminAuditLogPage /> },
              { path: "*", element: <NotFoundPage /> },
            ],
          },
        ],
      },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
];

export const router = createBrowserRouter(routes);
