import * as React from "react";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import { Check, ChevronRight, Circle } from "lucide-react";

import { cn } from "@/lib/utils";

// Use Radix Popover as the underlying primitive for menu-like popovers.
// This avoids some of the DropdownMenu semantics that lead to accidental
// auto-activation on focus/hover during scroll.
const DropdownMenu = PopoverPrimitive.Root;

const DropdownMenuTrigger = React.forwardRef<
  React.ElementRef<typeof PopoverPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Trigger>
>(({ onMouseDown, ...props }, ref) => {
  // Prevent the native mousedown default to avoid the trigger stealing focus
  // which can cause scroll jumps or immediate activation of menu items under the cursor.
  const handleMouseDown = (e: React.MouseEvent<any>) => {
    e.preventDefault();
    if (typeof onMouseDown === "function") onMouseDown(e as any);
  };

  return <PopoverPrimitive.Trigger ref={ref} onMouseDown={handleMouseDown} {...(props as any)} />;
});
DropdownMenuTrigger.displayName = "DropdownMenuTrigger";

const DropdownMenuGroup: React.FC<React.PropsWithChildren<Record<string, unknown>>> = ({ children }) => <>{children}</>;

const DropdownMenuPortal = PopoverPrimitive.Portal;

const DropdownMenuSub: React.FC<React.PropsWithChildren<Record<string, unknown>>> = ({ children }) => <>{children}</>;

const DropdownMenuRadioGroup: React.FC<React.PropsWithChildren<Record<string, unknown>>> = ({ children }) => <>{children}</>;

// Track last open time to suppress accidental immediate selection caused by pointerup
let __lastDropdownMenuOpen = 0;

const DropdownMenuSubTrigger = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, children, ...props }, ref) => (
  <div ref={ref as any} className={cn("flex items-center", className)} {...props}>
    {children}
    <ChevronRight className="ml-auto h-4 w-4" />
  </div>
));
DropdownMenuSubTrigger.displayName = "DropdownMenuSubTrigger";

const DropdownMenuSubContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
  <div
    ref={ref as any}
    className={cn("z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-lg", className)}
    {...props}
  />
));
DropdownMenuSubContent.displayName = "DropdownMenuSubContent";

const DropdownMenuContent = React.forwardRef<
  React.ElementRef<typeof PopoverPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content>
>(({ className, sideOffset = 4, align = "end", ...props }, ref) => {
  React.useEffect(() => {
    // Mark open timestamp when content mounts
    __lastDropdownMenuOpen = Date.now();
  }, []);
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        ref={ref}
        sideOffset={sideOffset}
        align={align as any}
        className={cn("z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md", className)}
        {...props}
      />
    </PopoverPrimitive.Portal>
  );
});
DropdownMenuContent.displayName = "DropdownMenuContent";

const DropdownMenuItem = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement> & { inset?: boolean }>(
  ({ className, inset, onClick, children, ...props }, ref) => {
    const guardedOnClick = React.useCallback(
      (e: React.MouseEvent<HTMLButtonElement>) => {
        if (Date.now() - __lastDropdownMenuOpen < 160) {
          e.preventDefault();
          e.stopPropagation();
          return;
        }
        onClick?.(e as any);
      },
      [onClick]
    );

    return (
      <button
        ref={ref}
        onClick={guardedOnClick}
        className={cn(
          "relative flex items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground",
          inset && "pl-8",
          className
        )}
        {...(props as any)}
      >
        {children}
      </button>
    );
  }
);
DropdownMenuItem.displayName = "DropdownMenuItem";

const DropdownMenuCheckboxItem = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement> & { checked?: boolean }>(
  ({ className, children, checked, ...props }, ref) => (
    <button
      ref={ref}
      role="menuitemcheckbox"
      aria-checked={checked}
      className={cn(
        "relative flex items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground",
        className
      )}
      {...(props as any)}
    >
      <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">{checked ? <Check className="h-4 w-4" /> : null}</span>
      {children}
    </button>
  )
);
DropdownMenuCheckboxItem.displayName = "DropdownMenuCheckboxItem";

const DropdownMenuRadioItem = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement> & { checked?: boolean }>(
  ({ className, children, checked, ...props }, ref) => (
    <button
      ref={ref}
      role="menuitemradio"
      aria-checked={checked}
      className={cn(
        "relative flex items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground",
        className
      )}
      {...(props as any)}
    >
      <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">{checked ? <Circle className="h-2 w-2 fill-current" /> : null}</span>
      {children}
    </button>
  )
);
DropdownMenuRadioItem.displayName = "DropdownMenuRadioItem";

const DropdownMenuLabel = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement> & { inset?: boolean }>(
  ({ className, inset, ...props }, ref) => <div ref={ref as any} className={cn("px-2 py-1.5 text-sm font-semibold", inset && "pl-8", className)} {...props} />
);
DropdownMenuLabel.displayName = "DropdownMenuLabel";

const DropdownMenuSeparator = React.forwardRef<HTMLHRElement, React.HTMLAttributes<HTMLHRElement>>(({ className, ...props }, ref) => (
  <hr ref={ref as any} className={cn("-mx-1 my-1 h-px bg-muted", className)} {...props} />
));
DropdownMenuSeparator.displayName = "DropdownMenuSeparator";

const DropdownMenuShortcut = ({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) => {
  return <span className={cn("ml-auto text-xs tracking-widest opacity-60", className)} {...props} />;
};
DropdownMenuShortcut.displayName = "DropdownMenuShortcut";

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuGroup,
  DropdownMenuPortal,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuRadioGroup,
};
