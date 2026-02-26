import React from "react";

interface AuthShellProps {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  iconBg: string;
  children: React.ReactNode;
}

export default function AuthShell({
  title,
  subtitle,
  icon,
  iconBg,
  children,
}: AuthShellProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="bg-slate-800/60 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-8 shadow-2xl">
          {/* Header */}
          <div className="mb-8 text-center">
            <div
              className={`inline-flex items-center justify-center w-14 h-14 rounded-xl mb-4 border ${iconBg}`}
            >
              {icon}
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              {title}
            </h1>
            <p className="text-slate-400 text-sm mt-1">{subtitle}</p>
          </div>

          {children}
        </div>
      </div>
    </div>
  );
}
