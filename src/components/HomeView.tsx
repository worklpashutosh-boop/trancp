import { ArrowRight, RotateCcw, ShieldCheck, Sparkles, Truck } from 'lucide-react';
import { useState } from 'react';
import type { AppView, Banner, Category, Product } from '../types';
import { ProductCard } from './ProductCard';

interface HomeViewProps {
  banners: Banner[];
  categories: Category[];
  products: Product[];
  wishlistIds: Set<number>;
  onNavigate: (view: AppView) => void;
  onToggleWishlist: (product: Product) => void;
  onQuickAdd: (product: Product) => void;
}

const COLLECTION_TABS: Array<{ key: Product['collection_tag']; label: string }> = [
  { key: 'Trending', label: 'Trending Now' },
  { key: 'Best Seller', label: 'Best Sellers' },
  { key: 'New Arrival', label: 'New Arrivals' },
  { key: 'Exclusive', label: 'Exclusive Edit' },
];

export function HomeView({
  banners,
  categories,
  products,
  wishlistIds,
  onNavigate,
  onToggleWishlist,
  onQuickAdd,
}: HomeViewProps) {
  const [activeCollection, setActiveCollection] = useState<Product['collection_tag']>('Trending');

  const heroBanner = banners.find((b) => b.placement === 'hero') || {
    title: 'The Atelier Festive & Tailored Edit',
    subtitle:
      'Handwoven Banarasi silks, architectural linen tailoring, and fine polki craftsmanship curated for modern wardrobes.',
    cta_text: 'Explore Collection',
    cta_link: 'Women',
    image_url: '/src/assets/images/hero_izho_atelier_1794649860908.jpg',
  };

  const promoBanner = banners.find((b) => b.placement === 'promo') || {
    title: 'Artisanal Handloom & Heritage Weaves',
    subtitle:
      'Enjoy up to 30% off limited-run Chanderi kurtis, organza sarees, and 22k gold-plated fine jewellery. Use code FESTIVE20.',
    cta_text: 'Shop Heritage Edit',
    cta_link: 'Sarees',
    image_url: '/src/assets/images/promo_festive_silk_1794649861982.jpg',
  };

  const collectionProducts = products.filter((p) => p.collection_tag === activeCollection);
  const displayProducts =
    collectionProducts.length >= 4
      ? collectionProducts.slice(0, 8)
      : [...collectionProducts, ...products.filter((p) => p.collection_tag !== activeCollection)].slice(0, 8);

  return (
    <main className="bg-white">
      {/* 1. Hero Campaign Banner */}
      <section className="relative mx-auto max-w-[1440px] px-0 sm:px-8 sm:pt-6">
        <div className="relative h-[480px] sm:h-[560px] lg:h-[620px] w-full overflow-hidden bg-[#EFEAE7]">
          <img
            src={heroBanner.image_url}
            alt={heroBanner.title}
            referrerPolicy="no-referrer"
            className="h-full w-full object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/30 to-transparent" />

          <div className="absolute inset-x-0 bottom-0 p-6 sm:p-12 lg:p-16">
            <div className="max-w-2xl">
              <p className="text-xs font-medium tracking-[0.22em] text-[#F9D5E1] uppercase">
                IZHO Autumn / Winter Atelier
              </p>
              <h1
                className="mt-3 font-editorial text-4xl sm:text-5xl lg:text-6xl font-semibold leading-[1.06] text-white"
                style={{ textWrap: 'balance' }}
              >
                {heroBanner.title}
              </h1>
              <p className="mt-4 max-w-xl text-sm sm:text-base leading-relaxed text-white/90">
                {heroBanner.subtitle}
              </p>
              <div className="mt-7 flex flex-wrap items-center gap-4">
                <button
                  type="button"
                  onClick={() =>
                    onNavigate({
                      name: 'catalog',
                      category: heroBanner.cta_link || 'All',
                    })
                  }
                  className="inline-flex items-center gap-2.5 bg-white px-7 py-3.5 text-xs font-semibold tracking-wider text-[#181415] uppercase transition-colors hover:bg-[#D62865] hover:text-white"
                >
                  <span>{heroBanner.cta_text}</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate({ name: 'catalog', collection: 'Exclusive' })}
                  className="inline-flex items-center gap-2 border border-white/60 bg-black/25 px-6 py-3.5 text-xs font-semibold tracking-wider text-white uppercase backdrop-blur-xs transition-colors hover:bg-white hover:text-[#181415]"
                >
                  <span>View Exclusive Edit</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Shop by Category Strip */}
      <section className="mx-auto max-w-[1440px] px-4 py-14 sm:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[#EAE3E0] pb-4">
          <div>
            <p className="text-xs font-medium tracking-[0.18em] text-[#D62865] uppercase">
              Curated Departments
            </p>
            <h2 className="mt-1 font-editorial text-3xl sm:text-4xl font-semibold text-[#181415]">
              Shop by Category
            </h2>
          </div>
          <button
            type="button"
            onClick={() => onNavigate({ name: 'catalog', category: 'All' })}
            className="inline-flex items-center gap-1.5 text-xs font-semibold tracking-wider text-[#181415] uppercase hover:text-[#D62865] transition-colors"
          >
            <span>Browse Full Catalogue</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-7">
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => onNavigate({ name: 'catalog', subcategory: cat.name })}
              className="group flex flex-col text-left focus-visible:outline-2 focus-visible:outline-[#D62865]"
            >
              <div className="aspect-[3/4] w-full overflow-hidden bg-[#FAF8F7]">
                <img
                  src={cat.image}
                  alt={cat.name}
                  referrerPolicy="no-referrer"
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
              </div>
              <span className="mt-2.5 text-sm font-medium text-[#181415] group-hover:text-[#D62865] transition-colors">
                {cat.name}
              </span>
              <span className="text-xs text-[#6D6366]">{cat.parent_group}</span>
            </button>
          ))}
        </div>
      </section>

      {/* 3. Trending, Best Sellers, New Arrivals & Exclusive Collections */}
      <section className="bg-[#FAF8F7] py-16">
        <div className="mx-auto max-w-[1440px] px-4 sm:px-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-medium tracking-[0.18em] text-[#D62865] uppercase">
                The IZHO Edit
              </p>
              <h2 className="mt-1 font-editorial text-3xl sm:text-4xl font-semibold text-[#181415]">
                Curated Style Selections
              </h2>
            </div>

            <div
              role="tablist"
              aria-label="Collection Filters"
              className="flex flex-wrap items-center gap-1.5 border border-[#EAE3E0] bg-white p-1"
            >
              {COLLECTION_TABS.map((tab) => {
                const active = activeCollection === tab.key;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => setActiveCollection(tab.key)}
                    className={`px-4 py-2 text-xs font-semibold tracking-wide transition-colors whitespace-nowrap shrink-0 ${
                      active
                        ? 'bg-[#181415] text-white'
                        : 'text-[#5C5356] hover:text-[#181415]'
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-8 grid grid-cols-2 gap-x-4 gap-y-8 sm:gap-x-6 lg:grid-cols-4">
            {displayProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                isWishlisted={wishlistIds.has(product.id)}
                onToggleWishlist={onToggleWishlist}
                onOpenProduct={(slug) => onNavigate({ name: 'product', idOrSlug: slug })}
                onQuickAdd={onQuickAdd}
              />
            ))}
          </div>

          <div className="mt-10 flex justify-center">
            <button
              type="button"
              onClick={() => onNavigate({ name: 'catalog', collection: activeCollection })}
              className="inline-flex items-center gap-2 border border-[#181415] bg-white px-8 py-3.5 text-xs font-semibold tracking-wider text-[#181415] uppercase transition-colors hover:bg-[#181415] hover:text-white"
            >
              <span>View All {activeCollection} Pieces</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </section>

      {/* 4. Promotional Heritage Banner */}
      <section className="mx-auto max-w-[1440px] px-4 py-16 sm:px-8">
        <div className="grid grid-cols-1 items-stretch overflow-hidden bg-[#FDF2F5] lg:grid-cols-12">
          <div className="relative min-h-[300px] lg:col-span-7">
            <img
              src={promoBanner.image_url}
              alt={promoBanner.title}
              referrerPolicy="no-referrer"
              className="h-full w-full object-cover"
            />
          </div>
          <div className="flex flex-col justify-center p-8 sm:p-12 lg:col-span-5">
            <p className="text-xs font-semibold tracking-[0.2em] text-[#D62865] uppercase">
              Limited Season Privilege
            </p>
            <h2
              className="mt-3 font-editorial text-3xl sm:text-4xl font-semibold leading-tight text-[#181415]"
              style={{ textWrap: 'balance' }}
            >
              {promoBanner.title}
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-[#4A4143]">
              {promoBanner.subtitle}
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-[#EAD7DD] pt-6">
              <div>
                <p className="text-[11px] font-medium tracking-wider text-[#6D6366] uppercase">
                  Festive Privilege Code
                </p>
                <p className="mt-0.5 font-mono text-base font-semibold text-[#181415]">
                  FESTIVE20 · IZHO15
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  onNavigate({
                    name: 'catalog',
                    subcategory: promoBanner.cta_link || 'Sarees',
                  })
                }
                className="ml-auto inline-flex items-center gap-2 bg-[#D62865] px-6 py-3 text-xs font-semibold tracking-wider text-white uppercase transition-colors hover:bg-[#B81D53]"
              >
                <span>{promoBanner.cta_text}</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 5. IZHO Atelier Standards Strip */}
      <section className="border-t border-[#EAE3E0] bg-white py-12">
        <div className="mx-auto grid max-w-[1440px] grid-cols-1 gap-8 px-4 sm:grid-cols-2 lg:grid-cols-4 sm:px-8">
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center bg-[#FDF2F5] text-[#D62865]">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[#181415]">Verified Atelier Quality</h3>
              <p className="mt-1 text-xs leading-relaxed text-[#6D6366]">
                Every weave, garment, and jewel undergoes multi-point provenance inspection before dispatch.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center bg-[#FDF2F5] text-[#D62865]">
              <Truck className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[#181415]">Complimentary Express Delivery</h3>
              <p className="mt-1 text-xs leading-relaxed text-[#6D6366]">
                Free insured Pan-India courier shipping on all orders above ₹1,999 with real-time tracking.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center bg-[#FDF2F5] text-[#D62865]">
              <RotateCcw className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[#181415]">14-Day Easy Returns</h3>
              <p className="mt-1 text-xs leading-relaxed text-[#6D6366]">
                Seamless doorstep pickup for size exchanges or full refunds within 14 days of delivery.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center bg-[#FDF2F5] text-[#D62865]">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[#181415]">Razorpay & Cash on Delivery</h3>
              <p className="mt-1 text-xs leading-relaxed text-[#6D6366]">
                256-bit encrypted UPI, cards, netbanking checkout or convenient Cash on Delivery across India.
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
