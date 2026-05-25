"use client";

import {
  forwardRef,
  type HTMLAttributes,
  type ReactNode,
} from "react";
import {
  Dialog as HLDialog,
  DialogBackdrop as HLDialogBackdrop,
  DialogPanel as HLDialogPanel,
  DialogTitle as HLDialogTitle,
  Description as HLDescription,
} from "@headlessui/react";
import { cn } from "../../cn";

// Root — converts onOpenChange(bool) to headlessui's onClose()
export function Dialog({
  open,
  onOpenChange,
  children,
}: {
  open: boolean;
  onOpenChange?: (open: boolean) => void;
  children?: ReactNode;
}) {
  return (
    <HLDialog open={open} onClose={() => onOpenChange?.(false)}>
      {children}
    </HLDialog>
  );
}

// Headlessui already portals — this is a structural passthrough
export function DialogPortal({ children }: { children?: ReactNode }) {
  return <>{children}</>;
}

export const DialogBackdrop = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  function DialogBackdrop({ className, ...props }, ref) {
    return (
      <HLDialogBackdrop
        ref={ref}
        className={cn("fixed inset-0 bg-black/50 backdrop-blur-sm", className)}
        {...props}
      />
    );
  },
);

// Positioning wrapper — not a headlessui primitive
export const DialogViewport = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  function DialogViewport({ className, ...props }, ref) {
    return (
      <div
        ref={ref}
        className={cn("fixed inset-0 flex min-h-full w-full items-center justify-center p-4", className)}
        {...props}
      />
    );
  },
);

export const DialogPopup = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  function DialogPopup({ className, ...props }, ref) {
    return (
      <HLDialogPanel
        ref={ref}
        className={cn(
          "relative z-50 w-full max-w-lg max-h-[85vh] overflow-auto rounded-xl",
          "border border-base-content/10 bg-base-100 shadow-lg p-6",
          className,
        )}
        {...props}
      />
    );
  },
);

export const DialogTitle = forwardRef<HTMLHeadingElement, HTMLAttributes<HTMLHeadingElement>>(
  function DialogTitle({ className, ...props }, ref) {
    return (
      <HLDialogTitle
        ref={ref}
        className={cn("text-lg font-semibold leading-none tracking-tight", className)}
        {...props}
      />
    );
  },
);

export const DialogDescription = forwardRef<HTMLParagraphElement, HTMLAttributes<HTMLParagraphElement>>(
  function DialogDescription({ className, ...props }, ref) {
    return (
      <HLDescription
        ref={ref}
        className={cn("text-sm text-base-content/60", className)}
        {...props}
      />
    );
  },
);

// Convenience: Portal + Backdrop + Viewport + Popup
export const DialogContent = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  function DialogContent({ className, children, ...props }, ref) {
    return (
      <DialogPortal>
        <DialogBackdrop />
        <DialogViewport>
          <DialogPopup ref={ref} className={className} {...props}>
            {children}
          </DialogPopup>
        </DialogViewport>
      </DialogPortal>
    );
  },
);
