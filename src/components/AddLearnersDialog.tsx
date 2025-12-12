import React, { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Users, User, Trash2, ChevronsUpDown, Check, FileDown, FileSpreadsheet, Loader2, UploadCloud } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { isValidEmail } from "@/lib/validators";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { courseRunsApi, clientOrganizationsApi } from "@/lib/api";
import { cn } from "@/lib/utils";
import * as XLSX from "xlsx";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface Course {
  id: string;
  title: string;
  defaultCourseFee: number;
  discounts?: Array<{ id: string; name: string; percentage: number }>;
}

interface CourseRun {
  id: string;
  course: Course;
  baseCourseFee?: number | null;
}

interface Organization {
  id: string;
  name: string;
  buNumber?: string;
  organizationType?: string;
}

interface TrainingCoordinator {
  id: string;
  name: string;
  email?: string;
  contactNumber?: string;
  isPrimaryCoordinator?: boolean;
}

interface Learner {
  id: string;
  fullname: string;
  designation?: string;
  email?: string;
  contact?: string;
  clientOrganizationId?: string;
  clientOrganizationName?: string;
  clientOrganizationBuNumber?: string;
  departmentName?: string;
  status?: string;
  trainingCoordinatorId?: string;
  trainingCoordinatorName?: string;
  trainingCoordinatorEmail?: string;
  trainingCoordinatorPhone?: string;
}

interface SingleRegistrationData {
  selectedLearnerId?: string | null;
  fullName: string;
  designation: string;
  email: string;
  contactNumber: string;
  organizationType: string;
  division: string;
  departmentName: string;
  buNumber: string;
  paymentMode: string;
  trainingCoordinatorId: string;
  trainingCoordinatorEmail: string;
  trainingCoordinatorPhone: string;
  currentDefaultCourseFee: number;
  discountId?: string | null;
  discountPercentage: number;
  totalFees: number;
  feesRemarks: string;
  invoiceNumber: string;
  remarks: string;
}

interface GroupLearnerData {
  selectedLearnerId?: string | null;
  fullName: string;
  designation: string;
  email: string;
  contactNumber: string;
}

interface GroupRegistrationData {
  organizationType: string;
  division: string;
  departmentName: string;
  buNumber: string;
  paymentMode: string;
  trainingCoordinatorId: string;
  trainingCoordinatorEmail: string;
  trainingCoordinatorPhone: string;
  currentDefaultCourseFee: number;
  discountId?: string | null;
  discountPercentage: number;
  totalFees: number;
  feesRemarks: string;
  invoiceNumber: string;
  learners: GroupLearnerData[];
  remarks: string;
}

interface AddLearnersDialogProps {
  courseRun?: CourseRun;
  courseRunId?: string;
  baseCourseFee?: number;
  onSuccess?: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  triggerLabel?: string;
}

interface SearchableSelectOption {
  value: string;
  label: string;
  description?: string;
  meta?: Record<string, any>;
}

interface SearchableSelectProps {
  value?: string | null;
  onValueChange: (value: string) => void;
  options: SearchableSelectOption[];
  placeholder?: string;
  disabled?: boolean;
  emptyMessage?: string;
  className?: string;
  clearOption?: SearchableSelectOption;
}

interface ImportLearnerRow {
  name: string;
  email: string;
  contact?: string;
  designation?: string;
  clientOrganizationName: string;
  department?: string;
  paymentMethod?: string;
  coordinatorEmail?: string;
  discountName?: string;
  feesRemarks?: string;
  invoiceRemarks?: string;
  remarks?: string;
}

interface ImportLearnerResultSummary {
  imported: number;
  failed: number;
  successes: Array<{ row: number; learnerId: string; learnerName: string }>;
  errors: Array<{ row: number; email?: string; name?: string; reason: string }>;
}

const IMPORT_TEMPLATE_COLUMNS: Array<{ header: string; key: keyof ImportLearnerRow; required?: boolean; example?: string }> = [
  { header: "Name", key: "name", required: true, example: "Jane Doe" },
  { header: "Email", key: "email", required: true, example: "jane.doe@example.com" },
  { header: "Contact", key: "contact", example: "+65 6123 4567" },
  { header: "Designation", key: "designation", example: "Training Officer" },
  { header: "Client Organization Name", key: "clientOrganizationName", required: true, example: "Singapore Police Force" },
  { header: "Department", key: "department", example: "Operations" },
  { header: "Payment Method", key: "paymentMethod", example: "Company-Sponsored (Non-Home Team)" },
  { header: "Coordinator Email", key: "coordinatorEmail", example: "coordinator@example.com" },
  { header: "Discount Name", key: "discountName", example: "Home Team Subsidy" },
  { header: "Fees Remarks", key: "feesRemarks" },
  { header: "Invoice Remarks", key: "invoiceRemarks" },
  { header: "Remarks", key: "remarks" },
];

// Mapping from display labels to enum values
const PAYMENT_MODES_MAP: Record<string, string> = {
  "Self-Payment": "SELF_SPONSORED",
  "Transition Dollar (TS)": "TRANSITION_DOLLARS",
  "Unit Local Training Fund (ULTF)": "ULTF",
  "Company-Sponsored (Non-Home Team)": "COMPANY_BILLING",
  "Polwel Training Subsidy": "GOVERNMENT_FUNDING",
};

const PAYMENT_MODES = [
  "Self-Payment",
  "Transition Dollar (TS)",
  "Unit Local Training Fund (ULTF)",
  "Company-Sponsored (Non-Home Team)",
  "Polwel Training Subsidy",
];

