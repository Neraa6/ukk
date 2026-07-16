"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/context/AuthContext";
import { Calendar, BedDouble, AlertCircle, ArrowRight, ShieldCheck, Tag, Info } from "lucide-react";

interface AvailableRoom {
  id: number;
  room_number: string;
  status: string;
}

interface RoomTypeResult {
  id: number;
  name: string;
  description: string;
  price: string;
  foto_url: string;
  availableRooms: AvailableRoom[];
}

import { Suspense } from "react";

function CatalogContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();

  // Initialize dates from search params or default to today and tomorrow
  const getTodayStr = () => new Date().toISOString().split("T")[0];
  const getTomorrowStr = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split("T")[0];
  };

  const [checkIn, setCheckIn] = useState(searchParams.get("checkIn") || getTodayStr());
  const [checkOut, setCheckOut] = useState(searchParams.get("checkOut") || getTomorrowStr());
  const [results, setResults] = useState<RoomTypeResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTriggered, setSearchTriggered] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Booking Modal State
  const [selectedRoomType, setSelectedRoomType] = useState<RoomTypeResult | null>(null);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [bookingNote, setBookingNote] = useState("");

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(val);
  };

  const fetchRooms = async (inDate: string, outDate: string) => {
    setLoading(true);
    setError(null);
    setSearchTriggered(true);
    try {
      const res = await fetch(`/api/rooms/search?checkIn=${inDate}&checkOut=${outDate}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || "Gagal memuat ketersediaan kamar");
      } else {
        setResults(data.results);
      }
    } catch (err) {
      console.error(err);
      setError("Terjadi kesalahan jaringan");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const inParam = searchParams.get("checkIn");
    const outParam = searchParams.get("checkOut");
    if (inParam && outParam) {
      setCheckIn(inParam);
      setCheckOut(outParam);
      fetchRooms(inParam, outParam);
    } else {
      // Prefill query on load automatically for excellent UX
      fetchRooms(checkIn, checkOut);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkIn || !checkOut) return;
    router.push(`/catalog?checkIn=${checkIn}&checkOut=${checkOut}`);
  };

  const handleOpenBookingModal = (roomType: RoomTypeResult) => {
    if (!user) {
      router.push(`/login`);
      return;
    }
    if (user.role !== "guest") {
      setBookingError("Hanya akun tamu yang dapat melakukan reservasi");
      return;
    }
    setSelectedRoomType(roomType);
    setBookingError(null);
    setBookingNote("");
  };

  const handleConfirmBooking = async () => {
    if (!selectedRoomType || selectedRoomType.availableRooms.length === 0) return;
    setBookingLoading(true);
    setBookingError(null);

    // Pick first available room of this type
    const roomToBook = selectedRoomType.availableRooms[0];

    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomId: roomToBook.id,
          checkIn,
          checkOut,
          note: bookingNote,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setBookingError(data.message || "Gagal membuat pemesanan");
      } else {
        // Redirect to Midtrans snap checkout (which will open mock checkout in sandbox)
        if (data.redirectUrl) {
          router.push(data.redirectUrl);
        } else {
          router.push("/my-bookings");
        }
      }
    } catch (err) {
      console.error(err);
      setBookingError("Terjadi kesalahan koneksi");
    } finally {
      setBookingLoading(false);
    }
  };

  const calculateDays = () => {
    const inDate = new Date(checkIn);
    const outDate = new Date(checkOut);
    if (isNaN(inDate.getTime()) || isNaN(outDate.getTime())) return 1;
    const diff = Math.abs(outDate.getTime() - inDate.getTime());
    return Math.ceil(diff / (1000 * 60 * 60 * 24)) || 1;
  };

  return (
    <div className="bg-heritage-cream-100 min-h-screen py-24 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="font-serif text-3xl md:text-5xl font-bold tracking-tight text-heritage-green-900">
            Katalog Kamar & Ketersediaan
          </h1>
          <p className="text-sm text-heritage-green-800/70 mt-2 font-sans">
            Tentukan tanggal menginap Anda untuk melihat kamar terbaik kami
          </p>
        </div>

        {/* Filter Widget */}
        <div className="bg-white p-6 rounded-lg shadow border border-heritage-gold-400/20 mb-12">
          <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-4 items-end">
            <div className="flex-1 w-full">
              <label className="block text-xs font-semibold uppercase tracking-wider text-heritage-green-800 mb-2 flex items-center gap-1">
                <Calendar className="h-3 w-3 text-heritage-gold-500" />
                Check-in
              </label>
              <input
                type="date"
                min={getTodayStr()}
                value={checkIn}
                onChange={(e) => setCheckIn(e.target.value)}
                className="w-full bg-heritage-cream-50 border border-heritage-gold-400/30 rounded px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-heritage-green-700 text-sm font-medium"
              />
            </div>

            <div className="flex-1 w-full">
              <label className="block text-xs font-semibold uppercase tracking-wider text-heritage-green-800 mb-2 flex items-center gap-1">
                <Calendar className="h-3 w-3 text-heritage-gold-500" />
                Check-out
              </label>
              <input
                type="date"
                min={checkIn || getTomorrowStr()}
                value={checkOut}
                onChange={(e) => setCheckOut(e.target.value)}
                className="w-full bg-heritage-cream-50 border border-heritage-gold-400/30 rounded px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-heritage-green-700 text-sm font-medium"
              />
            </div>

            <button
              type="submit"
              className="w-full md:w-auto bg-heritage-green-800 hover:bg-heritage-green-900 text-heritage-gold-100 font-bold px-8 py-3 rounded tracking-wide shadow-md transition-colors"
            >
              Update Ketersediaan
            </button>
          </form>
        </div>

        {/* Catalog List */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-heritage-gold-400 border-t-transparent"></div>
            <p className="text-sm font-serif italic text-heritage-green-800/80">Memeriksa ketersediaan kamar...</p>
          </div>
        ) : error ? (
          <div className="bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded text-sm text-center">
            {error}
          </div>
        ) : searchTriggered && results.length === 0 ? (
          <div className="bg-white p-12 rounded border text-center shadow">
            <AlertCircle className="h-12 w-12 text-heritage-gold-400 mx-auto mb-4" />
            <h3 className="font-serif text-xl font-bold mb-2">Maaf, Tidak Ada Kamar Tersedia</h3>
            <p className="text-sm text-heritage-green-800/60 font-sans">
              Tidak ada kamar kosong yang cocok dengan pilihan tanggal Anda. Cobalah sesuaikan rentang tanggal yang lain.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-8">
            {results.map((roomType) => (
              <div
                key={roomType.id}
                className="bg-white rounded-lg shadow-lg border border-heritage-gold-400/10 overflow-hidden flex flex-col md:flex-row hover:shadow-xl transition-all duration-300"
              >
                {/* Image */}
                <div
                  className="md:w-1/3 h-64 md:h-auto bg-cover bg-center shrink-0 min-h-64"
                  style={{
                    backgroundImage: `url('${roomType.foto_url || "https://images.unsplash.com/photo-1618773928121-c32242e63f39?auto=format&fit=crop&q=80&w=600"}')`,
                  }}
                />

                {/* Details */}
                <div className="p-6 md:p-8 flex flex-col justify-between flex-grow">
                  <div>
                    <div className="flex justify-between items-start gap-4 mb-3">
                      <h3 className="font-serif text-2xl font-bold text-heritage-green-950">
                        {roomType.name}
                      </h3>
                      <div className="bg-heritage-cream-100 text-heritage-green-800 text-xs font-semibold px-2.5 py-1 rounded border border-heritage-gold-400/20 flex items-center gap-1.5 shrink-0">
                        <BedDouble className="h-3.5 w-3.5 text-heritage-gold-500" />
                        <span>{roomType.availableRooms.length} Kamar Kosong</span>
                      </div>
                    </div>

                    <p className="text-sm text-heritage-green-800/70 leading-relaxed font-sans mb-6">
                      {roomType.description}
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 border-t border-heritage-gold-400/10 pt-6">
                    <div>
                      <span className="text-xs font-bold text-heritage-green-800/50 uppercase tracking-widest block">
                        Harga Per Malam
                      </span>
                      <span className="text-2xl font-bold text-heritage-green-950 font-serif">
                        {formatCurrency(Number(roomType.price))}
                      </span>
                    </div>

                    <button
                      onClick={() => handleOpenBookingModal(roomType)}
                      className="w-full sm:w-auto bg-heritage-green-800 hover:bg-heritage-green-900 text-heritage-gold-100 font-bold px-6 py-3 rounded shadow hover:bg-heritage-gold-300 transition-colors flex items-center justify-center gap-2"
                    >
                      <span>Booking Sekarang</span>
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Booking Confirmation Modal */}
      {selectedRoomType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-lg shadow-2xl border border-heritage-gold-400/30 max-w-md w-full overflow-hidden animate-fade-in-up">
            {/* Modal Header */}
            <div className="bg-heritage-green-900 text-heritage-gold-100 p-5 border-b border-heritage-gold-400/20">
              <h3 className="font-serif text-xl font-bold">Konfirmasi Reservasi</h3>
              <p className="text-xs text-heritage-gold-100/60 mt-1 font-sans">
                NeraaHotel Heritage Premium Booking
              </p>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4">
              {bookingError && (
                <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs px-3 py-2.5 rounded">
                  {bookingError}
                </div>
              )}

              {/* Prefilled/Confirm details */}
              <div className="bg-heritage-cream-100 p-4 rounded border border-heritage-gold-400/20 space-y-2">
                <div className="flex justify-between text-xs font-semibold text-heritage-green-800 uppercase tracking-wider">
                  <span>Tipe Kamar</span>
                  <span className="text-heritage-green-950">{selectedRoomType.name}</span>
                </div>
                <div className="flex justify-between text-xs font-semibold text-heritage-green-800 uppercase tracking-wider">
                  <span>Kamar Fisik</span>
                  <span className="text-heritage-green-950">Kamar {selectedRoomType.availableRooms[0]?.room_number}</span>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-semibold text-heritage-green-800 uppercase tracking-wider">
                    <span>Tanggal Menginap</span>
                  </div>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <label className="block text-[10px] text-heritage-green-800/70 mb-1">Check-in</label>
                      <input
                        type="date"
                        min={getTodayStr()}
                        value={checkIn}
                        onChange={(e) => setCheckIn(e.target.value)}
                        className="w-full bg-white border border-heritage-gold-400/30 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-heritage-green-700 text-sm font-medium"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block text-[10px] text-heritage-green-800/70 mb-1">Check-out</label>
                      <input
                        type="date"
                        min={checkIn || getTomorrowStr()}
                        value={checkOut}
                        onChange={(e) => setCheckOut(e.target.value)}
                        className="w-full bg-white border border-heritage-gold-400/30 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-heritage-green-700 text-sm font-medium"
                      />
                    </div>
                  </div>
                </div>
                <div className="flex justify-between text-xs font-semibold text-heritage-green-800 uppercase tracking-wider">
                  <span>Durasi</span>
                  <span className="text-heritage-green-950">{calculateDays()} Malam</span>
                </div>
                <hr className="border-heritage-gold-400/20 my-2" />
                <div className="flex justify-between items-end">
                  <span className="text-xs font-bold text-heritage-green-800/60 uppercase tracking-wider">
                    Total Biaya
                  </span>
                  <span className="text-lg font-bold text-heritage-green-950 font-serif">
                    {formatCurrency(Number(selectedRoomType.price) * calculateDays())}
                  </span>
                </div>
              </div>

              {/* Guest verification warning if not verified */}
              {user && !user.emailVerified && (
                <div className="bg-amber-50 border border-amber-200 text-amber-900 text-xs p-3 rounded flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
                  <div>
                    <span className="font-bold">Email belum terverifikasi!</span>
                    <p className="mt-1 font-sans">
                      Sesuai peraturan hotel, Anda wajib memverifikasi email Anda sebelum dapat memesan kamar. Silakan cek inbox Anda.
                    </p>
                  </div>
                </div>
              )}

              {/* Catatan Booking */}
              <div>
                <label className="block text-xs font-semibold text-heritage-green-800 uppercase tracking-wider mb-1">
                  Catatan Khusus (Opsional)
                </label>
                <textarea
                  value={bookingNote}
                  onChange={(e) => setBookingNote(e.target.value)}
                  placeholder="Contoh: Minta tempat tidur double, kamar bebas asap rokok, dll."
                  rows={3}
                  className="block w-full border border-heritage-gold-400/30 rounded p-2 focus:outline-none focus:ring-1 focus:ring-heritage-green-700 text-sm bg-heritage-cream-50"
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-heritage-cream-100 p-4 border-t border-heritage-gold-400/10 flex gap-3">
              <button
                type="button"
                onClick={() => setSelectedRoomType(null)}
                className="flex-1 border border-heritage-gold-400/30 text-heritage-green-900 hover:bg-heritage-cream-200 py-2.5 rounded text-sm font-semibold transition-colors"
              >
                Kembali
              </button>
              <button
                type="button"
                onClick={handleConfirmBooking}
                disabled={bookingLoading || !!(user && !user.emailVerified)}
                className="flex-1 bg-heritage-green-800 hover:bg-heritage-green-900 disabled:bg-heritage-green-800/40 text-heritage-gold-100 py-2.5 rounded text-sm font-bold shadow transition-colors flex items-center justify-center gap-1.5"
              >
                {bookingLoading ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-heritage-gold-400 border-t-transparent"></div>
                ) : (
                  <>
                    <ShieldCheck className="h-4 w-4 text-heritage-gold-400" />
                    <span>Lanjutkan Bayar</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Catalog() {
  return (
    <Suspense fallback={
      <div className="bg-heritage-cream-100 min-h-screen py-24 flex items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-heritage-gold-400 border-t-transparent"></div>
      </div>
    }>
      <CatalogContent />
    </Suspense>
  );
}
