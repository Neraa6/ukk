"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/context/AuthContext";
import { Hotel, Mail, Lock, Sparkles, ShieldAlert } from "lucide-react";
import { Suspense } from "react";

function AdminLoginContent() {
  const router = useRouter();
  const { login } = useAuth();

  const [formData, setFormData] = useState({
    email: "",
    password: "",
    rememberMe: false,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setFormData({ ...formData, [e.target.name]: value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/staff/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Gagal masuk");
      } else {
        login(data.user);
        router.push("/dashboard");
      }
    } catch (err) {
      console.error(err);
      setError("Terjadi kesalahan koneksi");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-heritage-cream-100 flex items-center justify-center py-24 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-xl border border-heritage-gold-400/20">
        <div className="text-center mb-8">
          <Hotel className="h-10 w-10 text-heritage-gold-400 mx-auto mb-3" />
          <h2 className="font-serif text-3xl font-bold text-heritage-green-900">
            Masuk Panel Internal
          </h2>
          <p className="text-sm text-heritage-green-800/60 mt-1 font-sans">
            Sistem Informasi drgHotel
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs px-3 py-2.5 rounded flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-heritage-green-800 uppercase tracking-wider mb-1">
              Alamat Email
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-heritage-gold-500">
                <Mail className="h-4 w-4" />
              </div>
              <input
                type="email"
                name="email"
                required
                placeholder="admin@drghotel.com"
                value={formData.email}
                onChange={handleChange}
                className="block w-full pl-10 pr-3 py-2 border border-heritage-gold-400/30 rounded focus:outline-none focus:ring-1 focus:ring-heritage-green-700 text-sm bg-heritage-cream-50"
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-xs font-semibold text-heritage-green-800 uppercase tracking-wider">
                Password
              </label>
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-heritage-gold-500">
                <Lock className="h-4 w-4" />
              </div>
              <input
                type="password"
                name="password"
                required
                placeholder="••••••••"
                value={formData.password}
                onChange={handleChange}
                className="block w-full pl-10 pr-3 py-2 border border-heritage-gold-400/30 rounded focus:outline-none focus:ring-1 focus:ring-heritage-green-700 text-sm bg-heritage-cream-50"
              />
            </div>
          </div>

          <div className="flex items-center">
            <input
              id="rememberMe"
              name="rememberMe"
              type="checkbox"
              checked={formData.rememberMe}
              onChange={handleChange}
              className="h-4 w-4 text-heritage-green-700 border-heritage-gold-400/30 rounded focus:ring-heritage-green-700"
            />
            <label htmlFor="rememberMe" className="ml-2 block text-xs text-heritage-green-800/80 font-semibold uppercase tracking-wide">
              Ingat Saya (Remember Me)
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-heritage-green-800 hover:bg-heritage-green-900 text-heritage-gold-100 font-bold py-2.5 rounded tracking-wide shadow transition-colors duration-200 mt-6"
          >
            {loading ? (
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-heritage-gold-400 border-t-transparent"></div>
            ) : (
              <>
                <Sparkles className="h-4 w-4 text-heritage-gold-400" />
                <span>Masuk Sekarang</span>
              </>
            )}
          </button>

          <div className="mt-6 bg-heritage-cream-200/40 p-4 rounded border border-heritage-gold-400/20 text-left">
            <span className="text-xs font-bold text-heritage-gold-500 uppercase tracking-wider block mb-2">
              💡 Kredensial Demo Sandbox
            </span>
            <ul className="text-xs text-heritage-green-900/80 space-y-1.5 font-sans leading-relaxed">
              <li>
                <strong>Admin/Staff:</strong> admin@drghotel.com <span className="text-heritage-gold-500 font-serif italic">(password: admin123)</span>
              </li>
              <li>
                <strong>Management:</strong> manager@drghotel.com <span className="text-heritage-gold-500 font-serif italic">(password: manager123)</span>
              </li>
            </ul>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function AdminLogin() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-heritage-cream-100 flex items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-heritage-gold-400 border-t-transparent"></div>
      </div>
    }>
      <AdminLoginContent />
    </Suspense>
  );
}
