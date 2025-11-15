import React, { useState, useEffect } from "react";
import PaginationControls from "@/components/ui/pagination";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "../lib/date";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import SafeDropdownMenu from "@/components/ui/safe-dropdown-menu";
import { DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import {
  Download,
  Filter,
  Shield,
  Users,
  Clock,
  MoreHorizontal,
  Edit,
  Trash2,
  Key,
  Eye,
  History,
  Mail,
  RefreshCw,
  X,
  Loader2,
  Lock,
  Unlock,
} from "lucide-react";
import * as XLSX from "xlsx";
import UserTable from "@/components/UserTable";
import { AddPolwelUserDialog } from "@/components/AddPolwelUserDialog";
import { EditPolwelUserDialog } from "@/components/EditPolwelUserDialog";
import { AuditTrailDialog, AuditTrailEntry } from "@/components/AuditTrailDialog";
import { ViewDetailsDialog } from "@/components/ViewDetailsDialog";
import { PasswordResetDialog } from "@/components/PasswordResetDialog";
import { polwelUsersApi, debugAuthState } from "@/lib/api";
import { format, parseISO } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

// Enhanced user data structure for POLWEL users
interface PolwelUser {
  id: string;
  name: string;
  email: string;
  role: "POLWEL";
  status: "ACTIVE" | "INACTIVE" | "PENDING" | "LOCKED";
  lastLogin: string | null;
  // mfaEnabled removed
  passwordExpiry?: string;
  failedLoginAttempts?: number;
  // permissionLevel and department removed
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
  const [perPage, setPerPage] = useState(10);
  const [exporting, setExporting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const { toast } = useToast();
  const { isAuthenticated, user } = useAuth();

  // Debug authentication state
  useEffect(() => {
    console.log("PolwelUsers - Auth State:", { isAuthenticated, user });
    debugAuthState();
  }, [isAuthenticated, user]);

  // Dummy data for POLWEL users
  const dummyUsers: PolwelUser[] = [
    //   {
    //     id: "1",
    //     name: "Alice Wong",
    //     email: "alice.wong@polwel.com",
    //     role: "POLWEL",
    //     status: "ACTIVE",
    //     lastLogin: "2024-08-12T10:30:00Z",
    // // mfaEnabled removed
    //     passwordExpiry: "2024-12-31T23:59:59Z",
    //     failedLoginAttempts: 0,
    //     createdAt: "2023-06-01T00:00:00Z",
    //     updatedAt: "2024-08-12T10:30:00Z",
    //   },
    //   {
    //     id: "2",
    //     name: "Robert Chen",
    //     email: "robert.chen@polwel.com",
    //     role: "POLWEL",
    //     status: "ACTIVE",
    //     lastLogin: "2024-08-11T14:15:00Z",
    // // mfaEnabled removed
    //     passwordExpiry: "2024-11-30T23:59:59Z",
    //     failedLoginAttempts: 0,
    //     createdAt: "2023-07-15T00:00:00Z",
    //     updatedAt: "2024-08-11T14:15:00Z",
    //   },
    //   {
    //     id: "3",
    //     name: "Maria Garcia",
    //     email: "maria.garcia@polwel.com",
    //     role: "POLWEL",
    //     status: "PENDING",
    //     lastLogin: null,
    // // mfaEnabled removed
    //     passwordExpiry: "2024-09-30T23:59:59Z",
    //     failedLoginAttempts: 0,
    //     createdAt: "2024-08-01T00:00:00Z",
    //     updatedAt: "2024-08-01T00:00:00Z",
    //   },
    //   {
    //     id: "4",
    //     name: "David Kim",
    //     email: "david.kim@polwel.com",
    //     role: "POLWEL",
    //     status: "ACTIVE",
    //     lastLogin: "2024-08-10T09:45:00Z",
    // // mfaEnabled removed
    //     passwordExpiry: "2024-10-31T23:59:59Z",
    //     failedLoginAttempts: 0,
    //     createdAt: "2023-08-20T00:00:00Z",
    //     updatedAt: "2024-08-10T09:45:00Z",
    //   },
  ];

  // Fetch users from API
  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await polwelUsersApi.getAll({
        page: pagination.page,
        limit: perPage,
        search: searchQuery || undefined,
        status: statusFilter || undefined,
      });

      setUsers(response.users || []);
      setPagination(response.pagination || { ...pagination, limit: perPage });

      // Debug: Log the first user to see the data structure
      if (response.users && response.users.length > 0) {
        console.log("PolwelUsers: Sample user data:", response.users[0]);
        console.log("PolwelUsers: User ID type:", typeof response.users[0].id, "Value:", response.users[0].id);
      }
    } catch (error) {
      console.error("Error fetching POLWEL users:", error);

      // Check if it's an authentication error
      if (error instanceof Error) {
        if (error.message.includes("Session expired") || error.message.includes("Authentication") || error.message.includes("TOKEN_EXPIRED")) {
          console.log("Authentication error detected, user will be redirected to login");
          // Don't set dummy data for auth errors - let auth service handle redirect
          setLoading(false);
          return;
        }
      }

      // Use dummy data only for non-authentication errors
      setUsers(dummyUsers);
      setPagination({
        page: 1,
        limit: 10,
        total: dummyUsers.length,
        totalPages: 1,
      });
    } finally {
      setLoading(false);
    }
  };

  // Fetch users on component mount and when filters change
  useEffect(() => {
    fetchUsers();
  }, [pagination.page, searchQuery, statusFilter]);

  useEffect(() => {
    // refetch when perPage changes; reset to page 1
    setPagination((p) => ({ ...p, page: 1 }));
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [perPage]);

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
      console.error("Error deleting user:", error);
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
      console.error("Error resetting password:", error);
    }
  };

  const handleStatusChange = async (userId: string, currentStatus: string, newStatus: "ACTIVE" | "INACTIVE") => {
    if (!confirm(`Are you sure you want to change the status to ${newStatus}?`)) {
      return;
    }

    try {
      await polwelUsersApi.updateStatus(userId, newStatus);
      toast({
        title: "Success",
        description: `User status changed to ${newStatus}`,
      });
      fetchUsers(); // Refresh the list
    } catch (error) {
      console.error("Error updating user status:", error);
      toast({
        title: "Error",
        description: "Failed to update user status",
        variant: "destructive",
      });
    }
  };

  const handleResendSetup = async (userId: string, userName: string) => {
    if (!confirm(`Are you sure you want to resend the setup email to ${userName}?`)) {
      return;
    }

    try {
      const response = await polwelUsersApi.resendSetup(userId);
      toast({
        title: "Setup Email Sent",
        description: "Setup email has been sent successfully",
      });
    } catch (error) {
      console.error("Error resending setup email:", error);
      toast({
        title: "Error",
        description: "Failed to send setup email",
        variant: "destructive",
      });
    }
  };

  const handleExport = async () => {
    try {
      setExporting(true);
      const response = await polwelUsersApi.getAll({
        search: searchQuery || undefined,
        status: statusFilter || undefined,
        all: true,
      });

      const dataset: PolwelUser[] = response.users || [];
      const rows = dataset.map((u) => ({
        Name: u.name,
        Email: u.email,
        Status: u.status,
        LastLogin: u.lastLogin ? formatDate(u.lastLogin) : "Never",
        CreatedAt: formatDate(u.createdAt),
        UpdatedAt: formatDate(u.updatedAt),
      }));

      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "POLWEL_Users");
      XLSX.writeFile(wb, "polwel_users.xlsx");
      toast({ title: "Exported", description: `Exported ${rows.length} POLWEL user${rows.length === 1 ? "" : "s"}.` });
    } catch (error) {
      console.error("Error exporting POLWEL users:", error);
      toast({
        title: "Export failed",
        description: "We couldn't export the POLWEL users. Please try again.",
        variant: "destructive",
      });
    } finally {
      setExporting(false);
    }
  };

  // Compute stats from real data
  const totalUsers = users.length;
  const activeUsers = users.filter((user) => user.status === "ACTIVE").length;
  const pendingUsers = users.filter((user) => user.status === "PENDING").length;
  const inactiveUsers = users.filter((user) => user.status === "INACTIVE").length;

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
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExport} disabled={exporting}>
            {exporting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
            {exporting ? "Exporting..." : "Export"}
          </Button>
          <Button variant="outline" size="sm" onClick={() => setFilterOpen((o) => !o)}>
            <Filter className="h-4 w-4 mr-2" />
            {filterOpen ? "Hide Filters" : "Filter"}
          </Button>
          <AddPolwelUserDialog />
        </div>
      </div>
      {filterOpen && (
        <Card className="border-dashed">
          <CardContent className="pt-6">
            <div className="flex flex-wrap items-end gap-4">
              <div>
                <label className="block text-xs font-medium mb-1">Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="h-9 rounded-md border bg-background px-3 py-1 text-sm"
                >
                  <option value="">All</option>
                  <option value="ACTIVE">Active</option>
                  <option value="PENDING">Pending</option>
                  <option value="INACTIVE">Inactive</option>
                  <option value="LOCKED">Locked</option>
                </select>
              </div>
              {statusFilter && (
                <Button type="button" variant="ghost" size="sm" onClick={() => setStatusFilter("")} className="text-xs">
                  <X className="h-3 w-3 mr-1" /> Clear
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total POLWEL Staff</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalUsers}</div>
            <p className="text-xs text-muted-foreground">Active staff members with system access</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeUsers}</div>
            <p className="text-xs text-muted-foreground">Currently active and authorized</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Accounts</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingUsers}</div>
            <p className="text-xs text-muted-foreground">Awaiting activation or verification</p>
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
                {/* department and permission level removed */}
                <TableHead>Status</TableHead>
                <TableHead>Last Login</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.name}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  {/* department and permission level removed */}
                  <TableCell>
                    <Badge variant={user.status === "ACTIVE" ? "default" : user.status === "PENDING" ? "outline" : "secondary"}>{user.status}</Badge>
                  </TableCell>
                  {/* MFA removed */}
                  <TableCell>
                    {user.lastLogin
                      ? (() => {
                          try {
                            const d = parseISO(user.lastLogin as string);
                            return format(d, "dd/MM/yyyy");
                          } catch (e) {
                            // Fallback to toLocaleDateString if parse fails
                            try {
                              return formatDate(user.lastLogin);
                            } catch (ee) {
                              return "Invalid date";
                            }
                          }
                        })()
                      : "Never"}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <EditPolwelUserDialog user={user} onUserUpdated={fetchUsers} />
                      <SafeDropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" onMouseDown={(e) => e.preventDefault()}>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <ViewDetailsDialog
                            userId={user.id}
                            userName={user.name}
                            trigger={
                              <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                <Eye className="h-4 w-4 mr-2" />
                                View Details
                              </DropdownMenuItem>
                            }
                          />
                          <AuditTrailDialog userId={user.id} userName={user.name} userEmail={user.email}>
                            <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                              <History className="h-4 w-4 mr-2" />
                              View Audit Trail
                            </DropdownMenuItem>
                          </AuditTrailDialog>
                          <PasswordResetDialog
                            userId={user.id}
                            userName={user.name}
                            userEmail={user.email}
                            trigger={
                              <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                <Mail className="h-4 w-4 mr-2" />
                                Send Password Reset Link
                              </DropdownMenuItem>
                            }
                          />
                          {/* <DropdownMenuItem onClick={() => handleResetPassword(user.id)}>
                            <Key className="h-4 w-4 mr-2" />
                            Reset Password (Legacy)
                          </DropdownMenuItem> */}
                          {user.status === "PENDING" && (
                            <DropdownMenuItem onClick={() => handleResendSetup(user.id, user.name)}>
                              <RefreshCw className="h-4 w-4 mr-2" />
                              Resend Onboarding Email
                            </DropdownMenuItem>
                          )}
                          {(user.status === "ACTIVE" || user.status === "INACTIVE") && (
                            <>
                              {user.status === "ACTIVE" && (
                                <DropdownMenuItem onClick={() => handleStatusChange(user.id, user.status, "INACTIVE")}>
                                  <Lock className="h-4 w-4 mr-2" />
                                  Deactivate User
                                </DropdownMenuItem>
                              )}
                              {user.status === "INACTIVE" && (
                                <DropdownMenuItem onClick={() => handleStatusChange(user.id, user.status, "ACTIVE")}>
                                  <Unlock className="h-4 w-4 mr-2" />
                                  Activate User
                                </DropdownMenuItem>
                              )}
                            </>
                          )}
                          {/* MFA toggle removed */}
                          <DropdownMenuItem onClick={() => handleDeleteUser(user.id)} className="text-destructive">
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete User
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </SafeDropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {/* Pagination controls - moved to bottom of table for better UX */}
          <div className="px-4 border-t mt-4">
            <PaginationControls
              page={pagination.page}
              perPage={perPage}
              total={pagination.total}
              onPageChange={(p) => setPagination((prev) => ({ ...prev, page: p }))}
              onPerPageChange={(pp) => setPerPage(pp)}
            />
          </div>

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
