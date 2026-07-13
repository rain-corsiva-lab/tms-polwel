import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Mail, ArrowLeft, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import AuthLayout from "@/components/AuthLayout";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email) {
      setError("Please enter your email address");
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("Please enter a valid email address");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/password-reset/forgot-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        setIsSuccess(true);
      } else {
        setError(data.message || "Failed to process request. Please try again.");
      }
    } catch (err) {
      console.error("Forgot password error:", err);
      setError("Failed to connect to server. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Success state
  if (isSuccess) {
    return (
      <AuthLayout>
        <Card className="transition-all duration-200 hover:shadow-md w-full max-w-md">
          <CardHeader className="text-center pb-4">
            <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <CardTitle className="text-lg">Check Your Email</CardTitle>
            <CardDescription>
              If an account with <span className="font-medium">{email}</span> exists, we've sent a password reset link.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0 space-y-4">
            <Alert>
              <Mail className="h-4 w-4" />
              <AlertDescription>
                The reset link will expire in <span className="font-semibold">1 hour</span>. Please check your spam folder if you don't see the email.
              </AlertDescription>
            </Alert>

            <div className="space-y-3">
              <Button onClick={() => navigate("/login")} className="w-full">
                Return to Login
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  setIsSuccess(false);
                  setEmail("");
                }}
              >
                Try Different Email
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="text-center text-sm text-muted-foreground">
          Need help? Please contact PDCS at{" "}
          <a href="mailto:pdcs@polwel.org.sg" className="text-primary hover:underline">
            pdcs@polwel.org.sg
          </a>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <Card className="transition-all duration-200 hover:shadow-md w-full max-w-md">
        <CardHeader className="text-center pb-4">
          <div className="mx-auto mb-2 h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Mail className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-lg">Reset Password</CardTitle>
          <CardDescription>We'll send you a link to reset your password</CardDescription>
        </CardHeader>
        <CardContent className="pt-0 space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form method="post" autoComplete="off" onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isSubmitting}
                required
                autoFocus
                autoComplete="off"
              />
            </div>

            <Button className="w-full" type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Mail className="mr-2 h-4 w-4" />
                  Send Reset Link
                </>
              )}
            </Button>
          </form>

          <div className="text-center">
            <Link to="/login" className="inline-flex items-center text-sm text-muted-foreground hover:text-primary transition-colors">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Login
            </Link>
          </div>
        </CardContent>
      </Card>
    </AuthLayout>
  );
};

export default ForgotPassword;
