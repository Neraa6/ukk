"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Hotel, User, Mail, Lock, Sparkles, CheckCircle, Phone, CreditCard } from "lucide-react";

export default function Register() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    identityNumber: "",
    password: "",
    address: "",
  });
  const [photo, setPhoto] = useState<File | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [mockVerifyUrl, setMockVerifyUrl] = useState<string | undefined>(undefined);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setPhoto(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);
    setMockVerifyUrl(undefined);

    try {
      const formPayload = new FormData();
      Object.entries(formData).forEach(([key, value]) => {
        formPayload.append(key, value);
      });
      formPayload.append("recaptchaToken", "mock-token");
      if (photo) {
        formPayload.append("photo", photo);
      }

      const res = await fetch("/api/auth/guest/register", {
        method: "POST",
        body: formPayload,
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.message || "Registrasi gagal");
      } else {
        setSuccess(data.message);
        if (data.mockVerificationUrl) {
          setMockVerifyUrl(data.mockVerificationUrl);
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
            Daftar Akun Tamu
          </h2>
          <p className="text-sm text-heritage-green-800/60 mt-1 font-sans">
            Mulai langkah perjalanan Anda bersama NeraaHotel
          </p>
        </div>

        {success ? (
          <div className="text-center space-y-6">
            <div className="inline-flex p-3 rounded-full bg-green-50 text-green-600 mb-2 animate-bounce">
              <CheckCircle className="h-12 w-12" />
            </div>
            <h3 className="font-serif text-2xl font-semibold text-heritage-green-950">
              Registrasi Sukses!
            </h3>
            <p className="text-sm text-heritage-green-800/80 leading-relaxed font-sans">
              {success}
            </p>

            {mockVerifyUrl && (
              <div className="bg-heritage-cream-200/50 p-4 rounded border border-heritage-gold-400/30 space-y-3">
                <span className="text-xs font-semibold text-heritage-gold-500 uppercase tracking-wider block">
                  🛡️ Sandbox Developer Fallback
                </span>
                <p className="text-xs text-heritage-green-800/70 font-sans">
                  Kredensial Gmail SMTP tidak diset, klik tombol di bawah ini untuk memverifikasi akun Anda secara instan:
                </p>
                <Link
                  href={mockVerifyUrl}
                  className="inline-block w-full bg-heritage-green-800 hover:bg-heritage-green-900 text-heritage-gold-100 text-xs font-bold py-2.5 px-4 rounded tracking-wide transition-colors"
                >
                  Verifikasi Akun Sekarang
                </Link>
              </div>
            )}

            <div className="pt-4">
              <Link
                href="/login"
                className="text-sm text-heritage-gold-500 hover:underline font-semibold"
              >
                Kembali ke halaman login
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs px-3 py-2.5 rounded">
                {error}
              </div>
            )}

            {/* Nama */}
            <div>
              <label className="block text-xs font-semibold text-heritage-green-800 uppercase tracking-wider mb-1">
                Nama Lengkap
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-heritage-gold-500">
                  <User className="h-4 w-4" />
                </div>
                <input
                  type="text"
                  name="name"
                  required
                  placeholder="Budi Santoso"
                  value={formData.name}
                  onChange={handleChange}
                  className="block w-full pl-10 pr-3 py-2 border border-heritage-gold-400/30 rounded focus:outline-none focus:ring-1 focus:ring-heritage-green-700 text-sm bg-heritage-cream-50"
                />
              </div>
            </div>

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
                  name="email"
                  required
                  placeholder="budi@example.com"
                  value={formData.email}
                  onChange={handleChange}
                  className="block w-full pl-10 pr-3 py-2 border border-heritage-gold-400/30 rounded focus:outline-none focus:ring-1 focus:ring-heritage-green-700 text-sm bg-heritage-cream-50"
                />
              </div>
            </div>

            {/* Nomor Telepon */}
            <div>
              <label className="block text-xs font-semibold text-heritage-green-800 uppercase tracking-wider mb-1">
                Nomor Telepon
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-heritage-gold-500">
                  <Phone className="h-4 w-4" />
                </div>
                <input
                  type="tel"
                  name="phone"
                  required
                  placeholder="081234567890"
                  value={formData.phone}
                  onChange={handleChange}
                  className="block w-full pl-10 pr-3 py-2 border border-heritage-gold-400/30 rounded focus:outline-none focus:ring-1 focus:ring-heritage-green-700 text-sm bg-heritage-cream-50"
                />
              </div>
            </div>

            {/* Nomor Identitas (KTP) */}
            <div>
              <label className="block text-xs font-semibold text-heritage-green-800 uppercase tracking-wider mb-1">
                Nomor Identitas (KTP / Passport)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-heritage-gold-500">
                  <CreditCard className="h-4 w-4" />
                </div>
                <input
                  type="text"
                  name="identityNumber"
                  required
                  placeholder="3273012345678901"
                  value={formData.identityNumber}
                  onChange={handleChange}
                  className="block w-full pl-10 pr-3 py-2 border border-heritage-gold-400/30 rounded focus:outline-none focus:ring-1 focus:ring-heritage-green-700 text-sm bg-heritage-cream-50"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-semibold text-heritage-green-800 uppercase tracking-wider mb-1">
                Password
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

            {/* Alamat */}
            <div>
              <label className="block text-xs font-semibold text-heritage-green-800 uppercase tracking-wider mb-1">
                Alamat Lengkap
              </label>
              <textarea
                name="address"
                placeholder="Jl. Merdeka No. 1..."
                value={formData.address}
                onChange={handleChange}
                className="block w-full px-3 py-2 border border-heritage-gold-400/30 rounded focus:outline-none focus:ring-1 focus:ring-heritage-green-700 text-sm bg-heritage-cream-50"
                rows={3}
              />
            </div>

            {/* Foto (Opsional) */}
            <div>
              <label className="block text-xs font-semibold text-heritage-green-800 uppercase tracking-wider mb-1">
                Foto (Opsional)
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={handlePhotoChange}
                className="block w-full text-sm text-heritage-green-800 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-heritage-gold-100 file:text-heritage-gold-700 hover:file:bg-heritage-gold-200 focus:outline-none"
              />
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
                  <span>Daftar Sekarang</span>
                </>
              )}
            </button>

            {/* Bottom Actions */}
            <div className="text-center text-xs text-heritage-green-800/70 mt-6 space-y-2">
              <p>
                Sudah memiliki akun?{" "}
                <Link href="/login" className="text-heritage-gold-500 hover:underline font-semibold">
                  Masuk di sini
                </Link>
              </p>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
