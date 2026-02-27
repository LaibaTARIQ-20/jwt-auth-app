"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import AuthShell from "@/components/AuthShell"; // ✅ default import
import Input from "@/components/Input"; // ✅ default import

export default function SignInPage() {
  const { login } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.error || "Invalid email or password.");
    } finally {
      setLoading(false);
    }
  };
  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to your account"
      iconBg="bg-indigo-500/20 border-indigo-500/40"
      icon={
        <svg
          className="w-7 h-7 text-indigo-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
          />
        </svg>
      }
    >
      {error && (
        <div className="mb-5 flex items-center gap-2 px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-lg">
          <svg
            className="w-4 h-4 text-red-400 shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <Input
          label="Email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          autoComplete="email"
        />
        <Input
          label="Password"
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          autoComplete="current-password"
        />

        <button
          type="submit"
          disabled={loading}
          className="w-full mt-2 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700
            disabled:opacity-50 disabled:cursor-not-allowed
            text-white font-semibold py-2.5 rounded-lg
            transition-colors duration-150 flex items-center justify-center gap-2"
        >
          {loading && (
            <svg
              className="w-4 h-4 animate-spin"
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
          {loading ? "Signing in..." : "Sign in"}
        </button>
      </form>

      <p className="text-center text-slate-400 text-sm mt-6">
        Don&apos;t have an account?{" "}
        <Link
          href="/register"
          className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
        >
          Create one
        </Link>
      </p>
    </AuthShell>
  );
}
