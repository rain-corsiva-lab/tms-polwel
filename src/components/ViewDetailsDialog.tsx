import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Eye, Calendar, Mail, Shield, Clock, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { polwelUsersApi } from "@/lib/api";

interface PolwelUserDetails {
  id: number;
  name: string;
  email: string;
  status: 'active' | 'inactive';
  lastLogin: string | null;
  passwordExpiry: string | null;
  failedLoginAttempts: number;
  lockedUntil: string | null;
  createdAt: string;
  updatedAt: string;
  permissions: string[];
}

interface ViewDetailsDialogProps {
  userId: string | number;
  userName: string;
  trigger?: React.ReactNode;
}

export function ViewDetailsDialog({ userId, userName, trigger }: ViewDetailsDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [userDetails, setUserDetails] = useState<PolwelUserDetails | null>(null);
  const { toast } = useToast();

  const fetchUserDetails = async () => {
    setLoading(true);
    try {
      console.log('ViewDetailsDialog: Fetching details for userId:', userId, 'type:', typeof userId);
      
      if (!userId || userId === 'undefined' || userId === 'null') {
        throw new Error('Invalid user ID');
      }
      
      const response = await polwelUsersApi.getDetails(userId);
      console.log('ViewDetailsDialog: Response received:', response);
      setUserDetails(response);
    } catch (error) {
      console.error('Error fetching user details:', error);
      toast({
        title: "Error",
        description: "Failed to load user details",
        variant: "destructive",
      });
      setUserDetails(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchUserDetails();
    }
  }, [open, userId]);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleString();
  };

  const getStatusBadge = (status: string) => {
    const variant = status === 'active' ? 'default' : 'secondary';
    return (
      <Badge variant={variant} className={status === 'active' ? 'bg-green-500' : ''}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const formatPermissions = (permissions: string[] | any[]) => {
    if (!permissions || !Array.isArray(permissions)) {
      return [];
    }

    const permissionGroups: Record<string, string[]> = {};
    
    permissions.forEach(permission => {
      let permissionString = '';
      
      // Handle different permission formats
      if (typeof permission === 'string') {
        permissionString = permission;
      } else if (permission?.permissionName) {
        // New database format: { permissionName: 'users.view' }
        const [module, action] = permission.permissionName.split('.');
        // Convert to frontend format
        const moduleMapping: Record<string, string> = {
          'users': 'user-management-polwel',
          'trainers': 'user-management-trainers',
          'clients': 'user-management-client-orgs',
          'courses': 'course-management',
          'venues': 'course-venue-setup',
          'bookings': 'booking-management',
          'calendar': 'training-calendar',
          'reports': 'reports-analytics'
        };
        const frontendModule = moduleMapping[module] || module;
        permissionString = `${frontendModule}:${action}`;
      } else if (permission?.permission) {
        // Old database format: { permission: { module: 'xxx', action: 'xxx' } }
        permissionString = `${permission.permission.module}:${permission.permission.action}`;
      } else if (permission?.module && permission?.action) {
        // Direct object format: { module: 'xxx', action: 'xxx' }
        permissionString = `${permission.module}:${permission.action}`;
      } else {
        console.warn('Unknown permission format:', permission);
        return;
      }
      
      const parts = permissionString.split(':');
      if (parts.length !== 2) {
        console.warn('Invalid permission format:', permissionString);
        return;
      }
      
      const [module, action] = parts;
      if (!permissionGroups[module]) {
        permissionGroups[module] = [];
      }
      permissionGroups[module].push(action);
    });

    const moduleDisplayNames: Record<string, string> = {
      'user-management-polwel': 'POLWEL Users',
      'user-management-trainers': 'Trainers & Partners',
      'user-management-client-orgs': 'Client Organisations',
      'course-venue-setup': 'Course & Venue Setup',
      'course-runs-operations': 'Course Runs & Operations',
      'email-reporting-library': 'Email & Reporting',
      'finance-activity': 'Finance & Activity'
    };

    return Object.entries(permissionGroups).map(([module, actions]) => ({
      module: moduleDisplayNames[module] || module,
      actions: actions.map(action => action.charAt(0).toUpperCase() + action.slice(1))
    }));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="sm">
            <Eye className="h-4 w-4 mr-2" />
            View Details
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            User Details - {userName}
          </DialogTitle>
          <DialogDescription>
            Detailed information about this POLWEL user account.
          </DialogDescription>
        </DialogHeader>
        
        {loading ? (
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : userDetails ? (
          <div className="space-y-6">
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Basic Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Full Name</label>
                    <p className="text-sm">{userDetails.name}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Email Address</label>
                    <p className="text-sm flex items-center gap-2">
                      <Mail className="h-3 w-3" />
                      {userDetails.email}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Status</label>
                    <div className="mt-1">
                      {getStatusBadge(userDetails.status)}
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">User ID</label>
                    <p className="text-sm">#{userDetails.id}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Security Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Security Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Last Login</label>
                    <p className="text-sm flex items-center gap-2">
                      <Clock className="h-3 w-3" />
                      {formatDate(userDetails.lastLogin)}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Password Expires</label>
                    <p className="text-sm flex items-center gap-2">
                      <Calendar className="h-3 w-3" />
                      {formatDate(userDetails.passwordExpiry)}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Failed Login Attempts</label>
                    <p className="text-sm">
                      <Badge variant={userDetails.failedLoginAttempts > 0 ? "destructive" : "secondary"}>
                        {userDetails.failedLoginAttempts}
                      </Badge>
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Account Locked Until</label>
                    <p className="text-sm">
                      {userDetails.lockedUntil ? (
                        <Badge variant="destructive">{formatDate(userDetails.lockedUntil)}</Badge>
                      ) : (
                        <Badge variant="secondary">Not Locked</Badge>
                      )}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Permissions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Access Permissions
                </CardTitle>
              </CardHeader>
              <CardContent>
                {userDetails.permissions.length > 0 ? (
                  <div className="space-y-4">
                    {formatPermissions(userDetails.permissions).map(({ module, actions }, index) => (
                      <div key={index} className="border rounded-lg p-3">
                        <h4 className="font-medium text-sm mb-2">{module}</h4>
                        <div className="flex flex-wrap gap-1">
                          {actions.map((action, actionIndex) => (
                            <Badge key={actionIndex} variant="outline" className="text-xs">
                              {action}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">No permissions assigned</p>
                )}
              </CardContent>
            </Card>

            {/* Account Timestamps */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Account History
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Created At</label>
                    <p className="text-sm">{formatDate(userDetails.createdAt)}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Last Updated</label>
                    <p className="text-sm">{formatDate(userDetails.updatedAt)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            Failed to load user details
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
