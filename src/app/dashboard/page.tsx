"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/context/AuthContext";
import {
  TrendingUp,
  BedDouble,
  DollarSign,
  Utensils,
  Download,
  Calendar,
  Plus,
  Edit,
  Trash2,
  Check,
  X,
  AlertCircle,
  ClipboardList,
  Users,
  Receipt,
  Settings,
  ShieldCheck,
} from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";

interface Stats {
  occupancy: {
    totalRooms: number;
    occupiedRooms: number;
    rate: number;
  };
  revenueToday: {
    room: number;
    restaurant: number;
    total: number;
  };
  additionalStats: {
    totalBookingsToday: number;
    totalRestoOrdersToday: number;
    averageRoomRate: number;
    uniqueGuestsToday: number;
  };
  topMenus: Array<{
    id: number;
    name: string;
    quantity: number;
    revenue: number;
  }>;
  chartData: Array<{
    month: string;
    room: number;
    resto: number;
  }>;
}

export default function Dashboard() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [activeTab, setActiveTab] = useState("analytics"); // analytics | bookings | rooms | menus
  const [mounted, setMounted] = useState(false);

  // Data states
  const [stats, setStats] = useState<Stats | null>(null);

  // Helper to get default date ranges
  const getDefaultStartDate = () => {
    const d = new Date();
    d.setMonth(d.getMonth() - 5);
    d.setDate(1);
    return d.toISOString().split("T")[0];
  };

  const getDefaultEndDate = () => {
    return new Date().toISOString().split("T")[0];
  };

  const [chartStartDate, setChartStartDate] = useState("");
  const [chartEndDate, setChartEndDate] = useState("");
  const [chartLoading, setChartLoading] = useState(false);

  const isCustomDate = mounted && (chartStartDate !== getDefaultStartDate() || chartEndDate !== getDefaultEndDate());

  const [bookings, setBookings] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [roomTypes, setRoomTypes] = useState<any[]>([]);
  const [menus, setMenus] = useState<any[]>([]);

  // Loading & error states
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<number | null>(null); // bookingId of checkin action

  // CRUD Modals States
  const [showRoomModal, setShowRoomModal] = useState(false);
  const [editingRoom, setEditingRoom] = useState<any>(null);
  const [roomForm, setRoomForm] = useState({
    room_number: "",
    room_type_id: "",
    status: "available",
  });

  const [showMenuModal, setShowMenuModal] = useState(false);
  const [editingMenu, setEditingMenu] = useState<any>(null);
  const [menuForm, setMenuForm] = useState({
    name: "",
    description: "",
    price: "",
    foto_url: "",
  });

  const [showTypeModal, setShowTypeModal] = useState(false);
  const [editingType, setEditingType] = useState<any>(null);
  const [typeForm, setTypeForm] = useState({
    name: "",
    description: "",
    price: "",
    foto_url: "",
  });

  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Form error states
  const [formError, setFormError] = useState<string | null>(null);

  const [exporting, setExporting] = useState(false);

  const handleDownloadPDF = async () => {
    setExporting(true);
    try {
      const start = chartStartDate || getDefaultStartDate();
      const end = chartEndDate || getDefaultEndDate();
      const res = await fetch(`/api/dashboard/export?startDate=${start}&endDate=${end}`);
      if (!res.ok) throw new Error("Gagal mengambil data laporan");
      const data = await res.json();
      if (!data.success) throw new Error(data.message || "Gagal memproses data laporan");

      const payments = data.payments;

      // 1. Initialize jsPDF (A4 size, portrait)
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      // 2. Draw Premium Header Banner
      doc.setFillColor(29, 59, 43); // Heritage Green (RGB)
      doc.rect(15, 15, 180, 24, "F");

      // Draw Gold Accent Line
      doc.setDrawColor(197, 168, 128); // Heritage Gold (RGB)
      doc.setLineWidth(0.8);
      doc.line(15, 39, 195, 39);

      // Title & Text on Banner
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.text("NeraaHotel", 20, 24);

      doc.setTextColor(197, 168, 128);
      doc.setFont("helvetica", "italic");
      doc.setFontSize(8);
      doc.text("Elegant Heritage Hotel", 20, 29);

      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text("LAPORAN TRANSAKSI INTERNAL", 190, 25, { align: "right" });

      doc.setTextColor(229, 223, 213);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.text(`Periode: ${start} - ${end}`, 190, 29, { align: "right" });
      doc.text(`Dicetak pada: ${new Date().toLocaleString("id-ID")}`, 190, 33, { align: "right" });

      // 3. Summary Metadata Section
      const totalTransactions = payments.length;
      const totalRevenue = payments
        .filter((p: any) => p.payment_status === "paid")
        .reduce((sum: number, p: any) => sum + Number(p.amount), 0);

      doc.setTextColor(13, 31, 21);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.text("Rangkuman Laporan", 15, 48);

      doc.setDrawColor(229, 223, 213);
      doc.setLineWidth(0.2);
      doc.line(15, 51, 195, 51);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(74, 93, 78);
      doc.text("Total Transaksi:", 15, 57);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(13, 31, 21);
      doc.text(totalTransactions.toString(), 45, 57);

      doc.setFont("helvetica", "normal");
      doc.setTextColor(74, 93, 78);
      doc.text("Total Pendapatan (Lunas):", 70, 57);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(29, 59, 43);
      doc.text(`IDR ${totalRevenue.toLocaleString("id-ID")}`, 110, 57);

      doc.setFont("helvetica", "normal");
      doc.setTextColor(74, 93, 78);
      doc.text("Petugas Pengunduh:", 145, 57);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(13, 31, 21);
      doc.text(user?.name || "-", 175, 57);

      // Add Dashboard Stats Data
      if (stats) {
        doc.setFont("helvetica", "normal");
        doc.setTextColor(74, 93, 78);
        doc.text("Okupansi Kamar:", 15, 65);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(13, 31, 21);
        doc.text(`${stats.occupancy.rate.toFixed(1)}% (${stats.occupancy.occupiedRooms}/${stats.occupancy.totalRooms})`, 45, 65);

        doc.setFont("helvetica", "normal");
        doc.setTextColor(74, 93, 78);
        doc.text("Omset Kamar Hari Ini:", 70, 65);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(29, 59, 43);
        doc.text(`IDR ${stats.revenueToday.room.toLocaleString("id-ID")}`, 110, 65);

        doc.setFont("helvetica", "normal");
        doc.setTextColor(74, 93, 78);
        doc.text("Omset Resto Hari Ini:", 145, 65);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(29, 59, 43);
        doc.text(`IDR ${stats.revenueToday.restaurant.toLocaleString("id-ID")}`, 175, 65);

        // Additional Stats line
        doc.setFont("helvetica", "normal");
        doc.setTextColor(74, 93, 78);
        doc.text("Total Booking Hari Ini:", 15, 73);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(13, 31, 21);
        doc.text(stats.additionalStats.totalBookingsToday.toString(), 45, 73);

        doc.setFont("helvetica", "normal");
        doc.setTextColor(74, 93, 78);
        doc.text("Total Pesanan Resto:", 70, 73);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(13, 31, 21);
        doc.text(stats.additionalStats.totalRestoOrdersToday.toString(), 110, 73);

        doc.setFont("helvetica", "normal");
        doc.setTextColor(74, 93, 78);
        doc.text("Tamu Aktif Hari Ini:", 145, 73);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(13, 31, 21);
        doc.text(stats.additionalStats.uniqueGuestsToday.toString(), 175, 73);

        doc.setFont("helvetica", "normal");
        doc.setTextColor(74, 93, 78);
        doc.text("Top Menu (Porsi):", 15, 81);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(13, 31, 21);
        const topMenuNames = stats.topMenus.map(m => `${m.name} (${m.quantity})`).join(", ");
        doc.text(topMenuNames.length > 90 ? topMenuNames.substring(0, 90) + "..." : topMenuNames || "-", 45, 81);
      }

      // 4. Prepare Table Data for autotable
      const tableHeaders = [
        ["ID", "Tanggal", "Layanan", "Pelanggan", "Detail Layanan", "Total (IDR)", "Status"]
      ];

      const tableRows = payments.map((payment: any) => {
        const dateStr = payment.created_at.split("T")[0];
        const amountStr = Number(payment.amount).toLocaleString("id-ID");
        
        let serviceType = "";
        let customerName = "";
        let details = "";

        if (payment.booking_id !== null && payment.bookings) {
          serviceType = "Kamar";
          customerName = payment.bookings.guests.name;
          details = `Kamar ${payment.bookings.rooms.room_number} (${payment.bookings.rooms.room_types.name})`;
        } else if (payment.restaurant_order_id !== null && payment.restaurant_orders) {
          serviceType = "Restoran";
          customerName = payment.restaurant_orders.guests.name;
          details = `Pesanan Restoran #${payment.restaurant_order_id}`;
        } else {
          serviceType = "Lainnya";
          customerName = "-";
          details = payment.note || "-";
        }

        return [
          payment.id.toString(),
          dateStr,
          serviceType,
          customerName,
          details,
          amountStr,
          payment.payment_status.toUpperCase(),
        ];
      });

      // 5. Render Table using jspdf-autotable
      autoTable(doc, {
        startY: stats ? 93 : 65,
        head: tableHeaders,
        body: tableRows,
        theme: "striped",
        headStyles: {
          fillColor: [29, 59, 43], // Heritage Green
          textColor: [255, 255, 255],
          fontStyle: "bold",
          fontSize: 8,
          valign: "middle",
          halign: "left",
        },
        columnStyles: {
          0: { cellWidth: 10 }, // ID
          1: { cellWidth: 20 }, // Tanggal
          2: { cellWidth: 20 }, // Layanan
          3: { cellWidth: 35 }, // Pelanggan
          4: { cellWidth: 50 }, // Detail
          5: { cellWidth: 28, halign: "right" }, // Total
          6: { cellWidth: 17, halign: "center" }, // Status
        },
        styles: {
          fontSize: 7.5,
          font: "helvetica",
          cellPadding: 2,
        },
        alternateRowStyles: {
          fillColor: [252, 251, 247], // Light cream zebra stripes
        },
        didParseCell: (data) => {
          if (data.column.index === 6 && data.cell.section === "body") {
            const status = data.cell.raw as string;
            if (status === "PAID") {
              data.cell.styles.textColor = [21, 128, 61];
            } else if (status === "FAILED") {
              data.cell.styles.textColor = [185, 28, 28];
            } else {
              data.cell.styles.textColor = [169, 137, 92];
            }
            data.cell.styles.fontStyle = "bold";
          }
        },
        didDrawPage: (data) => {
          // Footer
          doc.setFont("helvetica", "italic");
          doc.setFontSize(6.5);
          doc.setTextColor(138, 158, 143);
          doc.text("NeraaHotel - Laporan Transaksi Rahasia", 15, 287);
          doc.text(
            `Halaman ${data.pageNumber}`,
            195,
            287,
            { align: "right" }
          );
        },
      });

      // 6. Save PDF
      doc.save(`NeraaHotel-Laporan-Transaksi-${new Date().toISOString().split("T")[0]}.pdf`);
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Gagal mengunduh laporan PDF");
    } finally {
      setExporting(false);
    }
  };

  useEffect(() => {
    setMounted(true);
    setChartStartDate(getDefaultStartDate());
    setChartEndDate(getDefaultEndDate());
  }, []);

  // Auth Redirect: If not admin/management, block
  useEffect(() => {
    if (!authLoading) {
      if (!user || (user.role !== "admin" && user.role !== "management")) {
        router.push("/admin/login");
      } else {
        loadAllData();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading]);

  const loadAllData = async () => {
    setLoading(true);
    setError(null);
    try {
      const start = chartStartDate || getDefaultStartDate();
      const end = chartEndDate || getDefaultEndDate();
      const statsUrl = `/api/dashboard/stats?startDate=${start}&endDate=${end}`;

      const [statsRes, bookingsRes, roomsRes, typesRes, menusRes] = await Promise.all([
        fetch(statsUrl),
        fetch("/api/bookings"),
        fetch("/api/rooms"),
        fetch("/api/room-types"),
        fetch("/api/restaurant/menu"),
      ]);

      if (!statsRes.ok || !bookingsRes.ok || !roomsRes.ok || !typesRes.ok || !menusRes.ok) {
        throw new Error("Gagal mengambil data dari server API");
      }

      const statsData = await statsRes.json();
      const bookingsData = await bookingsRes.json();
      const roomsData = await roomsRes.json();
      const typesData = await typesRes.json();
      const menusData = await menusRes.json();

      setStats(statsData);
      setBookings(bookingsData.bookings);
      setRooms(roomsData.rooms);
      setRoomTypes(typesData.roomTypes);
      setMenus(menusData.menus);
    } catch (err) {
      console.error(err);
      setError("Gagal memuat panel dashboard. Pastikan server database menyala.");
    } finally {
      setLoading(false);
    }
  };

  const loadChartData = async (start: string, end: string) => {
    setChartLoading(true);
    try {
      const res = await fetch(`/api/dashboard/stats?startDate=${start}&endDate=${end}`);
      if (!res.ok) throw new Error("Gagal mengambil data analitik");
      const data = await res.json();
      setStats((prev) =>
        prev
          ? {
              ...prev,
              chartData: data.chartData,
              topMenus: data.topMenus,
            }
          : data
      );
    } catch (err) {
      console.error(err);
    } finally {
      setChartLoading(false);
    }
  };

  const handleStartDateChange = (val: string) => {
    setChartStartDate(val);
    if (val && chartEndDate) {
      if (val > chartEndDate) {
        setChartEndDate(val);
        loadChartData(val, val);
      } else {
        loadChartData(val, chartEndDate);
      }
    }
  };

  const handleEndDateChange = (val: string) => {
    setChartEndDate(val);
    if (chartStartDate && val) {
      if (chartStartDate > val) {
        setChartStartDate(val);
        loadChartData(val, val);
      } else {
        loadChartData(chartStartDate, val);
      }
    }
  };

  const handleResetChartDate = () => {
    const start = getDefaultStartDate();
    const end = getDefaultEndDate();
    setChartStartDate(start);
    setChartEndDate(end);
    loadChartData(start, end);
  };

  const handleBookingAction = async (bookingId: number, action: "check-in" | "check-out" | "cancel") => {
    setActionLoading(bookingId);
    setFormError(null);
    setSuccessMessage(null);

    try {
      const res = await fetch(`/api/bookings/${bookingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });

      const data = await res.json();
      if (!res.ok) {
        setFormError(data.message || `Gagal memproses ${action}`);
      } else {
        setSuccessMessage(`Berhasil memproses ${action}`);
        loadAllData(); // reload dashboard stats
      }
    } catch (err) {
      console.error(err);
      setFormError("Kesalahan jaringan");
    } finally {
      setActionLoading(null);
    }
  };

  // ROOMS CRUD
  const handleSaveRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const url = editingRoom ? `/api/rooms/${editingRoom.id}` : "/api/rooms";
    const method = editingRoom ? "PUT" : "POST";

    const payload = {
      room_number: roomForm.room_number,
      room_type_id: parseInt(roomForm.room_type_id),
      status: roomForm.status,
    };

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        setFormError(data.message || "Gagal menyimpan kamar");
      } else {
        setShowRoomModal(false);
        setSuccessMessage(`Kamar ${roomForm.room_number} berhasil disimpan`);
        loadAllData();
      }
    } catch (err) {
      console.error(err);
      setFormError("Kesalahan jaringan");
    }
  };

  const handleDeleteRoom = async (id: number) => {
    if (!confirm("Apakah Anda yakin ingin menghapus kamar ini?")) return;
    setFormError(null);
    try {
      const res = await fetch(`/api/rooms/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        alert(data.message || "Gagal menghapus kamar");
      } else {
        setSuccessMessage("Kamar berhasil dihapus");
        loadAllData();
      }
    } catch (err) {
      console.error(err);
      alert("Kesalahan jaringan");
    }
  };

  // ROOM TYPE CRUD
  const handleSaveType = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const url = editingType ? `/api/room-types/${editingType.id}` : "/api/room-types";
    const method = editingType ? "PUT" : "POST";

    const payload = {
      name: typeForm.name,
      description: typeForm.description,
      price: parseFloat(typeForm.price),
      foto_url: typeForm.foto_url || null,
    };

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        setFormError(data.message || "Gagal menyimpan tipe kamar");
      } else {
        setShowTypeModal(false);
        setSuccessMessage(`Tipe kamar ${typeForm.name} berhasil disimpan`);
        loadAllData();
      }
    } catch (err) {
      console.error(err);
      setFormError("Kesalahan jaringan");
    }
  };

  const handleDeleteType = async (id: number) => {
    if (!confirm("Apakah Anda yakin ingin menghapus tipe kamar ini?")) return;
    try {
      const res = await fetch(`/api/room-types/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        alert(data.message || "Gagal menghapus tipe kamar");
      } else {
        setSuccessMessage("Tipe kamar berhasil dihapus");
        loadAllData();
      }
    } catch (err) {
      console.error(err);
      alert("Kesalahan jaringan");
    }
  };

  // RESTO MENU CRUD
  const handleSaveMenu = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const url = editingMenu ? `/api/restaurant/menu/${editingMenu.id}` : "/api/restaurant/menu";
    const method = editingMenu ? "PUT" : "POST";

    const payload = {
      name: menuForm.name,
      description: menuForm.description,
      price: parseFloat(menuForm.price),
      foto_url: menuForm.foto_url || null,
    };

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        setFormError(data.message || "Gagal menyimpan menu");
      } else {
        setShowMenuModal(false);
        setSuccessMessage(`Menu ${menuForm.name} berhasil disimpan`);
        loadAllData();
      }
    } catch (err) {
      console.error(err);
      setFormError("Kesalahan jaringan");
    }
  };

  const handleDeleteMenu = async (id: number) => {
    if (!confirm("Apakah Anda yakin ingin menghapus menu makanan ini?")) return;
    try {
      const res = await fetch(`/api/restaurant/menu/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        alert(data.message || "Gagal menghapus menu");
      } else {
        setSuccessMessage("Menu berhasil dihapus");
        loadAllData();
      }
    } catch (err) {
      console.error(err);
      alert("Kesalahan jaringan");
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(val);
  };

  if (authLoading || loading) {
    return (
      <div className="bg-heritage-cream-100 min-h-screen py-32 text-center flex flex-col items-center justify-center gap-4">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-heritage-gold-400 border-t-transparent"></div>
        <p className="text-sm font-serif italic text-heritage-green-800/80">Memuat panel dashboard hotel...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-heritage-cream-100 min-h-screen py-32 px-4 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow max-w-md w-full border border-rose-200 text-center">
          <AlertCircle className="h-14 w-14 text-rose-600 mx-auto mb-4" />
          <h3 className="font-serif text-2xl font-bold text-rose-950 mb-2">Terjadi Kesalahan</h3>
          <p className="text-sm text-rose-800/70 font-sans mb-6 leading-relaxed">{error}</p>
          <button
            onClick={loadAllData}
            className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold py-2.5 rounded shadow transition-colors"
          >
            Muat Ulang Dashboard
          </button>
        </div>
      </div>
    );
  }

  const isManagement = user?.role === "management";
  const isAdmin = user?.role === "admin";

  return (
    <div className="bg-heritage-cream-100 min-h-screen py-24 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Success Alert */}
        {successMessage && (
          <div className="bg-green-50 border border-green-200 text-green-900 px-4 py-3 rounded mb-6 flex items-center justify-between text-sm shadow">
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-green-600 shrink-0" />
              <span>{successMessage}</span>
            </div>
            <button onClick={() => setSuccessMessage(null)} className="text-green-700 hover:text-green-900 font-bold">
              Dismiss
            </button>
          </div>
        )}

        {/* Dashboard Title Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 border-b border-heritage-gold-400/25 pb-6">
          <div>
            <h1 className="font-serif text-3xl md:text-5xl font-bold text-heritage-green-950">
              Panel Kendali Internal
            </h1>
            <p className="text-sm text-heritage-green-800/70 mt-1 font-sans">
              Selamat bekerja, <strong className="text-heritage-green-950">{user?.name}</strong>. Peran Anda:{" "}
              <span className="bg-heritage-green-900 text-heritage-gold-400 text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">
                {user?.role === "admin" ? "Staff Operasional" : "Management / Owner"}
              </span>
            </p>
          </div>

          <div className="flex gap-3 w-full md:w-auto">
            {/* PDF Export Button (Epic E) */}
            {isManagement && (
              <button
                onClick={handleDownloadPDF}
                disabled={exporting}
                className="flex-1 md:flex-initial bg-heritage-green-800 hover:bg-heritage-green-900 text-heritage-gold-100 font-bold px-5 py-2.5 rounded tracking-wide shadow flex items-center justify-center gap-2 text-sm border border-heritage-gold-400/20 disabled:opacity-50"
              >
                {exporting ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-heritage-gold-400 border-t-transparent"></div>
                ) : (
                  <Download className="h-4 w-4 text-heritage-gold-400" />
                )}
                <span>{exporting ? "Mengunduh..." : "Unduh PDF Laporan"}</span>
              </button>
            )}
          </div>
        </div>

        {/* Section Tabs */}
        <div className="flex flex-wrap bg-white p-1 rounded-md border border-heritage-gold-400/20 mb-8 max-w-2xl shadow-sm">
          <button
            onClick={() => setActiveTab("analytics")}
            className={`flex-1 min-w-[120px] py-2 text-xs font-bold tracking-wide rounded-md transition-all duration-200 ${
              activeTab === "analytics"
                ? "bg-heritage-green-800 text-heritage-gold-100 shadow"
                : "text-heritage-green-900/60 hover:text-heritage-green-900"
            }`}
          >
            Analitik & Laporan
          </button>
          <button
            onClick={() => setActiveTab("bookings")}
            className={`flex-1 min-w-[120px] py-2 text-xs font-bold tracking-wide rounded-md transition-all duration-200 ${
              activeTab === "bookings"
                ? "bg-heritage-green-800 text-heritage-gold-100 shadow"
                : "text-heritage-green-900/60 hover:text-heritage-green-900"
            }`}
          >
            Reservasi Tamu
          </button>
          <button
            onClick={() => setActiveTab("rooms")}
            className={`flex-1 min-w-[120px] py-2 text-xs font-bold tracking-wide rounded-md transition-all duration-200 ${
              activeTab === "rooms"
                ? "bg-heritage-green-800 text-heritage-gold-100 shadow"
                : "text-heritage-green-900/60 hover:text-heritage-green-900"
            }`}
          >
            Inventori Kamar
          </button>
          <button
            onClick={() => setActiveTab("menus")}
            className={`flex-1 min-w-[120px] py-2 text-xs font-bold tracking-wide rounded-md transition-all duration-200 ${
              activeTab === "menus"
                ? "bg-heritage-green-800 text-heritage-gold-100 shadow"
                : "text-heritage-green-900/60 hover:text-heritage-green-900"
            }`}
          >
            Menu Restoran
          </button>
        </div>

        {/* -------------------- TAB CONTENT -------------------- */}

        {/* 1. TAB ANALYTICS */}
        {activeTab === "analytics" && (
          <div className="space-y-8 animate-fade-in">
            {/* Stats Overview Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {/* Card 1: Occupancy Rate */}
              <div className="bg-white p-6 rounded-lg shadow border border-heritage-gold-400/10 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-heritage-green-800/50 uppercase tracking-widest block">
                    Okupansi Kamar
                  </span>
                  <h3 className="text-3xl font-bold font-serif text-heritage-green-950 mt-1">
                    {stats?.occupancy.rate.toFixed(1)}%
                  </h3>
                  <span className="text-xs text-heritage-green-800/60 font-sans block mt-1">
                    {stats?.occupancy.occupiedRooms} dari {stats?.occupancy.totalRooms} Kamar Terisi
                  </span>
                </div>
                <div className="bg-heritage-cream-100 text-heritage-gold-500 p-3 rounded-full shrink-0">
                  <BedDouble className="h-6 w-6" />
                </div>
              </div>

              {/* Card 2: Today Revenue */}
              <div className="bg-white p-6 rounded-lg shadow border border-heritage-gold-400/10 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-heritage-green-800/50 uppercase tracking-widest block">
                    Total Pendapatan Hari Ini
                  </span>
                  <h3 className="text-3xl font-bold font-serif text-heritage-green-950 mt-1">
                    {formatCurrency(stats?.revenueToday.total || 0)}
                  </h3>
                  <span className="text-xs text-heritage-green-800/60 font-sans block mt-1">
                    Kamar + Restoran Lunas
                  </span>
                </div>
                <div className="bg-heritage-cream-100 text-heritage-gold-500 p-3 rounded-full shrink-0">
                  <DollarSign className="h-6 w-6" />
                </div>
              </div>

              {/* Card 3: Room Revenue Today */}
              <div className="bg-white p-6 rounded-lg shadow border border-heritage-gold-400/10 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-heritage-green-800/50 uppercase tracking-widest block">
                    Omset Kamar Hari Ini
                  </span>
                  <h3 className="text-2xl font-bold font-serif text-heritage-green-950 mt-1">
                    {formatCurrency(stats?.revenueToday.room || 0)}
                  </h3>
                  <span className="text-xs text-heritage-green-800/60 font-sans block mt-1">
                    Dari reservasi kamar lunas
                  </span>
                </div>
                <div className="bg-heritage-cream-100 text-heritage-gold-500 p-3 rounded-full shrink-0">
                  <Calendar className="h-5 w-5" />
                </div>
              </div>

              {/* Card 4: Resto Revenue Today */}
              <div className="bg-white p-6 rounded-lg shadow border border-heritage-gold-400/10 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-heritage-green-800/50 uppercase tracking-widest block">
                    Omset Resto Hari Ini
                  </span>
                  <h3 className="text-2xl font-bold font-serif text-heritage-green-950 mt-1">
                    {formatCurrency(stats?.revenueToday.restaurant || 0)}
                  </h3>
                  <span className="text-xs text-heritage-green-800/60 font-sans block mt-1">
                    Pesanan makanan terbayar
                  </span>
                </div>
                <div className="bg-heritage-cream-100 text-heritage-gold-500 p-3 rounded-full shrink-0">
                  <Utensils className="h-5 w-5" />
                </div>
              </div>

              {/* Card 5: Total Bookings */}
              <div className="bg-white p-6 rounded-lg shadow border border-heritage-gold-400/10 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-heritage-green-800/50 uppercase tracking-widest block">
                    Booking Hari Ini
                  </span>
                  <h3 className="text-2xl font-bold font-serif text-heritage-green-950 mt-1">
                    {stats?.additionalStats.totalBookingsToday || 0}
                  </h3>
                  <span className="text-xs text-heritage-green-800/60 font-sans block mt-1">
                    Jumlah reservasi kamar baru
                  </span>
                </div>
                <div className="bg-heritage-cream-100 text-heritage-gold-500 p-3 rounded-full shrink-0">
                  <ClipboardList className="h-5 w-5" />
                </div>
              </div>

              {/* Card 6: Total Resto Orders */}
              <div className="bg-white p-6 rounded-lg shadow border border-heritage-gold-400/10 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-heritage-green-800/50 uppercase tracking-widest block">
                    Pesanan Resto
                  </span>
                  <h3 className="text-2xl font-bold font-serif text-heritage-green-950 mt-1">
                    {stats?.additionalStats.totalRestoOrdersToday || 0}
                  </h3>
                  <span className="text-xs text-heritage-green-800/60 font-sans block mt-1">
                    Total pesanan hari ini
                  </span>
                </div>
                <div className="bg-heritage-cream-100 text-heritage-gold-500 p-3 rounded-full shrink-0">
                  <Receipt className="h-5 w-5" />
                </div>
              </div>

              {/* Card 7: Average Room Rate */}
              <div className="bg-white p-6 rounded-lg shadow border border-heritage-gold-400/10 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-heritage-green-800/50 uppercase tracking-widest block">
                    Rata-Rata Tarif Kamar
                  </span>
                  <h3 className="text-2xl font-bold font-serif text-heritage-green-950 mt-1">
                    {formatCurrency(stats?.additionalStats.averageRoomRate || 0)}
                  </h3>
                  <span className="text-xs text-heritage-green-800/60 font-sans block mt-1">
                    Pendapatan per kamar terisi
                  </span>
                </div>
                <div className="bg-heritage-cream-100 text-heritage-gold-500 p-3 rounded-full shrink-0">
                  <TrendingUp className="h-5 w-5" />
                </div>
              </div>

              {/* Card 8: Active Guests */}
              <div className="bg-white p-6 rounded-lg shadow border border-heritage-gold-400/10 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-heritage-green-800/50 uppercase tracking-widest block">
                    Tamu Aktif Hari Ini
                  </span>
                  <h3 className="text-2xl font-bold font-serif text-heritage-green-950 mt-1">
                    {stats?.additionalStats.uniqueGuestsToday || 0}
                  </h3>
                  <span className="text-xs text-heritage-green-800/60 font-sans block mt-1">
                    Tamu unik yang bertransaksi
                  </span>
                </div>
                <div className="bg-heritage-cream-100 text-heritage-gold-500 p-3 rounded-full shrink-0">
                  <Users className="h-5 w-5" />
                </div>
              </div>
            </div>

            {/* Charts and Top Menus layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Revenue Trends Chart */}
              <div className="lg:col-span-2 bg-white p-6 rounded-lg border border-heritage-gold-400/10 shadow space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <h4 className="font-serif text-lg font-bold text-heritage-green-950 flex items-center gap-1.5">
                    <TrendingUp className="h-5 w-5 text-heritage-gold-500" />
                    Tren Pendapatan {isCustomDate ? "" : "(6 Bulan Terakhir)"}
                  </h4>
                  <div className="flex items-center gap-2 text-sm">
                    <input
                      type="date"
                      value={chartStartDate}
                      onChange={(e) => handleStartDateChange(e.target.value)}
                      className="border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-heritage-green-500"
                    />
                    <span>-</span>
                    <input
                      type="date"
                      value={chartEndDate}
                      onChange={(e) => handleEndDateChange(e.target.value)}
                      className="border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-heritage-green-500"
                    />
                    {isCustomDate && (
                      <button
                        onClick={handleResetChartDate}
                        className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-2 py-1 rounded"
                      >
                        Reset
                      </button>
                    )}
                  </div>
                </div>

                <div className="h-80 w-full font-sans text-xs">
                  {mounted && stats && stats.chartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={stats.chartData}
                        margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                      >
                        <defs>
                          <linearGradient id="colorRoom" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#1d3b2b" stopOpacity={0.8} />
                            <stop offset="95%" stopColor="#1d3b2b" stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="colorResto" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#c5a880" stopOpacity={0.8} />
                            <stop offset="95%" stopColor="#c5a880" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="month" />
                        <YAxis tickFormatter={(val) => `${val / 1000000}M`} />
                        <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                        <Legend />
                        <Area
                          type="monotone"
                          name="Reservasi Kamar"
                          dataKey="room"
                          stroke="#1d3b2b"
                          fillOpacity={1}
                          fill="url(#colorRoom)"
                        />
                        <Area
                          type="monotone"
                          name="Restoran"
                          dataKey="resto"
                          stroke="#c5a880"
                          fillOpacity={1}
                          fill="url(#colorResto)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full text-heritage-green-800/40">
                      Chart tidak tersedia
                    </div>
                  )}
                </div>
              </div>

              {/* Top Selling Menus */}
              <div className="bg-white p-6 rounded-lg border border-heritage-gold-400/10 shadow flex flex-col justify-between">
                <div>
                  <h4 className="font-serif text-lg font-bold text-heritage-green-950 flex items-center gap-1.5 border-b border-heritage-gold-400/10 pb-3 mb-4">
                    <Utensils className="h-5 w-5 text-heritage-gold-500" />
                    Top 5 Menu Terlaris (30 Hari)
                  </h4>

                  <div className="space-y-4">
                    {stats?.topMenus && stats.topMenus.length > 0 ? (
                      stats.topMenus.map((menu, i) => (
                        <div key={menu.id} className="flex items-center justify-between gap-3 text-sm">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="h-6 w-6 shrink-0 rounded-full bg-heritage-cream-100 text-heritage-green-900 flex items-center justify-center font-serif font-bold text-xs border border-heritage-gold-400/20">
                              {i + 1}
                            </span>
                            <span className="font-semibold text-heritage-green-950 truncate">{menu.name}</span>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="font-bold text-heritage-green-950 block">{menu.quantity} porsi</span>
                            <span className="text-[10px] text-heritage-green-800/60 font-semibold block">
                              {formatCurrency(Number(menu.revenue))}
                            </span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-heritage-green-800/50 italic text-center py-8">
                        Belum ada pesanan makanan terbayar
                      </p>
                    )}
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-heritage-gold-400/10 text-center text-xs text-heritage-green-800/50 font-sans">
                  Diperbarui secara real-time berdasarkan pesanan restoran lunas
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 2. TAB BOOKINGS (Check-In & Check-Out Grid) */}
        {activeTab === "bookings" && (
          <div className="bg-white rounded-lg border border-heritage-gold-400/10 shadow overflow-hidden animate-fade-in p-6">
            <h3 className="font-serif text-2xl font-bold text-heritage-green-950 border-b border-heritage-gold-400/10 pb-4 mb-6">
              Daftar Reservasi Tamu
            </h3>

            {formError && (
              <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs px-3 py-2.5 rounded mb-4">
                {formError}
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left text-heritage-green-950">
                <thead className="text-xs font-bold text-heritage-green-800/70 uppercase tracking-wider bg-heritage-cream-100/55 border-b border-heritage-gold-400/15">
                  <tr>
                    <th className="px-6 py-4">ID</th>
                    <th className="px-6 py-4">Pelanggan</th>
                    <th className="px-6 py-4">Kamar</th>
                    <th className="px-6 py-4">Tanggal Menginap</th>
                    <th className="px-6 py-4">Total Biaya</th>
                    <th className="px-6 py-4">Status Booking</th>
                    <th className="px-6 py-4">Status Bayar</th>
                    <th className="px-6 py-4 text-center">Aksi Operasional</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-heritage-gold-400/10">
                  {bookings.map((booking) => {
                    const payment = booking.payments[0];
                    const isConfirmed = booking.status === "confirmed";
                    const isCheckedIn = booking.status === "checked_in";

                    return (
                      <tr key={booking.id} className="hover:bg-heritage-cream-50/50">
                        <td className="px-6 py-4 font-bold">#{booking.id}</td>
                        <td className="px-6 py-4">
                          <span className="font-bold block">{booking.guests?.name}</span>
                          <span className="text-xs text-heritage-green-800/60 block">{booking.guests?.email}</span>
                        </td>
                        <td className="px-6 py-4 font-semibold">
                          Kamar {booking.rooms?.room_number} <br />
                          <span className="text-[10px] text-heritage-green-850 font-normal">
                            {booking.rooms?.room_types?.name}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-xs">
                          {new Date(booking.check_in).toLocaleDateString("id-ID")} - <br />
                          {new Date(booking.check_out).toLocaleDateString("id-ID")}
                        </td>
                        <td className="px-6 py-4 font-bold">{formatCurrency(Number(booking.total_price))}</td>
                        <td className="px-6 py-4 uppercase text-xs">
                          <span
                            className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                              booking.status === "confirmed"
                                ? "bg-green-100 text-green-800"
                                : booking.status === "checked_in"
                                ? "bg-blue-100 text-blue-800"
                                : booking.status === "checked_out"
                                ? "bg-slate-100 text-slate-800"
                                : "bg-amber-100 text-amber-800"
                            }`}
                          >
                            {booking.status.replace("_", " ")}
                          </span>
                        </td>
                        <td className="px-6 py-4 uppercase text-xs font-semibold">
                          {payment?.payment_status === "paid" ? (
                            <span className="text-green-700">LUNAS</span>
                          ) : (
                            <span className="text-amber-700">PENDING</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex justify-center gap-2">
                            {isAdmin ? (
                              <>
                                {/* Check-In Action Button */}
                                {isConfirmed && (
                                  <button
                                    onClick={() => handleBookingAction(booking.id, "check-in")}
                                    disabled={actionLoading !== null}
                                    className="bg-heritage-green-800 hover:bg-heritage-green-900 text-heritage-gold-100 text-xs font-bold px-3 py-1.5 rounded transition-all"
                                  >
                                    {actionLoading === booking.id ? "..." : "Check-In"}
                                  </button>
                                )}

                                {/* Check-Out Action Button */}
                                {isCheckedIn && (
                                  <button
                                    onClick={() => handleBookingAction(booking.id, "check-out")}
                                    disabled={actionLoading !== null}
                                    className="bg-heritage-gold-400 hover:bg-heritage-gold-500 text-heritage-green-900 text-xs font-bold px-3 py-1.5 rounded transition-all"
                                  >
                                    {actionLoading === booking.id ? "..." : "Check-Out"}
                                  </button>
                                )}

                                {/* Cancel Button */}
                                {(booking.status === "pending" || booking.status === "confirmed") && (
                                  <button
                                    onClick={() => handleBookingAction(booking.id, "cancel")}
                                    disabled={actionLoading !== null}
                                    className="text-rose-600 hover:text-rose-800 text-xs font-bold px-2.5 py-1.5 rounded hover:bg-rose-50 transition-colors"
                                  >
                                    Batal
                                  </button>
                                )}

                                {!isConfirmed && !isCheckedIn && booking.status !== "pending" && (
                                  <span className="text-xs text-heritage-green-800/40 italic">- Selesai -</span>
                                )}
                              </>
                            ) : (
                              <span className="text-xs text-heritage-green-800/40 italic">Hanya Pantau</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 3. TAB INVENTORI KAMAR (CRUD Rooms & Room Types) */}
        {activeTab === "rooms" && (
          <div className="space-y-8 animate-fade-in">
            {/* Room Types CRUD */}
            <div className="bg-white rounded-lg border border-heritage-gold-400/10 shadow p-6">
              <div className="flex justify-between items-center border-b border-heritage-gold-400/10 pb-4 mb-6">
                <h3 className="font-serif text-2xl font-bold text-heritage-green-950">
                  Master Tipe Kamar (Room Types)
                </h3>
                {isAdmin && (
                  <button
                    onClick={() => {
                      setEditingType(null);
                      setTypeForm({ name: "", description: "", price: "", foto_url: "" });
                      setFormError(null);
                      setShowTypeModal(true);
                    }}
                    className="bg-heritage-green-800 hover:bg-heritage-green-900 text-heritage-gold-100 text-xs font-bold px-4 py-2 rounded shadow flex items-center gap-1.5"
                  >
                    <Plus className="h-4 w-4" />
                    Tambah Tipe
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {roomTypes.map((type) => (
                  <div key={type.id} className="border border-heritage-gold-400/20 rounded-lg overflow-hidden flex flex-col justify-between bg-heritage-cream-50/20 shadow-sm">
                    <div
                      className="h-32 bg-cover bg-center"
                      style={{
                        backgroundImage: `url('${type.foto_url || "https://images.unsplash.com/photo-1618773928121-c32242e63f39?auto=format&fit=crop&q=80&w=400"}')`,
                      }}
                    />
                    <div className="p-4 space-y-2 flex-grow">
                      <h4 className="font-serif text-lg font-bold text-heritage-green-950">{type.name}</h4>
                      <p className="text-xs text-heritage-green-900/60 line-clamp-3 leading-relaxed">{type.description}</p>
                      <p className="text-sm font-bold text-heritage-green-950">{formatCurrency(Number(type.price))} / malam</p>
                    </div>
                    {isAdmin && (
                      <div className="p-4 bg-heritage-cream-100/50 border-t border-heritage-gold-400/10 flex justify-end gap-2">
                        <button
                          onClick={() => {
                            setEditingType(type);
                            setTypeForm({
                              name: type.name,
                              description: type.description,
                              price: String(type.price),
                              foto_url: type.foto_url || "",
                            });
                            setFormError(null);
                            setShowTypeModal(true);
                          }}
                          className="text-heritage-green-900 hover:text-heritage-gold-500"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteType(type.id)}
                          className="text-rose-600 hover:text-rose-800"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Rooms CRUD Grid */}
            <div className="bg-white rounded-lg border border-heritage-gold-400/10 shadow p-6">
              <div className="flex justify-between items-center border-b border-heritage-gold-400/10 pb-4 mb-6">
                <h3 className="font-serif text-2xl font-bold text-heritage-green-950">
                  Kamar Fisik (Rooms)
                </h3>
                {isAdmin && (
                  <button
                    onClick={() => {
                      setEditingRoom(null);
                      setRoomForm({
                        room_number: "",
                        room_type_id: roomTypes[0]?.id ? String(roomTypes[0].id) : "",
                        status: "available",
                      });
                      setFormError(null);
                      setShowRoomModal(true);
                    }}
                    className="bg-heritage-green-800 hover:bg-heritage-green-900 text-heritage-gold-100 text-xs font-bold px-4 py-2 rounded shadow flex items-center gap-1.5"
                  >
                    <Plus className="h-4 w-4" />
                    Tambah Kamar
                  </button>
                )}
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left text-heritage-green-950">
                  <thead className="text-xs font-bold text-heritage-green-800/70 uppercase tracking-wider bg-heritage-cream-100/55 border-b border-heritage-gold-400/15">
                    <tr>
                      <th className="px-6 py-4">Nomor Kamar</th>
                      <th className="px-6 py-4">Tipe Kamar</th>
                      <th className="px-6 py-4">Harga Kamar</th>
                      <th className="px-6 py-4">Status Fisik</th>
                      <th className="px-6 py-4 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-heritage-gold-400/10">
                    {rooms.map((room) => (
                      <tr key={room.id} className="hover:bg-heritage-cream-50/50">
                        <td className="px-6 py-4 font-bold text-lg">Kamar {room.room_number}</td>
                        <td className="px-6 py-4 font-semibold">{room.room_types?.name}</td>
                        <td className="px-6 py-4 font-semibold">{formatCurrency(Number(room.room_types?.price))}</td>
                        <td className="px-6 py-4">
                          <span
                            className={`px-2.5 py-1 rounded text-xs font-bold uppercase tracking-wider ${
                              room.status === "available"
                                ? "bg-green-50 text-green-700 border border-green-200"
                                : room.status === "occupied"
                                ? "bg-blue-50 text-blue-700 border border-blue-200"
                                : "bg-amber-50 text-amber-700 border border-amber-200"
                            }`}
                          >
                            {room.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-3">
                            {isAdmin ? (
                              <>
                                <button
                                  onClick={() => {
                                    setEditingRoom(room);
                                    setRoomForm({
                                      room_number: room.room_number,
                                      room_type_id: String(room.room_type_id),
                                      status: room.status,
                                    });
                                    setFormError(null);
                                    setShowRoomModal(true);
                                  }}
                                  className="text-heritage-green-900 hover:text-heritage-gold-500"
                                >
                                  <Edit className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteRoom(room.id)}
                                  className="text-rose-600 hover:text-rose-800"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </>
                            ) : (
                              <span className="text-xs text-heritage-green-800/40 italic">-</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* 4. TAB MENU RESTORAN CRUD */}
        {activeTab === "menus" && (
          <div className="bg-white rounded-lg border border-heritage-gold-400/10 shadow p-6 animate-fade-in">
            <div className="flex justify-between items-center border-b border-heritage-gold-400/10 pb-4 mb-6">
              <h3 className="font-serif text-2xl font-bold text-heritage-green-950">
                Menu Makanan Restoran (Master Data)
              </h3>
              {isAdmin && (
                <button
                  onClick={() => {
                    setEditingMenu(null);
                    setMenuForm({ name: "", description: "", price: "", foto_url: "" });
                    setFormError(null);
                    setShowMenuModal(true);
                  }}
                  className="bg-heritage-green-800 hover:bg-heritage-green-900 text-heritage-gold-100 text-xs font-bold px-4 py-2 rounded shadow flex items-center gap-1.5"
                >
                  <Plus className="h-4 w-4" />
                  Tambah Menu
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {menus.map((menu) => (
                <div key={menu.id} className="border border-heritage-gold-400/20 rounded-lg overflow-hidden flex flex-col justify-between bg-heritage-cream-50/20 shadow-sm">
                  <div
                    className="h-40 bg-cover bg-center"
                    style={{
                      backgroundImage: `url('${menu.foto_url || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=400"}')`,
                    }}
                  />
                  <div className="p-4 space-y-2 flex-grow">
                    <h4 className="font-serif text-lg font-bold text-heritage-green-950">{menu.name}</h4>
                    <p className="text-xs text-heritage-green-900/60 line-clamp-3 leading-relaxed">{menu.description}</p>
                    <p className="text-sm font-bold text-heritage-green-950">{formatCurrency(Number(menu.price))}</p>
                  </div>
                  {isAdmin && (
                    <div className="p-4 bg-heritage-cream-100/50 border-t border-heritage-gold-400/10 flex justify-end gap-2">
                      <button
                        onClick={() => {
                          setEditingMenu(menu);
                          setMenuForm({
                            name: menu.name,
                            description: menu.description,
                            price: String(menu.price),
                            foto_url: menu.foto_url || "",
                          });
                          setFormError(null);
                          setShowMenuModal(true);
                        }}
                        className="text-heritage-green-900 hover:text-heritage-gold-500"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteMenu(menu.id)}
                        className="text-rose-600 hover:text-rose-800"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* -------------------- CRUD MODALS -------------------- */}

      {/* ROOM MODAL */}
      {showRoomModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <form onSubmit={handleSaveRoom} className="bg-white rounded-lg shadow-2xl border border-heritage-gold-400/30 max-w-sm w-full overflow-hidden">
            <div className="bg-heritage-green-900 text-heritage-gold-100 p-5">
              <h3 className="font-serif text-xl font-bold">{editingRoom ? "Edit Kamar" : "Tambah Kamar Baru"}</h3>
            </div>
            <div className="p-5 space-y-4">
              {formError && <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs px-3 py-2 rounded">{formError}</div>}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-heritage-green-800 mb-1">Nomor Kamar</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., 101"
                  value={roomForm.room_number}
                  onChange={(e) => setRoomForm({ ...roomForm, room_number: e.target.value })}
                  className="w-full bg-heritage-cream-50 border border-heritage-gold-400/30 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-heritage-green-700"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-heritage-green-800 mb-1">Tipe Kamar</label>
                <select
                  value={roomForm.room_type_id}
                  onChange={(e) => setRoomForm({ ...roomForm, room_type_id: e.target.value })}
                  className="w-full bg-heritage-cream-50 border border-heritage-gold-400/30 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-heritage-green-700"
                >
                  {roomTypes.map((type) => (
                    <option key={type.id} value={type.id}>{type.name} ({formatCurrency(Number(type.price))})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-heritage-green-800 mb-1">Status Fisik</label>
                <select
                  value={roomForm.status}
                  onChange={(e) => setRoomForm({ ...roomForm, status: e.target.value })}
                  className="w-full bg-heritage-cream-50 border border-heritage-gold-400/30 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-heritage-green-700"
                >
                  <option value="available">available</option>
                  <option value="occupied">occupied</option>
                  <option value="maintenance">maintenance</option>
                </select>
              </div>
            </div>
            <div className="bg-heritage-cream-100 p-4 flex gap-3">
              <button type="button" onClick={() => setShowRoomModal(false)} className="flex-1 py-2 text-sm font-semibold border rounded hover:bg-heritage-cream-200">Batal</button>
              <button type="submit" className="flex-1 py-2 text-sm font-bold bg-heritage-green-800 hover:bg-heritage-green-900 text-heritage-gold-100 rounded shadow">Simpan</button>
            </div>
          </form>
        </div>
      )}

      {/* ROOM TYPE MODAL */}
      {showTypeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <form onSubmit={handleSaveType} className="bg-white rounded-lg shadow-2xl border border-heritage-gold-400/30 max-w-sm w-full overflow-hidden">
            <div className="bg-heritage-green-900 text-heritage-gold-100 p-5">
              <h3 className="font-serif text-xl font-bold">{editingType ? "Edit Tipe Kamar" : "Tambah Tipe Kamar"}</h3>
            </div>
            <div className="p-5 space-y-4">
              {formError && <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs px-3 py-2 rounded">{formError}</div>}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-heritage-green-800 mb-1">Nama Tipe</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Suite Room"
                  value={typeForm.name}
                  onChange={(e) => setTypeForm({ ...typeForm, name: e.target.value })}
                  className="w-full bg-heritage-cream-50 border border-heritage-gold-400/30 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-heritage-green-700"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-heritage-green-800 mb-1">Harga per Malam (IDR)</label>
                <input
                  type="number"
                  required
                  placeholder="e.g., 750000"
                  value={typeForm.price}
                  onChange={(e) => setTypeForm({ ...typeForm, price: e.target.value })}
                  className="w-full bg-heritage-cream-50 border border-heritage-gold-400/30 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-heritage-green-700"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-heritage-green-800 mb-1">Deskripsi</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Fasilitas kamar..."
                  value={typeForm.description}
                  onChange={(e) => setTypeForm({ ...typeForm, description: e.target.value })}
                  className="w-full bg-heritage-cream-50 border border-heritage-gold-400/30 rounded p-2 text-sm focus:outline-none focus:ring-1 focus:ring-heritage-green-700"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-heritage-green-800 mb-1">URL Foto (Unsplash)</label>
                <input
                  type="text"
                  placeholder="e.g., https://..."
                  value={typeForm.foto_url}
                  onChange={(e) => setTypeForm({ ...typeForm, foto_url: e.target.value })}
                  className="w-full bg-heritage-cream-50 border border-heritage-gold-400/30 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-heritage-green-700"
                />
              </div>
            </div>
            <div className="bg-heritage-cream-100 p-4 flex gap-3">
              <button type="button" onClick={() => setShowTypeModal(false)} className="flex-1 py-2 text-sm font-semibold border rounded hover:bg-heritage-cream-200">Batal</button>
              <button type="submit" className="flex-1 py-2 text-sm font-bold bg-heritage-green-800 hover:bg-heritage-green-900 text-heritage-gold-100 rounded shadow">Simpan</button>
            </div>
          </form>
        </div>
      )}

      {/* MENU RESTORAN MODAL */}
      {showMenuModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <form onSubmit={handleSaveMenu} className="bg-white rounded-lg shadow-2xl border border-heritage-gold-400/30 max-w-sm w-full overflow-hidden">
            <div className="bg-heritage-green-900 text-heritage-gold-100 p-5">
              <h3 className="font-serif text-xl font-bold">{editingMenu ? "Edit Menu Makanan" : "Tambah Menu Makanan"}</h3>
            </div>
            <div className="p-5 space-y-4">
              {formError && <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs px-3 py-2 rounded">{formError}</div>}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-heritage-green-800 mb-1">Nama Menu</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Nasi Goreng Gila"
                  value={menuForm.name}
                  onChange={(e) => setMenuForm({ ...menuForm, name: e.target.value })}
                  className="w-full bg-heritage-cream-50 border border-heritage-gold-400/30 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-heritage-green-700"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-heritage-green-800 mb-1">Harga (IDR)</label>
                <input
                  type="number"
                  required
                  placeholder="e.g., 35000"
                  value={menuForm.price}
                  onChange={(e) => setMenuForm({ ...menuForm, price: e.target.value })}
                  className="w-full bg-heritage-cream-50 border border-heritage-gold-400/30 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-heritage-green-700"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-heritage-green-800 mb-1">Deskripsi</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Bahan rempah-rempah..."
                  value={menuForm.description}
                  onChange={(e) => setMenuForm({ ...menuForm, description: e.target.value })}
                  className="w-full bg-heritage-cream-50 border border-heritage-gold-400/30 rounded p-2 text-sm focus:outline-none focus:ring-1 focus:ring-heritage-green-700"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-heritage-green-800 mb-1">URL Foto (Unsplash)</label>
                <input
                  type="text"
                  placeholder="e.g., https://..."
                  value={menuForm.foto_url}
                  onChange={(e) => setMenuForm({ ...menuForm, foto_url: e.target.value })}
                  className="w-full bg-heritage-cream-50 border border-heritage-gold-400/30 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-heritage-green-700"
                />
              </div>
            </div>
            <div className="bg-heritage-cream-100 p-4 flex gap-3">
              <button type="button" onClick={() => setShowMenuModal(false)} className="flex-1 py-2 text-sm font-semibold border rounded hover:bg-heritage-cream-200">Batal</button>
              <button type="submit" className="flex-1 py-2 text-sm font-bold bg-heritage-green-800 hover:bg-heritage-green-900 text-heritage-gold-100 rounded shadow">Simpan</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
