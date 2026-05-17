import { type ReactNode } from "react";

import { cn } from "@/lib/utils";

/** 모달·폼 공통 필드 라벨 */
export const formLabelClass = "text-xs font-medium text-[var(--foreground)]";

type FormFieldProps = {
  label: string;
  htmlFor?: string;
  help?: string;
  children: ReactNode;
  className?: string;
};

/** label + (선택) help + control — `space-y-1.5` 간격 */
export function FormField({ label, htmlFor, help, children, className }: FormFieldProps) {
  return (
    <div className={cn("w-full min-w-0 space-y-0.5", className)}>
      <div>
        <label htmlFor={htmlFor} className={formLabelClass}>
          {label}
        </label>
        {help ? <p className="mt-0.5 text-xs text-[var(--muted-foreground)]">{help}</p> : null}
      </div>
      {children}
    </div>
  );
}
