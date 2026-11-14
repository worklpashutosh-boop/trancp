import { Mail, MapPin, Phone } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import type { AppView } from '../types';

interface InfoViewProps {
  page: 'about' | 'contact' | 'privacy' | 'terms' | 'returns' | 'shipping' | 'faqs';
  onNavigate: (view: AppView) => void;
}

const INFO_CONTENT: Record<
  InfoViewProps['page'],
  { kicker: string; title: string; sections: Array<{ heading: string; body: string }> }
> = {
  about: {
    kicker: 'Our Heritage & Philosophy',
    title: 'About IZHO',
    sections: [
      {
        heading: 'Curated Indian & Contemporary Luxury',
        body: 'IZHO brings together master handloom weavers, contemporary tailors, fine jewellery artisans, and clean botanical beauty houses under one editorial storefront. From pure Banarasi katan silks and shadow-work Chanderi kurtis to architectural linen suiting and Italian-leather footwear, every piece is vetted for material integrity and timeless silhouette.',
      },
      {
        heading: 'Atelier Standards',
        body: 'Headquartered in Maharashtra with Pan-India express fulfillment, IZHO partners directly with craft clusters and boutique designers so you receive authentic provenance, transparent pricing, and attentive concierge care.',
      },
    ],
  },
  contact: {
    kicker: 'Concierge & Store Support',
    title: 'Contact Us',
    sections: [
      {
        heading: 'Direct Concierge Desk',
        body: 'Our styling and order concierge team is available Monday to Saturday, 10:00 AM – 7:00 PM IST. Reach us directly by phone at +91 8788632212 or email kolhapurpan1@gmail.com for sizing advice, bridal trousseau curation, or order assistance.',
      },
    ],
  },
  privacy: {
    kicker: 'Data Protection',
    title: 'Privacy Policy',
    sections: [
      {
        heading: 'Information We Collect',
        body: 'IZHO collects only the personal information required to process your orders, manage saved delivery addresses, personalize your wishlist, and provide order tracking notifications. We never sell or rent your personal contact details to third-party advertisers.',
      },
      {
        heading: 'Payment Security',
        body: 'Online payments are processed via Razorpay’s PCI-DSS compliant 256-bit SSL gateway. IZHO does not store your raw card numbers, CVV, or UPI PIN credentials on our servers.',
      },
    ],
  },
  terms: {
    kicker: 'Marketplace Guidelines',
    title: 'Terms & Conditions',
    sections: [
      {
        heading: 'Orders & Pricing',
        body: 'All prices listed on IZHO are in Indian Rupees (INR) and inclusive of applicable GST. Promotional coupon codes apply only to eligible cart values prior to checkout completion.',
      },
      {
        heading: 'Intellectual Property & Authenticity',
        body: 'All brand marks, curated photography, and garment descriptions on IZHO are protected. Every product sold is guaranteed authentic and shipped with original atelier tags intact.',
      },
    ],
  },
  returns: {
    kicker: 'Customer Assurance',
    title: 'Return & Refund Policy',
    sections: [
      {
        heading: '14-Day Hassle-Free Returns & Exchanges',
        body: 'Eligible unworn garments, footwear, and accessories with original tags and packaging may be returned or exchanged within 14 days of delivery. Reverse pickup is complimentary across serviceable PIN codes.',
      },
      {
        heading: 'Refund Timelines',
        body: 'Prepaid Razorpay orders are refunded to the original payment source within 3–5 business days after quality inspection. Cash on Delivery refunds are credited via instant UPI or bank transfer.',
      },
    ],
  },
  shipping: {
    kicker: 'Pan-India Logistics',
    title: 'Shipping Policy',
    sections: [
      {
        heading: 'Complimentary Express Shipping',
        body: 'All orders of ₹1,999 or above qualify for complimentary insured express shipping. Orders below ₹1,999 carry a flat ₹99 courier fee.',
      },
      {
        heading: 'Dispatch & Delivery Windows',
        body: 'In-stock pieces ship within 24–48 hours. Maharashtra priority PIN codes deliver in 1–2 business days; metro cities in 2–3 business days; and rest of India in 3–5 business days.',
      },
    ],
  },
  faqs: {
    kicker: 'Helpful Answers',
    title: 'Frequently Asked Questions',
    sections: [
      {
        heading: 'How do I check delivery speed to my PIN code?',
        body: 'Every IZHO product page includes an instant PIN Code Delivery Checker. Enter your 6-digit PIN code to confirm express delivery timelines and Cash on Delivery eligibility.',
      },
      {
        heading: 'What payment methods are accepted?',
        body: 'We support Razorpay (UPI, Google Pay, PhonePe, Credit/Debit Cards, Netbanking) as well as Cash on Delivery across India.',
      },
      {
        heading: 'How can I track my order?',
        body: 'Click "Track Order" in the top navigation bar or footer and enter your Order Number (e.g. IZH-2026-8410) for real-time courier updates.',
      },
    ],
  },
};

