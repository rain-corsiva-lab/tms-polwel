import { NavLink, useLocation } from "react-router-dom";
import { useState, useEffect, useCallback } from "react";
import * as React from "react";
import {
  Users,
  GraduationCap,
  Building2,
  Shield,
  ChevronDown,
  ChevronRight,
  BookOpen,
  Calendar,
  ClipboardList,
  FileText,
  LayoutDashboard,
  FileWarning,
  PanelLeftClose,
  PanelLeftOpen,
  Library,
  BarChart3,
  Mail,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { Can } from "../lib/casl/Can";
import type { Subject } from "@/lib/casl/types";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface SidebarProps {
  className?: string;
  isCollapsed?: boolean;
  onToggle?: () => void;
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
  { name: "Course Runs", href: "/course-runs", icon: Calendar, subject: "CourseRun" },
];

// Separate component for collapsed menu items to avoid hooks in loops
const CollapsedMenuItem = ({ item }: { item: MenuItem }) => {
  const [isHovered, setIsHovered] = React.useState(false);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <NavLink to={item.href}>
          {({ isActive }) => (
            <div
              style={{
                width: "28px",
                height: "28px",
                padding: "0",
                margin: "12px auto",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: isActive ? "#001A45  " : isHovered ? "rgba(0, 26, 69, 0.1)" : "transparent",
                color: isActive ? "#fff" : "#001A4566",
                border: "none",
                borderRadius: "8px",
                transition: "all 0.2s ease",
                transform: isHovered ? "scale(1.05)" : "scale(1)",
                boxShadow: isActive ? "0 2px 8px rgba(0, 26, 69, 0.3)" : isHovered ? "0 2px 4px rgba(0, 26, 69, 0.15)" : "none",
              }}
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={() => setIsHovered(false)}
            >
              <item.icon
                className="flex-shrink-0"
                style={{
                  width: "28px",
                  height: "28px",
                  color: isActive ? "#fff" : "#001A4566",
                  transition: "color 0.2s ease",
                }}
              />
            </div>
          )}
        </NavLink>
      </TooltipTrigger>
      <TooltipContent side="right" className="z-[9999]">
        {item.name}
      </TooltipContent>
    </Tooltip>
  );
};

