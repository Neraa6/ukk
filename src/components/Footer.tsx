import Link from "next/link";
import { Hotel, Mail, Phone, MapPin, Compass } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-heritage-green-900 border-t border-heritage-gold-400/20 text-heritage-cream-100/80 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand Col */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Hotel className="h-6 w-6 text-heritage-gold-400" />
              <span className="font-serif text-xl font-bold tracking-wide text-heritage-gold-100">
                Neraa<span className="text-heritage-gold-400">Hotel</span>
              </span>
            </div>
            <p className="text-sm text-heritage-cream-100/60 leading-relaxed font-sans">
              Menghadirkan keindahan, kehangatan, dan keagungan budaya Nusantara dalam pelayanan perhotelan berstandar internasional.
            </p>
          </div>

          {/* Links Col */}
          <div className="space-y-4">
            <h4 className="font-serif text-lg font-semibold text-heritage-gold-400">Navigasi</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/" className="hover:text-heritage-gold-400 transition-colors duration-250">
                  Beranda
                </Link>
              </li>
              <li>
                <Link href="/catalog" className="hover:text-heritage-gold-400 transition-colors duration-250">
                  Kamar & Reservasi
                </Link>
              </li>
              <li>
                <Link href="/login" className="hover:text-heritage-gold-400 transition-colors duration-250">
                  Staff Login
                </Link>
              </li>
            </ul>
          </div>

          {/* Features Col */}
          <div className="space-y-4">
            <h4 className="font-serif text-lg font-semibold text-heritage-gold-400">Fasilitas Masterpiece</h4>
            <ul className="space-y-2 text-sm text-heritage-cream-100/60">
              <li className="flex items-center gap-2">
                <Compass className="h-4 w-4 text-heritage-gold-400/80" />
                <span>Warisan Kuliner NeraaResto</span>
              </li>
              <li className="flex items-center gap-2">
                <Compass className="h-4 w-4 text-heritage-gold-400/80" />
                <span>Kolam Renang Keraton</span>
              </li>
              <li className="flex items-center gap-2">
                <Compass className="h-4 w-4 text-heritage-gold-400/80" />
                <span>Lounge Heritage Klasik</span>
              </li>
            </ul>
          </div>

          {/* Contact Col */}
          <div className="space-y-4">
            <h4 className="font-serif text-lg font-semibold text-heritage-gold-400">Hubungi Kami</h4>
            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-2.5">
                <MapPin className="h-5 w-5 text-heritage-gold-400 shrink-0" />
                <span className="text-heritage-cream-100/60 leading-relaxed">
                  Jl. Malioboro No. 206, Daerah Istimewa Yogyakarta, Indonesia
                </span>
              </li>
              <li className="flex items-center gap-2.5">
                <Phone className="h-4 w-4 text-heritage-gold-400 shrink-0" />
                <span className="text-heritage-cream-100/60">+62 274 555 1234</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Mail className="h-4 w-4 text-heritage-gold-400 shrink-0" />
                <span className="text-heritage-cream-100/60">info@neraahotel.com</span>
              </li>
            </ul>
          </div>
        </div>

        <hr className="border-heritage-gold-400/10 my-8" />

        <div className="flex flex-col sm:flex-row justify-between items-center text-xs text-heritage-cream-100/40 gap-4">
          <p>&copy; 2026 NeraaHotel. Seluruh hak cipta dilindungi.</p>
          <p className="font-serif italic tracking-wider text-heritage-gold-400/80">Elegant Heritage Hospitality</p>
        </div>
      </div>
    </footer>
  );
}
