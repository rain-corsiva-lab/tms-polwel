import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff, UserPlus, CheckCircle, XCircle, Loader2, FileText, Shield } from "lucide-react";

interface SetupResponse {
  success: boolean;
  message: string;
  user?: {
    name: string;
    email: string;
  };
}

const CompleteSetup = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [isVerifying, setIsVerifying] = useState(true);
  const [isValid, setIsValid] = useState(false);
  const [userInfo, setUserInfo] = useState<{ name: string; email: string } | null>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState("");
  const [showTermsDialog, setShowTermsDialog] = useState(false);
  const [showPrivacyDialog, setShowPrivacyDialog] = useState(false);

  // Password validation
  const passwordRequirements = [
    { test: (pwd: string) => pwd.length >= 8, text: "At least 8 characters" },
    { test: (pwd: string) => /[A-Z]/.test(pwd), text: "One uppercase letter" },
    { test: (pwd: string) => /[a-z]/.test(pwd), text: "One lowercase letter" },
    { test: (pwd: string) => /\d/.test(pwd), text: "One number" },
    { test: (pwd: string) => /[!@#$%^&*(),.?":{}|<>]/.test(pwd), text: "One special character" },
  ];

  const isPasswordValid = passwordRequirements.every(req => req.test(password));
  const doPasswordsMatch = password === confirmPassword && password.length > 0;
  const isFormValid = isPasswordValid && doPasswordsMatch && termsAccepted && privacyAccepted;

  // Verify token on component mount
  useEffect(() => {
    const verifyToken = async () => {
      if (!token) {
        setError("Setup token is missing");
        setIsVerifying(false);
        return;
      }

      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/user-setup/verify-token/${token}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        const data: SetupResponse = await response.json();

        if (data.success && data.user) {
          setIsValid(true);
          setUserInfo(data.user);
        } else {
          setError(data.message || "Invalid or expired setup token");
        }
      } catch (err) {
        console.error('Token verification error:', err);
        setError("Failed to verify setup token. Please try again.");
      } finally {
        setIsVerifying(false);
      }
    };

    verifyToken();
  }, [token]);

  const handleSetupComplete = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isFormValid) {
      setError("Please complete all required fields");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/user-setup/complete-setup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          password,
          termsAccepted,
          privacyAccepted,
        }),
      });

      const data: SetupResponse = await response.json();

      if (data.success) {
        setIsSuccess(true);
        toast({
          title: "Setup Complete!",
          description: "Your account has been activated successfully. You can now log in.",
        });
        
        // Redirect to login after 3 seconds
        setTimeout(() => {
          navigate('/login');
        }, 3000);
      } else {
        setError(data.message || "Failed to complete setup");
      }
    } catch (err) {
      console.error('Setup completion error:', err);
      setError("Failed to complete setup. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Loading state
  if (isVerifying) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardContent className="p-6">
            <div className="flex flex-col items-center space-y-4">
              <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
              <p className="text-sm text-muted-foreground">Verifying setup token...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Invalid token state
  if (!isValid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-red-100 flex items-center justify-center">
              <XCircle className="h-6 w-6 text-red-600" />
            </div>
            <CardTitle className="text-xl text-red-600">Invalid Setup Link</CardTitle>
            <CardDescription>
              {error || "This setup link is invalid or has expired."}
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-sm text-muted-foreground mb-4">
              Please contact your administrator to get a new setup link.
            </p>
            <Button onClick={() => navigate('/login')} className="w-full">
              Return to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Success state
  if (isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <CardTitle className="text-xl text-green-600">Setup Complete!</CardTitle>
            <CardDescription>
              Welcome to POLWEL! Your account has been activated successfully.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <p className="text-sm text-green-800">
                You can now log in with your email and the password you just created.
              </p>
            </div>
            <Button onClick={() => navigate('/login')} className="w-full">
              Continue to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Setup form
  return (
    <>
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="w-full max-w-lg">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-orange-100 flex items-center justify-center">
              <UserPlus className="h-6 w-6 text-orange-600" />
            </div>
            <CardTitle className="text-xl">Complete Your Account Setup</CardTitle>
            <CardDescription>
              Welcome <strong>{userInfo?.name}</strong>! Complete your POLWEL account setup.
              <br />
              <span className="text-sm text-muted-foreground">{userInfo?.email}</span>
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSetupComplete} className="space-y-6">
              {error && (
                <Alert variant="destructive">
                  <XCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* New Password Field */}
              <div className="space-y-2">
                <Label htmlFor="password">Create Password *</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Create a strong password"
                    className="pr-10"
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-gray-400" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-400" />
                    )}
                  </Button>
                </div>

                {/* Password Requirements */}
                {password && (
                  <div className="mt-2 space-y-1">
                    {passwordRequirements.map((req, index) => (
                      <div key={index} className="flex items-center text-xs">
                        {req.test(password) ? (
                          <CheckCircle className="h-3 w-3 text-green-500 mr-2" />
                        ) : (
                          <XCircle className="h-3 w-3 text-red-500 mr-2" />
                        )}
                        <span className={req.test(password) ? "text-green-600" : "text-red-600"}>
                          {req.text}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Confirm Password Field */}
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password *</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm your password"
                    className="pr-10"
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4 text-gray-400" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-400" />
                    )}
                  </Button>
                </div>

                {/* Password Match Indicator */}
                {confirmPassword && (
                  <div className="flex items-center text-xs mt-2">
                    {doPasswordsMatch ? (
                      <>
                        <CheckCircle className="h-3 w-3 text-green-500 mr-2" />
                        <span className="text-green-600">Passwords match</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="h-3 w-3 text-red-500 mr-2" />
                        <span className="text-red-600">Passwords do not match</span>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Terms & Conditions Checkbox */}
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="terms"
                    checked={termsAccepted}
                    onCheckedChange={(checked) => setTermsAccepted(checked === true)}
                  />
                  <label htmlFor="terms" className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    I agree to the{" "}
                    <Button
                      type="button"
                      variant="link"
                      className="p-0 h-auto text-orange-600 hover:text-orange-700"
                      onClick={() => setShowTermsDialog(true)}
                    >
                      Terms & Conditions
                    </Button>{" "}
                    *
                  </label>
                </div>

                {/* Privacy Policy Checkbox */}
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="privacy"
                    checked={privacyAccepted}
                    onCheckedChange={(checked) => setPrivacyAccepted(checked === true)}
                  />
                  <label htmlFor="privacy" className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    I agree to the{" "}
                    <Button
                      type="button"
                      variant="link"
                      className="p-0 h-auto text-orange-600 hover:text-orange-700"
                      onClick={() => setShowPrivacyDialog(true)}
                    >
                      Privacy Policy
                    </Button>{" "}
                    *
                  </label>
                </div>
              </div>

              {/* Submit Button */}
              <Button 
                type="submit" 
                className="w-full bg-orange-500 hover:bg-orange-600"
                disabled={!isFormValid || isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Completing Setup...
                  </>
                ) : (
                  <>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Complete Setup
                  </>
                )}
              </Button>
            </form>

            {/* Back to Login Link */}
            <div className="mt-6 text-center">
              <Button variant="ghost" onClick={() => navigate('/login')}>
                Already have an account? Sign in
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Terms & Conditions Dialog */}
      <Dialog open={showTermsDialog} onOpenChange={setShowTermsDialog}>
        <DialogContent className="max-w-3xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Terms & Conditions
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-[60vh] pr-4">
            <div className="space-y-4 text-sm">
              <h3 className="font-semibold text-lg">POLWEL Training Management System - Terms & Conditions</h3>
              
              <div>
                <h4 className="font-semibold mb-2">1. Acceptance of Terms</h4>
                <p>By accessing and using the POLWEL Training Management System ("the System"), you agree to be bound by these Terms & Conditions. If you do not agree to these terms, please do not use the System.</p>
              </div>

              <div>
                <h4 className="font-semibold mb-2">2. System Usage</h4>
                <p>The POLWEL Training Management System is designed for authorized users to manage training programs, courses, venues, and related administrative functions. Users must:</p>
                <ul className="list-disc pl-5 mt-2 space-y-1">
                  <li>Use the system only for legitimate business purposes</li>
                  <li>Maintain the confidentiality of login credentials</li>
                  <li>Not attempt to gain unauthorized access to system functions</li>
                  <li>Report security incidents immediately</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold mb-2">3. User Responsibilities</h4>
                <p>Users are responsible for:</p>
                <ul className="list-disc pl-5 mt-2 space-y-1">
                  <li>Ensuring accuracy of data entered into the system</li>
                  <li>Protecting sensitive information in accordance with privacy policies</li>
                  <li>Using the system in compliance with applicable laws and regulations</li>
                  <li>Immediately notifying administrators of any suspected unauthorized access</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold mb-2">4. Data Protection</h4>
                <p>POLWEL is committed to protecting user data. All personal and training information is handled in accordance with applicable data protection laws and our Privacy Policy.</p>
              </div>

              <div>
                <h4 className="font-semibold mb-2">5. System Availability</h4>
                <p>While we strive to maintain system availability, POLWEL does not guarantee uninterrupted access. Scheduled maintenance may occur with prior notice when possible.</p>
              </div>

              <div>
                <h4 className="font-semibold mb-2">6. Intellectual Property</h4>
                <p>The POLWEL Training Management System, including its design, functionality, and content, is the property of POLWEL. Users may not reproduce, distribute, or create derivative works without written permission.</p>
              </div>

              <div>
                <h4 className="font-semibold mb-2">7. Limitation of Liability</h4>
                <p>POLWEL shall not be liable for any indirect, incidental, or consequential damages arising from the use or inability to use the system.</p>
              </div>

              <div>
                <h4 className="font-semibold mb-2">8. Modifications</h4>
                <p>POLWEL reserves the right to modify these terms at any time. Users will be notified of significant changes and continued use constitutes acceptance of modified terms.</p>
              </div>

              <div>
                <h4 className="font-semibold mb-2">9. Contact Information</h4>
                <p>For questions regarding these Terms & Conditions, please contact the POLWEL system administrators.</p>
              </div>

              <div className="mt-6 pt-4 border-t">
                <p className="text-xs text-muted-foreground">Last updated: {new Date().toLocaleDateString()}</p>
              </div>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Privacy Policy Dialog */}
      <Dialog open={showPrivacyDialog} onOpenChange={setShowPrivacyDialog}>
        <DialogContent className="max-w-3xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Privacy Policy
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-[60vh] pr-4">
            <div className="space-y-4 text-sm">
              <h3 className="font-semibold text-lg">POLWEL Training Management System - Privacy Policy</h3>
              
              <div>
                <h4 className="font-semibold mb-2">1. Information We Collect</h4>
                <p>We collect the following types of information:</p>
                <ul className="list-disc pl-5 mt-2 space-y-1">
                  <li><strong>Account Information:</strong> Name, email address, role, and organization details</li>
                  <li><strong>Training Data:</strong> Course enrollments, completion records, and performance metrics</li>
                  <li><strong>System Usage:</strong> Login times, feature usage, and system interactions</li>
                  <li><strong>Technical Data:</strong> IP addresses, browser information, and session data</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold mb-2">2. How We Use Your Information</h4>
                <p>Your information is used to:</p>
                <ul className="list-disc pl-5 mt-2 space-y-1">
                  <li>Provide access to the training management system</li>
                  <li>Track training progress and generate reports</li>
                  <li>Communicate important system updates and notifications</li>
                  <li>Ensure system security and prevent unauthorized access</li>
                  <li>Improve system functionality and user experience</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold mb-2">3. Data Sharing and Disclosure</h4>
                <p>We do not sell, trade, or rent your personal information. Information may be shared only:</p>
                <ul className="list-disc pl-5 mt-2 space-y-1">
                  <li>With authorized personnel within your organization</li>
                  <li>When required by law or legal process</li>
                  <li>To protect the security and integrity of the system</li>
                  <li>With your explicit consent</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold mb-2">4. Data Security</h4>
                <p>We implement comprehensive security measures including:</p>
                <ul className="list-disc pl-5 mt-2 space-y-1">
                  <li>Encryption of data in transit and at rest</li>
                  <li>Regular security audits and assessments</li>
                  <li>Access controls and user authentication</li>
                  <li>Continuous monitoring for security threats</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold mb-2">5. Data Retention</h4>
                <p>We retain personal data only as long as necessary for the purposes outlined in this policy or as required by law. Training records may be retained for regulatory compliance purposes.</p>
              </div>

              <div>
                <h4 className="font-semibold mb-2">6. Your Rights</h4>
                <p>You have the right to:</p>
                <ul className="list-disc pl-5 mt-2 space-y-1">
                  <li>Access your personal information</li>
                  <li>Request corrections to inaccurate data</li>
                  <li>Request deletion of your data (subject to legal requirements)</li>
                  <li>Opt-out of non-essential communications</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold mb-2">7. Cookies and Tracking</h4>
                <p>We use cookies and similar technologies to maintain user sessions, remember preferences, and analyze system usage for improvement purposes.</p>
              </div>

              <div>
                <h4 className="font-semibold mb-2">8. Changes to Privacy Policy</h4>
                <p>We may update this privacy policy from time to time. Users will be notified of significant changes, and continued use of the system constitutes acceptance of the updated policy.</p>
              </div>

              <div>
                <h4 className="font-semibold mb-2">9. Contact Us</h4>
                <p>If you have questions about this Privacy Policy or how your data is handled, please contact our data protection team.</p>
              </div>

              <div className="mt-6 pt-4 border-t">
                <p className="text-xs text-muted-foreground">Last updated: {new Date().toLocaleDateString()}</p>
              </div>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default CompleteSetup;
