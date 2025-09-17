import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShieldOff, ArrowLeft } from "lucide-react";

export default function Forbidden() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted p-6">
      <Card className="max-w-2xl w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <ShieldOff className="text-red-500" />
            Unauthorized (403)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-muted-foreground">You don’t have permission to access this page or perform this action.</p>

          <div className="flex gap-3">
            <Button variant="outline" onClick={() => navigate(-1)}>
              <ArrowLeft className="mr-2" /> Go Back
            </Button>
            <Button onClick={() => navigate("/")}>Go Home</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
