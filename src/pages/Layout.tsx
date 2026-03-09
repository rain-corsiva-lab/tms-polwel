import { Outlet } from "react-router-dom";
import { useState, useEffect } from "react";
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import WorkflowModeIndicator from "@/components/WorkflowModeIndicator";
import { useAuth } from "@/hooks/useAuth";

const Layout = () => {
  const { user } = useAuth();

  // Manage sidebar collapsed state with localStorage persistence
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    const stored = localStorage.getItem("sidebar-collapsed");
    return stored === "true";
  });

  // Persist sidebar state
  useEffect(() => {
    localStorage.setItem("sidebar-collapsed", String(isSidebarCollapsed));
  }, [isSidebarCollapsed]);

  const toggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  // Hide sidebar for training coordinators
  const shouldShowSidebar = user?.role !== "TRAINING_COORDINATOR";

  // Calculate margin based on collapsed state
  const sidebarWidth = isSidebarCollapsed ? "4rem" : "var(--sidebar-width)";

  return (
    <div className="min-h-screen bg-background w-full overflow-x-hidden">
      <div className="flex w-full max-w-full">
        {shouldShowSidebar && <Sidebar isCollapsed={isSidebarCollapsed} onToggle={toggleSidebar} />}
        <div className="flex-1 flex flex-col transition-all duration-300 min-w-0 max-w-full" style={{ marginLeft: shouldShowSidebar ? sidebarWidth : 0 }}>
          <Header />
          <WorkflowModeIndicator />
          <main className="flex-1 p-6 w-full max-w-full overflow-x-hidden" style={{ paddingTop: "var(--header-height)" }}>
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
};

export default Layout;
