import { lazy, type ComponentType } from "react";
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
import { AdminRoute } from "./AdminRoute";
import { ProtectedRoute } from "./ProtectedRoute";

/**
 * Admin pages are split into their own chunks (students never download them).
 * AdminLayout wraps its Outlet in Suspense.
 */
function lazyPage<K extends string>(load: () => Promise<Record<K, ComponentType>>, name: K) {
  return lazy(() => load().then((m) => ({ default: m[name] })));
}

const AdminDashboardPage = lazyPage(() => import("../pages/admin/AdminDashboardPage"), "AdminDashboardPage");
const AdminElectionsPage = lazyPage(() => import("../pages/admin/AdminElectionsPage"), "AdminElectionsPage");
const AdminElectionNewPage = lazyPage(() => import("../pages/admin/AdminElectionNewPage"), "AdminElectionNewPage");
const AdminElectionEditorPage = lazyPage(
  () => import("../pages/admin/AdminElectionEditorPage"),
  "AdminElectionEditorPage",
);
const AdminStudentsPage = lazyPage(() => import("../pages/admin/AdminStudentsPage"), "AdminStudentsPage");
const AdminStudentImportPage = lazyPage(() => import("../pages/admin/AdminStudentImportPage"), "AdminStudentImportPage");
const AdminVoterListsPage = lazyPage(() => import("../pages/admin/AdminVoterListsPage"), "AdminVoterListsPage");
const AdminVoterListDetailPage = lazyPage(
  () => import("../pages/admin/AdminVoterListDetailPage"),
  "AdminVoterListDetailPage",
);
const AdminOrganizationsPage = lazyPage(() => import("../pages/admin/AdminOrganizationsPage"), "AdminOrganizationsPage");
const AdminAnnouncementsPage = lazyPage(() => import("../pages/admin/AdminAnnouncementsPage"), "AdminAnnouncementsPage");
const AdminMessagesPage = lazyPage(() => import("../pages/admin/AdminMessagesPage"), "AdminMessagesPage");
const AdminAuditLogPage = lazyPage(() => import("../pages/admin/AdminAuditLogPage"), "AdminAuditLogPage");

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
              { path: "elections/new", element: <AdminElectionNewPage /> },
              { path: "elections/:id", element: <AdminElectionEditorPage /> },
              { path: "students", element: <AdminStudentsPage /> },
              { path: "students/import", element: <AdminStudentImportPage /> },
              { path: "voter-lists", element: <AdminVoterListsPage /> },
              { path: "voter-lists/:id", element: <AdminVoterListDetailPage /> },
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
