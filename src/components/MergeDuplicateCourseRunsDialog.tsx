import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, AlertTriangle, CheckCircle2, GitMerge, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { courseRunsMergerApi } from "@/lib/api";

interface RunInfo {
  id: string;
  courseRunCode: string;
  status: string;
  createdAt: string;
  learnerCount: number;
}

interface DuplicateGroup {
  courseId: string;
  courseName: string;
  courseCode: string;
  startDate: string;
  learnerCount: number;
  runs: RunInfo[];
}

interface MergeResults {
  mergedGroups: number;
  deletedCount: number;
  enrollmentsShifted: number;
  enrollmentsDeleted: number;
}

export function MergeDuplicateCourseRunsDialog() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [merging, setMerging] = useState(false);
  const [groups, setGroups] = useState<DuplicateGroup[]>([]);
  const [results, setResults] = useState<MergeResults | null>(null);
  const [step, setStep] = useState<"idle" | "scanned" | "result">("idle");
  const { toast } = useToast();

  const reset = () => {
    setGroups([]);
    setResults(null);
    setStep("idle");
  };

  const handleClose = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) reset();
  };

  const handleScan = async () => {
    setLoading(true);
    try {
      const response = await courseRunsMergerApi.getDuplicates();
      if (response.success) {
        setGroups(response.groups || []);
        setStep("scanned");
        toast({
          title: "Scan complete",
          description: `Detected ${response.count} groups of duplicate course runs.`,
        });
      } else {
        throw new Error(response.message || "Failed to fetch duplicates");
      }
    } catch (err: any) {
      toast({
        title: "Scan failed",
        description: err.message || "Something went wrong while scanning.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleMerge = async () => {
    setMerging(true);
    try {
      const response = await courseRunsMergerApi.mergeDuplicates();
      if (response.success) {
        setResults({
          mergedGroups: response.mergedGroups,
          deletedCount: response.deletedCount,
          enrollmentsShifted: response.enrollmentsShifted,
          enrollmentsDeleted: response.enrollmentsDeleted,
        });
        setStep("result");
        toast({
          title: "Merge complete",
          description: `Successfully merged duplicate course runs.`,
        });
      } else {
        throw new Error(response.message || "Failed to merge duplicates");
      }
    } catch (err: any) {
      toast({
        title: "Merge failed",
        description: err.message || "Something went wrong while merging.",
        variant: "destructive",
      });
    } finally {
      setMerging(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogTrigger asChild>
        <Button variant="outline" className="flex items-center gap-2 border-orange-200 bg-orange-50/55 hover:bg-orange-50 text-orange-700 dark:bg-orange-950/20 dark:hover:bg-orange-950/40 dark:text-orange-400 dark:border-orange-900/50">
          <GitMerge className="h-4 w-4" />
          Merge Duplicate Course Runs
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col p-6 overflow-hidden bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800">
        <DialogHeader className="pb-4 border-b border-slate-100 dark:border-slate-800">
          <DialogTitle className="text-xl font-bold text-slate-950 dark:text-slate-50 flex items-center gap-2">
            <GitMerge className="h-5 w-5 text-orange-600 dark:text-orange-400" />
            Duplicate Course Runs Manager
          </DialogTitle>
          <DialogDescription className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            Detect and resolve course runs sharing the exact same course project and start date. Shift enrollments, billing, and bookings to a single primary run, deleting duplicate runs.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-6 space-y-4">
          {step === "idle" && (
            <div className="flex flex-col items-center justify-center py-12 text-center space-y-4 bg-slate-50/50 dark:bg-slate-950/10 rounded-lg border border-dashed border-slate-200 dark:border-slate-800">
              <div className="p-3 bg-orange-50 dark:bg-orange-950/25 text-orange-600 dark:text-orange-400 rounded-full">
                <RefreshCw className="h-8 w-8 animate-spin-slow text-orange-600" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-800 dark:text-slate-200">No Scan Active</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mt-1">
                  Start scanning your database to look for course runs on the same date.
                </p>
              </div>
              <Button onClick={handleScan} disabled={loading} className="bg-orange-600 hover:bg-orange-700 text-white font-medium shadow-md shadow-orange-200/50 dark:shadow-none">
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Scan for Duplicates
              </Button>
            </div>
          )}

          {step === "scanned" && (
            <div className="space-y-4">
              {groups.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center space-y-4 bg-green-50/20 dark:bg-green-950/5 rounded-lg border border-dashed border-green-200 dark:border-green-900/50">
                  <div className="p-3 bg-green-50 dark:bg-green-950/25 text-green-600 dark:text-green-400 rounded-full">
                    <CheckCircle2 className="h-8 w-8 text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-green-800 dark:text-green-200">Clean Database</h3>
                    <p className="text-sm text-green-600/80 dark:text-green-400/80 max-w-sm mt-1">
                      Excellent! No duplicate course runs sharing identical course and start dates were detected.
                    </p>
                  </div>
                  <Button variant="outline" onClick={reset}>Scan Again</Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 p-4 rounded-lg flex gap-3 text-amber-800 dark:text-amber-300">
                    <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5 text-amber-600" />
                    <div>
                      <h4 className="font-semibold text-sm">Action Required</h4>
                      <p className="text-xs mt-0.5 leading-relaxed">
                        Detected <strong>{groups.length} groups</strong> of duplicate course runs. Merging will:
                      </p>
                      <ul className="list-disc list-inside text-xs mt-1.5 space-y-1 pl-1">
                        <li>Determine the primary run based on the oldest creation date.</li>
                        <li>Re-assign all learners, attendance, and billing records to the primary run.</li>
                        <li>Safely purge duplicate runs.</li>
                      </ul>
                    </div>
                  </div>

                  <div className="border border-slate-100 dark:border-slate-800 rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader className="bg-slate-50 dark:bg-slate-900">
                        <TableRow>
                          <TableHead>Course Name</TableHead>
                          <TableHead className="w-32">Start Date</TableHead>
                          <TableHead className="w-24 text-center">Copies</TableHead>
                          <TableHead className="w-32 text-center">Total Learners</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {groups.map((group, idx) => (
                          <TableRow key={idx}>
                            <TableCell className="font-medium text-slate-900 dark:text-slate-100">
                              <div>{group.courseName}</div>
                              <div className="text-xs text-slate-400 font-mono mt-0.5">{group.courseCode}</div>
                            </TableCell>
                            <TableCell className="text-slate-600 dark:text-slate-350">{group.startDate}</TableCell>
                            <TableCell className="text-center font-semibold text-orange-600">{group.runs.length}</TableCell>
                            <TableCell className="text-center">{group.learnerCount}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </div>
          )}

          {step === "result" && results && (
            <div className="space-y-6">
              <div className="flex flex-col items-center justify-center text-center space-y-3 bg-green-50/20 dark:bg-green-950/5 p-6 rounded-lg border border-green-100 dark:border-green-900/40">
                <CheckCircle2 className="h-10 w-10 text-green-600 dark:text-green-400" />
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-slate-150">Merge Operations Complete</h3>
                  <p className="text-sm text-slate-500 mt-0.5">Duplicates have been successfully consolidated into primary runs.</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 dark:bg-slate-950/20 p-4 rounded-lg border border-slate-100 dark:border-slate-800 text-center">
                  <div className="text-2xl font-bold text-slate-800 dark:text-slate-100">{results.mergedGroups}</div>
                  <div className="text-xs text-slate-500 mt-0.5">Groups Consolidated</div>
                </div>
                <div className="bg-slate-50 dark:bg-slate-950/20 p-4 rounded-lg border border-slate-100 dark:border-slate-800 text-center">
                  <div className="text-2xl font-bold text-red-600 dark:text-red-400">{results.deletedCount}</div>
                  <div className="text-xs text-slate-500 mt-0.5">Duplicate Runs Purged</div>
                </div>
                <div className="bg-slate-50 dark:bg-slate-950/20 p-4 rounded-lg border border-slate-100 dark:border-slate-800 text-center">
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{results.enrollmentsShifted}</div>
                  <div className="text-xs text-slate-500 mt-0.5">Enrollments Re-routed</div>
                </div>
                <div className="bg-slate-50 dark:bg-slate-950/20 p-4 rounded-lg border border-slate-100 dark:border-slate-800 text-center">
                  <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">{results.enrollmentsDeleted}</div>
                  <div className="text-xs text-slate-500 mt-0.5">Conflicting Enrollments Merged</div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
          {step === "scanned" && groups.length > 0 && (
            <>
              <Button variant="ghost" onClick={reset} disabled={merging}>
                Cancel
              </Button>
              <Button onClick={handleMerge} disabled={merging} className="bg-orange-600 hover:bg-orange-700 text-white font-medium">
                {merging && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Consolidate All Duplicates
              </Button>
            </>
          )}
          {step === "result" && (
            <Button onClick={reset} className="bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white">
              Done
            </Button>
          )}
          {step === "idle" && (
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Close
            </Button>
          )}
          {step === "scanned" && groups.length === 0 && (
            <Button onClick={() => setOpen(false)}>Close</Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
