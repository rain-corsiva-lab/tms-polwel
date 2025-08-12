import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Download, Filter, Shield, Users, Clock, MoreHorizontal, Edit, Trash2, Key } from "lucide-react";
import UserTable from "@/components/UserTable";
import { AddPolwelUserDialog } from "@/components/AddPolwelUserDialog";
import { EditPolwelUserDialog } from "@/components/EditPolwelUserDialog";
import { AuditTrailEntry } from "@/components/AuditTrailDialog";
import { polwelUsersApi, debugAuthState } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

// Enhanced user data structure for POLWEL users
interface PolwelUser {
  id: string;
  name: string;
  email: string;
  role: 'POLWEL';
  status: 'ACTIVE' | 'INACTIVE' | 'PENDING' | 'LOCKED';
  lastLogin: string | null;
  mfaEnabled: boolean;
  passwordExpiry?: string;
  failedLoginAttempts?: number;
  permissionLevel: string | null;
  department: string | null;
  createdAt: string;
  updatedAt: string;
  auditTrail?: AuditTrailEntry[];
}

export default function PolwelUsers() {
  const [users, setUsers] = useState<PolwelUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const { toast } = useToast();
  const { isAuthenticated, user } = useAuth();

  // Debug authentication state
  useEffect(() => {
    console.log('PolwelUsers - Auth State:', { isAuthenticated, user });
    debugAuthState();
  }, [isAuthenticated, user]);

  // Fetch users from API
  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await polwelUsersApi.getAll({
        page: pagination.page,
        limit: pagination.limit,
        search: searchQuery || undefined,
        status: statusFilter || undefined,
      });

      setUsers(response.users || []);
      setPagination(response.pagination || pagination);
    } catch (error) {
      console.error('Error fetching POLWEL users:', error);
      toast({
        title: "Error",
        description: "Failed to load POLWEL users",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Fetch users on component mount and when filters change
  useEffect(() => {
    fetchUsers();
  }, [pagination.page, searchQuery, statusFilter]);

  // Handle user actions
  const handleDeleteUser = async (userId: string) => {
    if (!confirm("Are you sure you want to delete this user? This action cannot be undone.")) {
      return;
    }

    try {
      await polwelUsersApi.delete(userId);
      toast({
        title: "Success",
        description: "User deleted successfully",
      });
      fetchUsers(); // Refresh the list
    } catch (error) {
      console.error('Error deleting user:', error);
      toast({
        title: "Error",
        description: "Failed to delete user",
        variant: "destructive",
      });
    }
  };

  const handleResetPassword = async (userId: string) => {
    try {
      const response = await polwelUsersApi.resetPassword(userId);
      toast({
        title: "Password Reset",
        description: `New temporary password: ${response.tempPassword}`,
      });
    } catch (error) {
      console.error('Error resetting password:', error);
      toast({
        title: "Error",
        description: "Failed to reset password",
        variant: "destructive",
      });
    }
  };

  const handleToggleMfa = async (userId: string, enabled: boolean) => {
    try {
      await polwelUsersApi.toggleMfa(userId, enabled);
      toast({
        title: "MFA Updated",
        description: `MFA ${enabled ? 'enabled' : 'disabled'} successfully`,
      });
      fetchUsers(); // Refresh the list
    } catch (error) {
      console.error('Error toggling MFA:', error);
      toast({
        title: "Error",
        description: "Failed to update MFA settings",
        variant: "destructive",
      });
    }
  };

  // Compute stats from real data
  const totalUsers = users.length;
  const activeUsers = users.filter(user => user.status === 'ACTIVE').length;
  const pendingUsers = users.filter(user => user.status === 'PENDING').length;

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p>Loading POLWEL users...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">POLWEL Staff Management</h1>
          <p className="text-muted-foreground">
            Manage POLWEL staff accounts, permissions, and access controls
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-2" />
            Filter
          </Button>
          <AddPolwelUserDialog />
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total POLWEL Staff</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalUsers}</div>
            <p className="text-xs text-muted-foreground">
              Active staff members with system access
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeUsers}</div>
            <p className="text-xs text-muted-foreground">
              Currently active and authorized
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Accounts</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingUsers}</div>
            <p className="text-xs text-muted-foreground">
              Awaiting activation or verification
            </p>
          </CardContent>
        </Card>
      </div>

      {/* User Table */}
      <Card>
        <CardHeader>
          <CardTitle>POLWEL Staff Members</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Permission Level</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>MFA</TableHead>
                <TableHead>Last Login</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.name}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>{user.department || 'Not Set'}</TableCell>
                  <TableCell>{user.permissionLevel || 'Not Set'}</TableCell>
                  <TableCell>
                    <Badge 
                      variant={user.status === 'ACTIVE' ? 'default' : 
                               user.status === 'PENDING' ? 'outline' : 'secondary'}
                    >
                      {user.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={user.mfaEnabled ? "default" : "outline"}>
                      {user.mfaEnabled ? "Enabled" : "Disabled"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Never'}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <EditPolwelUserDialog user={user} onUserUpdated={fetchUsers} />
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleResetPassword(user.id)}>
                            <Key className="h-4 w-4 mr-2" />
                            Reset Password
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleToggleMfa(user.id, !user.mfaEnabled)}
                          >
                            <Shield className="h-4 w-4 mr-2" />
                            {user.mfaEnabled ? 'Disable' : 'Enable'} MFA
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleDeleteUser(user.id)}
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete User
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {users.length === 0 && (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-muted-foreground mb-2">No users found</h3>
              <p className="text-muted-foreground">
                {searchQuery || statusFilter ? "Try adjusting your search filters" : "No POLWEL users have been added yet"}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
