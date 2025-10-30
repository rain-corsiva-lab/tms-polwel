import { NavLink, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import { Users, GraduationCap, Building2, Shield, ChevronDown, ChevronRight, BookOpen, Calendar, ClipboardList } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { Can } from "../lib/casl/Can";
import type { Subject } from "@/lib/casl/types";

interface SidebarProps {
  className?: string;
}

interface MenuItem {
  name: string;
  href: string;
  icon: any;
  subject: Subject;
}

const userManagementItems: MenuItem[] = [
  { name: "POLWEL Users", href: "/polwel-users", icon: Shield, subject: "User" },
  { name: "Associate Trainers & Training Partners", href: "/trainers", icon: GraduationCap, subject: "Trainer" },
  { name: "Client Organisations", href: "/client-organisations", icon: Building2, subject: "Client" },
];

const courseManagementItems: MenuItem[] = [
  { name: "Courses", href: "/courses", icon: BookOpen, subject: "CourseVenue" },
  { name: "Course Run Management", href: "/course-runs", icon: Calendar, subject: "CourseRun" },
  { name: "Venue Management", href: "/venue-setup", icon: Building2, subject: "CourseVenue" },
];

const Sidebar = ({ className }: SidebarProps) => {
  const location = useLocation();
  const isCourseManagementRoute = courseManagementItems.some((item) => location.pathname.startsWith(item.href));

  const [userManagementOpen, setUserManagementOpen] = useState(false);
  const [courseManagementOpen, setCourseManagementOpen] = useState(isCourseManagementRoute);
  const { user, isAuthenticated, loading, ability } = useAuth();

  // Local helper that uses the CASL ability from AuthProvider
  const can = (action: string, subject: Subject) => {
    try {
      return Boolean(ability?.can(action as any, subject));
    } catch (e) {
      // If ability is not ready or invalid, default to false
      return false;
    }
  };

  // Explicit role checks
  const isPolwelUser = user?.role === "POLWEL";
  const isTrainer = user?.role === "TRAINER";

  // Compute group visibility using CASL
  const userManagementVisible = isPolwelUser || can("view", "User") || can("view", "Trainer") || can("view", "Client");

  const courseManagementVisible = isPolwelUser || can("view", "CourseVenue") || can("view", "CourseRun") || can("view", "PostCourseRun");

  const postRunManagementVisible = isPolwelUser || can("view", "PostCourseRun");

  useEffect(() => {
    if (isCourseManagementRoute) {
      setCourseManagementOpen(true);
    }
  }, [isCourseManagementRoute]);

  // Debug logging
  useEffect(() => {
    if (!loading && isAuthenticated && import.meta.env.MODE === "development") {
      console.group("🔍 [SIDEBAR CASL] Debug Info");
      console.log("User Role:", user?.role);
      console.log("Is POLWEL:", isPolwelUser);
      console.log("Is Trainer:", isTrainer);
      console.log("Permissions:", user?.permissions);
      console.log("---");
      console.log("Ability Rules:", ability.rules);
      console.log("---");
      console.log("User Management Visible:", userManagementVisible);
      console.log("  can('view', 'User'):", can("view", "User"));
      console.log("  can('view', 'Trainer'):", can("view", "Trainer"));
      console.log("  can('view', 'Client'):", can("view", "Client"));
      console.log("Course Management Visible:", courseManagementVisible);
      console.log("  can('view', 'CourseVenue'):", can("view", "CourseVenue"));
      console.log("  can('view', 'CourseRun'):", can("view", "CourseRun"));
      console.log("  can('view', 'PostCourseRun'):", can("view", "PostCourseRun"));
      console.groupEnd();
    }
  }, [loading, isAuthenticated, user, isPolwelUser, isTrainer, ability, userManagementVisible, courseManagementVisible, can]);

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
            My Dashboard
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
                {/* Conditionally render items using CASL Can component */}
                {userManagementItems.map((item) => (
                  <Can key={item.name} I="view" a={item.subject}>
                    <NavLink
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
                  </Can>
                ))}
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
                {/* Conditionally render items using CASL Can component */}
                {courseManagementItems.map((item) => (
                  <Can key={item.name} I="view" a={item.subject}>
                    <NavLink
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
                  </Can>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Post Run Management - Standalone Menu Item */}
        {postRunManagementVisible && (
          <Can I="view" a="PostCourseRun">
            <NavLink
              to="/post-run-management"
              className={({ isActive }) =>
                cn(
                  "flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors",
                  isActive ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground"
                )
              }
            >
              <ClipboardList className="mr-3 h-5 w-5" />
              Post Run Management
            </NavLink>
          </Can>
        )}
      </nav>
    </aside>
  );
};

export default Sidebar;
