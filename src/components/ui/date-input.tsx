import React, { useRef, useState, useEffect } from "react";
import { Calendar } from "lucide-react";
import { Input } from "./input";
import { formatDateDDMMYYYY, parseDDMMYYYYToISO } from "@/lib/utils";

interface DateInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange"> {
  // value expected to be ISO YYYY-MM-DD (or empty)
  value?: string;
  onChange?: (isoDate?: string | undefined) => void;
}

export const DateInput: React.FC<DateInputProps> = ({ value = "", onChange, id, className, ...rest }) => {
  // visibleText stores dd/mm/yyyy for display
  const [visibleText, setVisibleText] = useState<string>(() => formatDateDDMMYYYY(value));

  // hidden native date input (used to open platform picker)
  const nativeRef = useRef<HTMLInputElement | null>(null);

  // sync from prop value -> visible text
  useEffect(() => {
    setVisibleText(formatDateDDMMYYYY(value));
  }, [value]);

  const openNativePicker = () => {
    const el = nativeRef.current as any;
    if (!el) return;
    if (typeof el.showPicker === "function") {
      try {
        el.showPicker();
        return;
      } catch (err) {
        // ignore
      }
    }
    el.focus();
  };

  // When user changes visible text manually, try to parse dd/mm/yyyy -> ISO and call onChange
  const onVisibleChange = (text: string) => {
    setVisibleText(text);
    const iso = parseDDMMYYYYToISO(text);
    onChange && onChange(iso ?? undefined);
  };

  // When native date input changes (picker), update parent with ISO and visible text
  const onNativeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const iso = e.target.value; // YYYY-MM-DD
    onChange && onChange(iso || undefined);
    setVisibleText(formatDateDDMMYYYY(iso));
  };

  return (
    <div className="relative" onClick={() => openNativePicker()}>
      {/* Visible input that shows dd/mm/yyyy */}
      <Input
        id={id ? `${id}-display` : undefined}
        value={visibleText}
        onChange={(e) => onVisibleChange(e.target.value)}
        placeholder="dd/mm/yyyy"
        className={`${className ?? ""} pr-10`}
        {...rest}
      />

      {/* Hidden native date input used only to open native picker & keep native UX */}
      <input
        aria-hidden
        tabIndex={-1}
        ref={nativeRef}
        type="date"
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

export default DateInput;
