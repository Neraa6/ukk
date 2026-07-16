"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CreditCard, Wallet, Landmark, CheckCircle, ShieldCheck, ArrowRight, Sparkles } from "lucide-react";

import { Suspense } from "react";

function MockCheckoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const token = searchParams.get("token");
  const orderId = searchParams.get("order_id") || "BOOKING-0-0";
  const amountStr = searchParams.get("amount") || "0";
  const email = searchParams.get("email") || "";

  const amount = parseFloat(amountStr);

  const [paymentMethod, setPaymentMethod] = useState("credit_card");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(val);
  };

  const handlePay = async () => {
    setLoading(true);
    setError(null);

    // Prepare simulated Midtrans webhook notification payload
    // Inside webhook route, signature checks if payload contains "MOCK-SIGNATURE"
    const webhookPayload = {
      order_id: orderId,
      status_code: "200",
      gross_amount: amount.toFixed(2),
      signature_key: `MOCK-SIGNATURE-KEY-${orderId}-${Date.now()}`,
      transaction_status: "settlement",
      payment_type: paymentMethod,
    };

    try {
      // Simulate network lag
      await new Promise((resolve) => setTimeout(resolve, 1500));

      const res = await fetch("/api/webhooks/midtrans", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(webhookPayload),
      });

      if (!res.ok) {
        const errData = await res.json();
        setError(errData.message || "Gagal memproses notifikasi pembayaran");
      } else {
        setSuccess(true);
        // Wait 1.5s then redirect
        setTimeout(() => {
          if (orderId.startsWith("BOOKING-")) {
            router.push("/my-bookings?payment=success");
          } else {
            router.push("/my-bookings?payment=resto-success");
          }
        }, 1500);
      }
    } catch (err) {
      console.error(err);
      setError("Kesalahan koneksi saat memproses simulasi pembayaran");
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-heritage-cream-100 flex items-center justify-center p-4">
        <div className="bg-white p-6 rounded shadow border text-center">
          <p className="text-rose-600 font-bold">Token checkout tidak ditemukan</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-heritage-cream-100 flex items-center justify-center py-24 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full bg-white rounded-lg shadow-2xl border border-heritage-gold-400/30 overflow-hidden">
        {/* Header (Midtrans lookalike) */}
        <div className="bg-heritage-green-900 text-heritage-gold-100 p-6 border-b border-heritage-gold-400/20">
          <div className="flex justify-between items-center mb-4">
            <span className="font-serif text-xl font-bold tracking-wide">
              Neraa<span className="text-heritage-gold-400">Hotel</span> Pay
            </span>
            <span className="bg-heritage-gold-400 text-heritage-green-900 text-[10px] font-bold px-2 py-0.5 rounded tracking-widest uppercase">
              Sandbox Simulator
            </span>
          </div>
          <div className="text-left">
            <p className="text-xs text-heritage-gold-400 uppercase tracking-wider font-semibold">Total Tagihan</p>
            <h3 className="text-3xl font-bold text-white mt-1">{formatCurrency(amount)}</h3>
            <p className="text-xs text-heritage-gold-100/60 mt-1">Order ID: {orderId}</p>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {success ? (
            <div className="text-center py-10 space-y-4">
              <div className="inline-flex p-3 rounded-full bg-green-50 text-green-600 animate-bounce">
                <CheckCircle className="h-16 w-16" />
              </div>
              <h3 className="font-serif text-2xl font-bold text-heritage-green-950">Pembayaran Sukses!</h3>
              <p className="text-sm text-heritage-green-800/70 font-sans">
                Simulasi pembayaran berhasil dikonfirmasi. <br />
                Mengarahkan Anda kembali ke aplikasi...
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              <div>
                <h4 className="text-xs font-semibold text-heritage-green-800 uppercase tracking-wider mb-3">
                  Pilih Metode Pembayaran Simulasi
                </h4>
                <div className="space-y-2.5">
                  {/* Credit Card */}
                  <label
                    className={`flex items-center justify-between p-3.5 border rounded-lg cursor-pointer transition-all duration-200 ${
                      paymentMethod === "credit_card"
                        ? "border-heritage-green-800 bg-heritage-cream-50 ring-1 ring-heritage-green-800"
                        : "border-heritage-gold-400/20 hover:bg-heritage-cream-50/50"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <CreditCard className="h-5 w-5 text-heritage-gold-500" />
                      <span className="text-sm font-semibold text-heritage-green-950">Kartu Kredit / Debit</span>
                    </div>
                    <input
                      type="radio"
                      name="payment_method"
                      checked={paymentMethod === "credit_card"}
                      onChange={() => setPaymentMethod("credit_card")}
                      className="hidden"
                    />
                  </label>

                  {/* GoPay */}
                  <label
                    className={`flex items-center justify-between p-3.5 border rounded-lg cursor-pointer transition-all duration-200 ${
                      paymentMethod === "gopay"
                        ? "border-heritage-green-800 bg-heritage-cream-50 ring-1 ring-heritage-green-800"
                        : "border-heritage-gold-400/20 hover:bg-heritage-cream-50/50"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Wallet className="h-5 w-5 text-heritage-gold-500" />
                      <span className="text-sm font-semibold text-heritage-green-950">GoPay / e-Wallet</span>
                    </div>
                    <input
                      type="radio"
                      name="payment_method"
                      checked={paymentMethod === "gopay"}
                      onChange={() => setPaymentMethod("gopay")}
                      className="hidden"
                    />
                  </label>

                  {/* VA Bank */}
                  <label
                    className={`flex items-center justify-between p-3.5 border rounded-lg cursor-pointer transition-all duration-200 ${
                      paymentMethod === "bank_transfer"
                        ? "border-heritage-green-800 bg-heritage-cream-50 ring-1 ring-heritage-green-800"
                        : "border-heritage-gold-400/20 hover:bg-heritage-cream-50/50"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Landmark className="h-5 w-5 text-heritage-gold-500" />
                      <span className="text-sm font-semibold text-heritage-green-950">Virtual Account (VA)</span>
                    </div>
                    <input
                      type="radio"
                      name="payment_method"
                      checked={paymentMethod === "bank_transfer"}
                      onChange={() => setPaymentMethod("bank_transfer")}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              {error && (
                <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs px-3 py-2.5 rounded">
                  {error}
                </div>
              )}

              {/* Pay Button */}
              <button
                onClick={handlePay}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-heritage-green-800 hover:bg-heritage-green-900 text-heritage-gold-100 font-bold py-3.5 rounded tracking-wide shadow-md transition-all"
              >
                {loading ? (
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-heritage-gold-400 border-t-transparent"></div>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 text-heritage-gold-400" />
                    <span>Bayar Sekarang ({formatCurrency(amount)})</span>
                    <ArrowRight className="h-4 w-4 ml-1" />
                  </>
                )}
              </button>

              <div className="flex items-center justify-center gap-2 text-center text-[10px] text-heritage-green-900/60 uppercase tracking-widest font-semibold pt-4 border-t border-heritage-gold-400/10">
                <ShieldCheck className="h-4 w-4 text-heritage-gold-500" />
                <span>Pembayaran Terenkripsi & Aman</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function MockCheckout() {
  return (
    <Suspense fallback={
      <div className="bg-heritage-cream-100 min-h-screen py-24 flex items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-heritage-gold-400 border-t-transparent"></div>
      </div>
    }>
      <MockCheckoutContent />
    </Suspense>
  );
}
