"use client";

import { PanelLeft, PanelRight } from "lucide-react";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type SidebarSide = "left" | "right";

interface SidebarContextValue {
  isMobile: boolean;
  open: Record<SidebarSide, boolean>;
  setOpen: (side: SidebarSide, open: boolean) => void;
  toggle: (side: SidebarSide) => void;
}

const SidebarContext = React.createContext<SidebarContextValue | null>(null);

function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState(false);

  React.useEffect(() => {
    const media = window.matchMedia("(max-width: 767px)");

    const update = () => setIsMobile(media.matches);
    update();

    if (media.addEventListener) {
      media.addEventListener("change", update);
      return () => media.removeEventListener("change", update);
    }

    media.addListener(update);
    return () => media.removeListener(update);
  }, []);

  return isMobile;
}

interface SidebarProviderProps {
  defaultOpen?: Partial<Record<SidebarSide, boolean>>;
  children: React.ReactNode;
}

export function SidebarProvider({ defaultOpen, children }: SidebarProviderProps) {
  const isMobile = useIsMobile();
  const [openState, setOpenState] = React.useState<Record<SidebarSide, boolean>>({
    left: defaultOpen?.left ?? true,
    right: defaultOpen?.right ?? true,
  });

  React.useEffect(() => {
    if (isMobile) {
      setOpenState((prev) => ({
        ...prev,
        left: false,
        right: false,
      }));
    }
  }, [isMobile]);

  const setOpen = React.useCallback(
    (side: SidebarSide, open: boolean) => {
      setOpenState((prev) => {
        if (!isMobile) {
          return { ...prev, [side]: open };
        }

        if (open) {
          const otherSide: SidebarSide = side === "left" ? "right" : "left";
          return { ...prev, [side]: true, [otherSide]: false };
        }

        return { ...prev, [side]: false };
      });
    },
    [isMobile],
  );

  const toggle = React.useCallback(
    (side: SidebarSide) => {
      setOpen(side, !openState[side]);
    },
    [openState, setOpen],
  );

  const value = React.useMemo<SidebarContextValue>(
    () => ({
      isMobile,
      open: openState,
      setOpen,
      toggle,
    }),
    [isMobile, openState, setOpen, toggle],
  );

  return <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>;
}

export function useSidebar() {
  const context = React.useContext(SidebarContext);
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider.");
  }
  return context;
}

interface SidebarProps extends React.HTMLAttributes<HTMLElement> {
  side?: SidebarSide;
}

export const Sidebar = React.forwardRef<HTMLElement, SidebarProps>(
  ({ className, side = "left", ...props }, ref) => {
    const { isMobile, open, setOpen } = useSidebar();
    const isOpen = isMobile ? open[side] : true;
    const isLeft = side === "left";

    return (
      <>
        {isMobile && isOpen && (
          <button
            type="button"
            aria-label="Close sidebar"
            onClick={() => setOpen(side, false)}
            className="fixed inset-0 z-40 bg-black/40"
          />
        )}
        <aside
          ref={ref}
          data-side={side}
          data-state={isOpen ? "open" : "closed"}
          className={cn(
            "flex h-full flex-col bg-background",
            isLeft ? "border-r" : "border-l",
            isMobile
              ? cn(
                  "fixed inset-y-0 z-50 w-72 transition-transform duration-200 ease-in-out shadow-lg",
                  isLeft ? "left-0" : "right-0",
                  isOpen ? "translate-x-0" : isLeft ? "-translate-x-full" : "translate-x-full",
                )
              : "relative w-64",
            className,
          )}
          {...props}
        />
      </>
    );
  },
);

Sidebar.displayName = "Sidebar";

export function SidebarHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("flex items-center justify-between border-b p-4", className)} {...props} />
  );
}

export function SidebarContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex-1 overflow-y-auto p-4", className)} {...props} />;
}

export function SidebarFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("border-t p-4", className)} {...props} />;
}

interface SidebarTriggerProps extends React.ComponentProps<typeof Button> {
  side: SidebarSide;
}

export function SidebarTrigger({ side, className, children, ...props }: SidebarTriggerProps) {
  const { toggle } = useSidebar();
  const Icon = side === "left" ? PanelLeft : PanelRight;

  return (
    <Button type="button" onClick={() => toggle(side)} className={cn(className)} {...props}>
      {children ?? <Icon className="h-4 w-4" />}
    </Button>
  );
}
