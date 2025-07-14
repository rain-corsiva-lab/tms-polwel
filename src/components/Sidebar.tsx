import { NavLink } from "react-router-dom";
import { 
  Users, 
  UserCheck, 
  GraduationCap, 
  Building2, 
  BarChart3, 
  Settings,
  Shield,
  Calendar
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SidebarProps {
  className?: string;
}

const navigation = [
  { name: 'Dashboard', href: '/', icon: BarChart3 },
  { name: 'User Management', href: '/users', icon: Users },
  { name: 'POLWEL Users', href: '/polwel-users', icon: Shield },
  { name: 'Clients (TC)', href: '/clients', icon: Building2 },
  { name: 'Trainers & Partners', href: '/trainers', icon: GraduationCap },
  { name: 'Learners', href: '/learners', icon: UserCheck },
  { name: 'Training Schedule', href: '/schedule', icon: Calendar },
  { name: 'Settings', href: '/settings', icon: Settings },
];

const Sidebar = ({ className }: SidebarProps) => {
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
      </nav>
    </aside>
  );
};

export default Sidebar;