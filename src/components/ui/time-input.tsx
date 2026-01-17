import React, { useRef, useState, useEffect } from "react";
import { Clock } from "lucide-react";
import { Input } from "./input";

interface TimeInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange"> {
  // value expected to be HH:MM format (or empty)
  value?: string;
  onChange?: (time?: string | undefined) => void;
}

export const TimeInput: React.FC<TimeInputProps> = ({ value = "", onChange, id, className, ...rest }) => {
  // visibleText stores HH:MM for display
  const [visibleText, setVisibleText] = useState<string>(value);

  // hidden native time input (used to open platform picker)
  const nativeRef = useRef<HTMLInputElement | null>(null);

  // sync from prop value -> visible text
  useEffect(() => {
    setVisibleText(value);
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

  // When user changes visible text manually, validate and call onChange
  const onVisibleChange = (text: string) => {
    setVisibleText(text);

    // Basic HH:MM validation
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (timeRegex.test(text) || text === "") {
      onChange && onChange(text || undefined);
    }
  };

  // When native time input changes (picker), update parent and visible text
  const onNativeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = e.target.value; // HH:MM
    onChange && onChange(time || undefined);
    setVisibleText(time);
  };

  return (
    <div className="relative" onClick={() => openNativePicker()}>
      {/* Visible input that shows HH:MM */}
      <Input
        id={id ? `${id}-display` : undefined}
        value={visibleText}
        onChange={(e) => onVisibleChange(e.target.value)}
        placeholder="--:-- --"
        className={`${className ?? ""} pr-10`}
        {...rest}
      />

      {/* Hidden native time input used only to open native picker & keep native UX */}
      <input
        aria-hidden
        tabIndex={-1}
        ref={nativeRef}
        type="time"
        value={value}
        onChange={onNativeChange}
        className="absolute inset-0 w-full h-full opacity-0 pointer-events-none"
      />

      <span className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground">
        <Clock className="h-4 w-4" />
      </span>
    </div>
  );
};

export default TimeInput;
