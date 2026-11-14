import { Mail, Phone, ShieldCheck } from 'lucide-react';
import type { AppView } from '../types';

interface FooterProps {
  onNavigate: (view: AppView) => void;
}

export function Footer({ onNavigate }: FooterProps) {
  return (
    <footer className="border-t border-[#EAE3E0] bg-[#181415] text-white">
      <div className="mx-auto max-w-[1440px] px-4 py-14 sm:px-8">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-4">
          <div>
            <span className="font-editorial text-3xl font-bold tracking-[0.16em] text-white">
              IZHO
            </span>
            <p className="mt-3 text-sm leading-relaxed text-[#C7BFC1]">
              Curated Indian heritage weaves, contemporary tailoring, fine jewellery, footwear, and living essentials crafted for modern wardrobes.
            </p>
            <div className="mt-5 space-y-2 text-xs text-[#E5DCDF]">
              <p className="flex items-center gap-2">
                <Phone className="h-3.5 w-3.5 text-[#F6B2C8]" />
                <a href="tel:8788632212" className="hover:text-white tabular-nums">
                  +91 8788632212
                </a>
              </p>
              <p className="flex items-center gap-2">
                <Mail className="h-3.5 w-3.5 text-[#F6B2C8]" />
                <a href="mailto:kolhapurpan1@gmail.com" className="hover:text-white">
                  kolhapurpan1@gmail.com
                </a>
              </p>
            </div>
          </div>

          <div>
            <h3 className="text-xs font-semibold tracking-[0.18em] text-[#F6B2C8] uppercase">
              Shop Departments
            </h3>
            <ul className="mt-4 space-y-2.5 text-sm text-[#C7BFC1]">
              {['Women', 'Men', 'Kids', 'Beauty', 'Footwear', 'Jewellery', 'Accessories', 'Home & Living'].map(
                (cat) => (
                  <li key={cat}>
                    <button
                      type="button"
                      onClick={() => onNavigate({ name: 'catalog', category: cat })}
                      className="hover:text-white transition-colors"
                    >
                      {cat}
                    </button>
                  </li>
                )
              )}
            </ul>
          </div>

          <div>
            <h3 className="text-xs font-semibold tracking-[0.18em] text-[#F6B2C8] uppercase">
              Customer Care &amp; Policies
            </h3>
            <ul className="mt-4 space-y-2.5 text-sm text-[#C7BFC1]">
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate({ name: 'info', page: 'about' })}
                  className="hover:text-white transition-colors"
                >
                  About IZHO
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate({ name: 'info', page: 'contact' })}
                  className="hover:text-white transition-colors"
                >
                  Contact Us
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate({ name: 'info', page: 'shipping' })}
                  className="hover:text-white transition-colors"
                >
                  Shipping Policy
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate({ name: 'info', page: 'returns' })}
                  className="hover:text-white transition-colors"
                >
                  Return &amp; Refund Policy
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate({ name: 'info', page: 'faqs' })}
                  className="hover:text-white transition-colors"
                >
                  FAQs
                </button>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-xs font-semibold tracking-[0.18em] text-[#F6B2C8] uppercase">
              Legal &amp; Services
            </h3>
            <ul className="mt-4 space-y-2.5 text-sm text-[#C7BFC1]">
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate({ name: 'track' })}
                  className="hover:text-white transition-colors"
                >
                  Track Your Order
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate({ name: 'info', page: 'privacy' })}
                  className="hover:text-white transition-colors"
                >
                  Privacy Policy
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate({ name: 'info', page: 'terms' })}
                  className="hover:text-white transition-colors"
                >
                  Terms &amp; Conditions
                </button>
              </li>
            </ul>
            <div className="mt-6 border border-white/15 bg-white/5 p-4 text-xs text-[#D5CCC9]">
              <p className="flex items-center gap-2 font-semibold text-white">
                <ShieldCheck className="h-4 w-4 text-[#F6B2C8]" />
                100% Authentic &amp; Secure
              </p>
              <p className="mt-1 leading-relaxed">
                Protected by Razorpay 256-bit SSL &amp; Pan-India Cash on Delivery.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-6 text-xs text-[#9C9194] sm:flex-row">
          <p>© {new Date().getFullYear()} IZHO Fashion Retail. All rights reserved.</p>
          <p>Support: +91 8788632212 · kolhapurpan1@gmail.com</p>
        </div>
      </div>
    </footer>
  );
}
