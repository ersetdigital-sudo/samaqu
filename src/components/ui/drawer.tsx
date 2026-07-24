"use client";

import {
  DialogRoot,
  DialogTrigger,
  DialogBackdrop,
  DialogPositioner,
  DialogContent,
  DialogCloseTrigger,
  DialogTitle,
} from "@ark-ui/react/dialog";
import { createContext, useContext, ReactNode } from "react";

/* ── Context for external open control ── */
interface DrawerCtx {
  open: boolean;
  setOpen: (v: boolean) => void;
}

export const MobileDrawerCtx = createContext<DrawerCtx>({
  open: false,
  setOpen: () => {},
});

/* ── Props ── */
interface MobileDrawerProps {
  children: ReactNode;
  trigger: ReactNode;
  title?: string;
}

export function MobileDrawer({
  children,
  trigger,
  title = "Menu",
}: MobileDrawerProps) {
  const { open, setOpen } = useContext(MobileDrawerCtx);

  return (
    <DialogRoot
      open={open}
      onOpenChange={(details) => setOpen(details.open)}
      lazyMount
      unmountOnExit
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>

      {/* Backdrop — highest z-index */}
      <DialogBackdrop
        className="fixed inset-0 transition-opacity duration-300"
        style={{
          zIndex: 9998,
          background: "rgba(42,33,27,.4)",
        }}
      />

      {/* Positioner — above everything */}
      <DialogPositioner
        className="fixed inset-y-0 right-0"
        style={{ zIndex: 9999 }}
      >
        <DialogContent
          className="h-full w-[85vw] sm:w-[340px] flex flex-col outline-none"
          style={{
            background: "var(--ivory)",
            borderLeft: "1px solid rgba(201,183,156,.2)",
            boxShadow: "-8px 0 32px -8px rgba(45,33,27,.15)",
            animation: "drawerSlideIn 0.3s cubic-bezier(0.22, 1, 0.36, 1)",
          }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-5 h-[64px] shrink-0 border-b"
            style={{ borderColor: "rgba(201,183,156,.2)" }}
          >
            <DialogTitle
              className="text-[13px] tracking-[0.18em] uppercase font-ui font-medium"
              style={{ color: "var(--espresso)" }}
            >
              {title}
            </DialogTitle>
            <DialogCloseTrigger
              className="grid place-items-center w-9 h-9 rounded-sm transition-colors duration-200 hover:opacity-70"
              style={{ color: "var(--coffee)" }}
              aria-label="Tutup menu"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              >
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </DialogCloseTrigger>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto overscroll-contain">
            {children}
          </div>
        </DialogContent>
      </DialogPositioner>
    </DialogRoot>
  );
}
