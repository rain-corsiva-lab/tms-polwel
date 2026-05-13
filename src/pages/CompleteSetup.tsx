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
import AuthLayout from "@/components/AuthLayout";
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
    { test: (pwd: string) => pwd.length >= 12, text: "At least 12 characters" },
    { test: (pwd: string) => /[A-Z]/.test(pwd), text: "One uppercase letter" },
    { test: (pwd: string) => /[a-z]/.test(pwd), text: "One lowercase letter" },
    { test: (pwd: string) => /\d/.test(pwd), text: "One number" },
    { test: (pwd: string) => /[!@#$%^&*(),.?":{}|<>]/.test(pwd), text: "One special character" },
  ];

  const isPasswordValid = passwordRequirements.every((req) => req.test(password));
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
          method: "GET",
          headers: {
            "Content-Type": "application/json",
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
        console.error("Token verification error:", err);
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
        method: "POST",
        headers: {
          "Content-Type": "application/json",
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
          navigate("/login");
        }, 3000);
      } else {
        setError(data.message || "Failed to complete setup");
      }
    } catch (err) {
      console.error("Setup completion error:", err);
      setError("Failed to complete setup. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Loading state
  if (isVerifying) {
    return (
      <AuthLayout>
        <Card className="w-full max-w-md">
          <CardContent className="p-6">
            <div className="flex flex-col items-center space-y-4">
              <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
              <p className="text-sm text-muted-foreground">Verifying setup token...</p>
            </div>
          </CardContent>
        </Card>
      </AuthLayout>
    );
  }

  // Invalid token state
  if (!isValid) {
    return (
      <AuthLayout>
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-red-100 flex items-center justify-center">
              <XCircle className="h-6 w-6 text-red-600" />
            </div>
            <CardTitle className="text-xl text-red-600">Invalid Setup Link</CardTitle>
            <CardDescription>{error || "This setup link is invalid or has expired."}</CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-sm text-muted-foreground mb-4">Please contact your administrator to get a new setup link.</p>
            <Button onClick={() => navigate("/login")} className="w-full">
              Return to Login
            </Button>
          </CardContent>
        </Card>
      </AuthLayout>
    );
  }

  // Success state
  if (isSuccess) {
    return (
      <AuthLayout>
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <CardTitle className="text-xl text-green-600">Setup Complete!</CardTitle>
            <CardDescription>Welcome to POLWEL! Your account has been activated successfully.</CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <p className="text-sm text-green-800">You can now log in with your email and the password you just created.</p>
            </div>
            <Button onClick={() => navigate("/login")} className="w-full">
              Continue to Login
            </Button>
          </CardContent>
        </Card>
      </AuthLayout>
    );
  }

  // Setup form
  return (
    <>
      <AuthLayout>
        <Card className="w-full max-w-lg" style={{ maxHeight: "90vh", overflowY: "auto" }}>
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
                    {showPassword ? <EyeOff className="h-4 w-4 text-gray-400" /> : <Eye className="h-4 w-4 text-gray-400" />}
                  </Button>
                </div>

                {/* Password Requirements */}
                {password && (
                  <div className="mt-2 space-y-1">
                    {passwordRequirements.map((req, index) => (
                      <div key={index} className="flex items-center text-xs">
                        {req.test(password) ? <CheckCircle className="h-3 w-3 text-green-500 mr-2" /> : <XCircle className="h-3 w-3 text-red-500 mr-2" />}
                        <span className={req.test(password) ? "text-green-600" : "text-red-600"}>{req.text}</span>
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
                    {showConfirmPassword ? <EyeOff className="h-4 w-4 text-gray-400" /> : <Eye className="h-4 w-4 text-gray-400" />}
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
                  <Checkbox id="terms" checked={termsAccepted} onCheckedChange={(checked) => setTermsAccepted(checked === true)} />
                  <label htmlFor="terms" className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    I agree to the{" "}
                    <Button type="button" variant="link" className="p-0 h-auto text-orange-600 hover:text-orange-700" onClick={() => setShowTermsDialog(true)}>
                      Terms & Conditions
                    </Button>{" "}
                    *
                  </label>
                </div>

                {/* Privacy Policy Checkbox */}
                <div className="flex items-center space-x-2">
                  <Checkbox id="privacy" checked={privacyAccepted} onCheckedChange={(checked) => setPrivacyAccepted(checked === true)} />
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
              <Button type="submit" className="w-full bg-orange-500 hover:bg-orange-600" disabled={!isFormValid || isSubmitting}>
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
              <Button variant="ghost" onClick={() => navigate("/login")}>
                Already have an account? Sign in
              </Button>
            </div>

            <div className="text-center text-sm text-muted-foreground">
              Need help? Please contact PDCS at{" "}
              <a href="mailto:pdcs@polwel.org.sg" className="text-primary hover:underline">
                pdcs@polwel.org.sg
              </a>
            </div>
          </CardContent>
        </Card>
      </AuthLayout>
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
                Please read the following terms of use carefully (the “Terms”). By accessing and/or using the website, you agree to be bound by the Terms in the
                manner described in the Terms. If you do not agree to the Terms, you must not access and/or use the website.
              </p>
              <p>
                If you are accessing and/or using the website on behalf of a company or other legal entity, you represent that you have the authority to bind
                such entity and its affiliates to these Terms, in which case the terms “you” or “your” shall refer to you, the individual, or the entity you
                represent and its affiliates (and, as applicable, your users). If you do not have such authority or if you do not agree with the Terms, you must
                not access and/or use the website on behalf of such other entity.
              </p>
              <div>
                <h4 className="font-semibold mb-2">1. Your Use of the website</h4>
                <ol className="pl-5 space-y-2 list-none">
                  <li>
                    <span className="font-semibold">1.1.</span> You shall access and/or use the website in accordance with the Terms and all applicable laws /
                    regulations.
                  </li>
                  <li>
                    <span className="font-semibold">1.2.</span> You undertake not to (and shall not, knowingly or otherwise, authorise, allow or assist any
                    third party to):
                    <ul className="list-disc pl-5 mt-2 space-y-1">
                      <li>
                        reproduce, transfer, duplicate, copy, sell, resell or exploit any portion of the website, use of the website or access to the website;
                      </li>
                      <li>
                        modify or adapt the whole or any part of the website, or permit the website or any part of it to be combined with, or become
                        incorporated in, any other application, programs or other websites /platforms created by you;
                      </li>
                      <li>
                        decompile, reverse engineer or otherwise attempt to discover the source code of our website or any components thereof, except under any
                        specific circumstances expressly permitted by us in writing;
                      </li>
                      <li>
                        communicate, republish, upload, post, transmit, edit, re-use, rent, lease, loan, sell, assign, transfer, distribute, make available,
                        license, sublicense or create derivative works or adaptations based on the whole or any part of the website;
                      </li>
                      <li>
                        use the website in any unlawful manner, for any unlawful purpose, or in any manner inconsistent with the Terms, or in contravention of
                        any applicable law, including in any way that infringes our intellectual property rights or those of any third party in relation to the
                        website;
                      </li>
                      <li>
                        use the website in a way that could damage, disable, impair or compromise the website (or the systems or security of the website or any
                        other computer systems or devices used in connection therewith) or interfere with other users or affect the reputation of POLWEL;
                      </li>
                      <li>
                        provide, distribute or share, or enable the provision, distribution or sharing of, the website (or any data associated therewith) with
                        any third party;
                      </li>
                      <li>
                        reproduce, adapt, republish, translate, publish, display, communicate, hyperlink, post, transmit, broadcast, podcast, webcast,
                        distribute, sell, trade or exploit the whole or any part of the website in any manner or by any means or stored in an information
                        retrieval system except to the extent permitted with our prior written permission and/or that of the relevant rights owner;
                      </li>
                      <li>
                        reproduce, display or otherwise provide access to the website on another website or server, for example through framing, mirroring,
                        linking, spidering, scraping or any other technological means (including any technology available in the future), without our prior
                        written permission;
                      </li>
                      <li>
                        transmit or introduce any viruses, corrupted files, harmful elements, or any materials during the course of your use of the website
                        that: (i) is unlawful, harmful, threatening, defamatory, obscene, infringing, harassing or racially or ethnically offensive; (ii)
                        facilitates illegal activity; (iii) promotes unlawful violence; or (iv) is otherwise illegal or causes damage or injury to any person or
                        property, and we reserve the right, without liability to or prejudice to our other rights against you, to disable your access to any
                        material that breaches the provisions of this sub-clause, or to terminate or suspend your access to the website;
                      </li>
                      <li>
                        establish a link to any page on the website without our prior written permission (which we reserve the right to withdraw without
                        notice), and even if consent is provided, you may only establish a link in a way that is fair and legal and does not damage POLWEL’s
                        reputation or take advantage of it (e.g. by suggesting any association, approval or endorsement on our part where none exists).
                      </li>
                    </ul>
                  </li>
                  <li>
                    <span className="font-semibold">1.3.</span> You acknowledge and agree that:
                    <ul className="list-disc pl-5 mt-2 space-y-1">
                      <li>
                        When using and/or accessing the website, you shall be subject to additional terms and conditions, guidelines and/or rules which are in
                        addition to these Terms and may be posted from time to time on the website. You are required to comply with any such additional terms
                        and conditions in addition to these Terms, and all such guidelines or rules are hereby incorporated by reference into these Terms.
                      </li>
                      <li>
                        Any content or information that you upload to the website will be considered non-proprietary. You hereby grant us a licence to use,
                        store and copy that content and to distribute and make it available to third parties. POLWEL also has the right to disclose your
                        identity to any third party who is claiming any content you posted or uploaded on the website constitutes a violation of their
                        intellectual property rights.
                      </li>
                      <li>
                        POLWEL may establish general practices and limits concerning use of the website. Without prejudice to the generality of Clause 1.5,
                        POLWEL shall not be responsible or liable for the deletion of or failure to store any messages and other communications or other content
                        maintained or transmitted by the website. POLWEL reserves the right to change these general practices and limits at any time, in its
                        sole discretion, with or without notice;
                      </li>
                      <li>
                        POLWEL shall have the right (but not the obligation) to remove or disable access to any content which we deem to be potentially
                        defamatory of any person, unlawful, objectionable in any way, in violation of any third-party rights, or for any reason whatsoever. Any
                        editing or removal of any such content from the website shall be without prejudice to our other rights and remedies available at law;
                      </li>
                      <li>
                        POLWEL shall have the right to at any time and from time to time:
                        <ul className="list-disc pl-5 mt-2 space-y-1">
                          <li>
                            (a) switch to another data centre hosting any of the underlying infrastructure, middleware, application software, and application
                            data as determined by POLWEL in its sole and absolute discretion, without ascribing any reasons whatsoever;
                          </li>
                          <li>
                            (b) modify and/or update the website and its components from time to time, including to add or remove functionalities, features or
                            services (collectively, “Website Functions”); and
                          </li>
                          <li>
                            (c) deny, suspend, withdraw, block and/or restrict access to the website or any Website Functions whether to any user or generally,
                            at any time, including in the event (i) of a violation or alleged violation of these Terms, or (ii) any act or omission by you may
                            cause harm to POLWEL or its affiliates’ brand, reputation or business, as determined by its sole and absolute discretion, without
                            ascribing any reasons whatsoever,
                          </li>
                        </ul>
                        Unless explicitly stated otherwise, any new features that augment or enhance the website, shall be subject to the Terms.
                      </li>
                    </ul>
                  </li>
                  <li>
                    <span className="font-semibold">1.4.</span> The website is provided on an “as is” basis without any representation or warranty from POLWEL
                    of any kind. To the fullest extent permitted by law, and without prejudice to the generality of the foregoing, POLWEL hereby disclaims any
                    warranty:
                    <ul className="list-disc pl-5 mt-2 space-y-1">
                      <li>as to the website’s accuracy, correctness, completeness, reliability, timeliness, non-infringement and/or fitness for purpose;</li>
                      <li>
                        that the website or any website’s Functions will be uninterrupted or error-free, or that defects will be corrected or that the website
                        will be free of viruses and/or other harmful elements.
                      </li>
                    </ul>
                  </li>
                  <li>
                    <span className="font-semibold">1.5.</span> To the fullest extent permitted by law, POLWEL (and its affiliates, employees, agents and/or
                    services providers) shall not be liable for any damages or loss of any kind, howsoever caused as a result (whether directly or indirectly)
                    of your use and/or access of the website, including but not limited to any damage or loss suffered as a result of reliance on the services,
                    contents and/or resources contained or made available on the website.
                  </li>
                  <li>
                    <span className="font-semibold">1.6.</span> Where the website contains links to other websites and resources provided by third parties (e.g.
                    advertisements; applications posted by third parties), these links are provided for your information only. Such links should not be
                    interpreted as approval or endorsement by us of those linked websites or information you may obtain from them. We have no control over the
                    contents of those websites or resources. You agree that we shall not be responsible or liable for any third party content on the website,
                    and your access and/or use of any third party content on the website.
                  </li>
                </ol>
              </div>
              <div>
                <h4 className="font-semibold mb-2">2. Data Protection</h4>
                <ol className="list-none pl-5 space-y-2">
                  <li>
                    <span className="font-semibold">2.1.</span> It is a continuing condition of your use of the website that you agree and consent to POLWEL, as
                    well as our representatives and/or agents, collecting, using and disclosing and sharing amongst ourselves personal data, and disclosing such
                    personal data to our authorised service providers and relevant third parties in accordance with the terms of our privacy policy as amended
                    from time to time, available at{" "}
                    <a href="https://polwel.org.sg/privacy-policy/" target="_blank" rel="noopener noreferrer" className="text-orange-600 underline">
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
              <h3 className="font-semibold text-lg">Privacy Policy</h3>

              <p>
                This Privacy Policy (“Policy”) sets out the basis which POLWEL Co-operative Society Limited (“we”, “us”, or “our”) may collect, use, disclose or
                otherwise process personal data of the persons to whom this policy applies in accordance with the Singapore Personal Data Protection Act
                (“PDPA”).
              </p>

              <p>
                This Policy applies to personal data in our possession or under our control, including personal data in the possession of organisations which we
                have engaged to collect, use, disclose, or process personal data for our purposes.
              </p>

              <h4 className="font-semibold">PERSONAL DATA</h4>

              <p>
                1. As used in this Policy, personal data means data, any information that can uniquely identify an individual person (a) on its own, or (b) when
                combined with other information.
              </p>

              <p>
                2. Data intermediary in this Policy means an organisation which processes personal data on behalf of another organisation (the data controller).
              </p>

              <p>3. Other terms used in this Policy shall have the meanings given to them in the PDPA (where the context so permits).</p>

              <h4 className="font-semibold">COLLECTION, USE AND DISCLOSURE OF PERSONAL DATA</h4>

              <p>4. The types of personal data that we may collect from you include (but may not be limited to) the following:</p>
              <p>(a) Personal details (e.g. name, email address, personal identity card details, date of birth, contact number)</p>
              <p>(b) Voice, Photos and Video recordings (during WSQ security assessments / our workshops or trainings)</p>
              <p>(c) Financial details (e.g. banking details, account number, income / expenses, credit history details)</p>

              <p>For job applicants or individuals seeking career transition and support services</p>

              <p>(d) a to c above;</p>
              <p>(e) education qualifications, employment history, personal details of references and;</p>
              <p>(f) health information</p>

              <p>5. We generally do not collect your personal data unless:</p>
              <p>
                (a) it is provided to us voluntarily by you directly or via a third party who has been duly authorised by you to disclose your personal data to
                us (your “authorised representative”) after: you (or your authorised representative) have been notified of the purposes for which the data is
                collected, and you (or your authorised representative) have provided written consent to the collection and usage of your personal data for those
                purposes; or
              </p>
              <p>
                (b) collection and use of personal data without consent is permitted or required by the PDPA or other laws. We shall seek your consent before
                collecting any additional personal data and before using your personal data for a purpose which has not been notified to you (except where
                permitted or authorised by law).
              </p>

              <p>
                6. You have choices regarding our collection, use or disclosure of your personal data. You have the right to object to the processing of your
                personal data and withdraw your consent in the manner described in clause 16. However, if you choose not to provide us with the personal data
                intended for the purpose(s) for which you have been notified, we may not be able to fulfil the said purpose(s).
              </p>

              <p>
                7. If we are a Data Intermediary, we will ensure the limited processing of personal data to the purposes specified by the Data Controller and
                according to their instructions.
              </p>

              <p>
                8. We may collect, use or disclose your personal data without consent pursuant to an exception under the Personal Data Protection Act or other
                written law such as during the following situations:
              </p>
              <p>- To respond to an emergency that threatens your life, health and safety or of another individual;</p>
              <p>- Necessary in the national interest; and</p>
              <p>
                - We have a legitimate interest for the lawful collection, use or disclosure of personal data without consent. For example, where it is
                necessary for the society to recover debt, prevent misuse of services, conduct necessary corporate due diligence or improving our products and
                services. We take due care to assess and balance our legitimate interests against your personal data rights and ensure that our legitimate
                interests outweigh any likely residual adverse effect to you.
              </p>

              <p>9. We may collect, use and disclose your personal data for any or all of the following purposes:</p>
              <p>(a) performing obligations in the course of or in connection with our provision of the goods and/or services requested by you;</p>
              <p>(b) quality management and internal training;</p>
              <p>(c) responding to and handling your feedback, queries, requests, applications;</p>
              <p>(d) verifying your identity and accuracy of information provided;</p>
              <p>(e) processing your loans and/or deposits related matters;</p>
              <p>(f) facilitate private security licensing and WSQ assessment related matters;</p>
              <p>(g) administering training records and registration services;</p>
              <p>(h) administering payments;</p>
              <p>(i) creation and maintenance of user accounts for our system(s);</p>
              <p>(j) conducting audits and ensuring compliance;</p>
              <p>(k) processing and maintenance of your membership;</p>
              <p>(l) facilitate security clearance for entry to premises;</p>
              <p>(m) marketing and publicity;</p>
              <p>
                (n) sending you information regarding your membership benefits, such as promotions on products and services offered, as well as available
                employment/career opportunities;
              </p>
              <p>(o) notifying, inviting, and managing your participation in our marketing activities, such as surveys, lucky draws, and quizzes;</p>
              <p>(p) career transition support services;</p>
              <p>(q) [Job applicants]: assessing and evaluating your suitability for employment in any current or prospective position;</p>
              <p>(r) [Job applicants]: pre-employment screening;</p>
              <p>(s) any other purposes for which you have provided the information; and</p>
              <p>(t) any other incidental business purposes related to or in connection with the above.</p>

              <p>
                10. With reference to 9(n) and (o), we may communicate such marketing to you through various channels, where applicable, including by email,
                phone call, text message, SMS, and chat applications (e.g. WhatsApp, Telegram). If you wish to unsubscribe from receiving such marketing
                communications, please click on the unsubscribe link in the relevant email or message.
              </p>

              <p>
                11. We may disclose your personal data to third parties where necessary for the purposes described in clause 9. Where we engage third-party
                service providers (other companies and individuals) to perform functions on our behalf, they will need access to your personal information
                needed to perform their functions but may not use it for other purposes.
              </p>

              <p>
                12. If you choose to share personal data of other people (such as references for job applicants) with us, it is your responsibility to inform
                such other people, whose personal data you provide, about the use of their personal data as set out in this Notice.
              </p>

              <p>
                13. Our website uses cookies to improve your browsing experience. These cookies are essential for the working of basic functionalities of our
                website and to help us analyse and understand how you use our website generally, recognize your repeat visits and preferences, as well as to
                measure and analyse traffic.
              </p>

              <p>
                14. These cookies will be stored in your browser only with your consent. By clicking “Accept” on our cookie banner, or if you continue to
                explore our website without changing your cookie settings, you consent to the use of the cookies on our website. You also have the option to
                opt-out of these cookies by changing your cookie settings anytime. But opting out of some of the cookies may have an effect on your browsing
                experience.
              </p>

              <p>
                15. The purposes listed in the above clauses may continue to apply even in situations where your relationship with us (for example, pursuant to
                contract with us) has been terminated or altered in any way, for a reasonable period thereafter.
              </p>

              <h4 className="font-semibold">WITHDRAWING YOUR CONSENT</h4>

              <p>
                16. The consent that you provide for the collection, use and disclosure of your personal data will remain valid until such time it is being
                withdrawn by you in writing. You may withdraw consent and request us to stop collecting, using and/or disclosing your personal data for any or
                all of the purposes listed above by submitting your request in writing or via email to our Data Protection Officer at the contact details
                provided below.
              </p>

              <p>
                17. Upon receipt of your written request to withdraw your consent, we may require reasonable time (depending on the complexity of the request
                and its impact on our relationship with you) for your request to be processed and for us to notify you of the consequences of us acceding to the
                same, including any legal consequences which may affect your rights and liabilities to us.
              </p>

              <p>
                18. Whilst we respect your decision to withdraw your consent, please note that depending on the nature and scope of your request, we may not be
                in a position to continue providing our goods or services to you and we shall, in such circumstances, notify you before completing the
                processing of your request. Should you decide to cancel your withdrawal of consent, please inform us in writing in the manner described in
                clause 16.
              </p>

              <p>
                19. Please note that withdrawing consent does not affect our right to continue to collect, use and disclose personal data where such collection,
                usage and disclosure without consent is permitted or required under applicable laws.
              </p>

              <h4 className="font-semibold">ACCESS TO AND CORRECTION OF PERSONAL DATA</h4>

              <p>
                20. If you wish to make (a) an access request for access to a copy of the personal data which we hold about you or information about the ways in
                which we use or disclose your personal data, or (b) a correction request to correct or update any of your personal data which we hold about you,
                you may submit your request in writing or via email to our Data Protection Officer at the contact details provided below. We will respond to
                your request as soon as reasonably possible.
              </p>

              <p>
                21. Please note that a reasonable fee may be charged for an access request. If so, we will inform you of the fee before processing your request.
              </p>

              <h4 className="font-semibold">PROTECTION OF PERSONAL DATA</h4>

              <p>
                22. To safeguard your personal data from unauthorised access, collection, use, disclosure, copying, modification, disposal or similar risks, we
                have introduced appropriate administrative, physical and technical measures such as up-to-date antivirus protection, encryption, access control,
                password protection and disclosing personal data both internally and to our authorised third-party service providers and agents only on a
                need-to-know basis.
              </p>

              <p>
                23. You should be aware, however, that no method of transmission over the Internet or method of electronic storage is completely secure. While
                security cannot be guaranteed, we strive to protect the security of your information and are constantly reviewing and enhancing our information
                security measures.
              </p>

              <h4 className="font-semibold">ACCURACY OF PERSONAL DATA</h4>

              <p>
                24. We generally rely on personal data provided by you (or your authorised representative). In order to ensure that your personal data is
                current, complete and accurate, please update us if there are changes to your personal data by informing our Data Protection Officer in writing
                or via email at the contact details provided below.
              </p>

              <p>
                25. We will take reasonable steps to ensure that the personal data we collect about you is accurate, complete, not misleading and kept up to
                date, taking into account its intended use. Where possible, we will validate the information provided by you using generally accepted practices
                and guidelines.
              </p>

              <h4 className="font-semibold">RETENTION OF PERSONAL DATA</h4>

              <p>
                26. We may retain your personal data for as long as it is necessary to fulfil the purpose for which it was collected, or as required or
                permitted by applicable laws.
              </p>

              <p>
                27. We will cease to retain your personal data, or remove the means by which the data can be associated with you, as soon as it is reasonable to
                assume that such retention no longer serves the purpose for which the personal data was collected, and is no longer necessary for legal or
                business purposes.
              </p>

              <h4 className="font-semibold">TRANSFERS OF PERSONAL DATA OUTSIDE OF SINGAPORE</h4>

              <p>
                28. If your personal data is to be transferred out of Singapore in line with the purposes in clause 9, we will take steps to ensure that your
                personal data continues to receive a standard of protection that is at least comparable to that provided under the Singapore PDPA.
              </p>

              <h4 className="font-semibold">DATA BREACH NOTIFICATION</h4>

              <p>
                29. In the event a breach of security leading to accidental or unlawful destruction, loss, alteration, unauthorised disclosure of, or access to,
                personal data, we shall promptly assess the impact and once assessed that it is a notifiable data breach, we shall report this breach to the
                Personal Data Protection Commission (PDPC), unless an exception applies. We will notify you when the data breach is likely to result in
                significant harm to you after our notification to PDPC. If we are the Data Intermediary, we shall inform our Data Controller immediately without
                undue delay upon detection of a data breach that may affect them so that they can promptly assess the impact and comply with their own data
                breach notification obligation.
              </p>

              <h4 className="font-semibold">DATA PROTECTION OFFICER</h4>

              <p>
                30. You may contact our Data Protection Officer if you have any enquiries or feedback on our personal data protection policies and procedures,
                or if you wish to make any request, in the following manner:
              </p>
              <p>
                Email Address:{" "}
                <a href="mailto:dpo@polwel.org.sg" className="text-orange-600 underline">
                  dpo@polwel.org.sg
                </a>
              </p>

              <h4 className="font-semibold">EFFECT OF POLICY AND CHANGES TO POLICY</h4>

              <p>
                31. This Policy applies in conjunction with any other notices, contractual clauses and consent clauses that apply in relation to the collection,
                use and disclosure of your personal data by us.
              </p>

              <p>
                32. We may revise this Policy from time to time without any prior notice. You may determine if any such revision has taken place by referring to
                the date on which this Policy was last updated. Your continued use of our services constitutes your acknowledgement and acceptance of such
                changes.
              </p>

              <div className="mt-6 pt-4 border-t">
                <p className="text-xs text-muted-foreground">Last Updated: 1 August 2025</p>
              </div>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default CompleteSetup;
