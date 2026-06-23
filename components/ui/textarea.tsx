import { forwardRef, TextareaHTMLAttributes, useEffect, useLayoutEffect, useRef } from "react";
import { cn } from "@/lib/utils";

const useIsomorphicLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement>;

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, onChange, value, ...props }, ref) => {
    const localRef = useRef<HTMLTextAreaElement | null>(null);

    // Merge parent ref and local ref
    const setRefs = (node: HTMLTextAreaElement | null) => {
      localRef.current = node;
      if (typeof ref === "function") {
        ref(node);
      } else if (ref && typeof ref === "object") {
        (ref as any).current = node;
      }
    };

    const adjustHeight = () => {
      const textarea = localRef.current;
      if (textarea) {
        // Reset height to 0px to accurately calculate scrollHeight when content shrinks
        textarea.style.height = "0px";
        textarea.style.height = `${textarea.scrollHeight}px`;
      }
    };

    // Adjust height on value change before rendering to prevent jumpiness
    useIsomorphicLayoutEffect(() => {
      adjustHeight();
    }, [value]);

    // Handle initial mount and window resize events
    useEffect(() => {
      adjustHeight();
      window.addEventListener("resize", adjustHeight);
      return () => {
        window.removeEventListener("resize", adjustHeight);
      };
    }, []);

    return (
      <textarea
        ref={setRefs}
        className={cn(
          "w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-base text-[var(--foreground)] shadow-[var(--input-inset)] placeholder:text-[var(--muted-foreground)] focus:border-[color-mix(in_srgb,var(--primary)_45%,var(--border))] focus:outline-none focus:ring-2 focus:ring-[var(--ring-focus)] resize-none overflow-hidden whitespace-pre-wrap break-all",
          className,
        )}
        onChange={(e) => {
          adjustHeight();
          if (onChange) onChange(e);
        }}
        value={value}
        {...props}
      />
    );
  },
);

Textarea.displayName = "Textarea";