export function InfoView({ page, onNavigate }: InfoViewProps) {
  const [sent, setSent] = useState(false);
  const content = INFO_CONTENT[page];

  const handleInquiry = (e: FormEvent) => {
    e.preventDefault();
    setSent(true);
  };

  return (
    <main className="mx-auto max-w-4xl px-4 py-12 sm:px-8">
      <div className="border-b border-[#EAE3E0] pb-6">
        <p className="text-xs font-semibold tracking-[0.2em] text-[#D62865] uppercase">
          {content.kicker}
        </p>
        <h1 className="mt-2 font-editorial text-4xl font-semibold text-[#181415]">
          {content.title}
        </h1>
      </div>

      <div className="mt-8 space-y-8">
        {content.sections.map((sec, idx) => (
          <section key={idx}>
            <h2 className="font-editorial text-2xl font-semibold text-[#181415]">{sec.heading}</h2>
            <p className="mt-2.5 text-sm leading-relaxed text-[#4A4143]">{sec.body}</p>
          </section>
        ))}

        {page === 'contact' && (
          <div className="grid grid-cols-1 gap-8 border-t border-[#EAE3E0] pt-8 md:grid-cols-2">
            <div className="space-y-4 bg-[#FAF8F7] border border-[#EAE3E0] p-6">
              <h3 className="text-xs font-semibold tracking-wider text-[#181415] uppercase">
                IZHO Contact Information
              </h3>
              <p className="flex items-center gap-3 text-sm text-[#181415]">
                <Phone className="h-4 w-4 text-[#D62865]" />
                <span>+91 8788632212</span>
              </p>
              <p className="flex items-center gap-3 text-sm text-[#181415]">
                <Mail className="h-4 w-4 text-[#D62865]" />
                <span>kolhapurpan1@gmail.com</span>
              </p>
              <p className="flex items-center gap-3 text-sm text-[#4A4143]">
                <MapPin className="h-4 w-4 text-[#D62865]" />
                <span>IZHO Atelier &amp; Dispatch Studio, Kolhapur, Maharashtra</span>
              </p>
            </div>

            <form onSubmit={handleInquiry} className="space-y-3 border border-[#EAE3E0] p-6">
              <h3 className="text-xs font-semibold tracking-wider text-[#181415] uppercase">
                Send a Concierge Message
              </h3>
              {sent ? (
                <p className="text-sm font-medium text-[#16A34A]">
                  Thank you! Our team will respond to your inquiry shortly at your email or +91 8788632212.
                </p>
              ) : (
                <>
                  <input
                    type="text"
                    required
                    placeholder="Your Name"
                    className="w-full border border-[#E2D8D5] px-3 py-2 text-sm"
                  />
                  <input
                    type="email"
                    required
                    placeholder="Your Email"
                    className="w-full border border-[#E2D8D5] px-3 py-2 text-sm"
                  />
                  <textarea
                    required
                    rows={3}
                    placeholder="How can we assist you?"
                    className="w-full border border-[#E2D8D5] px-3 py-2 text-sm"
                  />
                  <button
                    type="submit"
                    className="w-full bg-[#181415] py-2.5 text-xs font-semibold tracking-wider text-white uppercase hover:bg-[#D62865]"
                  >
                    Send Inquiry
                  </button>
                </>
              )}
            </form>
          </div>
        )}
      </div>

      <div className="mt-12 border-t border-[#EAE3E0] pt-6">
        <button
          type="button"
          onClick={() => onNavigate({ name: 'home' })}
          className="text-xs font-semibold tracking-wider text-[#D62865] uppercase hover:underline"
        >
          ← Return to IZHO Storefront
        </button>
      </div>
    </main>
  );
}
