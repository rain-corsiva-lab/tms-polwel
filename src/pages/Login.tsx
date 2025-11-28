import { useState, useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { UserCheck, Loader2, AlertCircle, MailCheck, Clock, RefreshCw } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import type { AuthResponse } from "@/lib/auth";
import { toast } from "sonner";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showMfaForm, setShowMfaForm] = useState(false);
  const [mfaCode, setMfaCode] = useState("");
  const [mfaError, setMfaError] = useState("");
  const [mfaSubmitting, setMfaSubmitting] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [attemptsRemaining, setAttemptsRemaining] = useState<number | null>(null);
  const [timers, setTimers] = useState({ expiry: 0, resend: 0 });
  const [submittedChallengeId, setSubmittedChallengeId] = useState<string | null>(null);

  const { login, isAuthenticated, pendingMfa, setPendingMfa, verifyMfaCode, resendMfaCode } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Redirect to intended page after login or dashboard as default
  const from = location.state?.from?.pathname || "/";

  // If already authenticated, redirect
  useEffect(() => {
    if (isAuthenticated && !pendingMfa) {
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, pendingMfa, navigate, from]);

  useEffect(() => {
    if (!pendingMfa) {
      setShowMfaForm(false);
      setMfaCode("");
      setMfaError("");
      setAttemptsRemaining(null);
      setSubmittedChallengeId(null);
      setTimers({ expiry: 0, resend: 0 });
      return;
    }

    setShowMfaForm(true);

    if (pendingMfa.challengeId !== submittedChallengeId) {
      setSubmittedChallengeId(pendingMfa.challengeId);
      setMfaCode("");
      setMfaError("");
      setAttemptsRemaining(null);
      toast.info(`We've sent a verification code to ${pendingMfa.maskedEmail}.`);
    }
  }, [pendingMfa, submittedChallengeId]);

  useEffect(() => {
    if (!pendingMfa) {
      return;
    }

    const computeSeconds = (timestamp?: string) => {
      if (!timestamp) return 0;
      const target = new Date(timestamp).getTime();
      if (Number.isNaN(target)) return 0;
      const diff = Math.floor((target - Date.now()) / 1000);
      return diff > 0 ? diff : 0;
    };

    const updateTimers = () => {
      setTimers({
        expiry: computeSeconds(pendingMfa.expiresAt),
        resend: computeSeconds(pendingMfa.resendAvailableAt),
      });
    };

    updateTimers();
    const interval = window.setInterval(updateTimers, 1000);
    return () => window.clearInterval(interval);
  }, [pendingMfa]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      setError("Please enter both email and password");
      return;
    }

    setLoading(true);
    setError("");
    setMfaError("");

    try {
      const result = await login(email, password, rememberMe);

      if ("mfaRequired" in result && result.mfaRequired) {
        setMfaCode("");
        setAttemptsRemaining(null);
        return;
      }

      const success = result as AuthResponse;

      if (success.user.role === "TRAINING_COORDINATOR" && success.user.organizationId) {
        navigate("/org", { replace: true });
        return;
      }
      // Other roles handled by redirect effect
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Login failed";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const formatCountdown = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, "0")}`;
  };

  const resetMfaFlow = (message?: string) => {
    setPendingMfa(null);
    setShowMfaForm(false);
    setMfaCode("");
    setMfaError(message || "");
    setAttemptsRemaining(null);
    setTimers({ expiry: 0, resend: 0 });
    if (message) {
      setError(message);
    }
  };

  const handleVerifyMfa = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!pendingMfa) {
      setMfaError("No verification challenge is active. Please login again.");
      return;
    }

    if (!mfaCode.trim()) {
      setMfaError("Please enter the verification code.");
      return;
    }

    if (timers.expiry === 0) {
      resetMfaFlow("Your verification code has expired. Please login again.");
      return;
    }

    setMfaSubmitting(true);
    setMfaError("");
    setAttemptsRemaining(null);

    try {
      const result = await verifyMfaCode(mfaCode.trim());
      const success = result as AuthResponse;
      setMfaCode("");
      if (success.user.role === "TRAINING_COORDINATOR" && success.user.organizationId) {
        navigate("/org", { replace: true });
      }
    } catch (err: any) {
      const message = err instanceof Error ? err.message : "Verification failed";
      setMfaError(message);

      if (typeof err?.attemptsRemaining === "number") {
        setAttemptsRemaining(err.attemptsRemaining);
      }

      if (err?.code === "MFA_EXPIRED" || err?.code === "MFA_NOT_FOUND" || err?.code === "MFA_LOCKED") {
        resetMfaFlow(message);
      }
    } finally {
      setMfaSubmitting(false);
    }
  };

  const handleResendCode = async () => {
    if (!pendingMfa) {
      setMfaError("No verification challenge is active. Please login again.");
      return;
    }

    setResendLoading(true);
    setMfaError("");
    setAttemptsRemaining(null);

    try {
      await resendMfaCode();
      setMfaCode("");
      toast.success("A new verification code has been sent to your email.");
    } catch (err: any) {
      const message = err instanceof Error ? err.message : "Unable to resend verification code";
      setMfaError(message);

      if (err?.code === "MFA_EXPIRED" || err?.code === "MFA_NOT_FOUND" || err?.code === "MFA_LOCKED") {
        resetMfaFlow(message);
      }

      if (err?.nextAllowedAt) {
        const target = new Date(err.nextAllowedAt).getTime();
        if (!Number.isNaN(target)) {
          const diff = Math.max(0, Math.floor((target - Date.now()) / 1000));
          setTimers((prev) => ({ ...prev, resend: diff }));
        }
      }
    } finally {
      setResendLoading(false);
    }
  };

  const handleUseDifferentAccount = () => {
    resetMfaFlow();
    setEmail("");
    setPassword("");
    setRememberMe(false);
  };

  // Pre-fill with test credentials for development
  const fillTestCredentials = (role: string) => {
    const testAccounts = {
      admin: { email: "kukuhthewow@gmail.com", password: "password123" },
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

  const activeChallenge = showMfaForm && pendingMfa ? pendingMfa : null;
  const isResendDisabled = resendLoading || !activeChallenge || timers.resend > 0;
  const isCodeExpired = activeChallenge ? timers.expiry === 0 : false;

  const renderLoginCard = () => (
    <Card className="transition-all duration-200 hover:shadow-md">
      <CardHeader className="text-center pb-4">
        <UserCheck className="w-12 h-12 mx-auto text-primary mb-2" />
        <CardTitle className="text-lg">Login</CardTitle>
        <CardDescription>Access your training portal</CardDescription>
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

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Checkbox id="remember" checked={rememberMe} onCheckedChange={(checked) => setRememberMe(checked as boolean)} disabled={loading} />
              <Label htmlFor="remember" className="text-sm font-normal">
                Remember me for 7 days
              </Label>
            </div>
            <Link to="/forgot-password" className="text-sm text-primary hover:underline">
              Forgot password?
            </Link>
          </div>

          <Button className="w-full" type="submit" disabled={loading}>
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

        {process.env.NODE_ENV === "development" && (
          <div className="pt-4 border-t">
            <p className="text-xs text-muted-foreground mb-2">Quick Test Accounts:</p>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" size="sm" onClick={() => fillTestCredentials("admin")} disabled={loading}>
                Admin
              </Button>
              <Button variant="outline" size="sm" onClick={() => fillTestCredentials("coordinator")} disabled={loading}>
                Coordinator
              </Button>
              <Button variant="outline" size="sm" onClick={() => fillTestCredentials("trainer")} disabled={loading}>
                Trainer
              </Button>
              <Button variant="outline" size="sm" onClick={() => fillTestCredentials("learner")} disabled={loading}>
                Learner
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );

  const renderMfaCard = () => {
    if (!activeChallenge) return null;

    return (
      <Card className="transition-all duration-200 hover:shadow-md">
        <CardHeader className="pb-4 space-y-2 text-center">
          <MailCheck className="w-12 h-12 mx-auto text-primary" />
          <CardTitle className="text-lg">Verify your identity</CardTitle>
          <CardDescription>
            Enter the 6-digit code we sent to <span className="font-medium">{activeChallenge.maskedEmail}</span>
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0 space-y-4">
          {mfaError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{mfaError}</AlertDescription>
            </Alert>
          )}

          {attemptsRemaining !== null && attemptsRemaining <= 2 && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Incorrect code. You have {attemptsRemaining} attempt{attemptsRemaining === 1 ? "" : "s"} remaining before the login is locked.
              </AlertDescription>
            </Alert>
          )}

          <div className="grid gap-3 rounded-lg border border-border/70 bg-muted/40 p-3 text-sm">
            <div className="flex items-center gap-2">
              <MailCheck className="h-4 w-4 text-primary" />
              <span>
                Sent to: <span className="font-medium">{activeChallenge.maskedEmail}</span>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              <span>{isCodeExpired ? "Code expired" : `Code expires in ${formatCountdown(timers.expiry)}`}</span>
            </div>
            <div className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4 text-primary" />
              <span>
                {isCodeExpired
                  ? "Request a new login to continue"
                  : isResendDisabled
                  ? `Resend available in ${formatCountdown(timers.resend)}`
                  : "You can resend a new code now"}
              </span>
            </div>
          </div>

          <form onSubmit={handleVerifyMfa} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="mfaCode">Verification code</Label>
              <Input
                id="mfaCode"
                inputMode="numeric"
                pattern="[0-9]*"
                autoComplete="one-time-code"
                maxLength={6}
                placeholder="Enter 6-digit code"
                value={mfaCode}
                onChange={(e) => setMfaCode(e.target.value.replace(/[^0-9]/g, "").slice(0, 6))}
                disabled={mfaSubmitting || isCodeExpired}
                required
              />
            </div>

            <Button className="w-full" type="submit" disabled={mfaSubmitting || mfaCode.trim().length !== 6 || isCodeExpired}>
              {mfaSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                "Verify and continue"
              )}
            </Button>
          </form>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <Button type="button" variant="ghost" onClick={handleUseDifferentAccount} disabled={mfaSubmitting || resendLoading}>
              Use a different account
            </Button>
            <Button type="button" variant="outline" onClick={handleResendCode} disabled={isResendDisabled || isCodeExpired}>
              {resendLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Resend code
                  {timers.resend > 0 && !isCodeExpired ? ` (${formatCountdown(timers.resend)})` : ""}
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/20">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-foreground">Welcome</h1>
          <p className="text-muted-foreground">{activeChallenge ? "Enter the verification code to continue" : "Please enter your credentials to continue"}</p>
        </div>

        {activeChallenge ? renderMfaCard() : renderLoginCard()}

        <div className="text-center text-sm text-muted-foreground">Need help? Contact your system administrator</div>
      </div>
    </div>
  );
};

export default Login;
