import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { debugAuthState, polwelUsersApi } from "@/lib/api";

export function AuthDebugComponent() {
  const [testResult, setTestResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  
  // Mock auth data
  const user = { name: 'Demo User', role: 'POLWEL' };
  const isAuthenticated = true;

  const handleDebugAuth = () => {
    const result = debugAuthState();
    setTestResult({ type: 'auth_state', data: result });
  };

  const handleTestApi = async () => {
    setLoading(true);
    try {
      const result = await polwelUsersApi.getAll({ page: 1, limit: 5 });
      setTestResult({ type: 'api_success', data: result });
    } catch (error) {
      setTestResult({ 
        type: 'api_error', 
        data: { 
          message: error.message,
          name: error.name,
          stack: error.stack 
        } 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCheckLocalStorage = () => {
    const localStorage_data = {
      polwel_access_token: localStorage.getItem('polwel_access_token'),
      polwel_refresh_token: localStorage.getItem('polwel_refresh_token'),
      polwel_user_data: localStorage.getItem('polwel_user_data'),
      authToken: localStorage.getItem('authToken'), // Old key
    };
    setTestResult({ type: 'localStorage', data: localStorage_data });
  };

  return (
    <Card className="m-4">
      <CardHeader>
        <CardTitle>Authentication Debug Panel</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2 flex-wrap">
          <Button onClick={handleDebugAuth} variant="outline">
            Debug Auth State
          </Button>
          <Button onClick={handleTestApi} disabled={loading}>
            {loading ? "Testing..." : "Test API Call"}
          </Button>
          <Button onClick={handleCheckLocalStorage} variant="outline">
            Check LocalStorage
          </Button>
        </div>

        <div className="bg-gray-100 p-4 rounded">
          <p><strong>Auth Hook State:</strong></p>
          <p>Authenticated: {isAuthenticated ? "✅ Yes" : "❌ No"}</p>
          <p>User: {user ? user.name : "None"}</p>
        </div>

        {testResult && (
          <div className="bg-gray-50 p-4 rounded border">
            <h4 className="font-semibold mb-2">Test Result ({testResult.type}):</h4>
            <pre className="text-sm overflow-auto bg-white p-2 rounded border">
              {JSON.stringify(testResult.data, null, 2)}
            </pre>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
