import { render, screen } from "@testing-library/react";
import { createMemoryRouter, RouterProvider, useLocation } from "react-router-dom";
import type { CurrentUser } from "@asa/shared";
import { describe, expect, it } from "vitest";
import { MockAuthProvider } from "../context/AuthContext";
import { safeNextPath } from "../utils/auth";
import { AdminRoute } from "./AdminRoute";
import { ProtectedRoute } from "./ProtectedRoute";

const student: CurrentUser = {
  id: "u1",
  username: "jdoe",
  email: "jdoe@ole.augie.edu",
  firstName: "Jane",
  lastName: "Doe",
  classStanding: "SR",
  onRoster: true,
  platformRole: "STUDENT",
  orgRoles: [],
};

function LoginProbe() {
  const location = useLocation();
  return <p>login page {location.search}</p>;
}

function renderAt(path: string, user: CurrentUser | null) {
  const router = createMemoryRouter(
    [
      { path: "/login", element: <LoginProbe /> },
      { element: <ProtectedRoute />, children: [{ path: "/profile", element: <p>profile page</p> }] },
      { element: <AdminRoute />, children: [{ path: "/admin", element: <p>admin page</p> }] },
    ],
    { initialEntries: [path] },
  );
  render(
    <MockAuthProvider value={{ user }}>
      <RouterProvider router={router} />
    </MockAuthProvider>,
  );
}

describe("route guards", () => {
  it("redirects signed-out users to /login with ?next=", () => {
    renderAt("/profile", null);
    expect(screen.getByText(`login page ?next=${encodeURIComponent("/profile")}`)).toBeInTheDocument();
  });

  it("renders protected pages for signed-in users", () => {
    renderAt("/profile", student);
    expect(screen.getByText("profile page")).toBeInTheDocument();
  });

  it("blocks students without admin roles from /admin", () => {
    renderAt("/admin", student);
    expect(screen.queryByText("admin page")).not.toBeInTheDocument();
    expect(screen.getByText(/don't have access/)).toBeInTheDocument();
  });

  it("allows org election admins into /admin", () => {
    renderAt("/admin", { ...student, orgRoles: [{ organizationId: "o1", organizationSlug: "asa", role: "ELECTION_ADMIN" }] });
    expect(screen.getByText("admin page")).toBeInTheDocument();
  });
});

describe("safeNextPath", () => {
  it.each([
    [null, "/"],
    ["/elections/1", "/elections/1"],
    ["//evil.example", "/"],
    ["https://evil.example", "/"],
    ["/\\evil.example", "/"],
    ["/login?next=/x", "/"],
  ])("%s → %s", (input, expected) => {
    expect(safeNextPath(input)).toBe(expected);
  });
});
