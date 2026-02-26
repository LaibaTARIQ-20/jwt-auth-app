import React from "react";
import { clsx } from "clsx";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-slate-300">{label}</label>
        <input
          ref={ref}
          className={clsx(
            "w-full rounded-lg border px-4 py-2.5 text-sm text-white placeholder-slate-500",
            "bg-slate-900/50 transition duration-150",
            "focus:outline-none focus:ring-2",
            error
              ? "border-red-500/60 focus:ring-red-500/30"
              : "border-slate-600/50 focus:ring-indigo-500/40 focus:border-indigo-500/50",
            className,
          )}
          {...props}
        />
        {error && <p className="text-xs text-red-400">{error}</p>}
      </div>
    );
  },
);

Input.displayName = "Input";
export default Input;
