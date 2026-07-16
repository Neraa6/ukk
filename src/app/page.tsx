"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Calendar, Shield, Award, Sparkles, MapPin, Compass } from "lucide-react";


export default function Home() {
  const router = useRouter();
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");

const [hostname, setHostname] = useState("");
useEffect(() => {
  fetch("/api/hostname")
    .then((r) => r.json())
    .then((d) => setHostname(d.hostname));
}, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkIn || !checkOut) return;
    router.push(`/catalog?checkIn=${checkIn}&checkOut=${checkOut}`);
  };



  // Get tomorrow's date for check-out min attribute
  const todayStr = new Date().toISOString().split("T")[0];
  const tomorrowStr = (() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split("T")[0];
  })();

  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <section className="relative h-screen flex items-center justify-center bg-heritage-green-900 text-heritage-gold-100 overflow-hidden">
        {/* Background Image with Overlay */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-transform duration-10000 hover:scale-105"
          style={{
            backgroundImage: `linear-gradient(to bottom, rgba(13, 31, 21, 0.7), rgba(13, 31, 21, 0.9)), url('https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=1920&q=80')`,
          }}
        />

        {/* Hero Content */}
        <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center mt-12">
          <p className="text-heritage-gold-400 font-serif italic tracking-widest text-lg md:text-xl mb-4 animate-fade-in">
            Selamat Datang di NeraaHotel {hostname}
          </p>
          <h1 className="font-serif text-4xl md:text-7xl font-bold tracking-tight text-white mb-6 leading-tight">
            Keagungan Warisan Klasik, <br />
            <span className="text-heritage-gold-400 font-serif italic font-normal">Kenyamanan Modern.</span>
          </h1>
          <p className="text-lg md:text-xl text-heritage-gold-100/70 max-w-3xl mx-auto mb-12 font-light leading-relaxed">
            Rasakan kehangatan keramahan khas Nusantara yang menyatu dalam keindahan arsitektur keraton tradisional dan pelayanan berstandar internasional.
          </p>

          {/* Search Room Widget */}
          <form
            onSubmit={handleSearch}
            className="glass-panel text-heritage-green-900 max-w-4xl mx-auto p-6 rounded-lg shadow-2xl flex flex-col md:flex-row gap-4 items-end border border-heritage-gold-400/30"
          >
            <div className="flex-1 w-full text-left">
              <label className="block text-xs font-semibold uppercase tracking-wider text-heritage-green-800/80 mb-2 flex items-center gap-1">
                <Calendar className="h-3 w-3 text-heritage-gold-500" />
                Tanggal Check-in
              </label>
              <input
                type="date"
                min={todayStr}
                required
                value={checkIn}
                onChange={(e) => setCheckIn(e.target.value)}
                className="w-full bg-white/80 border border-heritage-gold-400/30 rounded px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-heritage-green-700 text-sm font-medium"
              />
            </div>

            <div className="flex-1 w-full text-left">
              <label className="block text-xs font-semibold uppercase tracking-wider text-heritage-green-800/80 mb-2 flex items-center gap-1">
                <Calendar className="h-3 w-3 text-heritage-gold-500" />
                Tanggal Check-out
              </label>
              <input
                type="date"
                min={checkIn || tomorrowStr}
                required
                value={checkOut}
                onChange={(e) => setCheckOut(e.target.value)}
                className="w-full bg-white/80 border border-heritage-gold-400/30 rounded px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-heritage-green-700 text-sm font-medium"
              />
            </div>

            <button
              type="submit"
              className="w-full md:w-auto bg-heritage-green-800 hover:bg-heritage-green-900 text-heritage-gold-100 font-bold px-8 py-3 rounded tracking-wide shadow-md transition-colors duration-250 shrink-0 border border-heritage-gold-400/20"
            >
              Cari Ketersediaan
            </button>
          </form>
        </div>
      </section>

      {/* Philosophy / Features Section */}
      <section className="py-24 bg-heritage-cream-100 text-heritage-green-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="font-serif text-3xl md:text-5xl font-bold tracking-tight text-heritage-green-900 mb-4">
              Pengalaman Menginap yang Luhur
            </h2>
            <div className="h-0.5 w-24 bg-heritage-gold-400 mx-auto mb-6" />
            <p className="text-heritage-green-800/70 font-sans">
              Kami menyatukan kenyamanan premium kelas dunia dengan detail warisan budaya luhur Nusantara untuk menciptakan kenangan tak terlupakan.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="bg-white p-8 rounded-lg shadow-sm border border-heritage-gold-400/10 hover:shadow-md transition-shadow duration-300 text-center">
              <div className="inline-flex p-3 rounded-full bg-heritage-cream-200 text-heritage-gold-500 mb-5">
                <Award className="h-6 w-6" />
              </div>
              <h3 className="font-serif text-xl font-bold mb-3">Layanan Bintang Lima</h3>
              <p className="text-sm text-heritage-green-800/70 leading-relaxed font-sans">
                Staf profesional kami berdedikasi tinggi memberikan pelayanan personal yang ramah, hangat, dan sigap setiap saat.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-white p-8 rounded-lg shadow-sm border border-heritage-gold-400/10 hover:shadow-md transition-shadow duration-300 text-center">
              <div className="inline-flex p-3 rounded-full bg-heritage-cream-200 text-heritage-gold-500 mb-5">
                <Sparkles className="h-6 w-6" />
              </div>
              <h3 className="font-serif text-xl font-bold mb-3">Keindahan Arsitektur</h3>
              <p className="text-sm text-heritage-green-800/70 leading-relaxed font-sans">
                Desain interior yang megah berpadu dengan ukiran kayu jati kuno dan sentuhan ornamen keraton Jawa yang artistik.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-white p-8 rounded-lg shadow-sm border border-heritage-gold-400/10 hover:shadow-md transition-shadow duration-300 text-center">
              <div className="inline-flex p-3 rounded-full bg-heritage-cream-200 text-heritage-gold-500 mb-5">
                <Shield className="h-6 w-6" />
              </div>
              <h3 className="font-serif text-xl font-bold mb-3">Keamanan Transaksional</h3>
              <p className="text-sm text-heritage-green-800/70 leading-relaxed font-sans">
                Seluruh proses registrasi, booking, dan pembayaran diamankan secara transaksional penuh menggunakan enkripsi termutakhir.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Banner Resto Section */}
      <section className="relative py-24 text-white overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: `linear-gradient(to right, rgba(13, 31, 21, 0.95), rgba(13, 31, 21, 0.5)), url('https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=1200&q=80')`,
          }}
        />
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <span className="text-heritage-gold-400 font-serif italic text-lg tracking-wider mb-2 block">
              Kuliner Warisan Nusantara
            </span>
            <h2 className="font-serif text-3xl md:text-5xl font-bold mb-6">
              NeraaResto In-House Dining
            </h2>
            <p className="text-heritage-gold-100/80 mb-8 leading-relaxed font-sans">
              Nikmati kelezatan soto bumbu kuning hangat, steak sirloin premium, hingga jus alpukat segar yang dapat dipesan langsung dari kamar Anda sewaktu menginap.
            </p>
            <Link
              href="/catalog"
              className="inline-flex items-center gap-2 bg-heritage-gold-400 text-heritage-green-900 font-bold px-6 py-3 rounded shadow hover:bg-heritage-gold-300 transition-colors duration-250"
            >
              <Compass className="h-4 w-4" />
              Pesan Kamar & Nikmati Kuliner Kami
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