const SearchableSelect: React.FC<SearchableSelectProps> = ({
  value,
  onValueChange,
  options,
  placeholder = "Select an option",
  disabled = false,
  emptyMessage = "No results found",
  className,
  clearOption,
}) => {
  const [open, setOpen] = useState(false);
  const selectedOption = options.find((option) => option.value === value) || (clearOption && clearOption.value === value ? clearOption : undefined);

  const handleSelect = (nextValue: string) => {
    onValueChange(nextValue);
    setOpen(false);
  };

  const buttonLabel = selectedOption?.label || placeholder;

  return (
    <Popover open={open && !disabled} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn("w-full justify-between", className, disabled && "cursor-not-allowed bg-gray-50 text-muted-foreground")}
        >
          <span className="truncate text-left">{buttonLabel}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[320px] p-0" align="start">
        <Command loop>
          <CommandInput placeholder="Search..." className="h-9" />
          <CommandList>
            <CommandEmpty>{emptyMessage}</CommandEmpty>
            {clearOption && (
              <CommandItem key="__clear" value={clearOption.value} onSelect={() => handleSelect(clearOption.value)}>
                <Check className={cn("mr-2 h-4 w-4", value === clearOption.value ? "opacity-100" : "opacity-0")} />
                <span>{clearOption.label}</span>
              </CommandItem>
            )}
            <CommandGroup>
              {options.map((option) => (
                <CommandItem key={option.value} value={`${option.label} ${option.description ?? ""}`.trim()} onSelect={() => handleSelect(option.value)}>
                  <Check className={cn("mr-2 h-4 w-4", value === option.value ? "opacity-100" : "opacity-0")} />
                  <div className="flex flex-col">
                    <span>{option.label}</span>
                    {option.description ? <span className="text-xs text-muted-foreground">{option.description}</span> : null}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

export const AddLearnersDialog: React.FC<AddLearnersDialogProps> = ({
  courseRun,
  courseRunId,
  baseCourseFee,
  onSuccess,
  open: controlledOpen,
  onOpenChange,
  triggerLabel,
}) => {
  // Runtime guard
  const resolvedCourseRunId = courseRun?.id || courseRunId || "";
  // Use baseCourseFee from course run data (preferred), fall back to baseCourseFee prop, then course default fee
  const effectiveBaseFee = courseRun?.baseCourseFee ?? baseCourseFee ?? courseRun?.course?.defaultCourseFee ?? 0;
  const discountsList: any[] = (courseRun?.course?.discounts as any[]) || [];

  if (!courseRun && !courseRunId) {
    // Render nothing if insufficient data; caller can pass the object or id
    return null;
  }
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const dialogOpen = isControlled ? controlledOpen! : internalOpen;
  const setDialogOpen = (next: boolean) => {
    if (!isControlled) {
      setInternalOpen(next);
    }
    onOpenChange?.(next);
  };
  const [mode, setMode] = useState<"single" | "group" | "import">("single");
  const [loading, setLoading] = useState(false);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [allLearners, setAllLearners] = useState<Learner[]>([]);
  const [learners, setLearners] = useState<Learner[]>([]);
  const [coordinators, setCoordinators] = useState<TrainingCoordinator[]>([]);
  const { toast } = useToast();

  // Single Registration State
  const [singleData, setSingleData] = useState<SingleRegistrationData>({
    fullName: "",
    designation: "",
    email: "",
    contactNumber: "",
    organizationType: "",
    division: "",
    departmentName: "",
    buNumber: "",
    paymentMode: "",
    trainingCoordinatorId: "",
    trainingCoordinatorEmail: "",
    trainingCoordinatorPhone: "",
    currentDefaultCourseFee: effectiveBaseFee,
    discountId: null,
    discountPercentage: 0,
    totalFees: effectiveBaseFee,
    feesRemarks: "",
    invoiceNumber: "",
    remarks: "",
  });

  // Group Registration State
  const [groupData, setGroupData] = useState<GroupRegistrationData>({
    organizationType: "",
    division: "",
    departmentName: "",
    buNumber: "",
    paymentMode: "",
    trainingCoordinatorId: "",
    trainingCoordinatorEmail: "",
    trainingCoordinatorPhone: "",
    currentDefaultCourseFee: effectiveBaseFee,
    discountId: null,
    discountPercentage: 0,
    totalFees: effectiveBaseFee,
    feesRemarks: "",
    invoiceNumber: "",
    learners: [
      {
        fullName: "",
        designation: "",
        email: "",
        contactNumber: "",
      },
    ],
    remarks: "",
  });

  const [importRows, setImportRows] = useState<ImportLearnerRow[]>([]);
  const [importFileName, setImportFileName] = useState<string>("");
  const [importParseErrors, setImportParseErrors] = useState<string[]>([]);
  const [importResult, setImportResult] = useState<ImportLearnerResultSummary | null>(null);
  const [importProcessing, setImportProcessing] = useState(false);

  // Load initial data
  useEffect(() => {
    if (dialogOpen) {
      loadOrganizations();
      loadAllLearners();
    }
  }, [dialogOpen]);

  const loadOrganizations = async () => {
    try {
      const response = await clientOrganizationsApi.getAll({ limit: 1000 });
      const orgs = Array.isArray(response?.organizations) ? response.organizations : [];
      setOrganizations(
        orgs.map((org: any) => ({
          id: org.id,
          name: org.name,
          buNumber: org.buNumber || "",
          organizationType: org.organizationType || "POLWEL",
        }))
      );
    } catch (error) {
      console.error("Failed to load organizations:", error);
      setOrganizations([]);
    }
  };

  const loadAllLearners = async () => {
    try {
      const response = await clientOrganizationsApi.getAllLearners({ limit: 1000 });
      const learnerList = Array.isArray(response?.learners) ? response.learners : Array.isArray(response?.data?.learners) ? response.data.learners : [];

      const mappedLearners: Learner[] = learnerList.map((learner: any) => ({
        id: learner.id,
        fullname: learner.fullname || learner.name || "",
        designation: learner.designation || learner.departmentName || "",
        email: learner.email || "",
        contact: learner.contact || learner.phone || "",
        clientOrganizationId: learner.clientOrganizationId || learner.organizationId,
        clientOrganizationName: learner.clientOrganizationName || learner.organizationName || learner.clientOrganization?.name || "",
        clientOrganizationBuNumber: learner.clientOrganizationBuNumber || learner.clientOrganization?.buNumber || learner.buNumber || "",
        departmentName: learner.departmentName || "",
        status: learner.status || (learner.deletedAt ? "INACTIVE" : "ACTIVE"),
        trainingCoordinatorId: learner.trainingCoordinatorId || learner.trainingCoordinator?.id,
        trainingCoordinatorName: learner.trainingCoordinatorName || learner.trainingCoordinator?.name || "",
        trainingCoordinatorEmail: learner.trainingCoordinatorEmail || learner.trainingCoordinator?.email || "",
        trainingCoordinatorPhone:
          learner.trainingCoordinatorPhone || learner.trainingCoordinator?.contactNumber || learner.trainingCoordinator?.phoneNumber || "",
      }));

      // Remove duplicates based on learner ID
      const uniqueLearners = Array.from(new Map(mappedLearners.map((learner) => [learner.id, learner])).values());

      setAllLearners(uniqueLearners);
      setLearners(uniqueLearners);
    } catch (error) {
      console.error("Failed to load learners:", error);
      setAllLearners([]);
      setLearners([]);
      const message = error instanceof Error ? error.message : "Unable to load learners. Please try again.";
      toast({
        variant: "destructive",
        title: "Learners unavailable",
        description: message,
      });
    }
  };

  useEffect(() => {
    const activeDivision = mode === "single" ? singleData.division : groupData.division;

    if (activeDivision) {
      setLearners(allLearners.filter((learner) => learner.clientOrganizationId === activeDivision));
    } else {
      setLearners(allLearners);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allLearners, mode, singleData.division, groupData.division]);

  const loadCoordinators = async (organizationId: string) => {
    if (!organizationId) {
      setCoordinators([]);
      return;
    }

    try {
      const response = await clientOrganizationsApi.getCoordinators(organizationId, { limit: 100, status: "all" });
      const coordinatorList = Array.isArray(response?.coordinators) ? response.coordinators : [];
      const mappedCoordinators: TrainingCoordinator[] = coordinatorList.map((coord: any) => ({
        id: coord.id,
        name: coord.name,
        email: coord.email,
        contactNumber: coord.contactNumber || "",
        isPrimaryCoordinator: coord.isPrimaryCoordinator,
      }));
      setCoordinators(mappedCoordinators);

      const primaryCoordinator = mappedCoordinators.find((c) => c.isPrimaryCoordinator);
      if (primaryCoordinator) {
        if (mode === "single") {
          setSingleData((prev) => ({
            ...prev,
            trainingCoordinatorId: primaryCoordinator.id,
            trainingCoordinatorEmail: primaryCoordinator.email || "",
            trainingCoordinatorPhone: primaryCoordinator.contactNumber || "",
          }));
        } else {
          setGroupData((prev) => ({
            ...prev,
            trainingCoordinatorId: primaryCoordinator.id,
            trainingCoordinatorEmail: primaryCoordinator.email || "",
            trainingCoordinatorPhone: primaryCoordinator.contactNumber || "",
          }));
        }
      }
    } catch (error) {
      console.error("Failed to load coordinators:", error);
      setCoordinators([]);
    }
  };

  // Calculate fees with discount
  const calculateTotalFees = (baseFee: number, discountPercentage: number): number => {
    const discountAmount = (baseFee * discountPercentage) / 100;
    return baseFee - discountAmount;
  };

  // Handle organization change
  const handleOrganizationChange = (organizationId: string, options: { preserveCoordinator?: boolean } = {}) => {
    const shouldResetCoordinator = !options.preserveCoordinator;
    const org = organizations.find((o) => o.id === organizationId);
    if (mode === "single") {
      setSingleData((prev) => ({
        ...prev,
        division: organizationId,
        buNumber: org?.buNumber || "",
        ...(shouldResetCoordinator ? { trainingCoordinatorId: "", trainingCoordinatorEmail: "", trainingCoordinatorPhone: "" } : {}),
      }));
    } else {
      setGroupData((prev) => ({
        ...prev,
        division: organizationId,
        buNumber: org?.buNumber || "",
        ...(shouldResetCoordinator ? { trainingCoordinatorId: "", trainingCoordinatorEmail: "", trainingCoordinatorPhone: "" } : {}),
      }));
    }

    if (organizationId) {
      loadCoordinators(organizationId);
    } else {
      setCoordinators([]);
    }
  };

  // Handle coordinator change
  const handleCoordinatorChange = (coordinatorId: string) => {
    const coordinator = coordinators.find((c) => c.id === coordinatorId);
    if (coordinator) {
      if (mode === "single") {
        setSingleData((prev) => ({
          ...prev,
          trainingCoordinatorId: coordinatorId,
          trainingCoordinatorEmail: coordinator.email || "",
          trainingCoordinatorPhone: coordinator.contactNumber || "",
        }));
      } else {
        setGroupData((prev) => ({
          ...prev,
          trainingCoordinatorId: coordinatorId,
          trainingCoordinatorEmail: coordinator.email || "",
          trainingCoordinatorPhone: coordinator.contactNumber || "",
        }));
      }
    }
  };

  const handleDownloadImportTemplate = () => {
    try {
      const headers = IMPORT_TEMPLATE_COLUMNS.map((column) => column.header);
      const exampleRow = IMPORT_TEMPLATE_COLUMNS.map((column) => column.example ?? "");
      const worksheet = XLSX.utils.aoa_to_sheet([headers, exampleRow]);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Learners");
      XLSX.writeFile(workbook, "learner-import-template.xlsx");
    } catch (error) {
      console.error("Failed to generate learner import template:", error);
      toast({
        title: "Unable to download template",
        description: "Please try again or contact support if the issue persists.",
        variant: "destructive",
      });
    }
  };

  const handleClearImport = () => {
    setImportRows([]);
    setImportFileName("");
    setImportParseErrors([]);
    setImportResult(null);
    setImportProcessing(false);
  };

  const handleImportFileUpload = async (file: File | null) => {
    if (!file) {
      handleClearImport();
      return;
    }

    setImportProcessing(true);
    setImportParseErrors([]);
    setImportResult(null);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: "array" });

      if (!workbook.SheetNames.length) {
        setImportParseErrors(["The selected file does not contain any sheets."]);
        setImportRows([]);
        setImportFileName(file.name);
        return;
      }

      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const rawRows = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, {
        defval: "",
        raw: false,
      });

      if (!rawRows.length) {
        setImportParseErrors(["The selected file does not contain any data rows."]);
        setImportRows([]);
        setImportFileName(file.name);
        return;
      }

      const normalizedHeaders = new Set<string>();
      rawRows.forEach((row) => {
        Object.keys(row).forEach((key) => {
          if (typeof key === "string" && key.trim()) {
            normalizedHeaders.add(key.trim().toLowerCase());
          }
        });
      });

      const missingHeaders = IMPORT_TEMPLATE_COLUMNS.filter((column) => column.required).filter(
        (column) => !normalizedHeaders.has(column.header.toLowerCase())
      );

      if (missingHeaders.length) {
        setImportParseErrors([
          `Missing required columns: ${missingHeaders
            .map((column) => column.header)
            .join(", ")}. Please download the template and ensure the headers are unchanged.`,
        ]);
        setImportRows([]);
        setImportFileName(file.name);
        return;
      }

      const processedRows: ImportLearnerRow[] = rawRows
        .map((row) => {
          const extractValue = (keys: string[]): string => {
            for (const key of keys) {
              if (key in row) {
                const value = row[key];
                if (value === undefined || value === null) {
                  continue;
                }
                const stringValue = typeof value === "string" ? value : String(value);
                const trimmed = stringValue.trim();
                if (trimmed) {
                  return trimmed;
                }
              }
            }
            return "";
          };

          const mappedRow: ImportLearnerRow = {
            name: extractValue(["Name", "name"]),
            email: extractValue(["Email", "email"]),
            contact: extractValue(["Contact", "contact", "Contact Number", "Phone"]),
            designation: extractValue(["Designation", "designation", "Title"]),
            clientOrganizationName: extractValue(["Client Organization Name", "clientOrganizationName", "Client Organisation Name"]),
            department: extractValue(["Department", "department", "Department Name", "departmentName"]),
            paymentMethod: extractValue(["Payment Method", "paymentMethod", "Payment Mode"]),
            coordinatorEmail: extractValue(["Coordinator Email", "coordinatorEmail", "Training Coordinator Email"]),
            discountName: extractValue(["Discount Name", "discountName"]),
            feesRemarks: extractValue(["Fees Remarks", "feesRemarks", "Fee Remarks"]),
            invoiceRemarks: extractValue(["Invoice Remarks", "invoiceRemarks", "Invoice Number"]),
            remarks: extractValue(["Remarks", "remarks"]),
          };

          return mappedRow;
        })
        .filter((row) => Object.values(row).some((value) => typeof value === "string" && value.trim().length));

      if (!processedRows.length) {
        setImportParseErrors(["No learner rows were detected. Please ensure your file contains learner information starting from the second row."]);
        setImportRows([]);
        setImportFileName(file.name);
        return;
      }

      const rowValidationIssues: string[] = [];
      processedRows.forEach((row, index) => {
        const missingFields: string[] = [];
        if (!row.name) missingFields.push("Name");
        if (!row.email) missingFields.push("Email");
        if (!row.clientOrganizationName) missingFields.push("Client Organization Name");
        if (missingFields.length) {
          rowValidationIssues.push(`Row ${index + 2}: Missing ${missingFields.join(", ")}. These learners will fail to import until the details are provided.`);
        }
      });

      setImportRows(processedRows);
      setImportFileName(file.name);
      setImportParseErrors(rowValidationIssues);
    } catch (error) {
      console.error("Failed to parse learner import file:", error);
      setImportParseErrors(["We couldn't read this file. Please ensure it's a CSV or Excel file that follows the latest template."]);
      setImportRows([]);
      setImportFileName("");
    } finally {
      setImportProcessing(false);
    }
  };

  // Handle learner selection (pre-fill data)
  const handleLearnerSelection = (learnerId: string, learnerIndex?: number) => {
    if (learnerId === "__none__") {
      if (mode === "single") {
        setSingleData((prev) => ({
          ...prev,
          selectedLearnerId: null,
          fullName: "",
          designation: "",
          email: "",
          contactNumber: "",
          departmentName: "",
        }));
      } else if (learnerIndex !== undefined) {
        setGroupData((prev) => ({
          ...prev,
          learners: prev.learners.map((l, i) =>
            i === learnerIndex
              ? {
                  ...l,
                  selectedLearnerId: null,
                  fullName: "",
                  designation: "",
                  email: "",
                  contactNumber: "",
                }
              : l
          ),
        }));
      }
      return;
    }

    const learner = allLearners.find((l) => l.id === learnerId);
    if (learner) {
      if (mode === "single") {
        // Find the organization to get its type
        const org = organizations.find((o) => o.id === learner.clientOrganizationId);

        setSingleData((prev) => ({
          ...prev,
          selectedLearnerId: learnerId,
          fullName: learner.fullname,
          designation: learner.designation || "",
          email: learner.email || "",
          contactNumber: learner.contact || "",
          departmentName: learner.departmentName || "",
          organizationType: org?.organizationType || prev.organizationType || "",
          division: learner.clientOrganizationId || prev.division,
          buNumber: learner.clientOrganizationBuNumber || prev.buNumber,
          trainingCoordinatorId: learner.trainingCoordinatorId || prev.trainingCoordinatorId || "",
          trainingCoordinatorEmail: learner.trainingCoordinatorEmail || prev.trainingCoordinatorEmail || "",
          trainingCoordinatorPhone: learner.trainingCoordinatorPhone || prev.trainingCoordinatorPhone || "",
        }));

        // Load coordinators if learner has an organization
        if (learner.clientOrganizationId) {
          loadCoordinators(learner.clientOrganizationId);
        }
      } else if (learnerIndex !== undefined) {
        setGroupData((prev) => ({
          ...prev,
          learners: prev.learners.map((l, i) =>
            i === learnerIndex
              ? {
                  ...l,
                  selectedLearnerId: learnerId,
                  fullName: learner.fullname,
                  designation: learner.designation || "",
                  email: learner.email || "",
                  contactNumber: learner.contact || "",
                }
              : l
          ),
        }));
      }
    }
  };

  const resolveDiscountSelection = (discountId: string) => {
    const actualDiscountId = discountId === "none" ? null : discountId;
    const discount = actualDiscountId ? discountsList.find((d) => d.id === actualDiscountId) : null;
    const discountPercentage = discount ? discount.percentage : 0;
    return { actualDiscountId, discountPercentage };
  };

  const handleSingleDiscountChange = (discountId: string) => {
    const { actualDiscountId, discountPercentage } = resolveDiscountSelection(discountId);
    const totalFees = calculateTotalFees(singleData.currentDefaultCourseFee, discountPercentage);
    setSingleData((prev) => ({
      ...prev,
      discountId: actualDiscountId,
      discountPercentage,
      totalFees,
    }));
  };

  const handleGroupDiscountChange = (discountId: string) => {
    const { actualDiscountId, discountPercentage } = resolveDiscountSelection(discountId);
    const totalFees = calculateTotalFees(groupData.currentDefaultCourseFee, discountPercentage);
    setGroupData((prev) => ({
      ...prev,
      discountId: actualDiscountId,
      discountPercentage,
      totalFees,
    }));
  };

  // Add new learner to group
  const addGroupLearner = () => {
    setGroupData((prev) => ({
      ...prev,
      learners: [
        ...prev.learners,
        {
          fullName: "",
          designation: "",
          email: "",
          contactNumber: "",
        },
      ],
    }));
  };

  // Remove learner from group
  const removeGroupLearner = (index: number) => {
    if (groupData.learners.length > 1) {
      setGroupData((prev) => ({
        ...prev,
        learners: prev.learners.filter((_, i) => i !== index),
      }));
    }
  };

  // Submit registration or import
  const handleSubmit = async () => {
    if (mode === "import") {
      if (importProcessing) {
        toast({
          title: "Processing file",
          description: "Please wait for the file to finish processing before importing.",
          variant: "destructive",
        });
        return;
      }

      if (!importRows.length) {
        toast({
          title: "No learners detected",
          description: "Upload a CSV or Excel file that follows the template before importing.",
          variant: "destructive",
        });
        return;
      }

      setLoading(true);
      try {
        const response = await courseRunsApi.importLearners(resolvedCourseRunId, {
          rows: importRows,
        });

        const successes = Array.isArray(response?.results?.successes) ? response.results.successes : [];
        const errors = Array.isArray(response?.results?.errors) ? response.results.errors : [];
        const importedCount = typeof response?.imported === "number" ? response.imported : successes.length;
        const failedCount = typeof response?.failed === "number" ? response.failed : errors.length;

        const summary: ImportLearnerResultSummary = {
          imported: importedCount,
          failed: failedCount,
          successes,
          errors,
        };
        setImportResult(summary);

        const descriptionParts: string[] = [];
        descriptionParts.push(`${importedCount} learner${importedCount === 1 ? "" : "s"} imported`);
        if (failedCount > 0) {
          descriptionParts.push(`${failedCount} failed`);
        }

        toast({
          title: failedCount > 0 ? "Import completed with issues" : "Import completed",
          description: descriptionParts.join(", "),
          ...(failedCount > 0 && importedCount === 0 ? { variant: "destructive" as const } : {}),
        });

        if (importedCount > 0) {
          onSuccess?.();
        }
      } catch (error: any) {
        console.error("Failed to import learners:", error);

        // Parse error message for better user feedback
        let errorMessage = "We couldn't import learners. Please review your file and try again.";

        if (error?.response?.data?.message) {
          errorMessage = error.response.data.message;
        } else if (error?.response?.data?.error) {
          errorMessage = error.response.data.error;
        } else if (error?.message) {
          errorMessage = error.message;
        }

        // Handle specific error types
        if (errorMessage.toLowerCase().includes("format")) {
          errorMessage = "File format is invalid. Please use the provided template.";
        } else if (errorMessage.toLowerCase().includes("email")) {
          errorMessage = "One or more email addresses are invalid. Please check your file.";
        } else if (errorMessage.toLowerCase().includes("required")) {
          errorMessage = "Missing required fields. Please ensure all columns are filled.";
        }

        toast({
          title: "Import failed",
          description: errorMessage,
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
      return;
    }

    setLoading(true);
    try {
      if (mode === "single") {
        // Validate single registration
        if (!singleData.fullName || !singleData.email || !singleData.division) {
          toast({ title: "Error", description: "Please fill in all required fields", variant: "destructive" });
          return;
        }

        if (!isValidEmail(singleData.email)) {
          toast({ title: "Validation Error", description: "Please enter a valid email address (name@email.com).", variant: "destructive" });
          return;
        }

        // Submit single registration
        const cleanSingleData = {
          ...singleData,
          discountId: singleData.discountId === "none" ? null : singleData.discountId,
          selectedLearnerId: singleData.selectedLearnerId === "__none__" ? null : singleData.selectedLearnerId,
        };
        await courseRunsApi.enrollLearner(resolvedCourseRunId, {
          mode: "single",
          data: cleanSingleData,
        });
      } else {
        // Validate group registration
        if (!groupData.division || groupData.learners.some((l) => !l.fullName || !l.email)) {
          toast({ title: "Error", description: "Please fill in all required fields for all learners", variant: "destructive" });
          return;
        }

        if (groupData.learners.some((l) => !isValidEmail(l.email))) {
          toast({ title: "Validation Error", description: "One or more learners have invalid email addresses. Please correct them.", variant: "destructive" });
          return;
        }

        // Submit group registration
        const processedLearners = groupData.learners.map((learner) => ({
          ...learner,
          selectedLearnerId: learner.selectedLearnerId === "__none__" ? null : learner.selectedLearnerId,
          currentDefaultCourseFee: groupData.currentDefaultCourseFee,
          discountId: groupData.discountId,
          discountPercentage: groupData.discountPercentage,
          totalFees: groupData.totalFees,
          feesRemarks: groupData.feesRemarks,
          invoiceNumber: groupData.invoiceNumber,
        }));

        const cleanGroupData = {
          division: groupData.division,
          departmentName: groupData.departmentName,
          buNumber: groupData.buNumber,
          paymentMode: groupData.paymentMode,
          trainingCoordinatorId: groupData.trainingCoordinatorId,
          trainingCoordinatorEmail: groupData.trainingCoordinatorEmail,
          trainingCoordinatorPhone: groupData.trainingCoordinatorPhone,
          remarks: groupData.remarks,
          currentDefaultCourseFee: groupData.currentDefaultCourseFee,
          discountId: groupData.discountId,
          discountPercentage: groupData.discountPercentage,
          totalFees: groupData.totalFees,
          feesRemarks: groupData.feesRemarks,
          invoiceNumber: groupData.invoiceNumber,
          learners: processedLearners,
        };
        await courseRunsApi.enrollLearners(resolvedCourseRunId, {
          mode: "group",
          data: cleanGroupData,
        });
      }

      toast({ title: "Success", description: "Learners enrolled successfully" });
      setDialogOpen(false);
      onSuccess?.();
    } catch (error: any) {
      console.error("Failed to enroll learners:", error);

      // Parse error message for better user feedback
      let errorMessage = "Failed to enroll learners";

      if (error?.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error?.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error?.message) {
        errorMessage = error.message;
      }

      // Handle specific error types
      if (errorMessage.toLowerCase().includes("email")) {
        errorMessage = "Email validation failed. Please check email addresses.";
      } else if (errorMessage.toLowerCase().includes("duplicate")) {
        errorMessage = "One or more learners are already enrolled in this course run.";
      } else if (errorMessage.toLowerCase().includes("capacity")) {
        errorMessage = "Course run has reached maximum capacity.";
      } else if (errorMessage.toLowerCase().includes("coordinator")) {
        errorMessage = "Invalid training coordinator selected.";
      } else if (errorMessage.toLowerCase().includes("organization")) {
        errorMessage = "Invalid client organization selected.";
      }

      toast({
        title: "Enrollment Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setSingleData({
      fullName: "",
      designation: "",
      email: "",
      contactNumber: "",
      organizationType: "",
      division: "",
      departmentName: "",
      buNumber: "",
      paymentMode: "",
      trainingCoordinatorId: "",
      trainingCoordinatorEmail: "",
      trainingCoordinatorPhone: "",
      currentDefaultCourseFee: effectiveBaseFee,
      discountId: null,
      discountPercentage: 0,
      totalFees: effectiveBaseFee,
      feesRemarks: "",
      invoiceNumber: "",
      remarks: "",
    });

    setGroupData({
      organizationType: "",
      division: "",
      departmentName: "",
      buNumber: "",
      paymentMode: "",
      trainingCoordinatorId: "",
      trainingCoordinatorEmail: "",
      trainingCoordinatorPhone: "",
      currentDefaultCourseFee: effectiveBaseFee,
      discountId: null,
      discountPercentage: 0,
      totalFees: effectiveBaseFee,
      feesRemarks: "",
      invoiceNumber: "",
      learners: [
        {
          fullName: "",
          designation: "",
          email: "",
          contactNumber: "",
        },
      ],
      remarks: "",
    });

    handleClearImport();
  };

  return (
    <Dialog
      open={dialogOpen}
      onOpenChange={(isOpen) => {
        setDialogOpen(isOpen);
        if (!isOpen) {
          setMode("single");
          resetForm();
        }
      }}
    >
      {!isControlled && (
        <DialogTrigger asChild>
          <Button className="bg-blue-600 hover:bg-blue-700">
            <Plus className="h-4 w-4 mr-2" />
            {triggerLabel || "Add Learners"}
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle>Add Learners</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 pb-6">
          {/* Mode Selection */}
          <div className="grid grid-cols-1 gap-4 mb-6 md:grid-cols-2">
            <Card
              className={`cursor-pointer transition-all ${mode === "single" ? "ring-2 ring-blue-500 bg-blue-50" : "hover:bg-gray-50"}`}
              onClick={() => setMode("single")}
            >
              <CardContent className="flex flex-col items-center justify-center p-6 text-center">
                <Plus className="h-8 w-8 text-gray-400 mb-2" />
                <h3 className="font-medium">Single Registration</h3>
                <p className="text-sm text-gray-500">Add one learner at a time</p>
              </CardContent>
            </Card>
            <Card
              className={`cursor-pointer transition-all ${mode === "group" ? "ring-2 ring-blue-500 bg-blue-50" : "hover:bg-gray-50"}`}
              onClick={() => setMode("group")}
            >
              <CardContent className="flex flex-col items-center justify-center p-6 text-center">
                <Users className="h-8 w-8 text-gray-400 mb-2" />
                <h3 className="font-medium">Group Registration</h3>
                <p className="text-sm text-gray-500">Add multiple learners at once</p>
              </CardContent>
            </Card>
            {/* <Card
            className={`cursor-pointer transition-all ${mode === "import" ? "ring-2 ring-blue-500 bg-blue-50" : "hover:bg-gray-50"}`}
            onClick={() => setMode("import")}
          >
            <CardContent className="flex flex-col items-center justify-center p-6 text-center">
              <FileSpreadsheet className="h-8 w-8 text-gray-400 mb-2" />
              <h3 className="font-medium">Import from File</h3>
              <p className="text-sm text-gray-500">Upload the learner template (CSV/XLSX)</p>
            </CardContent>
          </Card> */}
          </div>

          {mode === "single" ? (
            <SingleRegistrationForm
              data={singleData}
              setData={setSingleData}
              organizations={organizations}
              learners={learners}
              coordinators={coordinators}
              courseRun={courseRun}
              onOrganizationChange={handleOrganizationChange}
              onCoordinatorChange={handleCoordinatorChange}
              onLearnerSelection={handleLearnerSelection}
              onDiscountChange={handleSingleDiscountChange}
            />
          ) : mode === "group" ? (
            <GroupRegistrationForm
              data={groupData}
              setData={setGroupData}
              organizations={organizations}
              learners={learners}
              coordinators={coordinators}
              courseRun={courseRun}
              onOrganizationChange={handleOrganizationChange}
              onCoordinatorChange={handleCoordinatorChange}
              onLearnerSelection={handleLearnerSelection}
              onGroupDiscountChange={handleGroupDiscountChange}
              onAddLearner={addGroupLearner}
              onRemoveLearner={removeGroupLearner}
            />
          ) : (
            <ImportLearnersForm
              rows={importRows}
              fileName={importFileName}
              parseErrors={importParseErrors}
              result={importResult}
              isParsing={importProcessing}
              isSubmitting={loading}
              onFileSelected={handleImportFileUpload}
              onDownloadTemplate={handleDownloadImportTemplate}
              onClear={handleClearImport}
              baseCourseFee={effectiveBaseFee}
            />
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-2 pt-4 px-6 pb-6 border-t">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={loading || (mode === "import" && (importProcessing || importRows.length === 0))}>
              {loading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {mode === "import" ? "Importing..." : "Adding..."}
                </span>
              ) : mode === "single" ? (
                "Add Learner"
              ) : mode === "group" ? (
                `Add ${groupData.learners.length} Learners`
              ) : (
                "Import Now"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Single Registration Form Component
interface SingleRegistrationFormProps {
  data: SingleRegistrationData;
  setData: React.Dispatch<React.SetStateAction<SingleRegistrationData>>;
  organizations: Organization[];
  learners: Learner[];
  coordinators: TrainingCoordinator[];
  courseRun: CourseRun;
  onOrganizationChange: (orgId: string) => void;
  onCoordinatorChange: (coordId: string) => void;
  onLearnerSelection: (learnerId: string) => void;
  onDiscountChange: (discountId: string) => void;
}

const SingleRegistrationForm: React.FC<SingleRegistrationFormProps> = ({
  data,
  setData,
  organizations,
  learners,
  coordinators,
  courseRun,
  onOrganizationChange,
  onCoordinatorChange,
  onLearnerSelection,
  onDiscountChange,
}) => {
  const isFieldDisabled = (field: string) => {
    const disabledFields = ["fullName", "designation", "email", "contactNumber", "division"];
    return data.selectedLearnerId && disabledFields.includes(field);
  };

  // Helper function to get division field label based on organization type
  const getDivisionLabel = () => {
    return data.organizationType === "SPF" ? "Division" : "Name";
  };

  const learnerOptions: SearchableSelectOption[] = (learners || []).map((learner) => ({
    value: learner.id,
    label: learner.fullname,
    description: [learner.email, learner.clientOrganizationName].filter(Boolean).join(" • "),
  }));

  // Filter organizations by selected type
  const filteredOrganizations = data.organizationType ? (organizations || []).filter((org) => org.organizationType === data.organizationType) : [];

  const organizationOptions: SearchableSelectOption[] = filteredOrganizations.map((org) => ({
    value: org.id,
    label: org.name,
    description: org.buNumber ? `BU: ${org.buNumber}` : undefined,
  }));

  const organizationTypeOptions: SearchableSelectOption[] = [
    { value: "SPF", label: "SPF" },
    { value: "POLWEL", label: "POLWEL" },
    { value: "PUBLIC_SECTOR", label: "Public Sector" },
    { value: "PRIVATE_SECTOR", label: "Private Sector" },
  ];

  const coordinatorOptions: SearchableSelectOption[] = (coordinators || []).map((coord) => ({
    value: coord.id,
    label: coord.name,
    description: coord.email,
  }));

  const discountOptions: SearchableSelectOption[] = (courseRun.course.discounts || []).map((discount) => ({
    value: discount.id,
    label: `${discount.name} (${discount.percentage}%)`,
  }));

  const paymentModeOptions: SearchableSelectOption[] = PAYMENT_MODES.map((mode) => ({
    value: PAYMENT_MODES_MAP[mode],
    label: mode,
  }));

  return (
    <div className="space-y-6">
      {/* Learner Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Select Existing Learner (Optional)</CardTitle>
        </CardHeader>
        <CardContent>
          <SearchableSelect
            value={data.selectedLearnerId || "__none__"}
            onValueChange={onLearnerSelection}
            options={learnerOptions}
            placeholder="Select existing learner or leave blank to add new"
            clearOption={{ value: "__none__", label: "Add new learner" }}
          />
        </CardContent>
      </Card>

      {/* Personal Information */}
      <Card>
        <CardHeader>
          <CardTitle>Personal Information</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Full Name *</Label>
            <Input
              value={data.fullName}
              onChange={(e) => setData((prev) => ({ ...prev, fullName: e.target.value }))}
              disabled={isFieldDisabled("fullName")}
              className={isFieldDisabled("fullName") ? "bg-gray-50" : ""}
            />
          </div>
          <div className="space-y-2">
            <Label>Designation *</Label>
            <Input
              value={data.designation}
              onChange={(e) => setData((prev) => ({ ...prev, designation: e.target.value }))}
              disabled={isFieldDisabled("designation")}
              className={isFieldDisabled("designation") ? "bg-gray-50" : ""}
            />
          </div>
          <div className="space-y-2">
            <Label>Email Address *</Label>
            <Input
              type="email"
              value={data.email}
              onChange={(e) => setData((prev) => ({ ...prev, email: e.target.value }))}
              disabled={isFieldDisabled("email")}
              className={isFieldDisabled("email") ? "bg-gray-50" : ""}
            />
          </div>
          <div className="space-y-2">
            <Label>Contact Number</Label>
            <Input
              type="tel"
              value={data.contactNumber}
              onChange={(e) => setData((prev) => ({ ...prev, contactNumber: e.target.value }))}
              disabled={isFieldDisabled("contactNumber")}
              className={isFieldDisabled("contactNumber") ? "bg-gray-50" : ""}
            />
          </div>
        </CardContent>
      </Card>

      {/* Organization Information */}
      <Card>
        <CardHeader>
          <CardTitle>Organization Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Organisation Type *</Label>
              <SearchableSelect
                value={data.organizationType}
                onValueChange={(value) => {
                  setData((prev) => ({
                    ...prev,
                    organizationType: value,
                    division: "", // Reset division when type changes
                    buNumber: "",
                    trainingCoordinatorId: "",
                    trainingCoordinatorEmail: "",
                    trainingCoordinatorPhone: "",
                  }));
                }}
                options={organizationTypeOptions}
                placeholder="Select organisation type"
              />
            </div>
            <div className="space-y-2">
              <Label>{getDivisionLabel()} *</Label>
              <SearchableSelect
                value={data.division}
                onValueChange={onOrganizationChange}
                options={organizationOptions}
                placeholder={`Select ${getDivisionLabel().toLowerCase()}`}
                disabled={!data.organizationType || isFieldDisabled("division")}
                emptyMessage={!data.organizationType ? "Select organisation type first" : `No ${getDivisionLabel().toLowerCase()}s found`}
              />
            </div>
            <div className="space-y-2">
              <Label>Department (Optional)</Label>
              <Input
                value={data.departmentName}
                onChange={(e) => setData((prev) => ({ ...prev, departmentName: e.target.value }))}
                placeholder="Department name"
              />
            </div>
            <div className="space-y-2">
              <Label>
                BU Number <span className="text-gray-400">(Optional)</span>
              </Label>
              <Input value={data.buNumber} disabled className="bg-gray-50" />
            </div>
            <div className="space-y-2">
              <Label>Payment Mode (Optional)</Label>
              <SearchableSelect
                value={data.paymentMode}
                onValueChange={(value) => setData((prev) => ({ ...prev, paymentMode: value }))}
                options={paymentModeOptions}
                placeholder="Select payment mode (optional)"
              />
            </div>
          </div>

          <div className="border-t pt-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Coordinator Name</Label>
                <SearchableSelect
                  value={data.trainingCoordinatorId}
                  onValueChange={onCoordinatorChange}
                  options={coordinatorOptions}
                  placeholder="Select coordinator"
                  emptyMessage={organizationOptions.length === 0 ? "Select a division first" : "No coordinators found"}
                />
              </div>
              <div className="space-y-2">
                <Label>Coordinator Email</Label>
                <Input value={data.trainingCoordinatorEmail} disabled className="bg-gray-50" />
              </div>
              <div className="space-y-2">
                <Label>Coordinator Phone</Label>
                <Input value={data.trainingCoordinatorPhone} disabled className="bg-gray-50" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Fees & Payment Information */}
      <Card>
        <CardHeader>
          <CardTitle>Fees & Payment Information</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Current Default Course Fee</Label>
            <div className="text-2xl font-bold">${data.currentDefaultCourseFee}</div>
          </div>
          <div className="space-y-2">
            <Label>Apply Discount (Optional)</Label>
            <SearchableSelect
              value={data.discountId ?? "none"}
              onValueChange={onDiscountChange}
              options={discountOptions}
              placeholder="No discount"
              clearOption={{ value: "none", label: "No discount" }}
            />
          </div>
          <div className="space-y-2">
            <Label>Total Fees</Label>
            <div className="text-2xl font-bold text-blue-600">${data.totalFees}</div>
          </div>
          <div className="space-y-2 col-span-2">
            <Label>Fees Remarks</Label>
            <Input
              value={data.feesRemarks}
              onChange={(e) => setData((prev) => ({ ...prev, feesRemarks: e.target.value }))}
              placeholder="Standard training fee"
            />
          </div>
          <div className="space-y-2">
            <Label>Invoice Number</Label>
            <Input value={data.invoiceNumber} onChange={(e) => setData((prev) => ({ ...prev, invoiceNumber: e.target.value }))} placeholder="INV-2024-001" />
          </div>
        </CardContent>
      </Card>

      {/* Additional Information */}
      <Card>
        <CardHeader>
          <CardTitle>Additional Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label>Remarks</Label>
            <Textarea
              value={data.remarks}
              onChange={(e) => setData((prev) => ({ ...prev, remarks: e.target.value }))}
              placeholder="Regular enrollment for skills development program"
              rows={3}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Group Registration Form Component
interface GroupRegistrationFormProps {
  data: GroupRegistrationData;
  setData: React.Dispatch<React.SetStateAction<GroupRegistrationData>>;
  organizations: Organization[];
  learners: Learner[];
  coordinators: TrainingCoordinator[];
  courseRun: CourseRun;
  onOrganizationChange: (orgId: string) => void;
  onCoordinatorChange: (coordId: string) => void;
  onLearnerSelection: (learnerId: string, learnerIndex?: number) => void;
  onGroupDiscountChange: (discountId: string) => void;
  onAddLearner: () => void;
  onRemoveLearner: (index: number) => void;
}

const GroupRegistrationForm: React.FC<GroupRegistrationFormProps> = ({
  data,
  setData,
  organizations,
  learners,
  coordinators,
  courseRun,
  onOrganizationChange,
  onCoordinatorChange,
  onLearnerSelection,
  onGroupDiscountChange,
  onAddLearner,
  onRemoveLearner,
}) => {
  // Filter organizations by selected type
  const filteredOrganizations = data.organizationType ? (organizations || []).filter((org) => org.organizationType === data.organizationType) : [];

  // Helper function to get division field label based on organization type
  const getDivisionLabel = () => {
    return data.organizationType === "SPF" ? "Division" : "Name";
  };

  const organizationOptions: SearchableSelectOption[] = filteredOrganizations.map((org) => ({
    value: org.id,
    label: org.name,
    description: org.buNumber ? `BU: ${org.buNumber}` : undefined,
  }));

  const organizationTypeOptions: SearchableSelectOption[] = [
    { value: "SPF", label: "SPF" },
    { value: "POLWEL", label: "POLWEL" },
    { value: "PUBLIC_SECTOR", label: "Public Sector" },
    { value: "PRIVATE_SECTOR", label: "Private Sector" },
  ];

  const coordinatorOptions: SearchableSelectOption[] = (coordinators || []).map((coord) => ({
    value: coord.id,
    label: coord.name,
    description: coord.email,
  }));

  const learnerOptions: SearchableSelectOption[] = (learners || []).map((learner) => ({
    value: learner.id,
    label: learner.fullname,
    description: [learner.email, learner.clientOrganizationName].filter(Boolean).join(" • "),
  }));

  const discountOptions: SearchableSelectOption[] = (courseRun.course.discounts || []).map((discount) => ({
    value: discount.id,
    label: `${discount.name} (${discount.percentage}%)`,
  }));

  const paymentModeOptions: SearchableSelectOption[] = PAYMENT_MODES.map((mode) => ({
    value: PAYMENT_MODES_MAP[mode],
    label: mode,
  }));

  const groupTotal = data.totalFees * data.learners.length;

  return (
    <div className="space-y-6">
      {/* Group Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Users className="h-4 w-4 mr-2" />
            Group Information
          </CardTitle>
          <p className="text-sm text-gray-500">Common details for all learners in this group</p>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Organisation Type *</Label>
            <SearchableSelect
              value={data.organizationType}
              onValueChange={(value) => {
                setData((prev) => ({
                  ...prev,
                  organizationType: value,
                  division: "", // Reset division when type changes
                  buNumber: "",
                  trainingCoordinatorId: "",
                  trainingCoordinatorEmail: "",
                  trainingCoordinatorPhone: "",
                }));
              }}
              options={organizationTypeOptions}
              placeholder="Select organisation type"
            />
          </div>
          <div className="space-y-2">
            <Label>{getDivisionLabel()} *</Label>
            <SearchableSelect
              value={data.division}
              onValueChange={onOrganizationChange}
              options={organizationOptions}
              placeholder={`Select ${getDivisionLabel().toLowerCase()}`}
              disabled={!data.organizationType}
              emptyMessage={!data.organizationType ? "Select organisation type first" : `No ${getDivisionLabel().toLowerCase()}s found`}
            />
          </div>
          <div className="space-y-2">
            <Label>Department (Optional)</Label>
            <Input
              value={data.departmentName}
              onChange={(e) => setData((prev) => ({ ...prev, departmentName: e.target.value }))}
              placeholder="Department name"
            />
          </div>
          <div className="space-y-2">
            <Label>
              BU Number <span className="text-gray-400">(Optional)</span>
            </Label>
            <Input value={data.buNumber} disabled className="bg-gray-50" />
          </div>
          <div className="space-y-2">
            <Label>Payment Mode (Optional)</Label>
            <SearchableSelect
              value={data.paymentMode}
              onValueChange={(value) => setData((prev) => ({ ...prev, paymentMode: value }))}
              options={paymentModeOptions}
              placeholder="Select payment mode (optional)"
            />
          </div>
        </CardContent>
        <CardContent className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Coordinator Name</Label>
            <SearchableSelect
              value={data.trainingCoordinatorId}
              onValueChange={onCoordinatorChange}
              options={coordinatorOptions}
              placeholder="Select coordinator"
              emptyMessage={organizationOptions.length === 0 ? "Select a division first" : "No coordinators found"}
            />
          </div>
          <div className="space-y-2">
            <Label>Coordinator Email</Label>
            <Input value={data.trainingCoordinatorEmail} disabled className="bg-gray-50" />
          </div>
          <div className="space-y-2">
            <Label>Coordinator Phone</Label>
            <Input value={data.trainingCoordinatorPhone} disabled className="bg-gray-50" />
          </div>
        </CardContent>
      </Card>

      {/* Training Coordinator
      <Card>
        <CardHeader>
          <CardTitle>Training Coordinator</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Coordinator Name</Label>
            <SearchableSelect
              value={data.trainingCoordinatorId}
              onValueChange={onCoordinatorChange}
              options={coordinatorOptions}
              placeholder="Select coordinator"
              emptyMessage={organizationOptions.length === 0 ? "Select a division first" : "No coordinators found"}
            />
          </div>
          <div className="space-y-2">
            <Label>Coordinator Email</Label>
            <Input value={data.trainingCoordinatorEmail} disabled className="bg-gray-50" />
          </div>
          <div className="space-y-2">
            <Label>Coordinator Phone</Label>
            <Input value={data.trainingCoordinatorPhone} disabled className="bg-gray-50" />
          </div>
        </CardContent>
      </Card> */}

      {/* Learners */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Learners</CardTitle>
              <p className="text-sm text-gray-500">
                Add individual learner details ({data.learners.length} learner{data.learners.length !== 1 ? "s" : ""})
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={onAddLearner}>
              <Plus className="h-4 w-4 mr-2" />
              Add Learner
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {data.learners.map((learner, index) => (
            <GroupLearnerCard
              key={index}
              learner={learner}
              index={index}
              canRemove={data.learners.length > 1}
              onLearnerSelection={(learnerId) => onLearnerSelection(learnerId, index)}
              onRemove={() => onRemoveLearner(index)}
              onUpdate={(updatedLearner) => {
                setData((prev) => ({
                  ...prev,
                  learners: prev.learners.map((l, i) => (i === index ? updatedLearner : l)),
                }));
              }}
              learnerOptions={learnerOptions}
            />
          ))}
        </CardContent>
      </Card>

      {/* Shared Fees & Payment */}
      <Card>
        <CardHeader>
          <CardTitle>Fees & Payment Information</CardTitle>
          <p className="text-sm text-gray-500">Applied uniformly to all learners in this group</p>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Base Fee per Learner</Label>
            <div className="text-2xl font-semibold">${data.currentDefaultCourseFee}</div>
          </div>
          <div className="space-y-2">
            <Label>Discount</Label>
            <SearchableSelect
              value={data.discountId ?? "none"}
              onValueChange={onGroupDiscountChange}
              options={discountOptions}
              placeholder="No discount"
              clearOption={{ value: "none", label: "No discount" }}
            />
          </div>
          <div className="space-y-2">
            <Label>Total Per Learner</Label>
            <div className="text-2xl font-semibold text-blue-600">${data.totalFees}</div>
          </div>
          <div className="space-y-2">
            <Label>Group Total ({data.learners.length} learners)</Label>
            <div className="text-xl font-semibold text-blue-600">${groupTotal}</div>
          </div>
          <div className="space-y-2">
            <Label>Fees Remarks</Label>
            <Input
              value={data.feesRemarks}
              onChange={(e) => setData((prev) => ({ ...prev, feesRemarks: e.target.value }))}
              placeholder="Standard training fee"
            />
          </div>
          <div className="space-y-2">
            <Label>Invoice Number</Label>
            <Input value={data.invoiceNumber} onChange={(e) => setData((prev) => ({ ...prev, invoiceNumber: e.target.value }))} placeholder="INV-2024-001" />
          </div>
        </CardContent>
      </Card>

      {/* Additional Remarks */}
      <Card>
        <CardHeader>
          <CardTitle>Additional Remarks</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={data.remarks}
            onChange={(e) => setData((prev) => ({ ...prev, remarks: e.target.value }))}
            placeholder="Regular enrollment for skills development program"
            rows={3}
          />
        </CardContent>
      </Card>
    </div>
  );
};

// Group Learner Card Component
interface GroupLearnerCardProps {
  learner: GroupLearnerData;
  index: number;
  learnerOptions: SearchableSelectOption[];
  canRemove: boolean;
  onLearnerSelection: (learnerId: string) => void;
  onRemove: () => void;
  onUpdate: (learner: GroupLearnerData) => void;
}

const GroupLearnerCard: React.FC<GroupLearnerCardProps> = ({ learner, index, learnerOptions, canRemove, onLearnerSelection, onRemove, onUpdate }) => {
  const isFieldDisabled = (field: string) => {
    const disabledFields = ["fullName", "designation", "email", "contactNumber"];
    return learner.selectedLearnerId && disabledFields.includes(field);
  };

  return (
    <Card className="relative">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <Badge variant="secondary">
            <User className="h-3 w-3 mr-1" />
            Learner {index + 1}
          </Badge>
          {canRemove && (
            <Button variant="ghost" size="sm" onClick={onRemove} className="text-red-500 hover:text-red-700 hover:bg-red-50">
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Learner Selection */}
        <div className="space-y-2">
          <Label className="text-sm">Select Existing Learner (Optional)</Label>
          <SearchableSelect
            value={learner.selectedLearnerId || "__none__"}
            onValueChange={onLearnerSelection}
            options={learnerOptions}
            placeholder="Select existing learner or leave blank to add new"
            clearOption={{ value: "__none__", label: "Add new learner" }}
          />
        </div>

        {/* Personal Details */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Name *</Label>
            <Input
              value={learner.fullName}
              onChange={(e) => onUpdate({ ...learner, fullName: e.target.value })}
              disabled={isFieldDisabled("fullName")}
              className={isFieldDisabled("fullName") ? "bg-gray-50" : ""}
              placeholder="Enter full name"
            />
          </div>
          <div className="space-y-2">
            <Label>Designation *</Label>
            <Input
              value={learner.designation}
              onChange={(e) => onUpdate({ ...learner, designation: e.target.value })}
              disabled={isFieldDisabled("designation")}
              className={isFieldDisabled("designation") ? "bg-gray-50" : ""}
              placeholder="Job title"
            />
          </div>
          <div className="space-y-2">
            <Label>Email Address *</Label>
            <Input
              type="email"
              value={learner.email}
              onChange={(e) => onUpdate({ ...learner, email: e.target.value })}
              disabled={isFieldDisabled("email")}
              className={isFieldDisabled("email") ? "bg-gray-50" : ""}
              placeholder="learner@company.com"
            />
          </div>
          <div className="space-y-2">
            <Label>Contact Number</Label>
            <Input
              type="tel"
              value={learner.contactNumber}
              onChange={(e) => onUpdate({ ...learner, contactNumber: e.target.value })}
              disabled={isFieldDisabled("contactNumber")}
              className={isFieldDisabled("contactNumber") ? "bg-gray-50" : ""}
              placeholder="+65 xxxx xxxx"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

interface ImportLearnersFormProps {
  rows: ImportLearnerRow[];
  fileName: string;
  parseErrors: string[];
  result: ImportLearnerResultSummary | null;
  isParsing: boolean;
  isSubmitting: boolean;
  onFileSelected: (file: File | null) => void;
  onDownloadTemplate: () => void;
  onClear: () => void;
  baseCourseFee: number;
}

const ImportLearnersForm: React.FC<ImportLearnersFormProps> = ({
  rows,
  fileName,
  parseErrors,
  result,
  isParsing,
  isSubmitting,
  onFileSelected,
  onDownloadTemplate,
  onClear,
  baseCourseFee,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const previewRows = rows.slice(0, 5);
  const hasMoreRows = rows.length > previewRows.length;
  const requiredColumns = IMPORT_TEMPLATE_COLUMNS.filter((column) => column.required).map((column) => column.header);
  const optionalColumns = IMPORT_TEMPLATE_COLUMNS.filter((column) => !column.required).map((column) => column.header);
  const formattedBaseFee = new Intl.NumberFormat("en-SG", { style: "currency", currency: "SGD" }).format(baseCourseFee || 0);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const nextFile = event.target.files?.[0] ?? null;
    onFileSelected(nextFile);
    event.target.value = "";
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Learner import template</CardTitle>
          <CardDescription>
            Required columns: {requiredColumns.join(", ")}. Optional columns: {optionalColumns.join(", ") || "None"}.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="max-w-3xl">
              Use the latest template so headers stay consistent. Client organisations are matched by name, coordinators by email, and discounts by their exact
              name. Base course fee defaults to {formattedBaseFee}; discounts will be applied automatically.
            </p>
            <Button type="button" variant="outline" onClick={onDownloadTemplate}>
              <FileDown className="h-4 w-4 mr-2" />
              Download template
            </Button>
          </div>
          <ul className="list-disc pl-6 space-y-1">
            <li>Supports CSV and Excel (.xlsx) files.</li>
            <li>Leave optional columns blank if not applicable.</li>
            <li>Ensure learner emails are unique per row.</li>
            <li>One learner per row; duplicate rows will be flagged during import.</li>
          </ul>
        </CardContent>
      </Card>

      <div className="rounded-lg border-2 border-dashed border-muted-foreground/30 bg-muted/30 p-6 text-center">
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          className="hidden"
          onChange={handleFileChange}
        />
        <div className="flex flex-col items-center gap-3">
          <UploadCloud className="h-10 w-10 text-muted-foreground" />
          <div>
            <p className="text-sm font-medium">Drop your CSV/XLSX file here</p>
            <p className="text-xs text-muted-foreground">or click below to browse.</p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <Button type="button" onClick={() => fileInputRef.current?.click()} disabled={isParsing || isSubmitting}>
              {isParsing ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Processing...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <UploadCloud className="h-4 w-4" />
                  Choose file
                </span>
              )}
            </Button>
            {(rows.length > 0 || fileName) && (
              <Button type="button" variant="ghost" onClick={onClear} disabled={isParsing || isSubmitting}>
                Clear selection
              </Button>
            )}
          </div>
          {fileName ? (
            <p className="text-xs text-muted-foreground">
              Selected file: <span className="font-medium text-foreground">{fileName}</span> – {rows.length} learner{rows.length === 1 ? "" : "s"} detected.
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">Accepted formats: .csv, .xlsx</p>
          )}
        </div>
      </div>

      {parseErrors.length > 0 && (
        <Alert variant="destructive">
          <AlertTitle>File warnings</AlertTitle>
          <AlertDescription>
            <ul className="list-disc pl-5 space-y-1">
              {parseErrors.slice(0, 5).map((message, index) => (
                <li key={index}>{message}</li>
              ))}
              {parseErrors.length > 5 && <li>...and {parseErrors.length - 5} more issue(s).</li>}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {rows.length > 0 && (
        <Card>
          <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle>Preview</CardTitle>
              <CardDescription>
                Showing the first {previewRows.length} row{previewRows.length === 1 ? "" : "s"} out of {rows.length} detected.
              </CardDescription>
            </div>
            <Badge variant="secondary">
              {rows.length} learner{rows.length === 1 ? "" : "s"}
            </Badge>
          </CardHeader>
          <CardContent className="max-w-full overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  {IMPORT_TEMPLATE_COLUMNS.map((column) => (
                    <TableHead key={column.header}>{column.header}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {previewRows.map((row, index) => (
                  <TableRow key={index}>
                    <TableCell>{index + 1}</TableCell>
                    {IMPORT_TEMPLATE_COLUMNS.map((column) => {
                      const cellValue = row[column.key] as string | undefined;
                      return <TableCell key={column.header}>{cellValue ? cellValue : <span className="text-muted-foreground">—</span>}</TableCell>;
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {hasMoreRows && <p className="mt-3 text-xs text-muted-foreground">Showing a partial preview. Import will include all {rows.length} learners.</p>}
          </CardContent>
        </Card>
      )}

      {result && (
        <Card>
          <CardHeader>
            <CardTitle>Import summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="flex flex-wrap items-center gap-3">
              <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">Imported {result.imported}</Badge>
              <Badge variant={result.failed > 0 ? "destructive" : "secondary"}>Failed {result.failed}</Badge>
            </div>
            {result.successes.length > 0 && (
              <div>
                <h4 className="font-medium text-foreground">Imported learners</h4>
                <ul className="mt-2 space-y-1 text-muted-foreground">
                  {result.successes.slice(0, 5).map((item) => (
                    <li key={item.learnerId}>
                      Row {item.row}: {item.learnerName}
                    </li>
                  ))}
                  {result.successes.length > 5 && <li>...and {result.successes.length - 5} more learner(s).</li>}
                </ul>
              </div>
            )}
            {result.errors.length > 0 && (
              <Alert variant="destructive">
                <AlertTitle>Rows that could not be imported</AlertTitle>
                <AlertDescription>
                  <ul className="list-disc pl-5 space-y-1">
                    {result.errors.slice(0, 5).map((error, index) => (
                      <li key={`${error.row}-${index}`}>
                        Row {error.row}
                        {error.name ? ` (${error.name})` : ""}
                        {error.email ? ` <${error.email}>` : ""}: {error.reason}
                      </li>
                    ))}
                    {result.errors.length > 5 && <li>...and {result.errors.length - 5} more issue(s).</li>}
                  </ul>
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};
