import React, { useEffect, useRef, useState } from "react";
import { DropdownMenu } from "./dropdown-menu";

type SafeDropdownMenuProps = React.ComponentProps<typeof DropdownMenu> & {
  // keep composability: children expected to contain Trigger/Content
  children: React.ReactNode;
};

/**
 * SafeDropdownMenu wraps the Radix DropdownMenu to ignore open requests
 * that occur immediately after a page scroll. This prevents accidental
 * menu opens while the user is scrolling.
 */
export default function SafeDropdownMenu({ children, ...props }: SafeDropdownMenuProps) {
  const [open, setOpen] = useState(false);
  const lastScrollRef = useRef<number>(0);

  useEffect(() => {
    const onScroll = () => {
      lastScrollRef.current = Date.now();
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleOpenChange = (next: boolean) => {
    if (next) {
      const now = Date.now();
      // ignore opens triggered within 250ms after scroll
      if (now - lastScrollRef.current < 250) return;
    }
    setOpen(next);
    if (props.onOpenChange) props.onOpenChange(next);
  };

  return (
    <DropdownMenu {...props} open={open} onOpenChange={handleOpenChange}>
      {children}
    </DropdownMenu>
  );
}
