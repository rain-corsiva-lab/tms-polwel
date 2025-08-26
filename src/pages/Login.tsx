import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { UserCheck, Loader2, AlertCircle } from "lucide-react";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const navigate = useNavigate();
  const location = useLocation();

  // Mock login function
  const login = async (email: string, password: string, rememberMe?: boolean) => {
    return Promise.resolve();
  };
  
  // Redirect to intended page after login or dashboard as default
  const from = location.state?.from?.pathname || "/";

  // Mock auth check - redirect immediately for demo
  useEffect(() => {
    navigate(from, { replace: true });
  }, [navigate, from]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      setError("Please enter both email and password");
      return;
    }

    setLoading(true);
    setError("");

    try {
      await login(email, password, rememberMe);
      // Navigation will be handled by the useEffect above
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Login failed";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Pre-fill with test credentials for development
  const fillTestCredentials = (role: string) => {
    const testAccounts = {
      admin: { email: "john.tan@polwel.org", password: "password123" },
      coordinator: { email: "mary.lim@spf.gov.sg", password: "password123" },
      trainer: { email: "david.chen@training.com", password: "password123" },
      learner: { email: "raj.kumar@spf.gov.sg", password: "password123" },
    };

    const account = testAccounts[role as keyof typeof testAccounts];
    if (account) {
      setEmail(account.email);
      setPassword(account.password);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/20">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-foreground">Welcome</h1>
          <p className="text-muted-foreground">Please enter your credentials to continue</p>
        </div>

        <Card className="transition-all duration-200 hover:shadow-md">
          <CardHeader className="text-center pb-4">
            <UserCheck className="w-12 h-12 mx-auto text-primary mb-2" />
            <CardTitle className="text-lg">Login</CardTitle>
            <CardDescription>
              Access your training portal
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0 space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input 
                  id="email" 
                  type="email" 
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input 
                  id="password" 
                  type="password" 
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  required
                />
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="remember"
                  checked={rememberMe}
                  onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                  disabled={loading}
                />
                <Label htmlFor="remember" className="text-sm font-normal">
                  Remember me for 7 days
                </Label>
              </div>

              <Button 
                className="w-full" 
                type="submit" 
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  "Login"
                )}
              </Button>
            </form>

            {/* Development Test Accounts */}
            {process.env.NODE_ENV === 'development' && (
              <div className="pt-4 border-t">
                <p className="text-xs text-muted-foreground mb-2">Quick Test Accounts:</p>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fillTestCredentials('admin')}
                    disabled={loading}
                  >
                    Admin
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fillTestCredentials('coordinator')}
                    disabled={loading}
                  >
                    Coordinator
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fillTestCredentials('trainer')}
                    disabled={loading}
                  >
                    Trainer
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fillTestCredentials('learner')}
                    disabled={loading}
                  >
                    Learner
                  </Button>
                </div>
              </div>
            )}
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