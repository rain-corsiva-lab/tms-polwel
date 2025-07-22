import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UserCheck, Users, Shield } from "lucide-react";

const Login = () => {
  const handleLogin = (userType: string) => {
    // This would typically redirect to the appropriate login form
    console.log(`Logging in as: ${userType}`);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/20">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-foreground">Welcome</h1>
          <p className="text-muted-foreground">Please select your login type to continue</p>
        </div>

        <Card className="transition-all duration-200 hover:shadow-md">
          <CardHeader className="text-center pb-4">
            <UserCheck className="w-12 h-12 mx-auto text-primary mb-2" />
            <CardTitle className="text-lg">Login</CardTitle>
            <CardDescription>
              Access your training portal
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <Button className="w-full" variant="default" onClick={() => handleLogin('user')}>
              Login
            </Button>
          </CardContent>
        </Card>

        <div className="text-center text-sm text-muted-foreground">
          Need help? Contact your system administrator
        </div>
      </div>
    </div>
  );
};

export default Login;