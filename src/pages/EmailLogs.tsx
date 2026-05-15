import React, { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import PaginationControls from "@/components/ui/pagination";
import { emailLogsApi, emailRetryQueueApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { RefreshCw, Search, Mail, CheckCircle2, XCircle, Clock, RotateCcw, AlertCircle } from "lucide-react";
import { format } from "date-fns";

// ── Types ────────────────────────────────────────────────────────────────────

interface EmailLog {
  id: string;
  emailType: string;
  recipient: string;
  cc?: string | null;
  subject?: string | null;
  status: "PENDING" | "SENT" | "FAILED" | "RETRYING";
  attempts: number;
  lastAttemptAt?: string | null;
  sentAt?: string | null;
  messageId?: string | null;
  errorMessage?: string | null;
  errorCode?: string | null;
  provider?: string | null;
  errorCategory?: string | null;
  smtpResponse?: string | null;
  errorStack?: string | null;
  courseRunId?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
  retryQueueId?: string | null;
  courseRun?: {
    id: string;
    serialNumber?: string | null;
    course?: { title: string; courseCode?: string | null } | null;
  } | null;
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface StatsInfo {
  PENDING: number;
  SENT: number;
  FAILED: number;
  RETRYING: number;
}

interface RetryQueueJob {
  id: string;
  emailType: string;
  recipient: string;
  subject?: string | null;
  status: "PENDING" | "PROCESSING" | "SENT" | "ABANDONED";
  attempts: number;
  maxAttempts: number;
  nextRunAt: string;
  lastError?: string | null;
  errorCategory?: string | null;
  courseRunId?: string | null;
  createdAt: string;
  updatedAt: string;
  emailLogs?: { id: string; status: string; createdAt: string }[];
}

const EMAIL_TYPES = [
  { value: "all", label: "All Types" },
  { value: "TA_APPROVAL", label: "TA Approval" },
  { value: "COURSE_CONFIRMATION", label: "Course Confirmation" },
  { value: "TRAINER_ASSIGNMENT", label: "Trainer Assignment" },
  { value: "WAIVER_NOTIFICATION", label: "Waiver Notification" },
  { value: "COURSE_CANCELLATION", label: "Course Cancellation" },
  { value: "COURSE_COMPLETION", label: "Course Completion" },
  { value: "TRAINER_COMPLETION", label: "Trainer Completion" },
  { value: "PASSWORD_RESET", label: "Password Reset" },
  { value: "MFA_CODE", label: "MFA Code" },
  { value: "USER_SETUP", label: "User Setup" },
  { value: "POLWEL_USER_SETUP", label: "POLWEL User Setup" },
  { value: "TRAINER_SETUP", label: "Trainer Setup" },
  { value: "COORDINATOR_SETUP", label: "Coordinator Setup" },
];

const STATUSES = [
  { value: "all", label: "All Statuses" },
  { value: "PENDING", label: "Pending" },
  { value: "SENT", label: "Sent" },
  { value: "FAILED", label: "Failed" },
  { value: "RETRYING", label: "Retrying" },
];

const PROVIDERS = [
  { value: "all", label: "All Providers" },
  { value: "SMTP", label: "SMTP" },
  { value: "GRAPH_API", label: "Graph API" },
  { value: "MAILJET", label: "Mailjet" },
  { value: "NONE", label: "None (unconfigured)" },
];

const ERROR_CATEGORIES: Record<string, { label: string; color: string }> = {
  RATE_LIMIT: { label: "Rate Limit", color: "bg-orange-100 text-orange-800 border-orange-200" },
  AUTH_FAILED: { label: "Auth Failed", color: "bg-red-100 text-red-800 border-red-200" },
  NETWORK_ERROR: { label: "Network Error", color: "bg-blue-100 text-blue-800 border-blue-200" },
  SMTP_TIMEOUT: { label: "SMTP Timeout", color: "bg-yellow-100 text-yellow-800 border-yellow-200" },
  INVALID_RECIPIENT: { label: "Invalid Recipient", color: "bg-pink-100 text-pink-800 border-pink-200" },
  ATTACHMENT_ERROR: { label: "Attachment Error", color: "bg-purple-100 text-purple-800 border-purple-200" },
  CONFIG_ERROR: { label: "Config Error", color: "bg-gray-100 text-gray-800 border-gray-300" },
  GRAPH_API_ERROR: { label: "Graph API Error", color: "bg-indigo-100 text-indigo-800 border-indigo-200" },
  MAILJET_ERROR: { label: "Mailjet Error", color: "bg-cyan-100 text-cyan-800 border-cyan-200" },
  SERVICE_UNAVAILABLE: { label: "Service Unavailable", color: "bg-amber-100 text-amber-800 border-amber-200" },
  UNKNOWN: { label: "Unknown", color: "bg-gray-100 text-gray-600 border-gray-200" },
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function statusBadge(status: string) {
  switch (status) {
    case "SENT":
      return (
        <Badge className="bg-green-100 text-green-800 border-green-200">
          <CheckCircle2 className="w-3 h-3 mr-1" />
          Sent
        </Badge>
      );
    case "FAILED":
      return (
        <Badge className="bg-red-100 text-red-800 border-red-200">
          <XCircle className="w-3 h-3 mr-1" />
          Failed
        </Badge>
      );
    case "RETRYING":
      return (
        <Badge className="bg-orange-100 text-orange-800 border-orange-200">
          <RotateCcw className="w-3 h-3 mr-1" />
          Retrying
        </Badge>
      );
    case "PENDING":
    default:
      return (
        <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">
          <Clock className="w-3 h-3 mr-1" />
          Pending
        </Badge>
      );
  }
}

function formatEmailType(type: string): string {
  return type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return "—";
  try {
    return format(new Date(dateStr), "d MMM yyyy, HH:mm");
  } catch {
    return dateStr;
  }
}

// ── Component ────────────────────────────────────────────────────────────────

export default function EmailLogs() {
  const { toast } = useToast();

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [providerFilter, setProviderFilter] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Pagination
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(25);

  // Data
  const [logs, setLogs] = useState<EmailLog[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo>({ page: 1, limit: 25, total: 0, totalPages: 0 });
  const [stats, setStats] = useState<StatsInfo>({ PENDING: 0, SENT: 0, FAILED: 0, RETRYING: 0 });
  const [loading, setLoading] = useState(false);
  const [statsLoading, setStatsLoading] = useState(false);

  // Detail modal
  const [selectedLog, setSelectedLog] = useState<EmailLog | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // Retry Queue tab
  const [activeTab, setActiveTab] = useState<"logs" | "retryQueue">("logs");
  const [retryJobs, setRetryJobs] = useState<RetryQueueJob[]>([]);
  const [retryPagination, setRetryPagination] = useState<PaginationInfo>({ page: 1, limit: 25, total: 0, totalPages: 0 });
  const [retryLoading, setRetryLoading] = useState(false);
  const [retryStatusFilter, setRetryStatusFilter] = useState("all");

  const loadRetryQueue = useCallback(async () => {
    setRetryLoading(true);
    try {
      const res = await emailRetryQueueApi.getAll({
        page: retryPagination.page,
        limit: 25,
        ...(retryStatusFilter !== "all" ? { status: retryStatusFilter } : {}),
      });
      if (res?.success) {
        setRetryJobs(res.data);
        setRetryPagination((p) => ({ ...p, ...res.pagination }));
      }
    } catch {
      toast({ title: "Error", description: "Failed to load retry queue", variant: "destructive" });
    } finally {
      setRetryLoading(false);
    }
  }, [retryPagination.page, retryStatusFilter, toast]);

  const handleCancelRetryJob = async (id: string) => {
    try {
      await emailRetryQueueApi.cancel(id);
      toast({ title: "Cancelled", description: "Retry job has been abandoned." });
      void loadRetryQueue();
    } catch {
      toast({ title: "Error", description: "Failed to cancel retry job", variant: "destructive" });
    }
  };

  useEffect(() => {
    if (activeTab === "retryQueue") void loadRetryQueue();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, retryStatusFilter, retryPagination.page]);

  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const res = await emailLogsApi.getStats({ startDate: startDate || undefined, endDate: endDate || undefined });
      if (res?.success) setStats(res.stats);
    } catch {
      // silently ignore stats errors
    } finally {
      setStatsLoading(false);
    }
  }, [startDate, endDate]);

  const loadLogs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await emailLogsApi.getAll({
        page,
        limit: perPage,
        status: statusFilter !== "all" ? statusFilter : undefined,
        emailType: typeFilter !== "all" ? typeFilter : undefined,
        provider: providerFilter !== "all" ? providerFilter : undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        search: search || undefined,
      });

      if (res?.success) {
        setLogs(res.logs || []);
        setPagination(res.pagination || { page: 1, limit: perPage, total: 0, totalPages: 0 });
      }
    } catch (err: any) {
      toast({ title: "Error", description: err?.message || "Failed to load email logs", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [page, perPage, statusFilter, typeFilter, providerFilter, startDate, endDate, search, toast]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    loadLogs();
  }

  function handleReset() {
    setSearch("");
    setStatusFilter("all");
    setTypeFilter("all");
    setProviderFilter("all");
    setStartDate("");
    setEndDate("");
    setPage(1);
  }

  async function openDetail(log: EmailLog) {
    try {
      const res = await emailLogsApi.getById(log.id);
      setSelectedLog(res?.success ? res.log : log);
    } catch {
      setSelectedLog(log);
    }
    setDetailOpen(true);
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Email Logs</h1>
          <p className="text-sm text-gray-500 mt-1">Monitor all outbound emails sent by the system</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            loadLogs();
            loadStats();
          }}
          disabled={loading}
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatsCard icon={<Mail className="w-5 h-5 text-gray-500" />} label="Pending" value={stats.PENDING} color="yellow" loading={statsLoading} />
        <StatsCard icon={<CheckCircle2 className="w-5 h-5 text-green-600" />} label="Sent" value={stats.SENT} color="green" loading={statsLoading} />
        <StatsCard icon={<XCircle className="w-5 h-5 text-red-600" />} label="Failed" value={stats.FAILED} color="red" loading={statsLoading} />
        <StatsCard icon={<RotateCcw className="w-5 h-5 text-orange-500" />} label="Retrying" value={stats.RETRYING} color="orange" loading={statsLoading} />
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b">
        <button
          onClick={() => setActiveTab("logs")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === "logs" ? "border-blue-600 text-blue-700" : "border-transparent text-gray-500 hover:text-gray-700"}`}
        >
          <Mail className="w-4 h-4 inline mr-1.5" />
          Email Logs
        </button>
        <button
          onClick={() => setActiveTab("retryQueue")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === "retryQueue" ? "border-blue-600 text-blue-700" : "border-transparent text-gray-500 hover:text-gray-700"}`}
        >
          <RotateCcw className="w-4 h-4 inline mr-1.5" />
          Retry Queue
        </button>
      </div>

      {activeTab === "retryQueue" && (
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">Auto-Retry Queue</CardTitle>
              <CardDescription>Failed emails scheduled for automatic retry (up to 10 attempts, 3 min intervals)</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Select value={retryStatusFilter} onValueChange={setRetryStatusFilter}>
                <SelectTrigger className="w-36 h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="PROCESSING">Processing</SelectItem>
                  <SelectItem value="SENT">Sent</SelectItem>
                  <SelectItem value="ABANDONED">Abandoned</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" onClick={() => void loadRetryQueue()} disabled={retryLoading}>
                <RefreshCw className={`w-4 h-4 ${retryLoading ? "animate-spin" : ""}`} />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Created</TableHead>
                    <TableHead className="text-xs">Type</TableHead>
                    <TableHead className="text-xs">Recipient</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                    <TableHead className="text-xs">Attempts</TableHead>
                    <TableHead className="text-xs">Next Retry</TableHead>
                    <TableHead className="text-xs">Last Error</TableHead>
                    <TableHead className="text-xs"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {retryLoading ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-10 text-gray-400">
                        <RefreshCw className="w-5 h-5 animate-spin mx-auto" />
                      </TableCell>
                    </TableRow>
                  ) : retryJobs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-10 text-gray-400">
                        <RotateCcw className="w-6 h-6 mx-auto mb-1 opacity-40" />
                        <span className="text-sm">No retry jobs found</span>
                      </TableCell>
                    </TableRow>
                  ) : (
                    retryJobs.map((job) => (
                      <TableRow key={job.id}>
                        <TableCell className="text-xs text-gray-500 whitespace-nowrap">{formatDate(job.createdAt)}</TableCell>
                        <TableCell className="text-xs font-medium">{formatEmailType(job.emailType)}</TableCell>
                        <TableCell className="text-xs max-w-[180px] truncate" title={job.recipient}>
                          {job.recipient}
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={`text-xs ${job.status === "SENT" ? "bg-green-100 text-green-800" : job.status === "ABANDONED" ? "bg-red-100 text-red-800" : job.status === "PROCESSING" ? "bg-blue-100 text-blue-800" : "bg-yellow-100 text-yellow-800"}`}
                          >
                            {job.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-center">
                          {job.attempts}/{job.maxAttempts}
                        </TableCell>
                        <TableCell className="text-xs text-gray-500 whitespace-nowrap">
                          {job.status === "PENDING" || job.status === "PROCESSING" ? formatDate(job.nextRunAt) : "—"}
                        </TableCell>
                        <TableCell className="text-xs text-red-600 max-w-[180px] truncate" title={job.lastError ?? undefined}>
                          {job.lastError || "—"}
                        </TableCell>
                        <TableCell>
                          {(job.status === "PENDING" || job.status === "PROCESSING") && (
                            <Button variant="ghost" size="sm" className="text-xs text-red-600 h-7 px-2" onClick={() => handleCancelRetryJob(job.id)}>
                              Cancel
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
            {retryPagination.totalPages > 1 && (
              <div className="p-4 border-t">
                <PaginationControls
                  page={retryPagination.page}
                  perPage={25}
                  total={retryPagination.total}
                  onPageChange={(p) => setRetryPagination((prev) => ({ ...prev, page: p }))}
                  onPerPageChange={() => {}}
                />
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === "logs" && (
        <>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Filters</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSearch} className="flex flex-wrap gap-3 items-end">
                <div className="flex-1 min-w-[200px]">
                  <label className="text-xs text-gray-500 mb-1 block">Search recipient / subject / error</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
                  </div>
                </div>

                <div className="w-44">
                  <label className="text-xs text-gray-500 mb-1 block">Status</label>
                  <Select
                    value={statusFilter}
                    onValueChange={(v) => {
                      setStatusFilter(v);
                      setPage(1);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUSES.map((s) => (
                        <SelectItem key={s.value} value={s.value}>
                          {s.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="w-52">
                  <label className="text-xs text-gray-500 mb-1 block">Email Type</label>
                  <Select
                    value={typeFilter}
                    onValueChange={(v) => {
                      setTypeFilter(v);
                      setPage(1);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {EMAIL_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-xs text-gray-500 mb-1 block">From</label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => {
                      setStartDate(e.target.value);
                      setPage(1);
                    }}
                    className="w-40"
                  />
                </div>

                <div>
                  <label className="text-xs text-gray-500 mb-1 block">To</label>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => {
                      setEndDate(e.target.value);
                      setPage(1);
                    }}
                    className="w-40"
                  />
                </div>

                <div className="w-44">
                  <label className="text-xs text-gray-500 mb-1 block">Provider</label>
                  <Select
                    value={providerFilter}
                    onValueChange={(v) => {
                      setProviderFilter(v);
                      setPage(1);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PROVIDERS.map((p) => (
                        <SelectItem key={p.value} value={p.value}>
                          {p.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex gap-2">
                  <Button type="submit" disabled={loading} size="sm">
                    <Search className="w-4 h-4 mr-2" />
                    Apply
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={handleReset}>
                    Reset
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Table */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Log Entries</CardTitle>
                <CardDescription>
                  {pagination.total} total record{pagination.total !== 1 ? "s" : ""}
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead className="w-40">Date / Time</TableHead>
                      <TableHead className="w-44">Type</TableHead>
                      <TableHead>Recipient(s)</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead className="w-28">Status</TableHead>
                      <TableHead className="w-24">Provider</TableHead>
                      <TableHead className="w-20 text-center">Attempts</TableHead>
                      <TableHead className="w-40">Course Run</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-12 text-gray-400">
                          <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" />
                          Loading…
                        </TableCell>
                      </TableRow>
                    ) : logs.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-12 text-gray-400">
                          <Mail className="w-8 h-8 mx-auto mb-2 opacity-40" />
                          No email logs found
                        </TableCell>
                      </TableRow>
                    ) : (
                      logs.map((log) => (
                        <TableRow key={log.id} className="cursor-pointer hover:bg-blue-50 transition-colors" onClick={() => openDetail(log)}>
                          <TableCell className="text-xs text-gray-500 whitespace-nowrap">{formatDate(log.createdAt)}</TableCell>
                          <TableCell className="text-xs font-medium">{formatEmailType(log.emailType)}</TableCell>
                          <TableCell className="text-xs max-w-[200px] truncate" title={log.recipient}>
                            {log.recipient}
                          </TableCell>
                          <TableCell className="text-xs max-w-[220px] truncate text-gray-600" title={log.subject ?? undefined}>
                            {log.subject || "—"}
                          </TableCell>
                          <TableCell>{statusBadge(log.status)}</TableCell>
                          <TableCell>{log.provider ? providerBadge(log.provider) : <span className="text-gray-400 text-xs">—</span>}</TableCell>
                          <TableCell className="text-center text-sm font-medium">{log.attempts}</TableCell>
                          <TableCell className="text-xs text-gray-500">
                            {log.courseRun ? <span className="font-mono">{log.courseRun.serialNumber || log.courseRun.id.slice(0, 8)}</span> : "—"}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {pagination.totalPages > 1 && (
                <div className="p-4 border-t">
                  <PaginationControls
                    page={page}
                    perPage={perPage}
                    total={pagination.total}
                    onPageChange={setPage}
                    onPerPageChange={(n) => {
                      setPerPage(n);
                      setPage(1);
                    }}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Detail Modal */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5" />
              Email Log Detail
            </DialogTitle>
            <DialogDescription>{selectedLog ? formatDate(selectedLog.createdAt) : ""}</DialogDescription>
          </DialogHeader>
          {selectedLog && <LogDetail log={selectedLog} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function providerBadge(provider: string) {
  const colorMap: Record<string, string> = {
    SMTP: "bg-blue-100 text-blue-800 border-blue-200",
    GRAPH_API: "bg-indigo-100 text-indigo-800 border-indigo-200",
    MAILJET: "bg-cyan-100 text-cyan-800 border-cyan-200",
    NONE: "bg-gray-100 text-gray-600 border-gray-200",
  };
  const cls = colorMap[provider] ?? "bg-gray-100 text-gray-600 border-gray-200";
  return <Badge className={`text-xs ${cls}`}>{provider}</Badge>;
}

function StatsCard({
  icon,
  label,
  value,
  color,
  loading,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: "yellow" | "green" | "red" | "orange";
  loading: boolean;
}) {
  const colorMap = {
    yellow: "bg-yellow-50 border-yellow-200",
    green: "bg-green-50  border-green-200",
    red: "bg-red-50    border-red-200",
    orange: "bg-orange-50 border-orange-200",
  };
  return (
    <div className={`rounded-lg border p-4 flex items-center gap-3 ${colorMap[color]}`}>
      {icon}
      <div>
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-xl font-bold text-gray-900">{loading ? <span className="text-gray-300">…</span> : value.toLocaleString()}</p>
      </div>
    </div>
  );
}

function LogDetail({ log }: { log: EmailLog }) {
  return (
    <div className="space-y-4 text-sm">
      <DetailRow label="ID" value={<span className="font-mono text-xs">{log.id}</span>} />
      <DetailRow label="Type" value={formatEmailType(log.emailType)} />
      <DetailRow label="Status" value={statusBadge(log.status)} />
      <DetailRow label="Attempts" value={String(log.attempts)} />
      <DetailRow label="Recipient" value={log.recipient} />
      {log.cc && <DetailRow label="CC" value={log.cc} />}
      {log.subject && <DetailRow label="Subject" value={log.subject} />}
      {log.messageId && <DetailRow label="Message ID" value={<span className="font-mono text-xs">{log.messageId}</span>} />}
      {log.provider && <DetailRow label="Provider" value={providerBadge(log.provider)} />}
      <DetailRow label="Created" value={formatDate(log.createdAt)} />
      <DetailRow label="Last Attempt" value={formatDate(log.lastAttemptAt)} />
      {log.sentAt && <DetailRow label="Sent At" value={formatDate(log.sentAt)} />}
      {log.courseRun && (
        <DetailRow
          label="Course Run"
          value={
            <span>
              {log.courseRun.serialNumber || log.courseRun.id} {log.courseRun.course && <span className="text-gray-500">— {log.courseRun.course.title}</span>}
            </span>
          }
        />
      )}
      {log.errorMessage && (
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 flex items-center gap-1">
            <AlertCircle className="w-3 h-3 text-red-500" /> Error
          </p>
          {log.errorCategory &&
            (() => {
              const cat = ERROR_CATEGORIES[log.errorCategory] ?? { label: log.errorCategory, color: "bg-gray-100 text-gray-600 border-gray-200" };
              return <Badge className={`text-xs mb-2 ${cat.color}`}>{cat.label}</Badge>;
            })()}
          <div className="bg-red-50 border border-red-200 rounded p-3 text-xs text-red-700 font-mono whitespace-pre-wrap break-all">
            {log.errorCode && <span className="font-bold">[{log.errorCode}] </span>}
            {log.errorMessage}
          </div>
        </div>
      )}
      {log.smtpResponse && (
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Transport Response</p>
          <pre className="bg-gray-50 border rounded p-3 text-xs overflow-auto max-h-24 text-gray-700 whitespace-pre-wrap break-all">{log.smtpResponse}</pre>
        </div>
      )}
      {log.errorStack && (
        <details className="mt-1">
          <summary className="text-xs font-semibold text-gray-500 uppercase tracking-wide cursor-pointer select-none">Stack Trace</summary>
          <pre className="mt-2 bg-gray-50 border rounded p-3 text-xs overflow-auto max-h-40 text-gray-600 whitespace-pre-wrap break-all">{log.errorStack}</pre>
        </details>
      )}
      {log.metadata && (
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Metadata</p>
          <pre className="bg-gray-50 border rounded p-3 text-xs overflow-auto max-h-40 text-gray-700">{JSON.stringify(log.metadata, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <span className="w-28 shrink-0 text-xs font-semibold text-gray-500 uppercase tracking-wide pt-0.5">{label}</span>
      <span className="flex-1 text-gray-800 break-all">{value}</span>
    </div>
  );
}
