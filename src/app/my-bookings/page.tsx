"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/context/AuthContext";
import { Calendar, CreditCard, Ticket, CheckCircle2, Clock, AlertTriangle, AlertCircle, ShoppingBag } from "lucide-react";

interface Booking {
  id: number;
  guest_id: number;
  room_id: number;
  check_in: string;
  check_out: string;
  total_price: string;
  status: "pending" | "confirmed" | "checked_in" | "checked_out" | "cancelled";
  created_at: string;
  rooms: {
    room_number: string;
    room_types: {
      name: string;
      description: string;
      price: string;
    };
  };
  payments: Array<{
    payment_status: "pending" | "paid" | "failed";
    payment_method: string | null;
    note: string; // contains Midtrans order_id
  }>;
}

import { Suspense } from "react";

function MyBookingsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Check online/offline state
  useEffect(() => {
    setIsOffline(!navigator.onLine);

    const goOnline = () => setIsOffline(false);
    const goOffline = () => setIsOffline(true);

    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);

    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  // Check query parameters for checkout success notifications
  useEffect(() => {
    if (searchParams.get("payment") === "success") {
      setSuccessMsg("Pembayaran kamar berhasil dikonfirmasi! E-Ticket Anda telah aktif.");
    } else if (searchParams.get("payment") === "resto-success") {
      setSuccessMsg("Pembayaran makanan berhasil dikonfirmasi! Makanan akan segera diantarkan ke kamar Anda.");
    }
  }, [searchParams]);

  const fetchBookings = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/bookings");
      if (!res.ok) {
        throw new Error("Gagal mengambil data dari server");
      }
      const data = await res.json();
      setBookings(data.bookings);
      setLastUpdated(new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }));

      // Save to localStorage for PWA offline fallback caching
      localStorage.setItem("drghotel_cached_bookings", JSON.stringify(data.bookings));
      localStorage.setItem("drghotel_cached_bookings_time", new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }));
    } catch (err) {
      console.error(err);
      // Fallback to offline localStorage cache
      const cached = localStorage.getItem("drghotel_cached_bookings");
      const cachedTime = localStorage.getItem("drghotel_cached_bookings_time");
      if (cached) {
        setBookings(JSON.parse(cached));
        setLastUpdated(cachedTime);
        setIsOffline(true); // mark as offline if failed and fell back
      } else {
        setError("Gagal memuat riwayat pemesanan. Koneksi internet diperlukan.");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchBookings();
    } else {
      setLoading(false);
    }
  }, [user]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(val);
  };

  const getStatusBadge = (status: string) => {
    const styles: { [key: string]: string } = {
      pending: "bg-amber-100 text-amber-800 border-amber-300",
      confirmed: "bg-green-100 text-green-800 border-green-300",
      checked_in: "bg-blue-100 text-blue-800 border-blue-300",
      checked_out: "bg-slate-100 text-slate-800 border-slate-300",
      cancelled: "bg-rose-100 text-rose-800 border-rose-300",
    };

    const labels: { [key: string]: string } = {
      pending: "Menunggu Pembayaran",
      confirmed: "Telah Dipesan (Lunas)",
      checked_in: "Sudah Check-in",
      checked_out: "Sudah Check-out",
      cancelled: "Dibatalkan",
    };

    return (
      <span className={`text-[10px] font-bold px-2.5 py-1 rounded border uppercase tracking-wider ${styles[status] || styles.pending}`}>
        {labels[status] || status}
      </span>
    );
  };

  if (!user) {
    return (
      <div className="bg-heritage-cream-100 min-h-screen py-32 px-4 text-center flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow max-w-sm w-full border border-heritage-gold-400/20">
          <AlertCircle className="h-12 w-12 text-heritage-gold-400 mx-auto mb-4" />
          <h3 className="font-serif text-xl font-bold mb-2">Silakan Masuk Terlebih Dahulu</h3>
          <p className="text-sm text-heritage-green-800/60 font-sans mb-6">
            Anda harus masuk ke akun tamu Anda untuk melihat riwayat reservasi kamar Anda.
          </p>
          <button
            onClick={() => router.push("/login")}
            className="w-full bg-heritage-green-800 hover:bg-heritage-green-900 text-heritage-gold-100 font-bold py-2.5 rounded shadow transition-colors"
          >
            Masuk Sekarang
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-heritage-cream-100 min-h-screen py-24 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Offline Badge Notification */}
        {isOffline && (
          <div className="bg-amber-100 border border-amber-300 text-amber-900 px-4 py-3 rounded mb-6 flex items-center justify-between text-sm shadow">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
              <span>
                <strong>Mode Offline Aktif</strong> — Anda sedang offline. Menampilkan riwayat pemesanan yang disimpan di memori perangkat Anda.
              </span>
            </div>
            {lastUpdated && (
              <span className="text-xs font-semibold text-amber-800 shrink-0">
                Terakhir Diperbarui: {lastUpdated}
              </span>
            )}
          </div>
        )}

        {successMsg && (
          <div className="bg-green-50 border border-green-200 text-green-900 px-4 py-3.5 rounded mb-6 flex items-center gap-2.5 text-sm shadow">
            <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="font-serif text-3xl md:text-5xl font-bold tracking-tight text-heritage-green-900">
            Booking & E-Ticket Saya
          </h1>
          <p className="text-sm text-heritage-green-800/70 mt-2 font-sans">
            Kelola reservasi Anda dan akses tiket masuk meskipun sedang offline
          </p>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-heritage-gold-400 border-t-transparent"></div>
            <p className="text-sm font-serif italic text-heritage-green-800/80">Memuat riwayat booking...</p>
          </div>
        ) : error && bookings.length === 0 ? (
          <div className="bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded text-sm text-center">
            {error}
          </div>
        ) : bookings.length === 0 ? (
          <div className="bg-white p-12 rounded border text-center shadow border-heritage-gold-400/20">
            <Ticket className="h-12 w-12 text-heritage-gold-400 mx-auto mb-4" />
            <h3 className="font-serif text-xl font-bold mb-2">Belum Ada Pemesanan</h3>
            <p className="text-sm text-heritage-green-800/60 font-sans mb-6">
              Anda belum melakukan reservasi kamar di drgHotel. Jelajahi katalog kami sekarang!
            </p>
            <button
              onClick={() => router.push("/catalog")}
              className="bg-heritage-green-800 hover:bg-heritage-green-900 text-heritage-gold-100 font-bold px-6 py-2.5 rounded shadow transition-colors"
            >
              Jelajahi Kamar
            </button>
          </div>
        ) : (
          <div className="space-y-8">
            {bookings.map((booking) => {
              const payment = booking.payments[0];
              const isPendingPayment = booking.status === "pending" && payment?.payment_status === "pending";

              return (
                <div
                  key={booking.id}
                  className="bg-white rounded-lg shadow-lg border border-heritage-gold-400/20 overflow-hidden"
                >
                  {/* Card Header */}
                  <div className="bg-heritage-green-900 text-heritage-gold-100 p-4 px-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-heritage-gold-400/20">
                    <div className="flex items-center gap-2">
                      <Ticket className="h-5 w-5 text-heritage-gold-400" />
                      <span className="font-serif font-bold text-lg">E-Ticket #{booking.id}</span>
                    </div>
                    <div>{getStatusBadge(booking.status)}</div>
                  </div>

                  {/* Card Body */}
                  <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Details Column */}
                    <div className="space-y-4">
                      <div>
                        <span className="text-[10px] font-bold text-heritage-green-800/50 uppercase tracking-widest block">
                          Tipe Kamar
                        </span>
                        <h4 className="font-serif text-xl font-bold text-heritage-green-950">
                          {booking.rooms.room_types.name}
                        </h4>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <span className="text-[10px] font-bold text-heritage-green-800/50 uppercase tracking-widest block flex items-center gap-1">
                            <Calendar className="h-3 w-3 text-heritage-gold-500" /> Check-in
                          </span>
                          <span className="text-sm font-semibold text-heritage-green-900">
                            {new Date(booking.check_in).toLocaleDateString("id-ID", {
                              weekday: "short",
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </span>
                        </div>

                        <div>
                          <span className="text-[10px] font-bold text-heritage-green-800/50 uppercase tracking-widest block flex items-center gap-1">
                            <Calendar className="h-3 w-3 text-heritage-gold-500" /> Check-out
                          </span>
                          <span className="text-sm font-semibold text-heritage-green-900">
                            {new Date(booking.check_out).toLocaleDateString("id-ID", {
                              weekday: "short",
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 pt-2 border-t border-dashed border-heritage-gold-400/20">
                        <div>
                          <span className="text-[10px] font-bold text-heritage-green-800/50 uppercase tracking-widest block">
                            Nomor Kamar
                          </span>
                          <span className="text-sm font-bold text-heritage-green-950">
                            Kamar {booking.rooms.room_number}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] font-bold text-heritage-green-800/50 uppercase tracking-widest block">
                            Metode Bayar
                          </span>
                          <span className="text-sm font-semibold text-heritage-green-900 capitalize">
                            {payment?.payment_method?.replace("_", " ") || "-"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Cost / Payment Column */}
                    <div className="bg-heritage-cream-100/40 p-5 rounded-lg border border-heritage-gold-400/10 flex flex-col justify-between items-center sm:items-start text-center sm:text-left gap-4">
                      <div className="w-full">
                        <span className="text-[10px] font-bold text-heritage-green-800/50 uppercase tracking-widest block">
                          Total Pembayaran
                        </span>
                        <h4 className="text-2xl font-bold font-serif text-heritage-green-950 mt-1">
                          {formatCurrency(Number(booking.total_price))}
                        </h4>
                        <div className="flex items-center gap-1.5 justify-center sm:justify-start mt-2">
                          <CreditCard className="h-3.5 w-3.5 text-heritage-gold-500" />
                          <span
                            className={`text-xs font-semibold uppercase tracking-wider ${
                              payment?.payment_status === "paid" ? "text-green-700" : "text-amber-700"
                            }`}
                          >
                            Status Bayar: {payment?.payment_status === "paid" ? "LUNAS" : "PENDING"}
                          </span>
                        </div>
                      </div>

                      {/* Pay Now Button (if pending) */}
                      {isPendingPayment && !isOffline && (
                        <button
                          onClick={() => {
                            // Redirect to payment snapshot redirect page (which handles mock checkout in sandbox)
                            const mockUrl = `/payments/mock-checkout?token=MOCK-SNAP-TOKEN-${booking.id}&order_id=${payment.note}&amount=${booking.total_price}&email=${encodeURIComponent(user.email)}`;
                            router.push(mockUrl);
                          }}
                          className="w-full bg-heritage-green-800 hover:bg-heritage-green-900 text-heritage-gold-100 font-bold py-2.5 px-4 rounded text-xs tracking-wide shadow-sm transition-colors text-center"
                        >
                          Bayar Sekarang
                        </button>
                      )}

                      {isPendingPayment && isOffline && (
                        <p className="text-xs text-amber-800/80 italic font-sans flex items-center gap-1">
                          <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                          Koneksi offline. Menunggu koneksi untuk bayar.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default function MyBookings() {
  return (
    <Suspense fallback={
      <div className="bg-heritage-cream-100 min-h-screen py-24 flex items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-heritage-gold-400 border-t-transparent"></div>
      </div>
    }>
      <MyBookingsContent />
    </Suspense>
  );
}
