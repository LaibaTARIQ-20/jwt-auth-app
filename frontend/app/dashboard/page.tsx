/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import api from "@/lib/apiClient";

export default function DashboardPage() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const [apiResult, setApiResult] = useState<any>(null);
  const [fetching, setFetching] = useState(false);
  const [apiError, setApiError] = useState("");

  useEffect(() => {
    // IMPORTANT: only redirect AFTER loading is done
    // If we redirect while loading=true, we kick out logged-in users
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  const testProtectedApi = async () => {
    setFetching(true);
    setApiError("");
    setApiResult(null);
    try {
      const res = await api.get("/auth/me");
      setApiResult(res.data);
    } catch (err: any) {
      setApiError(err.response?.data?.error || "Request failed");
    } finally {
      setFetching(false);
    }
  };

  // Show spinner while session is being restored
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-400 text-sm">Restoring session...</p>
        </div>
      </div>
    );
  }

  // Don't render anything while redirect is happening
  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* ── Navbar ── */}
      <nav className="sticky top-0 z-10 border-b border-slate-700/50 bg-slate-900/70 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <svg
                className="w-4 h-4 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                />
              </svg>
            </div>
            <span className="text-white font-bold">AuthApp</span>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-slate-400 text-sm hidden sm:block">
              {user.email}
            </span>
            <button
              onClick={handleLogout}
              className="text-sm font-medium text-slate-300 hover:text-white border border-slate-600
                hover:border-slate-400 px-3 py-1.5 rounded-lg transition-all duration-150"
            >
              Logout
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-6 py-10 space-y-6">
        {/* ── Welcome ── */}
        <div>
          <h1 className="text-3xl font-bold text-white">
            Hello, <span className="text-indigo-400">{user.name}</span> 👋
          </h1>
          <p className="text-slate-400 mt-1 text-sm">
            You are authenticated successfully.
          </p>
        </div>

        {/* ── User Info Cards ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: "User ID", value: user.id, emoji: "🆔" },
            { label: "Email", value: user.email, emoji: "📧" },
            { label: "Name", value: user.name, emoji: "👤" },
          ].map((item) => (
            <div
              key={item.label}
              className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-5"
            >
              <div className="text-2xl mb-2">{item.emoji}</div>
              <p className="text-slate-500 text-xs uppercase tracking-wider mb-1">
                {item.label}
              </p>
              <p className="text-white text-sm font-medium truncate">
                {item.value}
              </p>
            </div>
          ))}
        </div>

        {/* ── Protected API Test ── */}
        <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-6">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <h2 className="text-white font-semibold text-lg">
                Protected API Test
              </h2>
              <p className="text-slate-400 text-sm mt-0.5">
                Calls{" "}
                <code className="text-indigo-400 bg-slate-900/60 px-1.5 py-0.5 rounded text-xs">
                  GET /api/auth/me
                </code>{" "}
                using your access token
              </p>
            </div>
            <button
              onClick={testProtectedApi}
              disabled={fetching}
              className="shrink-0 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50
                disabled:cursor-not-allowed text-white text-sm font-medium
                px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
            >
              {fetching && (
                <svg
                  className="w-3.5 h-3.5 animate-spin"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v8H4z"
                  />
                </svg>
              )}
              {fetching ? "Fetching..." : "Test API"}
            </button>
          </div>

          {apiResult && (
            <pre
              className="bg-slate-900/70 border border-slate-700/40 rounded-lg p-4
              text-emerald-400 text-sm overflow-auto"
            >
              {JSON.stringify(apiResult, null, 2)}
            </pre>
          )}
          {apiError && (
            <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 px-4 py-3 rounded-lg">
              {apiError}
            </p>
          )}

          <div className="mt-4 p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-lg">
            <p className="text-indigo-300 text-sm leading-relaxed">
              <span className="font-semibold">Auto-refresh:</span> Access tokens
              expire in <strong>15 minutes</strong>. When a request returns 401,
              the app silently calls{" "}
              <code className="bg-slate-900/60 px-1 rounded text-xs">
                /auth/refresh
              </code>{" "}
              using the httpOnly cookie, gets a new token, and retries —
              invisible to the user.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
