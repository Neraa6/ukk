"use client";

import React, { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Hotel, Lock, CheckCircle2, ShieldAlert, Sparkles, ArrowRight } from "lucide-react";

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [formData, setFormData] = useState({
    password: "",
    confirmPassword: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!token) {
      setError("Token tidak ditemukan. Silakan ajukan ulang permintaan lupa password.");
      return;
    }

    if (formData.password.length < 6) {
      setError("Password minimal terdiri dari 6 karakter.");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError("Konfirmasi password tidak cocok.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          password: formData.password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Gagal mengatur ulang password");
      } else {
        setSuccess(data.message || "Password Anda berhasil diperbarui!");
        setFormData({ password: "", confirmPassword: "" });
      }
    } catch (err) {
      console.error(err);
      setError("Terjadi kesalahan koneksi");
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-heritage-cream-100 flex items-center justify-center py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-xl border border-heritage-gold-400/20 text-center">
          <ShieldAlert className="h-12 w-12 text-rose-600 mx-auto mb-4" />
          <h2 className="font-serif text-2xl font-bold text-heritage-green-900 mb-2">
            Tautan Tidak Valid
          </h2>
          <p className="text-sm text-heritage-green-800/60 mb-6 font-sans">
            Tautan pengaturan ulang password tidak lengkap atau tidak valid. Silakan ajukan kembali.
          </p>
          <Link
            href="/forgot-password"
            className="inline-flex items-center justify-center gap-2 bg-heritage-green-800 hover:bg-heritage-green-900 text-heritage-gold-100 font-bold py-2.5 px-6 rounded tracking-wide shadow transition-colors duration-200"
          >
            <span>Ajukan Tautan Baru</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-heritage-cream-100 flex items-center justify-center py-24 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-xl border border-heritage-gold-400/20">
        {/* Header */}
        <div className="text-center mb-8">
          <Hotel className="h-10 w-10 text-heritage-gold-400 mx-auto mb-3" />
          <h2 className="font-serif text-3xl font-bold text-heritage-green-900">
            Atur Ulang Password
          </h2>
          <p className="text-sm text-heritage-green-800/60 mt-1 font-sans">
            Silakan masukkan password baru Anda untuk melanjutkan.
          </p>
        </div>

        {success ? (
          <div className="text-center space-y-6">
            <div className="bg-green-50 border border-green-200 text-green-800 text-sm p-4 rounded-lg flex items-center gap-3 justify-center">
              <CheckCircle2 className="h-5 w-5 shrink-0 text-green-600" />
              <span className="font-medium">{success}</span>
            </div>
            
            <p className="text-xs text-heritage-green-800/70 font-sans">
              Anda sekarang dapat menggunakan password baru Anda untuk masuk ke sistem.
            </p>

            <Link
              href="/login"
              className="w-full flex items-center justify-center gap-2 bg-heritage-green-800 hover:bg-heritage-green-900 text-heritage-gold-100 font-bold py-2.5 rounded tracking-wide shadow transition-colors duration-200"
            >
              <span>Masuk Sekarang</span>
              <ArrowRight className="h-4 w-4 text-heritage-gold-400" />
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs px-3 py-2.5 rounded flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 shrink-0 text-rose-600" />
                <span>{error}</span>
              </div>
            )}

            {/* Password */}
            <div>
              <label className="block text-xs font-semibold text-heritage-green-800 uppercase tracking-wider mb-1">
                Password Baru
              </label>
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

            {/* Confirm Password */}
            <div>
              <label className="block text-xs font-semibold text-heritage-green-800 uppercase tracking-wider mb-1">
                Konfirmasi Password Baru
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-heritage-gold-500">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  type="password"
                  name="confirmPassword"
                  required
                  placeholder="••••••••"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className="block w-full pl-10 pr-3 py-2 border border-heritage-gold-400/30 rounded focus:outline-none focus:ring-1 focus:ring-heritage-green-700 text-sm bg-heritage-cream-50"
                />
              </div>
            </div>

            {/* Submit */}
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
                  <span>Perbarui Password</span>
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default function ResetPassword() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-heritage-cream-100 flex items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-heritage-gold-400 border-t-transparent"></div>
      </div>
    }>
      <ResetPasswordContent />
    </Suspense>
  );
}
