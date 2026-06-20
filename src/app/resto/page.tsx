"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/context/AuthContext";
import { Utensils, ShoppingCart, Plus, Minus, Trash2, ShieldCheck, HelpCircle, Sparkles, AlertCircle } from "lucide-react";

interface MenuItem {
  id: number;
  name: string;
  description: string;
  price: string;
  foto_url: string | null;
}

interface CartItem {
  menu: MenuItem;
  quantity: number;
}

export default function Resto() {
  const router = useRouter();
  const { user } = useAuth();

  const [menus, setMenus] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [eligible, setEligible] = useState(false);
  const [eligibilityMsg, setEligibilityMsg] = useState("");
  const [activeBooking, setActiveBooking] = useState<any>(null);

  const [cart, setCart] = useState<CartItem[]>([]);
  const [submittingOrder, setSubmittingOrder] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(val);
  };

  // Verify guest eligibility & load menus
  useEffect(() => {
    if (!user) {
      router.push("/login");
      return;
    }

    const checkEligibilityAndLoadData = async () => {
      try {
        // 1. Check eligibility
        const eligibilityRes = await fetch("/api/guests/active-booking");
        const eligibilityData = await eligibilityRes.json();

        setEligible(eligibilityData.eligible);
        if (!eligibilityData.eligible) {
          setEligibilityMsg(eligibilityData.message || "Pemesanan makanan hanya diizinkan untuk tamu yang sudah check-in.");
          setLoading(false);
          return;
        }

        setActiveBooking(eligibilityData.booking);

        // 2. Load menus
        const menuRes = await fetch("/api/restaurant/menu");
        const menuData = await menuRes.json();
        setMenus(menuData.menus);
      } catch (err) {
        console.error(err);
        setEligibilityMsg("Gagal memproses data. Silakan muat ulang halaman.");
      } finally {
        setLoading(false);
      }
    };

    checkEligibilityAndLoadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const addToCart = (menu: MenuItem) => {
    const existing = cart.find((item) => item.menu.id === menu.id);
    if (existing) {
      setCart(
        cart.map((item) =>
          item.menu.id === menu.id ? { ...item, quantity: item.quantity + 1 } : item
        )
      );
    } else {
      setCart([...cart, { menu, quantity: 1 }]);
    }
  };

  const updateQuantity = (menuId: number, delta: number) => {
    setCart(
      cart
        .map((item) => {
          if (item.menu.id === menuId) {
            const newQty = item.quantity + delta;
            return { ...item, quantity: newQty };
          }
          return item;
        })
        .filter((item) => item.quantity > 0)
    );
  };

  const removeFromCart = (menuId: number) => {
    setCart(cart.filter((item) => item.menu.id !== menuId));
  };

  const getSubtotal = () => {
    return cart.reduce((sum, item) => sum + Number(item.menu.price) * item.quantity, 0);
  };

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    setSubmittingOrder(true);
    setOrderError(null);

    const items = cart.map((item) => ({
      menuId: item.menu.id,
      quantity: item.quantity,
    }));

    try {
      const res = await fetch("/api/restaurant/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });

      const data = await res.json();

      if (!res.ok) {
        setOrderError(data.message || "Gagal mengirim pesanan");
      } else {
        // Clear cart
        setCart([]);
        // Redirect to payment snapshot redirect page (which handles mock checkout in sandbox)
        if (data.redirectUrl) {
          router.push(data.redirectUrl);
        } else {
          router.push("/my-bookings");
        }
      }
    } catch (err) {
      console.error(err);
      setOrderError("Terjadi kesalahan jaringan");
    } finally {
      setSubmittingOrder(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-heritage-cream-100 min-h-screen py-32 text-center flex flex-col items-center justify-center gap-4">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-heritage-gold-400 border-t-transparent"></div>
        <p className="text-sm font-serif italic text-heritage-green-800/80">Memverifikasi status check-in Anda...</p>
      </div>
    );
  }

  if (!eligible) {
    return (
      <div className="bg-heritage-cream-100 min-h-screen py-32 px-4 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow max-w-md w-full border border-heritage-gold-400/20 text-center">
          <AlertCircle className="h-14 w-14 text-heritage-gold-400 mx-auto mb-4" />
          <h3 className="font-serif text-2xl font-bold text-heritage-green-950 mb-2">Restoran Khusus Tamu Aktif</h3>
          <p className="text-sm text-heritage-green-800/70 font-sans mb-6 leading-relaxed">
            {eligibilityMsg}
          </p>
          <button
            onClick={() => router.push("/catalog")}
            className="w-full bg-heritage-green-800 hover:bg-heritage-green-900 text-heritage-gold-100 font-bold py-2.5 rounded shadow transition-colors"
          >
            Pesan Kamar & Check-in
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-heritage-cream-100 min-h-screen py-24 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex p-2.5 rounded-full bg-heritage-green-900 text-heritage-gold-400 mb-3 shadow">
            <Utensils className="h-6 w-6" />
          </div>
          <h1 className="font-serif text-3xl md:text-5xl font-bold tracking-tight text-heritage-green-900">
            Layanan Restoran drgResto
          </h1>
          <p className="text-sm text-heritage-green-800/70 mt-2 font-sans">
            Pesan makanan warisan Nusantara langsung diantar ke Kamar {activeBooking?.rooms?.room_number}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Menu Catalog Column */}
          <div className="lg:col-span-2 space-y-6">
            <h3 className="font-serif text-2xl font-bold text-heritage-green-950 border-b border-heritage-gold-400/20 pb-2">
              Menu Hari Ini
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {menus.map((menu) => (
                <div
                  key={menu.id}
                  className="bg-white rounded-lg shadow border border-heritage-gold-400/10 overflow-hidden flex flex-col justify-between hover:shadow-md transition-shadow duration-300"
                >
                  <div>
                    {/* Image */}
                    <div
                      className="h-48 bg-cover bg-center"
                      style={{
                        backgroundImage: `url('${menu.foto_url || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=400"}')`,
                      }}
                    />

                    {/* Details */}
                    <div className="p-4 space-y-2">
                      <h4 className="font-serif text-lg font-bold text-heritage-green-950">
                        {menu.name}
                      </h4>
                      <p className="text-xs text-heritage-green-800/60 font-sans line-clamp-3 leading-relaxed">
                        {menu.description}
                      </p>
                    </div>
                  </div>

                  <div className="p-4 pt-0 flex justify-between items-center border-t border-heritage-gold-400/5 mt-4">
                    <span className="font-serif font-bold text-heritage-green-950">
                      {formatCurrency(Number(menu.price))}
                    </span>
                    <button
                      onClick={() => addToCart(menu)}
                      className="bg-heritage-green-800 hover:bg-heritage-green-900 text-heritage-gold-100 text-xs font-bold px-3.5 py-2 rounded shadow transition-colors flex items-center gap-1"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>Tambah</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Cart Column */}
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-lg border border-heritage-gold-400/20 p-6 sticky top-24">
              <div className="flex justify-between items-center border-b border-heritage-gold-400/20 pb-4 mb-4">
                <h3 className="font-serif text-xl font-bold text-heritage-green-950 flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5 text-heritage-gold-500" />
                  Keranjang Belanja
                </h3>
                <span className="bg-heritage-cream-200 text-heritage-green-800 text-xs font-bold px-2.5 py-0.5 rounded-full shrink-0">
                  {cart.reduce((sum, item) => sum + item.quantity, 0)} Item
                </span>
              </div>

              {cart.length === 0 ? (
                <div className="text-center py-12 text-heritage-green-800/50 space-y-2">
                  <Utensils className="h-8 w-8 text-heritage-gold-400 mx-auto opacity-75" />
                  <p className="text-sm font-serif italic">Keranjang belanja kosong</p>
                  <p className="text-xs font-sans">Tambahkan makanan dari daftar menu di samping</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Cart Items List */}
                  <div className="max-h-72 overflow-y-auto pr-1 space-y-3">
                    {cart.map((item) => (
                      <div
                        key={item.menu.id}
                        className="flex justify-between items-center gap-3 bg-heritage-cream-100/30 p-2.5 rounded border border-heritage-gold-400/5"
                      >
                        <div className="flex-grow min-w-0">
                          <h5 className="text-xs font-bold text-heritage-green-950 truncate">
                            {item.menu.name}
                          </h5>
                          <span className="text-[10px] text-heritage-green-800/60 font-semibold block">
                            {formatCurrency(Number(item.menu.price))} / porsi
                          </span>
                        </div>

                        {/* Quantity Controls */}
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => updateQuantity(item.menu.id, -1)}
                            className="bg-heritage-cream-200 hover:bg-heritage-cream-300 text-heritage-green-900 p-1 rounded transition-colors"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="text-xs font-bold text-heritage-green-950 min-w-4 text-center">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => updateQuantity(item.menu.id, 1)}
                            className="bg-heritage-cream-200 hover:bg-heritage-cream-300 text-heritage-green-900 p-1 rounded transition-colors"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                          <button
                            onClick={() => removeFromCart(item.menu.id)}
                            className="text-rose-600 hover:text-rose-800 p-1 transition-colors ml-1"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Summary */}
                  <div className="border-t border-heritage-gold-400/20 pt-4 space-y-2">
                    <div className="flex justify-between text-xs text-heritage-green-800/80">
                      <span>Subtotal</span>
                      <span className="font-semibold">{formatCurrency(getSubtotal())}</span>
                    </div>
                    <div className="flex justify-between text-xs text-heritage-green-800/80">
                      <span>Pajak & Layanan (10%)</span>
                      <span className="font-semibold">{formatCurrency(getSubtotal() * 0.1)}</span>
                    </div>
                    <hr className="border-heritage-gold-400/10 my-2" />
                    <div className="flex justify-between items-end">
                      <span className="text-xs font-bold text-heritage-green-800 uppercase tracking-wider">
                        Total Biaya
                      </span>
                      <span className="text-lg font-bold font-serif text-heritage-green-950">
                        {formatCurrency(getSubtotal() * 1.1)}
                      </span>
                    </div>
                  </div>

                  {orderError && (
                    <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs px-3 py-2 rounded">
                      {orderError}
                    </div>
                  )}

                  {/* Submit Order */}
                  <button
                    onClick={handleCheckout}
                    disabled={submittingOrder}
                    className="w-full bg-heritage-green-800 hover:bg-heritage-green-900 text-heritage-gold-100 font-bold py-3 rounded tracking-wide shadow transition-colors flex items-center justify-center gap-1.5"
                  >
                    {submittingOrder ? (
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-heritage-gold-400 border-t-transparent"></div>
                    ) : (
                      <>
                        <ShieldCheck className="h-4.5 w-4.5 text-heritage-gold-400" />
                        <span>Pesan & Bayar Sekarang</span>
                      </>
                    )}
                  </button>

                  <div className="flex items-center justify-center gap-1 text-[9px] text-heritage-green-900/40 uppercase tracking-widest font-semibold pt-2 text-center">
                    <ShieldCheck className="h-3 w-3 text-heritage-gold-500" />
                    <span>Diantar langsung ke kamar Anda</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
