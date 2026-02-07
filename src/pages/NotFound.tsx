import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Search, Home, ArrowLeft } from "lucide-react";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted p-6">
      <Card className="max-w-3xl w-full shadow-sm">
        <CardContent className="p-10">
          <div className="flex flex-col items-center text-center gap-4">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 text-primary">
              <Search size={28} />
            </div>
            <h1 className="text-4xl font-bold tracking-tight">Page not found</h1>
            <p className="text-muted-foreground max-w-prose">
              We couldn’t find the page you’re looking for. It might have been removed, renamed, or it never existed.
            </p>
            <div className="flex gap-3 mt-2">
              <Button variant="outline" onClick={() => navigate(-1)}>
                <ArrowLeft className="mr-2" /> Go Back
              </Button>
              <Button onClick={() => navigate("/")}>
                <Home className="mr-2" /> Go Home
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default NotFound;
