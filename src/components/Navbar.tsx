"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/context/AuthContext";
import { useState, useEffect } from "react";
import { Hotel, User, LogOut, Utensils, Calendar, Menu, X, ShieldAlert } from "lucide-react";

export default function Navbar() {
  const { user, logout, loading } = useAuth();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [isEligibleResto, setIsEligibleResto] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Check restaurant eligibility if logged in
  useEffect(() => {
    if (user && user.role === "guest") {
      fetch("/api/guests/active-booking")
        .then((res) => res.json())
        .then((data) => {
          setIsEligibleResto(data.eligible);
        })
        .catch(() => setIsEligibleResto(false));
    } else {
      setIsEligibleResto(false);
    }
  }, [user, pathname]);

  const navLinks = [
    { name: "Beranda", href: "/" },
    { name: "Cari Kamar", href: "/catalog" },
  ];

  if (user && user.role === "guest") {
    navLinks.push({ name: "Booking Saya", href: "/my-bookings" });
    if (isEligibleResto) {
      navLinks.push({ name: "Pesan Makanan", href: "/resto" });
    }
  }

  if (user && (user.role === "admin" || user.role === "management")) {
    navLinks.push({ name: "Panel Dashboard", href: "/dashboard" });
  }

  const isActive = (href: string) => pathname === href;

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-heritage-green-900/90 backdrop-blur-md border-b border-heritage-gold-400/20 py-3 shadow-lg"
          : "bg-transparent py-5"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center">
          {/* Logo */}
          <div className="flex-shrink-0">
            <Link href="/" className="flex items-center gap-2">
              <Hotel className="h-8 w-8 text-heritage-gold-400" />
              <span className="font-serif text-2xl font-bold tracking-wide text-heritage-gold-100">
                drg<span className="text-heritage-gold-400">Hotel</span>
              </span>
            </Link>
          </div>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center space-x-8">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                href={link.href}
                className={`text-sm font-medium tracking-wide transition-colors duration-200 ${
                  isActive(link.href)
                    ? "text-heritage-gold-400 font-semibold"
                    : "text-heritage-gold-100/80 hover:text-heritage-gold-400"
                }`}
              >
                {link.name}
              </Link>
            ))}
          </div>

          {/* User Actions (Desktop) */}
          <div className="hidden md:flex items-center gap-4">
            {loading ? (
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-heritage-gold-400 border-t-transparent"></div>
            ) : user ? (
              <div className="flex items-center gap-4">
                <span className="text-sm text-heritage-gold-100/90 flex items-center gap-2 bg-heritage-green-800/60 px-3 py-1.5 rounded border border-heritage-gold-400/20">
                  <User className="h-4 w-4 text-heritage-gold-400" />
                  <span>
                    {user.role === "guest" ? "" : `${user.role === "admin" ? "Staf: " : "Manajer: "}`}
                    {user.name}
                  </span>
                </span>
                <button
                  onClick={logout}
                  className="flex items-center gap-1.5 text-sm font-semibold text-rose-200 hover:text-rose-400 transition-colors duration-200"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Logout</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Link
                  href="/login"
                  className="text-sm font-semibold text-heritage-gold-100 hover:text-heritage-gold-400 transition-colors duration-200"
                >
                  Masuk
                </Link>
                <Link
                  href="/register"
                  className="bg-heritage-gold-400 text-heritage-green-900 text-sm font-bold px-4 py-2 rounded shadow hover:bg-heritage-gold-300 transition-colors duration-200"
                >
                  Daftar
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="text-heritage-gold-100 hover:text-heritage-gold-400 p-2 focus:outline-none"
            >
              {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {isOpen && (
        <div className="md:hidden bg-heritage-green-900/95 border-b border-heritage-gold-400/20 px-4 pt-2 pb-6 space-y-3 shadow-xl backdrop-blur-lg">
          {navLinks.map((link) => (
            <Link
              key={link.name}
              href={link.href}
              onClick={() => setIsOpen(false)}
              className={`block px-3 py-2 rounded text-base font-medium transition-colors duration-200 ${
                isActive(link.href)
                  ? "bg-heritage-green-800 text-heritage-gold-400 font-semibold"
                  : "text-heritage-gold-100/80 hover:bg-heritage-green-800/50 hover:text-heritage-gold-400"
              }`}
            >
              {link.name}
            </Link>
          ))}

          <hr className="border-heritage-gold-400/10 my-3" />

          {/* User actions (Mobile) */}
          <div className="px-3">
            {loading ? (
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-heritage-gold-400 border-t-transparent"></div>
            ) : user ? (
              <div className="space-y-3">
                <div className="text-sm text-heritage-gold-100 flex items-center gap-2 py-1">
                  <User className="h-4 w-4 text-heritage-gold-400" />
                  <span>{user.name}</span>
                </div>
                <button
                  onClick={() => {
                    setIsOpen(false);
                    logout();
                  }}
                  className="w-full flex items-center justify-center gap-2 bg-rose-950/40 border border-rose-500/20 text-rose-200 py-2.5 rounded text-sm font-semibold hover:bg-rose-900/30 transition-all duration-200"
                >
                  <LogOut className="h-4 w-4" />
                  Logout
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-2.5">
                <Link
                  href="/login"
                  onClick={() => setIsOpen(false)}
                  className="w-full text-center py-2.5 text-sm font-semibold text-heritage-gold-100 border border-heritage-gold-400/20 rounded hover:bg-heritage-green-800"
                >
                  Masuk
                </Link>
                <Link
                  href="/register"
                  onClick={() => setIsOpen(false)}
                  className="w-full text-center py-2.5 text-sm font-bold bg-heritage-gold-400 text-heritage-green-900 rounded shadow hover:bg-heritage-gold-300"
                >
                  Daftar
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
