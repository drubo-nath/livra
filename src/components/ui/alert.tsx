import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

const alertVariants = cva(
  "relative w-full rounded-xl border p-4 text-sm transition-colors text-foreground [&>svg~*]:pl-7 has-[>[data-slot=alert-action]]:pr-10 [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:size-4 [&>svg]:translate-y-0.5 [&>svg]:text-current",
  {
    variants: {
      variant: {
        default:
          "bg-card text-card-foreground border-border [&>svg]:text-foreground",
        brand:
          "bg-cream border-line text-ink dark:bg-ink dark:border-line/40 dark:text-cream [&>svg]:text-clay [&_[data-slot=alert-description]]:text-taupe dark:[&_[data-slot=alert-description]]:text-sand",
        editorial:
          "bg-cream border-l-4 border-l-clay border-y border-r border-line text-ink dark:bg-ink dark:border-line/40 dark:border-l-clay dark:text-cream [&>svg]:text-clay [&_[data-slot=alert-description]]:text-taupe dark:[&_[data-slot=alert-description]]:text-sand",
        destructive:
          "bg-destructive/10 border-destructive/25 text-destructive dark:bg-destructive/20 dark:border-destructive/40 [&>svg]:text-destructive [&_[data-slot=alert-description]]:text-destructive/90",
        success:
          "bg-emerald-500/10 border-emerald-500/25 text-emerald-900 dark:bg-emerald-500/15 dark:border-emerald-500/40 dark:text-emerald-200 [&>svg]:text-emerald-600 dark:[&>svg]:text-emerald-400 [&_[data-slot=alert-description]]:text-emerald-800/90 dark:[&_[data-slot=alert-description]]:text-emerald-300",
        warning:
          "bg-amber-500/10 border-amber-500/25 text-amber-900 dark:bg-amber-500/15 dark:border-amber-500/40 dark:text-amber-200 [&>svg]:text-amber-600 dark:[&>svg]:text-amber-400 [&_[data-slot=alert-description]]:text-amber-800/90 dark:[&_[data-slot=alert-description]]:text-amber-300",
        info:
          "bg-sky-500/10 border-sky-500/25 text-sky-900 dark:bg-sky-500/15 dark:border-sky-500/40 dark:text-sky-200 [&>svg]:text-sky-600 dark:[&>svg]:text-sky-400 [&_[data-slot=alert-description]]:text-sky-800/90 dark:[&_[data-slot=alert-description]]:text-sky-300",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

const variantAliases: Record<string, "default" | "brand" | "editorial" | "destructive" | "success" | "warning" | "info"> = {
  error: "destructive",
  danger: "destructive",
}

export interface AlertProps
  extends Omit<React.ComponentProps<"div">, "title">,
    VariantProps<typeof alertVariants> {
  asChild?: boolean
  Type?: "default" | "brand" | "editorial" | "destructive" | "error" | "success" | "warning" | "info"
  title?: React.ReactNode
  message?: React.ReactNode
  duration?: number
}

function Alert({
  className,
  variant = "default",
  Type,
  title,
  message,
  duration,
  asChild = false,
  children,
  ...props
}: AlertProps) {
  const resolvedVariant = (Type ? (variantAliases[Type] || Type) : variant) as VariantProps<typeof alertVariants>["variant"]
  const Comp = asChild ? Slot.Root : "div"

  return (
    <Comp
      data-slot="alert"
      role="alert"
      data-variant={resolvedVariant}
      className={cn(alertVariants({ variant: resolvedVariant }), className)}
      {...props}
    >
      {title && <AlertTitle>{title}</AlertTitle>}
      {message && <AlertDescription>{message}</AlertDescription>}
      {children}
    </Comp>
  )
}

function AlertTitle({
  className,
  asChild = false,
  ...props
}: React.ComponentProps<"div"> & {
  asChild?: boolean
}) {
  const Comp = asChild ? Slot.Root : "div"

  return (
    <Comp
      data-slot="alert-title"
      className={cn("mb-1 font-medium leading-snug tracking-tight", className)}
      {...props}
    />
  )
}

function AlertDescription({
  className,
  asChild = false,
  ...props
}: React.ComponentProps<"div"> & {
  asChild?: boolean
}) {
  const Comp = asChild ? Slot.Root : "div"

  return (
    <Comp
      data-slot="alert-description"
      className={cn(
        "text-sm leading-relaxed text-muted-foreground [&_p]:leading-relaxed",
        className
      )}
      {...props}
    />
  )
}

function AlertAction({
  className,
  asChild = false,
  ...props
}: React.ComponentProps<"div"> & {
  asChild?: boolean
}) {
  const Comp = asChild ? Slot.Root : "div"

  return (
    <Comp
      data-slot="alert-action"
      className={cn(
        "absolute top-4 right-4 flex items-center gap-2",
        className
      )}
      {...props}
    />
  )
}

export {
  Alert,
  AlertTitle,
  AlertDescription,
  AlertAction,
  alertVariants,
}