const Sidebar = ({ className, isCollapsed = false, onToggle }: SidebarProps) => {
  const location = useLocation();
  const isCourseManagementRoute = courseManagementItems.some((item) => location.pathname.startsWith(item.href));

  const [userManagementOpen, setUserManagementOpen] = useState(false);
  const [courseManagementOpen, setCourseManagementOpen] = useState(isCourseManagementRoute);
  const { user, isAuthenticated, loading, ability } = useAuth();

  // Helper component for nav items with tooltip support
  const NavItem = ({ to, icon: Icon, label, end = false }: { to: string; icon: any; label: string; end?: boolean }) => {
    const [isHovered, setIsHovered] = React.useState(false);

    const content = (
      <NavLink to={to} end={end}>
        {({ isActive }) => (
          <>
            <div
              className={cn(
                "flex items-center text-sm font-medium rounded-lg transition-all duration-200",
                isCollapsed ? "" : "px-3 py-2.5",
                isActive && !isCollapsed ? "bg-[#001A45] text-white shadow-md" : "",
                !isActive && !isCollapsed ? "text-muted-foreground hover:bg-[#001A45]/20 hover:text-[#001A45] hover:shadow-sm" : "",
              )}
              style={
                isCollapsed
                  ? {
                      width: "28px",
                      height: "28px",
                      padding: "0",
                      margin: "12px auto",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: isActive ? "#001A45" : isHovered ? "rgba(0, 26, 69, 0.1)" : "transparent",
                      color: isActive ? "#fff" : "#001A4566",
                      border: "none",
                      borderRadius: "8px",
                      transition: "all 0.2s ease",
                      transform: isHovered ? "scale(1.05)" : "scale(1)",
                      boxShadow: isActive ? "0 2px 8px rgba(0, 26, 69, 0.3)" : isHovered ? "0 2px 4px rgba(0, 26, 69, 0.15)" : "none",
                    }
                  : undefined
              }
              onMouseEnter={() => isCollapsed && setIsHovered(true)}
              onMouseLeave={() => isCollapsed && setIsHovered(false)}
            >
              <Icon
                className={cn("flex-shrink-0", isCollapsed ? "" : "h-4 w-4", !isCollapsed && "mr-3")}
                style={isCollapsed ? { width: "28px", height: "28px", color: isActive ? "#fff" : "#001A4566", transition: "color 0.2s ease" } : undefined}
              />
              {!isCollapsed && <span>{label}</span>}
            </div>
          </>
        )}
      </NavLink>
    );

    if (isCollapsed) {
      return (
        <Tooltip>
          <TooltipTrigger asChild>{content}</TooltipTrigger>
          <TooltipContent side="right" className="z-[9999]">
            {label}
          </TooltipContent>
        </Tooltip>
      );
    }

    return content;
  };

  // Local helper that uses the CASL ability from AuthProvider
  const can = useCallback(
    (action: string, subject: Subject) => {
      try {
        return Boolean(ability?.can(action as any, subject));
      } catch (e) {
        // If ability is not ready or invalid, default to false
        return false;
      }
    },
    [ability],
  );
  // useEffect(() => {
  //   const style = document.createElement("style");
  //   style.textContent = `
  //     .collapsed-nav{
  //        margin-bottom:10px;
  //     }
  //   `;
  //   document.head.appendChild(style);
  //   return () => {
  //     document.head.removeChild(style);
  //   };
  // }, []);
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
      console.log("Ability Rules:", ability?.rules ?? []);
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
      className={cn("fixed top-0 left-0 bg-card border-r border-border h-screen flex flex-col overflow-auto transition-all duration-300", className)}
      style={{
        width: isCollapsed ? "4rem" : "var(--sidebar-width)",
        paddingTop: "var(--header-height)",
      }}
    >
      <div className={cn("p-6 flex items-center transition-all duration-300", isCollapsed ? "justify-center p-3" : "space-x-2")}>
        {!isCollapsed ? (
          <>
            <img src="/images/POLWEL Logo_Horizontal.png" alt="POLWEL Logo" className="h-12 w-auto transition-all duration-300" />
          </>
        ) : (
          <div className="flex items-center justify-center transition-all duration-300">
            <img src="/images/POLWEL Logo_Vertical.png" alt="POLWEL Logo" className="h-10 w-auto" />
          </div>
        )}
      </div>

      <nav className="flex-1 px-4 space-y-2">
        <TooltipProvider delayDuration={0}>
          {/* Dashboard - Only for POLWEL users */}
          {isPolwelUser && <NavItem to="/" icon={LayoutDashboard} label="Dashboard" end />}

          {/* Trainer Dashboard - Only show for trainers */}
          {user?.role === "TRAINER" && <NavItem to="/trainer-dashboard" icon={Calendar} label="My Dashboard" />}

          {/* User Management Dropdown - show only if at least one child is visible */}
          {userManagementVisible && !isCollapsed && (
            <div className="space-y-1">
              <button
                onClick={() => setUserManagementOpen(!userManagementOpen)}
                className="w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors text-muted-foreground hover:bg-[#001A45]/20 hover:text-[#001A45]"
              >
                <Users className="mr-3 h-5 w-5" />
                User Management
                {userManagementOpen ? <ChevronDown className="ml-auto h-4 w-4" /> : <ChevronRight className="ml-auto h-4 w-4" />}
              </button>

              {userManagementOpen && (
                <div className="ml-6 space-y-1">
                  {userManagementItems.map((item) => (
                    <Can key={item.name} I="view" a={item.subject}>
                      <NavLink
                        to={item.href}
                        className={({ isActive }) =>
                          cn(
                            "flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors",
                            isActive ? "bg-[#001A45] text-white" : "text-muted-foreground hover:bg-[#001A45]/20 hover:text-[#001A45]",
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

          {/* User Management - Collapsed mode */}
          {userManagementVisible && isCollapsed && (
            <>
              {userManagementItems.map((item) => (
                <Can key={item.name} I="view" a={item.subject}>
                  <CollapsedMenuItem item={item} />
                </Can>
              ))}
            </>
          )}

          {/* Course Management Dropdown - show only if at least one child is visible */}
          {courseManagementVisible && !isCollapsed && (
            <div className="space-y-1">
              <button
                onClick={() => setCourseManagementOpen(!courseManagementOpen)}
                className="w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors text-muted-foreground hover:bg-[#001A45]/20 hover:text-[#001A45]"
              >
                <BookOpen className="mr-3 h-5 w-5" />
                Course Management
                {courseManagementOpen ? <ChevronDown className="ml-auto h-4 w-4" /> : <ChevronRight className="ml-auto h-4 w-4" />}
              </button>

              {courseManagementOpen && (
                <div className="ml-6 space-y-1">
                  {courseManagementItems.map((item) => (
                    <Can key={item.name} I="view" a={item.subject}>
                      <NavLink
                        to={item.href}
                        className={({ isActive }) =>
                          cn(
                            "flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors",
                            isActive ? "bg-[#001A45] text-white" : "text-muted-foreground hover:bg-[#001A45]/20 hover:text-[#001A45]",
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

          {/* Course Management - Collapsed mode */}
          {courseManagementVisible && isCollapsed && (
            <>
              {courseManagementItems.map((item) => (
                <Can key={item.name} I="view" a={item.subject}>
                  <CollapsedMenuItem item={item} />
                </Can>
              ))}
            </>
          )}

          {/* Venue Management - Standalone Menu Item */}
          {courseManagementVisible && (
            <Can I="view" a="CourseVenue">
              <NavItem to="/venue-setup" icon={Building2} label="Venue Management" />
            </Can>
          )}

          {/* Post Run Management - Standalone Menu Item */}
          {postRunManagementVisible && (
            <Can I="view" a="PostCourseRun">
              <NavItem to="/post-run-management" icon={ClipboardList} label="Post Run Management" />
            </Can>
          )}

          {/* Billing Reports - Standalone Menu Item */}
          {postRunManagementVisible && (
            <Can I="view" a="PostCourseRun">
              <NavItem to="/billing-reports" icon={FileText} label="Billing Reports" />
            </Can>
          )}

          {/* Waiver Requests - Standalone Menu Item */}
          {postRunManagementVisible && (
            <Can I="view" a="PostCourseRun">
              <NavItem to="/waiver-requests" icon={FileWarning} label="Waiver Requests" />
            </Can>
          )}

          {/* Resource Library - Standalone Menu Item */}
          {postRunManagementVisible && (
            <Can I="view" a="ResourceLibrary">
              <NavItem to="/resource-library" icon={Library} label="Resource Library" />
            </Can>
          )}

          {/* Reporting - Standalone Menu Item */}
          {postRunManagementVisible && (
            <Can I="view" a="Reporting">
              <NavItem to="/reporting" icon={BarChart3} label="Reporting" />
            </Can>
          )}

          {/* Email Logs - POLWEL only */}
          {isPolwelUser && <NavItem to="/email-logs" icon={Mail} label="Email Logs" />}
        </TooltipProvider>
      </nav>

      {/* Toggle Button */}
      {onToggle && (
        <div className="p-4 border-t border-border">
          <TooltipProvider delayDuration={0}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={onToggle}
                  className="w-full flex items-center justify-center px-3 py-2 text-sm font-medium rounded-md transition-colors text-muted-foreground hover:bg-[#001A45]/20 hover:text-[#001A45]"
                >
                  {isCollapsed ? (
                    <PanelLeftOpen style={{ width: "28px", height: "28px", minWidth: "28px", minHeight: "28px" }} />
                  ) : (
                    <PanelLeftClose style={{ width: "28px", height: "28px", minWidth: "28px", minHeight: "28px" }} />
                  )}
                  {!isCollapsed && <span className="ml-3">Collapse</span>}
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">{isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      )}
    </aside>
  );
};

export default Sidebar;
