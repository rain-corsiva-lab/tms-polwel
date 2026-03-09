import { useEffect, useState } from "react";
import { courseRunsApi } from "@/lib/api";
import { AlertTriangle } from "lucide-react";

interface WorkflowMode {
  isTestingMode: boolean;
  environment: string;
  cronSchedule: string;
  transitionRule: string;
}

/**
 * Displays a persistent banner when the backend is running in
 * WORKFLOW_TESTING_MODE=true (staging / local).
 *
 * The banner is completely hidden in production mode (isTestingMode=false).
 * It is globally mounted in Layout.tsx so it appears on every page.
 */
const WorkflowModeIndicator = () => {
  const [mode, setMode] = useState<WorkflowMode | null>(null);

  useEffect(() => {
    let cancelled = false;
    courseRunsApi
      .getWorkflowMode()
      .then((data) => {
        if (!cancelled) setMode(data);
      })
      .catch(() => {
        // Silently ignore — banner is informational only
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!mode?.isTestingMode) return null;

  return (
    <div className="w-full bg-amber-400 text-amber-900 px-4 py-2 flex items-center gap-2 text-sm font-medium z-50 shadow-sm">
      <AlertTriangle className="h-4 w-4 shrink-0" />
      <span>
        🧪&nbsp;
        <strong>Workflow Testing Mode Active</strong>
        &nbsp;— Courses transition&nbsp;
        <span className="underline decoration-dotted cursor-help" title={`Cron: ${mode.cronSchedule}`}>
          IN_PROGRESS → PENDING_BILLING 5 minutes after end time
        </span>
        .&nbsp;
        <span className="opacity-70">
          (ENV: {mode.environment} · cron: {mode.cronSchedule})
        </span>
      </span>
    </div>
  );
};

export default WorkflowModeIndicator;
