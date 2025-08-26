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
        const response = await fetch(`${import.meta.env.VITE_API_URL}/user-setup/verify-token/${token}`, {
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
      const response = await fetch(`${import.meta.env.VITE_API_URL}/user-setup/onboarding/`, {
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
          Terms of Use
        </DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-[60vh] pr-4">
        <div className="space-y-4 text-sm">
          <h3 className="font-semibold text-lg">Terms of Use</h3>
          <p>
            Please read the following terms of use carefully (the “Terms”). By accessing and/or using the website, you agree to be bound by the Terms in the manner described in the Terms. If you do not agree to the Terms, you must not access and/or use the website.
          </p>
          <p>
            If you are accessing and/or using the website on behalf of a company or other legal entity, you represent that you have the authority to bind such entity and its affiliates to these Terms, in which case the terms “you” or “your” shall refer to you, the individual, or the entity you represent and its affiliates (and, as applicable, your users). If you do not have such authority or if you do not agree with the Terms, you must not access and/or use the website on behalf of such other entity.
          </p>
          <div>
            <h4 className="font-semibold mb-2">1. Your Use of the website</h4>
            <ol className="list-decimal pl-5 space-y-2">
          <li>
            <span className="font-semibold">1.1.</span> You shall access and/or use the website in accordance with the Terms and all applicable laws / regulations.
          </li>
          <li>
            <span className="font-semibold">1.2.</span> You undertake not to (and shall not, knowingly or otherwise, authorise, allow or assist any third party to):
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>reproduce, transfer, duplicate, copy, sell, resell or exploit any portion of the website, use of the website or access to the website;</li>
              <li>modify or adapt the whole or any part of the website, or permit the website or any part of it to be combined with, or become incorporated in, any other application, programs or other websites /platforms created by you;</li>
              <li>decompile, reverse engineer or otherwise attempt to discover the source code of our website or any components thereof, except under any specific circumstances expressly permitted by us in writing;</li>
              <li>communicate, republish, upload, post, transmit, edit, re-use, rent, lease, loan, sell, assign, transfer, distribute, make available, license, sublicense or create derivative works or adaptations based on the whole or any part of the website;</li>
              <li>use the website in any unlawful manner, for any unlawful purpose, or in any manner inconsistent with the Terms, or in contravention of any applicable law, including in any way that infringes our intellectual property rights or those of any third party in relation to the website;</li>
              <li>use the website in a way that could damage, disable, impair or compromise the website (or the systems or security of the website or any other computer systems or devices used in connection therewith) or interfere with other users or affect the reputation of POLWEL;</li>
              <li>provide, distribute or share, or enable the provision, distribution or sharing of, the website (or any data associated therewith) with any third party;</li>
              <li>reproduce, adapt, republish, translate, publish, display, communicate, hyperlink, post, transmit, broadcast, podcast, webcast, distribute, sell, trade or exploit the whole or any part of the website in any manner or by any means or stored in an information retrieval system except to the extent permitted with our prior written permission and/or that of the relevant rights owner;</li>
              <li>reproduce, display or otherwise provide access to the website on another website or server, for example through framing, mirroring, linking, spidering, scraping or any other technological means (including any technology available in the future), without our prior written permission;</li>
              <li>transmit or introduce any viruses, corrupted files, harmful elements, or any materials during the course of your use of the website that: (i) is unlawful, harmful, threatening, defamatory, obscene, infringing, harassing or racially or ethnically offensive; (ii) facilitates illegal activity; (iii) promotes unlawful violence; or (iv) is otherwise illegal or causes damage or injury to any person or property, and we reserve the right, without liability to or prejudice to our other rights against you, to disable your access to any material that breaches the provisions of this sub-clause, or to terminate or suspend your access to the website;</li>
              <li>establish a link to any page on the website without our prior written permission (which we reserve the right to withdraw without notice), and even if consent is provided, you may only establish a link in a way that is fair and legal and does not damage POLWEL’s reputation or take advantage of it (e.g. by suggesting any association, approval or endorsement on our part where none exists).</li>
            </ul>
          </li>
          <li>
            <span className="font-semibold">1.3.</span> You acknowledge and agree that:
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>
            When using and/or accessing the website, you shall be subject to additional terms and conditions, guidelines and/or rules which are in addition to these Terms and may be posted from time to time on the website. You are required to comply with any such additional terms and conditions in addition to these Terms, and all such guidelines or rules are hereby incorporated by reference into these Terms.
              </li>
              <li>
            Any content or information that you upload to the website will be considered non-proprietary. You hereby grant us a licence to use, store and copy that content and to distribute and make it available to third parties. POLWEL also has the right to disclose your identity to any third party who is claiming any content you posted or uploaded on the website constitutes a violation of their intellectual property rights.
              </li>
              <li>
            POLWEL may establish general practices and limits concerning use of the website. Without prejudice to the generality of Clause 1.5, POLWEL shall not be responsible or liable for the deletion of or failure to store any messages and other communications or other content maintained or transmitted by the website. POLWEL reserves the right to change these general practices and limits at any time, in its sole discretion, with or without notice;
              </li>
              <li>
            POLWEL shall have the right (but not the obligation) to remove or disable access to any content which we deem to be potentially defamatory of any person, unlawful, objectionable in any way, in violation of any third-party rights, or for any reason whatsoever. Any editing or removal of any such content from the website shall be without prejudice to our other rights and remedies available at law;
              </li>
              <li>
            POLWEL shall have the right to at any time and from time to time:
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>(a) switch to another data centre hosting any of the underlying infrastructure, middleware, application software, and application data as determined by POLWEL in its sole and absolute discretion, without ascribing any reasons whatsoever;</li>
              <li>(b) modify and/or update the website and its components from time to time, including to add or remove functionalities, features or services (collectively, “Website Functions”); and</li>
              <li>(c) deny, suspend, withdraw, block and/or restrict access to the website or any Website Functions whether to any user or generally, at any time, including in the event (i) of a violation or alleged violation of these Terms, or (ii) any act or omission by you may cause harm to POLWEL or its affiliates’ brand, reputation or business, as determined by its sole and absolute discretion, without ascribing any reasons whatsoever,</li>
            </ul>
            Unless explicitly stated otherwise, any new features that augment or enhance the website, shall be subject to the Terms.
              </li>
            </ul>
          </li>
          <li>
            <span className="font-semibold">1.4.</span> The website is provided on an “as is” basis without any representation or warranty from POLWEL of any kind. To the fullest extent permitted by law, and without prejudice to the generality of the foregoing, POLWEL hereby disclaims any warranty:
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>as to the website’s accuracy, correctness, completeness, reliability, timeliness, non-infringement and/or fitness for purpose;</li>
              <li>that the website or any website’s Functions will be uninterrupted or error-free, or that defects will be corrected or that the website will be free of viruses and/or other harmful elements.</li>
            </ul>
          </li>
          <li>
            <span className="font-semibold">1.5.</span> To the fullest extent permitted by law, POLWEL (and its affiliates, employees, agents and/or services providers) shall not be liable for any damages or loss of any kind, howsoever caused as a result (whether directly or indirectly) of your use and/or access of the website, including but not limited to any damage or loss suffered as a result of reliance on the services, contents and/or resources contained or made available on the website.
          </li>
          <li>
            <span className="font-semibold">1.6.</span> Where the website contains links to other websites and resources provided by third parties (e.g. advertisements; applications posted by third parties), these links are provided for your information only. Such links should not be interpreted as approval or endorsement by us of those linked websites or information you may obtain from them. We have no control over the contents of those websites or resources. You agree that we shall not be responsible or liable for any third party content on the website, and your access and/or use of any third party content on the website.
          </li>
            </ol>
          </div>
          <div>
            <h4 className="font-semibold mb-2">2. Data Protection</h4>
            <ol className="list-decimal pl-5 space-y-2">
          <li>
            <span className="font-semibold">2.1.</span> It is a continuing condition of your use of the website that you agree and consent to POLWEL, as well as our representatives and/or agents, collecting, using and disclosing and sharing amongst ourselves personal data, and disclosing such personal data to our authorised service providers and relevant third parties in accordance with the terms of our privacy policy as amended from time to time, available at{" "}
            <a
              href="https://polwel.org.sg/privacy-policy/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-orange-600 underline"
            >
              https://polwel.org.sg/privacy-policy/
            </a>{" "}
            (the “Privacy Policy”), the terms of which also apply to your use of the website.
          </li>
            </ol>
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
