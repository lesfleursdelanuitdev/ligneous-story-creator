"use client";

import * as React from "react";
import {
  Dialog as DialogPrimitive,
  type DialogRootProps,
} from "@base-ui/react/dialog";
import { cn } from "../../cn";

export const Dialog = ({
  open,
  onOpenChange,
  disablePointerDismissal,
  ...props
}: DialogRootProps & { disablePointerDismissal?: boolean }) => (
  <DialogPrimitive.Root
    open={open}
    onOpenChange={(next, details) => {
      if (!next && disablePointerDismissal && details.reason === "outside-press") return;
      onOpenChange?.(next, details);
    }}
    {...props}
  />
);

export const DialogPortal = DialogPrimitive.Portal;

export const DialogBackdrop = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Backdrop>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Backdrop
    ref={ref}
    className={cn("fixed inset-0 z-[200] bg-black/50 backdrop-blur-sm", className)}
    {...props}
  />
));
DialogBackdrop.displayName = "DialogBackdrop";

export const DialogViewport = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Viewport>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Viewport
    ref={ref}
    className={cn("fixed inset-0 z-[200] flex min-h-full w-full items-center justify-center p-4", className)}
    {...props}
  />
));
DialogViewport.displayName = "DialogViewport";

export const DialogPopup = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Popup>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Popup
    ref={ref}
    className={cn(
      "relative z-50 w-full max-w-lg max-h-[85vh] overflow-auto rounded-xl",
      "border border-base-content/10 bg-base-100 shadow-lg p-6",
      className,
    )}
    {...props}
  />
));
DialogPopup.displayName = "DialogPopup";

export const DialogTitle = React.forwardRef<
  HTMLHeadingElement,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn("text-lg font-semibold leading-none tracking-tight", className)}
    {...props}
  />
));
DialogTitle.displayName = "DialogTitle";

export const DialogDescription = React.forwardRef<
  HTMLParagraphElement,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn("text-sm text-base-content/60", className)}
    {...props}
  />
));
DialogDescription.displayName = "DialogDescription";

export const DialogContent = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Popup>
>(({ className, children, ...props }, ref) => (
  <DialogPortal>
    <DialogBackdrop />
    <DialogViewport>
      <DialogPopup ref={ref} className={className} {...props}>
        {children}
      </DialogPopup>
    </DialogViewport>
  </DialogPortal>
));
DialogContent.displayName = "DialogContent";
