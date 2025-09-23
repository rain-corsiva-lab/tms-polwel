import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "./Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { trainerDashboardApi, profileApi } from "@/lib/api";

const Profile = () => {
  const { user, apiRequest } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [name, setName] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [bio, setBio] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [passwordTouched, setPasswordTouched] = useState(false);

  const pwHasUpper = /[A-Z]/.test(newPassword);
  const pwHasLower = /[a-z]/.test(newPassword);
  const pwHasNumber = /[0-9]/.test(newPassword);
  const pwHasSpecial = /[^A-Za-z0-9]/.test(newPassword);
  const pwHasLength = newPassword.length >= 12;
  const pwValid = pwHasUpper && pwHasLower && pwHasNumber && pwHasSpecial && pwHasLength;

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      try {
        const data = await profileApi.get();
        if (data && data.data) {
          setProfile(data.data);
          setName(data.data.name || "");
          setContactNumber(data.data.contactNumber || "");
          setBio(data.data.bio || "");
        }
      } catch (err) {
        toast({ title: "Error", description: "Failed to load profile", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  const handleSave = async () => {
    if (!name.trim()) {
      toast({ title: "Validation", description: "Name is required", variant: "destructive" });
      return;
    }
    try {
      const res = await profileApi.update({ name: name.trim(), contactNumber: contactNumber || undefined, bio: bio || undefined });
      // If password fields provided, call change password
      if (currentPassword.trim() || newPassword.trim()) {
        if (!currentPassword.trim() || !newPassword.trim()) {
          toast({ title: "Validation", description: "To change password provide both current and new password", variant: "destructive" });
          return;
        }
        if (!pwValid) {
          toast({ title: "Validation", description: "Password must be 12+ chars, with upper, lower, number, special.", variant: "destructive" });
          return;
        }
        await profileApi.changePassword({ currentPassword: currentPassword.trim(), newPassword: newPassword });
        toast({ title: "Success", description: "Password changed" });
        setCurrentPassword("");
        setNewPassword("");
        setPasswordTouched(false);
      }
      toast({ title: "Success", description: "Profile updated" });
      setProfile(res.data);
    } catch (err: any) {
      toast({ title: "Error", description: err?.message || "Failed to update profile", variant: "destructive" });
    }
  };

  return (
    <div className="p-6">
      <Card>
        <CardHeader>
          <CardTitle>My Account</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 max-w-2xl">
            <div>
              <Label className="text-sm">Full name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your full name" />
            </div>

            <div>
              <Label className="text-sm">Email</Label>
              <Input value={profile?.email || ""} disabled />
            </div>

            <div>
              <Label className="text-sm">Contact number</Label>
              <Input value={contactNumber} onChange={(e) => setContactNumber(e.target.value)} placeholder="Mobile or office number" />
            </div>

            <div>
              <Label className="text-sm">About / Bio</Label>
              <Textarea value={bio} onChange={(e) => setBio(e.target.value)} className="min-h-[120px]" placeholder="A short professional summary" />
            </div>

            <div className="pt-4 border-t border-border">
              <Label className="text-sm">Change password (leave blank to keep current)</Label>
              <div className="space-y-2 mt-2 max-w-md">
                <Input type="password" placeholder="Current password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
                <Input
                  type="password"
                  placeholder="New password (12+ chars, upper/lower/number/special)"
                  value={newPassword}
                  onChange={(e) => {
                    setNewPassword(e.target.value);
                    if (!passwordTouched) setPasswordTouched(true);
                  }}
                />
                {(passwordTouched || newPassword.length > 0) && (
                  <div className="text-xs space-y-1 mt-1">
                    <Rule ok={pwHasLength} text="At least 12 characters" />
                    <Rule ok={pwHasUpper} text="Contains an uppercase letter" />
                    <Rule ok={pwHasLower} text="Contains a lowercase letter" />
                    <Rule ok={pwHasNumber} text="Contains a number" />
                    <Rule ok={pwHasSpecial} text="Contains a special character" />
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => navigate(-1)}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={(!!currentPassword || !!newPassword) && !pwValid}>
                Save changes
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Profile;

function Rule({ ok, text }: { ok: boolean; text: string }) {
  return (
    <div className={"flex items-center gap-2 " + (ok ? "text-green-600" : "text-muted-foreground")}>
      <span className={"inline-block h-2 w-2 rounded-full " + (ok ? "bg-green-600" : "bg-gray-300")} />
      <span>{text}</span>
    </div>
  );
}
