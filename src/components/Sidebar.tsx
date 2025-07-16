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
  Calendar,
  ChevronDown,
  ChevronRight
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SidebarProps {
  className?: string;
}

const navigation = [
  { name: 'Dashboard', href: '/', icon: BarChart3 },
  { name: 'Training Schedule', href: '/schedule', icon: Calendar },
  { name: 'Settings', href: '/settings', icon: Settings },
];

const userManagementItems = [
  { name: 'POLWEL Users', href: '/polwel-users', icon: Shield },
  { name: 'Trainers & Partners', href: '/trainers', icon: GraduationCap },
];

const trainingOrgsItems = [
  { name: 'Training Coordinators', href: '/training-coordinators', icon: UserCheck },
  { name: 'Learners', href: '/learners', icon: Users },
];

const Sidebar = ({ className }: SidebarProps) => {
  const [userManagementOpen, setUserManagementOpen] = useState(false);
  const [trainingOrgsOpen, setTrainingOrgsOpen] = useState(false);

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
        {/* Main navigation items */}
        {navigation.map((item) => (
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
            <item.icon className="mr-3 h-5 w-5" />
            {item.name}
          </NavLink>
        ))}

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

              {/* Training Organisations Sub-dropdown */}
              <div className="space-y-1">
                <button
                  onClick={() => setTrainingOrgsOpen(!trainingOrgsOpen)}
                  className="w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground"
                >
                  <Building2 className="mr-3 h-4 w-4" />
                  Training Organisations
                  {trainingOrgsOpen ? (
                    <ChevronDown className="ml-auto h-3 w-3" />
                  ) : (
                    <ChevronRight className="ml-auto h-3 w-3" />
                  )}
                </button>

                {trainingOrgsOpen && (
                  <div className="ml-6 space-y-1">
                    {trainingOrgsItems.map((item) => (
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
                        <item.icon className="mr-3 h-3 w-3" />
                        {item.name}
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </nav>
    </aside>
  );
};

export default Sidebar;