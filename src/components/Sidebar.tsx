import { NavLink } from "react-router-dom";
import { useState, useEffect } from "react";
import { Users, UserCheck, GraduationCap, Building2, BarChart3, Settings, Shield, ChevronDown, ChevronRight, BookOpen, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { usePermission } from "@/hooks/usePermission";

interface SidebarProps {
  className?: string;
}

const navigation = [
  // Dashboard and Settings removed
];

const userManagementItems = [
  { name: "POLWEL Users", href: "/polwel-users", icon: Shield, permission: "users.view" },
  { name: "Associate Trainers & Training Partners", href: "/trainers", icon: GraduationCap, permission: "trainers.view" },
];

const clientOrgsItems = [
  { name: "Training Coordinators", href: "/training-coordinators", icon: UserCheck, permission: "clients.view" },
  { name: "Learners", href: "/learners", icon: Users, permission: "clients.view" },
];

const courseManagementItems = [
  { name: "Course Creation", href: "/course-creation", icon: BookOpen, permission: "courses.view" },
  { name: "Course Run Management", href: "/course-runs", icon: Calendar, permission: "courses.view" },
  { name: "Venue Management", href: "/venue-setup", icon: Building2, permission: "venues.view" },
];

const Sidebar = ({ className }: SidebarProps) => {
  const [userManagementOpen, setUserManagementOpen] = useState(false);
  const [clientOrgsOpen, setClientOrgsOpen] = useState(false);
  const [courseManagementOpen, setCourseManagementOpen] = useState(false);
  const { user, isAuthenticated, loading } = useAuth();
  const { hasAny, list } = usePermission();

  // Determine visibility for top-level groups
  // POLWEL users should see all menus regardless of specific permissions
  const isPolwelUser = user?.role === "POLWEL";
  const userManagementVisible = user?.role === "TRAINER" ? false : isPolwelUser || hasAny(["users.view", "trainers.view", "clients.view"]);

  const courseManagementVisible = user?.role === "TRAINER" ? false : isPolwelUser || hasAny(["courses.view", "venues.view"]);

  // Debug logging for staging troubleshooting
  useEffect(() => {
    if (!loading && isAuthenticated) {
      console.debug("🔍 [SIDEBAR] Debug info:", {
        userRole: user?.role,
        isPolwelUser,
        isAuthenticated,
        loading,
        permissionsCount: user?.permissions?.length || 0,
        permissions: list(),
        userManagementVisible,
        courseManagementVisible,
        environment: import.meta.env.MODE,
      });
    }
  }, [loading, isAuthenticated, user, isPolwelUser, userManagementVisible, courseManagementVisible, list]);

  return (
    <aside
      className={cn("fixed top-0 left-0 bg-card border-r border-border h-screen flex flex-col overflow-auto", className)}
      style={{ width: "var(--sidebar-width)", paddingTop: "var(--header-height)" }}
    >
      <div className="p-6">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-sm">TMS</span>
          </div>
          <span className="font-semibold text-foreground">Training MS</span>
        </div>
      </div>

      <nav className="flex-1 px-4 space-y-1">
        {/* Trainer Dashboard - Only show for trainers */}
        {user?.role === "TRAINER" && (
          <NavLink
            to="/trainer-dashboard"
            className={({ isActive }) =>
              cn(
                "flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors",
                isActive ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground"
              )
            }
          >
            <Calendar className="mr-3 h-5 w-5" />
            Dashboard
          </NavLink>
        )}

        {/* User Management Dropdown - show only if at least one child is visible */}
        {userManagementVisible && (
          <div className="space-y-1">
            <button
              onClick={() => setUserManagementOpen(!userManagementOpen)}
              className="w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground"
            >
              <Users className="mr-3 h-5 w-5" />
              User Management
              {userManagementOpen ? <ChevronDown className="ml-auto h-4 w-4" /> : <ChevronRight className="ml-auto h-4 w-4" />}
            </button>

            {userManagementOpen && (
              <div className="ml-6 space-y-1">
                {userManagementItems
                  .filter((item) => !item.permission || isPolwelUser || hasAny([item.permission]))
                  .map((item) => (
                    <NavLink
                      key={item.name}
                      to={item.href}
                      className={({ isActive }) =>
                        cn(
                          "flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors",
                          isActive ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground"
                        )
                      }
                    >
                      <item.icon className="mr-3 h-4 w-4" />
                      {item.name}
                    </NavLink>
                  ))}

                {/* Client Organisations as direct link (show only if has clients.view) */}
                {(isPolwelUser || hasAny(["clients.view"])) && (
                  <NavLink
                    to="/client-organisations"
                    className={({ isActive }) =>
                      cn(
                        "flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors",
                        isActive ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground"
                      )
                    }
                  >
                    <Building2 className="mr-3 h-4 w-4" />
                    Clients
                  </NavLink>
                )}
              </div>
            )}
          </div>
        )}

        {/* Course Management Dropdown - show only if at least one child is visible */}
        {courseManagementVisible && (
          <div className="space-y-1">
            <button
              onClick={() => setCourseManagementOpen(!courseManagementOpen)}
              className="w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground"
            >
              <BookOpen className="mr-3 h-5 w-5" />
              Course Management
              {courseManagementOpen ? <ChevronDown className="ml-auto h-4 w-4" /> : <ChevronRight className="ml-auto h-4 w-4" />}
            </button>

            {courseManagementOpen && (
              <div className="ml-6 space-y-1">
                {courseManagementItems
                  .filter((item) => !item.permission || isPolwelUser || hasAny([item.permission]))
                  .map((item) => (
                    <NavLink
                      key={item.name}
                      to={item.href}
                      className={({ isActive }) =>
                        cn(
                          "flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors",
                          isActive ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground"
                        )
                      }
                    >
                      <item.icon className="mr-3 h-4 w-4" />
                      {item.name}
                    </NavLink>
                  ))}
              </div>
            )}
          </div>
        )}
      </nav>
    </aside>
  );
};

export default Sidebar;
