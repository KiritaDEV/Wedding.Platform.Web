import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { Link } from "react-router-dom";
import { Tooltip } from "../../../components/ui/Tooltip";
import type { EventDetail } from "../types";
import { EventWorkspaceNavigation } from "./EventWorkspaceNavigation";
import { useWorkspaceSidebar } from "./WorkspaceSidebarContext";

export function EventWorkspaceSidebar({ event }: { event: EventDetail }) {
  const { collapsed, toggle } = useWorkspaceSidebar();

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-30 hidden flex-col overflow-x-hidden border-r border-border bg-surface transition-[width] duration-200 lg:flex ${collapsed ? "w-16" : "w-60"}`}
    >
      <div
        className={`flex h-14 shrink-0 items-center border-b border-border ${collapsed ? "justify-center px-2" : "px-4"}`}
      >
        <Link
          className="flex min-w-0 items-center gap-2 text-sm font-semibold tracking-tight"
          to="/events"
          aria-label="Event Platform - My Events"
        >
          <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-accent text-xs text-accent-foreground">
            E
          </span>
          {!collapsed && <span className="truncate">Event Platform</span>}
        </Link>
      </div>

      <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto">
        <EventWorkspaceNavigation event={event} collapsed={collapsed} />
      </div>

      <div className="shrink-0 border-t border-border p-2">
        {collapsed ? (
          <Tooltip label="Expand sidebar">
            <button
              className="grid min-h-10 w-full place-items-center rounded-lg text-foreground-muted hover:bg-surface-muted hover:text-foreground"
              type="button"
              onClick={toggle}
              aria-label="Expand sidebar"
            >
              <PanelLeftOpen aria-hidden="true" size={18} />
            </button>
          </Tooltip>
        ) : (
          <button
            className="flex min-h-10 w-full items-center gap-2.5 rounded-lg px-3 text-sm text-foreground-muted hover:bg-surface-muted hover:text-foreground"
            type="button"
            onClick={toggle}
            aria-label="Collapse sidebar"
          >
            <PanelLeftClose aria-hidden="true" size={18} /> Collapse sidebar
          </button>
        )}
      </div>
    </aside>
  );
}
