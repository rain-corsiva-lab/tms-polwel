import { Button } from "@/components/ui/button";
import { Bell, Search, User, Settings } from "lucide-react";

const Header = () => {
  return (
    <header className="bg-card border-b border-border h-16 flex items-center justify-between px-6">
      <div className="flex items-center space-x-4">
        <h1 className="text-xl font-semibold text-foreground">Training Management System</h1>
      </div>
      
      <div className="flex items-center space-x-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <input
            type="text"
            placeholder="Search users..."
            className="pl-10 pr-4 py-2 border border-input rounded-md bg-background text-foreground w-64 focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        
        <Button variant="ghost" size="icon">
          <Bell className="h-5 w-5" />
        </Button>
        
        <Button variant="ghost" size="icon">
          <Settings className="h-5 w-5" />
        </Button>
        
        <Button variant="ghost" size="icon">
          <User className="h-5 w-5" />
        </Button>
      </div>
    </header>
  );
};

export default Header;