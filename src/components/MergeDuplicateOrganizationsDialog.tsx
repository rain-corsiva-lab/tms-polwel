import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, AlertTriangle, CheckCircle2, GitMerge, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { organizationsApi } from "@/lib/api";

interface OrgInfo {
  id: string;
  name: string;
  createdAt: string;
  buNumber: string | null;
  organizationType: string;
}

interface DuplicateGroup {
  name: string;
  count: number;
  learnerCount: number;
  primary: OrgInfo;
  duplicates: OrgInfo[];
}

interface MergeResults {
  mergedGroups: number;
  deletedCount: number;
  mergedLearners: number;
  deletedLearners: number;
  mergedCoordinators: number;
  deletedCoordinators: number;
  referencesUpdated: {
    courseRunLearners: number;
    bookings: number;
    users: number;
    courseRuns: number;
  };
}

export function MergeDuplicateOrganizationsDialog() {
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
      const response = await organizationsApi.getDuplicates();
      if (response.success) {
        setGroups(response.groups || []);
        setStep("scanned");
        toast({
          title: "Scan complete",
          description: `Detected ${response.count} groups of duplicate organizations.`,
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
      const response = await organizationsApi.mergeDuplicates();
      if (response.success) {
        setResults({
          mergedGroups: response.mergedGroups,
          deletedCount: response.deletedCount,
          mergedLearners: response.mergedLearners,
          deletedLearners: response.deletedLearners,
          mergedCoordinators: response.mergedCoordinators,
          deletedCoordinators: response.deletedCoordinators,
          referencesUpdated: response.referencesUpdated,
        });
        setStep("result");
        toast({
          title: "Merge complete",
          description: `Successfully merged duplicate client organizations.`,
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
        <Button variant="outline" className="flex items-center gap-2 border-indigo-200 bg-indigo-50/55 hover:bg-indigo-50 text-indigo-700 dark:bg-indigo-950/20 dark:hover:bg-indigo-950/40 dark:text-indigo-400 dark:border-indigo-900/50">
          <GitMerge className="h-4 w-4" />
          Merge Duplicate Organizations
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col p-6 overflow-hidden bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800">
        <DialogHeader className="pb-4 border-b border-slate-100 dark:border-slate-800">
          <DialogTitle className="text-xl font-bold text-slate-950 dark:text-slate-50 flex items-center gap-2">
            <GitMerge className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            Duplicate Organizations Manager
          </DialogTitle>
          <DialogDescription className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            Detect and resolve organizations sharing identical names. Automatically shifts learners, bookings, coordinators, and runs to a single primary organization, deleting redundant copies.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-6 space-y-4">
          {step === "idle" && (
            <div className="flex flex-col items-center justify-center py-12 text-center space-y-4 bg-slate-50/50 dark:bg-slate-950/10 rounded-lg border border-dashed border-slate-200 dark:border-slate-800">
              <div className="p-3 bg-indigo-50 dark:bg-indigo-950/25 text-indigo-600 dark:text-indigo-400 rounded-full">
                <RefreshCw className="h-8 w-8 animate-spin-slow" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-800 dark:text-slate-200">No Scan Active</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mt-1">
                  Start scanning your database to look for client organizations with matching names.
                </p>
              </div>
              <Button onClick={handleScan} disabled={loading} className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium shadow-md shadow-indigo-200/50 dark:shadow-none">
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Scan for Duplicates
              </Button>
            </div>
          )}

          {step === "scanned" && (
            <div className="space-y-6">
              {groups.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center space-y-3 bg-emerald-50/30 dark:bg-emerald-950/10 border border-emerald-100 dark:border-emerald-900/30 rounded-lg">
                  <CheckCircle2 className="h-10 w-10 text-emerald-600 dark:text-emerald-400" />
                  <div>
                    <h3 className="font-semibold text-slate-800 dark:text-slate-200">No Duplicates Found</h3>
                    <p className="text-sm text-emerald-600/80 dark:text-emerald-400/80 max-w-sm mt-1">
                      Your database is clean! No organizations sharing the same name were detected.
                    </p>
                  </div>
                  <Button variant="outline" onClick={handleScan} disabled={loading} className="mt-2">
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Scan Again
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-start gap-3 p-4 bg-amber-55/10 dark:bg-amber-950/10 border border-amber-200/50 dark:border-amber-900/30 rounded-lg text-amber-800 dark:text-amber-300">
                    <AlertTriangle className="h-5 w-5 mt-0.5 flex-shrink-0" />
                    <div className="text-sm leading-relaxed">
                      <p className="font-semibold">Merge Confirmation Warning</p>
                      <p className="opacity-90 mt-0.5">
                        Merging will permanently delete the <strong>{groups.reduce((acc, g) => acc + (g.count - 1), 0)} redundant copies</strong> listed below. All associated learners, bookings, users, and dedicated runs will be safely reassigned to the oldest primary organization (created first).
                      </p>
                    </div>
                  </div>

                  <div className="border border-slate-100 dark:border-slate-800 rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader className="bg-slate-50 dark:bg-slate-900/55">
                        <TableRow>
                          <TableHead className="font-semibold text-slate-700 dark:text-slate-350">Organization Name</TableHead>
                          <TableHead className="font-semibold text-slate-700 dark:text-slate-350 text-center">Duplicates</TableHead>
                          <TableHead className="font-semibold text-slate-700 dark:text-slate-350 text-center">Connected Learners</TableHead>
                          <TableHead className="font-semibold text-slate-700 dark:text-slate-350">Primary Org (Created On)</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {groups.map((group, idx) => (
                          <TableRow key={idx} className="border-b border-slate-100 dark:border-slate-850 hover:bg-slate-50/30">
                            <TableCell className="font-medium text-slate-900 dark:text-slate-100">{group.name}</TableCell>
                            <TableCell className="text-center font-semibold text-indigo-600 dark:text-indigo-400">{group.count}</TableCell>
                            <TableCell className="text-center font-semibold text-amber-600 dark:text-amber-400">{group.learnerCount}</TableCell>
                            <TableCell className="text-xs text-slate-500 dark:text-slate-400">
                              {new Date(group.primary.createdAt).toLocaleDateString("en-GB", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              })}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  <div className="flex justify-between items-center pt-2">
                    <Button variant="outline" onClick={handleScan} disabled={loading || merging}>
                      {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Re-scan
                    </Button>
                    <Button onClick={handleMerge} disabled={merging} className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium shadow-md shadow-indigo-200/50 dark:shadow-none">
                      {merging && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Merge All Detected Duplicates
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {step === "result" && results && (
            <div className="space-y-6">
              <div className="flex flex-col items-center justify-center text-center p-6 bg-emerald-50/20 dark:bg-emerald-950/15 border border-emerald-250 dark:border-emerald-900/35 rounded-xl space-y-3">
                <div className="p-3 bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-full">
                  <CheckCircle2 className="h-10 w-10 animate-bounce" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-slate-150">Merge Successfully Completed</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-450 mt-1">
                    Redundant database records have been purged, and reference constraints updated.
                  </p>
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-slate-950/20 p-5 rounded-lg border border-slate-100 dark:border-slate-800 space-y-4">
                <h4 className="font-semibold text-slate-800 dark:text-slate-200 text-sm uppercase tracking-wider">Operations Log</h4>
                <ul className="text-sm space-y-2.5 text-slate-650 dark:text-slate-350">
                  <li className="flex justify-between border-b border-slate-100 dark:border-slate-850 pb-1.5">
                    <span>Groups resolved & combined:</span>
                    <strong className="text-slate-900 dark:text-slate-100">{results.mergedGroups} groups</strong>
                  </li>
                  <li className="flex justify-between border-b border-slate-100 dark:border-slate-850 pb-1.5">
                    <span>Redundant organizations deleted:</span>
                    <strong className="text-rose-600 dark:text-rose-400">{results.deletedCount} organizations</strong>
                  </li>
                  <li className="flex justify-between border-b border-slate-100 dark:border-slate-850 pb-1.5 font-semibold text-emerald-650 dark:text-emerald-400">
                    <span>Duplicate learners merged:</span>
                    <strong className="text-emerald-650 dark:text-emerald-400">{results.deletedLearners} participants ({results.mergedLearners} unique)</strong>
                  </li>
                  <li className="flex justify-between border-b border-slate-100 dark:border-slate-850 pb-1.5 font-semibold text-emerald-650 dark:text-emerald-400">
                    <span>Duplicate coordinators merged:</span>
                    <strong className="text-emerald-650 dark:text-emerald-400">{results.deletedCoordinators} users ({results.mergedCoordinators} unique)</strong>
                  </li>
                  <li className="flex justify-between border-b border-slate-100 dark:border-slate-850 pb-1.5">
                    <span>Learner enrollments updated:</span>
                    <strong className="text-indigo-600 dark:text-indigo-400">{results.referencesUpdated.courseRunLearners} records</strong>
                  </li>
                  <li className="flex justify-between border-b border-slate-100 dark:border-slate-850 pb-1.5">
                    <span>Active bookings updated:</span>
                    <strong className="text-indigo-600 dark:text-indigo-400">{results.referencesUpdated.bookings} records</strong>
                  </li>
                  <li className="flex justify-between border-b border-slate-100 dark:border-slate-850 pb-1.5">
                    <span>Associated users redirected:</span>
                    <strong className="text-indigo-600 dark:text-indigo-400">{results.referencesUpdated.users} users</strong>
                  </li>
                  <li className="flex justify-between pb-0.5">
                    <span>Dedicated course runs redirected:</span>
                    <strong className="text-indigo-600 dark:text-indigo-400">{results.referencesUpdated.courseRuns} runs</strong>
                  </li>
                </ul>
              </div>

              <div className="flex justify-end pt-2">
                <Button onClick={() => handleClose(false)} className="bg-slate-800 hover:bg-slate-900 text-white font-medium">
                  Close Manager
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
