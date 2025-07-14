import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MoreHorizontal, Edit, Trash2, Eye } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface User {
  id: string;
  name: string;
  email: string;
  role: 'POLWEL' | 'Client' | 'Trainer';
  status: 'Active' | 'Inactive';
  lastLogin?: string;
  mfaEnabled: boolean;
  organization?: string;
}

interface UserTableProps {
  users: User[];
  title: string;
}

const getRoleColor = (role: string) => {
  switch (role) {
    case 'POLWEL':
      return 'bg-primary text-primary-foreground';
    case 'Client':
      return 'bg-warning text-warning-foreground';
    case 'Trainer':
      return 'bg-success text-success-foreground';
    default:
      return 'bg-muted text-muted-foreground';
  }
};

const getStatusColor = (status: string) => {
  return status === 'Active' 
    ? 'bg-success text-success-foreground' 
    : 'bg-destructive text-destructive-foreground';
};

const UserTable = ({ users, title }: UserTableProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Name</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Email</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Role</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Status</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">MFA</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Last Login</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-b border-border hover:bg-muted/50">
                  <td className="py-3 px-4">
                    <div>
                      <div className="font-medium text-foreground">{user.name}</div>
                      {user.organization && (
                        <div className="text-sm text-muted-foreground">{user.organization}</div>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-foreground">{user.email}</td>
                  <td className="py-3 px-4">
                    <Badge className={getRoleColor(user.role)}>{user.role}</Badge>
                  </td>
                  <td className="py-3 px-4">
                    <Badge className={getStatusColor(user.status)}>{user.status}</Badge>
                  </td>
                  <td className="py-3 px-4">
                    <Badge variant={user.mfaEnabled ? "default" : "destructive"}>
                      {user.mfaEnabled ? 'Enabled' : 'Disabled'}
                    </Badge>
                  </td>
                  <td className="py-3 px-4 text-muted-foreground">
                    {user.lastLogin || 'Never'}
                  </td>
                  <td className="py-3 px-4">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>
                          <Eye className="h-4 w-4 mr-2" />
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit User
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive">
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete User
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
};

export default UserTable;