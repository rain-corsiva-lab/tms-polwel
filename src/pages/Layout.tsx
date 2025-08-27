import { Outlet } from "react-router-dom";
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import { useAuth } from "@/hooks/useAuth";

const Layout = () => {
  const { user } = useAuth();
  
  // Hide sidebar for training coordinators
  const shouldShowSidebar = user?.role !== 'TRAINING_COORDINATOR';

  return (
    <div className="min-h-screen bg-background">
      <div className="flex">
        {shouldShowSidebar && <Sidebar />}
        <div className="flex-1 flex flex-col">
          <Header />
          <main className="flex-1 p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
};

export default Layout;