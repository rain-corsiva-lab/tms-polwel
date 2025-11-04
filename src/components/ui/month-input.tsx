import React, { useRef, useState, useEffect } from "react";
import { Calendar } from "lucide-react";
import { Input } from "./input";

interface MonthInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange"> {
  // value expected to be YYYY-MM (or empty)
  value?: string;
  onChange?: (monthValue?: string | undefined) => void;
}

// Format YYYY-MM to "MonthName YYYY" for display
const formatMonthDisplay = (yyyyMm: string): string => {
  if (!yyyyMm || !yyyyMm.includes('-')) return '';
  const [year, month] = yyyyMm.split('-');
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const monthIndex = parseInt(month, 10) - 1;
  if (monthIndex >= 0 && monthIndex < 12) {
    return `${monthNames[monthIndex]} ${year}`;
  }
  return '';
};

// Parse "MonthName YYYY" or "MM/YYYY" back to YYYY-MM
const parseMonthInput = (text: string): string | null => {
  if (!text) return null;
  
  const monthNames = [
    'january', 'february', 'march', 'april', 'may', 'june',
    'july', 'august', 'september', 'october', 'november', 'december'
  ];
  
  // Try to match "MonthName YYYY" format
  const parts = text.trim().split(/\s+/);
  if (parts.length === 2) {
    const monthStr = parts[0].toLowerCase();
    const year = parts[1];
    const monthIndex = monthNames.indexOf(monthStr);
    if (monthIndex >= 0 && /^\d{4}$/.test(year)) {
      const month = String(monthIndex + 1).padStart(2, '0');
      return `${year}-${month}`;
    }
  }
  
  // Try MM/YYYY format
  const slashMatch = text.match(/^(\d{1,2})\/(\d{4})$/);
  if (slashMatch) {
    const month = slashMatch[1].padStart(2, '0');
    const year = slashMatch[2];
    return `${year}-${month}`;
  }
  
  return null;
};

export const MonthInput: React.FC<MonthInputProps> = ({ 
  value = "", 
  onChange, 
  id, 
  className, 
  ...rest 
}) => {
  // visibleText stores "MonthName YYYY" for display
  const [visibleText, setVisibleText] = useState<string>(() => formatMonthDisplay(value));

  // hidden native month input (used to open platform picker)
  const nativeRef = useRef<HTMLInputElement | null>(null);

  // sync from prop value -> visible text
  useEffect(() => {
    setVisibleText(formatMonthDisplay(value));
  }, [value]);

  const openNativePicker = () => {
    const el = nativeRef.current as any;
    if (!el) return;
    if (typeof el.showPicker === 'function') {
      try {
        el.showPicker();
        return;
      } catch (err) {
        // ignore
      }
    }
    el.focus();
  };

  // When user changes visible text manually, try to parse and call onChange
  const onVisibleChange = (text: string) => {
    setVisibleText(text);
    const parsed = parseMonthInput(text);
    onChange && onChange(parsed ?? undefined);
  };

  // When native month input changes (picker), update parent with YYYY-MM and visible text
  const onNativeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const yyyyMm = e.target.value; // YYYY-MM
    onChange && onChange(yyyyMm || undefined);
    setVisibleText(formatMonthDisplay(yyyyMm));
  };

  return (
    <div className="relative" onClick={() => openNativePicker()}>
      {/* Visible input that shows "MonthName YYYY" */}
      <Input
        id={id ? `${id}-display` : undefined}
        value={visibleText}
        onChange={(e) => onVisibleChange(e.target.value)}
        placeholder="Month YYYY"
        className={`${className ?? ""} pr-10 cursor-pointer`}
        {...rest}
      />

      {/* Hidden native month input used only to open native picker & keep native UX */}
      <input
        aria-hidden
        tabIndex={-1}
        ref={nativeRef}
        type="month"
        value={value}
        onChange={onNativeChange}
        className="absolute inset-0 w-full h-full opacity-0 pointer-events-none"
      />

      <span className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground">
        <Calendar className="h-4 w-4" />
      </span>
    </div>
  );
};

export default MonthInput;
