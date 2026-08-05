"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";

import { Badge } from "@/components/ui/badge";

interface ArchiveTreeNodeProps {
  title: ReactNode;
  subtitle?: ReactNode;
  icon?: ReactNode;
  badge?: ReactNode;
  children?: ReactNode;
  defaultOpen?: boolean;
  level?: number;
}

export function ArchiveTreeNode({
  title,
  subtitle,
  icon,
  badge,
  children,
  defaultOpen = false,
  level = 0,
}: ArchiveTreeNodeProps) {
  const [open, setOpen] = useState(defaultOpen);
  const hasChildren = Boolean(children);

  return (
    <div className="space-y-2">
      <button
        type="button"
        className={cn(
          "flex w-full items-start gap-2 rounded-md border bg-background p-3 text-left transition-colors hover:bg-muted/60",
          level > 0 && "ml-4",
        )}
        onClick={() => {
          if (hasChildren) {
            setOpen((current) => !current);
          }
        }}
      >
        <div className="mt-0.5 h-5 w-5 shrink-0">
          {hasChildren ? (
            open ? (
              <ChevronDown className="h-5 w-5 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            )
          ) : (
            <span className="block h-5 w-5" />
          )}
        </div>

        {icon ? (
          <div className="mt-0.5 shrink-0 text-muted-foreground">
            {icon}
          </div>
        ) : null}

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <div className="font-medium">
              {title}
            </div>

            {badge ? (
              <Badge variant="secondary">
                {badge}
              </Badge>
            ) : null}
          </div>

          {subtitle ? (
            <div className="mt-1 text-sm text-muted-foreground">
              {subtitle}
            </div>
          ) : null}
        </div>
      </button>

      {open && hasChildren ? (
        <div className="space-y-2">
          {children}
        </div>
      ) : null}
    </div>
  );
}