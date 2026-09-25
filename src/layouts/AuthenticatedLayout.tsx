import { LogOut } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { NavLink, Outlet, useMatch, useNavigate } from "react-router-dom";
import { ThemeSwitch } from "../components/ui/ThemeSwitch";
import { useAuth } from "../features/auth/AuthContext";
import { authErrorMessage } from "../features/auth/errorMessage";
import { WorkspaceSidebarContext } from "../features/events/workspace/WorkspaceSidebarContext";
import { NotificationCenter } from "../features/notifications/NotificationCenter";

const SIDEBAR_STORAGE_KEY = "event-platform-workspace-sidebar";

export function AuthenticatedLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(
    () => localStorage.getItem(SIDEBAR_STORAGE_KEY) === "collapsed",
  );
  const inWorkspace = useMatch("/events/:eventId/*") !== null;
  const inWebsiteBuilder = useMatch("/events/:eventId/websites/:projectId") !== null;
  const showWorkspaceSidebar = inWorkspace && !inWebsiteBuilder;

  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed((collapsed) => {
      const next = !collapsed;
      localStorage.setItem(
        SIDEBAR_STORAGE_KEY,
        next ? "collapsed" : "expanded",
      );
      return next;
    });
  }, []);

  const sidebarValue = useMemo(
    () => ({ collapsed: sidebarCollapsed, toggle: toggleSidebar }),
    [sidebarCollapsed, toggleSidebar],
  );

  async function handleLogout() {
    setIsLoggingOut(true);
    setLogoutError(null);
    try {
      await logout();
      navigate("/login", { replace: true });
    } catch (error) {
      setLogoutError(authErrorMessage(error));
    } finally {
      setIsLoggingOut(false);
    }
  }

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden bg-background text-foreground">
      <header
        className={`relative z-20 shrink-0 backdrop-blur-lg transition-[margin] duration-200 ${inWorkspace ? `border-b border-border/60 bg-header-surface shadow-[var(--shadow-header)] ${showWorkspaceSidebar ? (sidebarCollapsed ? "lg:ml-16" : "lg:ml-60") : ""}` : "border-b border-border bg-background/92"}`}
      >
        <div
          className={`flex h-14 items-center gap-2.5 px-4 sm:px-5 lg:px-6 ${inWorkspace ? "justify-end" : "mx-auto max-w-[1360px]"}`}
        >
          <NavLink
            className={`mr-auto items-center gap-2 text-sm font-semibold tracking-tight ${showWorkspaceSidebar ? "flex lg:hidden" : "flex"}`}
            to="/events"
          >
            <span className="grid size-7 place-items-center rounded-lg bg-accent text-xs text-accent-foreground">
              E
            </span>
            <span className="hidden sm:inline">Event Platform</span>
          </NavLink>

          {!inWorkspace && (
            <NavLink
              className={({ isActive }) =>
                `hidden rounded-lg px-2.5 py-1.5 text-sm font-medium sm:block ${isActive ? "bg-surface-muted text-foreground" : "text-foreground-muted hover:text-foreground"}`
              }
              to="/events"
            >
              My Events
            </NavLink>
          )}

          <ThemeSwitch />
          <NotificationCenter />

          <div className="hidden min-w-0 text-right md:block">
            <p className="truncate text-sm font-medium">{user?.name}</p>
            <p className="max-w-40 truncate text-[11px] text-foreground-muted">
              {user?.email}
            </p>
          </div>

          <button
            className="grid size-9 place-items-center rounded-lg border border-border bg-surface text-foreground-muted hover:bg-surface-muted hover:text-foreground disabled:opacity-60"
            type="button"
            disabled={isLoggingOut}
            onClick={() => void handleLogout()}
            aria-label={isLoggingOut ? "Logging out" : "Logout"}
          >
            <LogOut aria-hidden="true" size={16} />
          </button>
        </div>
        {logoutError && (
          <p
            className="border-t border-border bg-danger-muted px-4 py-2 text-center text-sm text-danger"
            role="alert"
          >
            {logoutError}
          </p>
        )}
      </header>
      <div
        className={`h-0 min-h-0 flex-1 transition-[padding] duration-200 ${inWebsiteBuilder ? "overflow-hidden" : "overflow-y-auto"} ${showWorkspaceSidebar ? (sidebarCollapsed ? "lg:pl-16" : "lg:pl-60") : ""}`}
      >
        <WorkspaceSidebarContext value={sidebarValue}>
          <Outlet />
        </WorkspaceSidebarContext>
      </div>
    </div>
  );
}
