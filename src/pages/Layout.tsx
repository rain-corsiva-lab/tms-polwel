import { Outlet } from "react-router-dom";
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import { useAuth } from "@/hooks/useAuth";

const Layout = () => {
  const { user } = useAuth();

  // Hide sidebar for training coordinators
  const shouldShowSidebar = user?.role !== "TRAINING_COORDINATOR";

  return (
    <div className="min-h-screen bg-background">
      <div className="flex">
        {shouldShowSidebar && <Sidebar />}
        <div className={"flex-1 flex flex-col"} style={{ marginLeft: shouldShowSidebar ? "var(--sidebar-width)" : 0 }}>
          <Header />
          <main className="flex-1 p-6" style={{ paddingTop: "var(--header-height)" }}>
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
};

export default Layout;
