import { NavLink } from "react-router-dom";
import { useState } from "react";
import { 
  Users, 
  UserCheck, 
  GraduationCap, 
  Building2, 
  BarChart3, 
  Settings,
  Shield,
  ChevronDown,
  ChevronRight,
  BookOpen
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SidebarProps {
  className?: string;
}

const navigation = [
  // Dashboard and Settings removed
];

const userManagementItems = [
  { name: 'POLWEL Users', href: '/polwel-users', icon: Shield },
  { name: 'Trainers & Partners', href: '/trainers', icon: GraduationCap },
];

const clientOrgsItems = [
  { name: 'Training Coordinators', href: '/training-coordinators', icon: UserCheck },
  { name: 'Learners', href: '/learners', icon: Users },
];

const courseManagementItems = [
  { name: 'Course Creation', href: '/course-creation', icon: BookOpen },
  { name: 'Venue Management', href: '/venue-setup', icon: Building2 },
];

const Sidebar = ({ className }: SidebarProps) => {
  const [userManagementOpen, setUserManagementOpen] = useState(false);
  const [clientOrgsOpen, setClientOrgsOpen] = useState(false);
  const [courseManagementOpen, setCourseManagementOpen] = useState(false);

  return (
    <aside className={cn("bg-card border-r border-border w-64 h-screen flex flex-col", className)}>
      <div className="p-6">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-sm">TMS</span>
          </div>
          <span className="font-semibold text-foreground">Training MS</span>
        </div>
      </div>
      
      <nav className="flex-1 px-4 space-y-1">
        {/* User Management Dropdown */}
        <div className="space-y-1">
          <button
            onClick={() => setUserManagementOpen(!userManagementOpen)}
            className="w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground"
          >
            <Users className="mr-3 h-5 w-5" />
            User Management
            {userManagementOpen ? (
              <ChevronDown className="ml-auto h-4 w-4" />
            ) : (
              <ChevronRight className="ml-auto h-4 w-4" />
            )}
          </button>

          {userManagementOpen && (
            <div className="ml-6 space-y-1">
              {userManagementItems.map((item) => (
                <NavLink
                  key={item.name}
                  to={item.href}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors",
                      isActive
                        ? "bg-accent text-accent-foreground"
                        : "text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground"
                    )
                  }
                >
                  <item.icon className="mr-3 h-4 w-4" />
                  {item.name}
                </NavLink>
              ))}

              {/* Client Organisations as direct link */}
              <NavLink
                to="/client-organisations"
                className={({ isActive }) =>
                  cn(
                    "flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors",
                    isActive
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground"
                  )
                }
              >
                <Building2 className="mr-3 h-4 w-4" />
                Clients
              </NavLink>
            </div>
          )}
        </div>

        {/* Course Management Dropdown */}
        <div className="space-y-1">
          <button
            onClick={() => setCourseManagementOpen(!courseManagementOpen)}
            className="w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground"
          >
            <BookOpen className="mr-3 h-5 w-5" />
            Course Management
            {courseManagementOpen ? (
              <ChevronDown className="ml-auto h-4 w-4" />
            ) : (
              <ChevronRight className="ml-auto h-4 w-4" />
            )}
          </button>

          {courseManagementOpen && (
            <div className="ml-6 space-y-1">
              {courseManagementItems.map((item) => (
                <NavLink
                  key={item.name}
                  to={item.href}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors",
                      isActive
                        ? "bg-accent text-accent-foreground"
                        : "text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground"
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
      </nav>
    </aside>
  );
};

export default Sidebar;