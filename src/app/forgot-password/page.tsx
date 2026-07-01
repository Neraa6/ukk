"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Hotel, Mail, ArrowLeft, Sparkles, CheckCircle2, ShieldAlert } from "lucide-react";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [mockResetUrl, setMockResetUrl] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);
    setMockResetUrl(null);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Gagal mengajukan permintaan");
      } else {
        setSuccess(data.message);
        if (data.mockResetUrl) {
          setMockResetUrl(data.mockResetUrl);
        }
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
        {/* Header */}
        <div className="text-center mb-8">
          <Hotel className="h-10 w-10 text-heritage-gold-400 mx-auto mb-3" />
          <h2 className="font-serif text-3xl font-bold text-heritage-green-900">
            Lupa Password
          </h2>
          <p className="text-sm text-heritage-green-800/60 mt-1 font-sans">
            Masukkan email terdaftar Anda untuk menerima tautan atur ulang password.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {success && (
            <div className="bg-green-50 border border-green-200 text-green-800 text-xs px-3 py-2.5 rounded flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-green-600" />
                <span className="font-semibold">{success}</span>
              </div>
              
              {mockResetUrl && (
                <div className="mt-2 bg-heritage-cream-100 p-2.5 rounded border border-heritage-gold-400/20 text-left font-sans text-xs">
                  <span className="text-heritage-gold-500 font-bold block mb-1">💡 Sandbox Mock Tautan Reset:</span>
                  <a href={mockResetUrl} className="text-heritage-gold-500 hover:underline break-all font-mono">
                    {mockResetUrl}
                  </a>
                </div>
              )}
            </div>
          )}

          {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs px-3 py-2.5 rounded flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Email */}
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
                required
                placeholder="budi@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
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
                <span>Kirim Link Reset</span>
              </>
            )}
          </button>

          {/* Back to Login */}
          <div className="text-center mt-6">
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 text-xs text-heritage-green-900/60 hover:text-heritage-gold-500 transition-colors duration-200 font-semibold"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Kembali ke Halaman Masuk</span>
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
