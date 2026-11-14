import {
  Check,
  ChevronRight,
  Heart,
  MapPin,
  Minus,
  Plus,
  ShieldCheck,
  ShoppingBag,
  Star,
  Truck,
} from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import type { AppView, Product, Review, User } from '../types';
import { apiFetch, formatINR } from '../utils/api';
import { ProductCard } from './ProductCard';

interface ProductDetailViewProps {
  idOrSlug: string;
  user: User | null;
  wishlistIds: Set<number>;
  onNavigate: (view: AppView) => void;
  onAddToCart: (product: Product, size: string, color: string, quantity: number, openDrawer?: boolean) => void;
  onToggleWishlist: (product: Product) => void;
  onRequireAuth: () => void;
}

export function ProductDetailView({
  idOrSlug,
  user,
  wishlistIds,
  onNavigate,
  onAddToCart,
  onToggleWishlist,
  onRequireAuth,
}: ProductDetailViewProps) {
  const [product, setProduct] = useState<Product | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [related, setRelated] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const [activeImageIdx, setActiveImageIdx] = useState(0);
  const [selectedSize, setSelectedSize] = useState('');
  const [selectedColor, setSelectedColor] = useState('');
  const [quantity, setQuantity] = useState(1);

  const [pincode, setPincode] = useState('');
  const [pincodeResult, setPincodeResult] = useState<any>(null);
  const [pincodeError, setPincodeError] = useState('');

  const [reviewRating, setReviewRating] = useState(5);
  const [reviewTitle, setReviewTitle] = useState('');
  const [reviewComment, setReviewComment] = useState('');
  const [reviewMsg, setReviewMsg] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    setActiveImageIdx(0);
    setQuantity(1);
    setPincodeResult(null);
    setPincodeError('');

    apiFetch<{ product: Product; reviews: Review[]; related: Product[] }>(`/api/products/${idOrSlug}`)
      .then((res) => {
        if (!active) return;
        setProduct(res.product);
        setReviews(res.reviews);
        setRelated(res.related);
        setSelectedSize(res.product.sizes[0] || 'Standard');
        setSelectedColor(res.product.colors[0]?.name || 'Default');

        // Dynamic SEO title, meta description & JSON-LD Schema.org Product
        document.title = `${res.product.title} – ${res.product.brand} | IZHO`;
        const metaDesc = document.querySelector('meta[name="description"]');
        if (metaDesc) {
          metaDesc.setAttribute(
            'content',
            `Shop ${res.product.title} by ${res.product.brand} at ${formatINR(res.product.discounted_price)} (${res.product.discount_percent}% OFF) on IZHO.`
          );
        }
        let ldScript = document.getElementById('izho-product-jsonld');
        if (!ldScript) {
          ldScript = document.createElement('script');
          ldScript.id = 'izho-product-jsonld';
          ldScript.setAttribute('type', 'application/ld+json');
          document.head.appendChild(ldScript);
        }
        ldScript.textContent = JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'Product',
          name: res.product.title,
          brand: { '@type': 'Brand', name: res.product.brand },
          description: res.product.description,
          sku: res.product.sku,
          offers: {
            '@type': 'Offer',
            priceCurrency: 'INR',
            price: res.product.discounted_price,
            availability:
              res.product.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
          },
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: res.product.rating,
            reviewCount: Math.max(1, res.product.review_count),
          },
        });
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [idOrSlug]);

  const checkPincode = async (e: FormEvent) => {
    e.preventDefault();
    setPincodeError('');
    setPincodeResult(null);
    try {
      const res = await apiFetch(`/api/shipping/check-pincode?pincode=${encodeURIComponent(pincode)}`);
      setPincodeResult(res);
    } catch (err: any) {
      setPincodeError(err.message);
    }
  };

  const handleReviewSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) {
      onRequireAuth();
      return;
    }
    if (!product) return;
    try {
      const res = await apiFetch<{ reviews: Review[]; rating: number; review_count: number }>(
        `/api/products/${product.id}/reviews`,
        {
          method: 'POST',
          body: JSON.stringify({
            rating: reviewRating,
            title: reviewTitle,
            comment: reviewComment,
          }),
        }
      );
      setReviews(res.reviews);
      setProduct({ ...product, rating: res.rating, review_count: res.review_count });
      setReviewTitle('');
      setReviewComment('');
      setReviewMsg('Thank you! Your verified review has been published.');
    } catch (err: any) {
      setReviewMsg(err.message);
    }
  };

  if (loading) {
    return (
      <main className="mx-auto max-w-[1440px] px-4 py-12 sm:px-8">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 animate-pulse">
          <div className="aspect-[3/4] bg-[#F3ECEA] lg:col-span-7" />
          <div className="space-y-4 lg:col-span-5">
            <div className="h-4 w-28 bg-[#F3ECEA]" />
            <div className="h-10 w-3/4 bg-[#F3ECEA]" />
            <div className="h-6 w-1/2 bg-[#F3ECEA]" />
          </div>
        </div>
      </main>
    );
  }

  if (!product) {
    return (
      <main className="mx-auto max-w-[1440px] px-4 py-20 text-center sm:px-8">
        <h1 className="font-editorial text-3xl font-semibold text-[#181415]">Product not found</h1>
        <button
          type="button"
          onClick={() => onNavigate({ name: 'catalog', category: 'All' })}
          className="mt-6 bg-[#181415] px-6 py-3 text-xs font-semibold tracking-wider text-white uppercase"
        >
          Return to Catalogue
        </button>
      </main>
    );
  }

  const isWishlisted = wishlistIds.has(product.id);

  return (
    <main className="mx-auto max-w-[1440px] px-4 py-8 sm:px-8">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="mb-6 flex items-center gap-2 text-xs text-[#6D6366]">
        <button type="button" onClick={() => onNavigate({ name: 'home' })} className="hover:text-[#181415]">
          Home
        </button>
        <ChevronRight className="h-3.5 w-3.5" />
        <button
          type="button"
          onClick={() => onNavigate({ name: 'catalog', category: product.category })}
          className="hover:text-[#181415]"
        >
          {product.category}
        </button>
        <ChevronRight className="h-3.5 w-3.5" />
        <button
          type="button"
          onClick={() => onNavigate({ name: 'catalog', subcategory: product.subcategory })}
          className="hover:text-[#181415]"
        >
          {product.subcategory}
        </button>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="truncate text-[#181415] font-medium">{product.title}</span>
      </nav>

      {/* Contiguous Product Module */}
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-12">
        {/* Multi-Image Gallery Left */}
        <div className="lg:col-span-7">
          <div className="flex flex-col-reverse gap-4 sm:flex-row">
            <div className="flex gap-3 sm:w-20 sm:flex-col">
              {product.images.map((img, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setActiveImageIdx(idx)}
                  className={`aspect-[3/4] w-16 sm:w-full overflow-hidden border transition-all ${
                    activeImageIdx === idx
                      ? 'border-[#D62865] ring-1 ring-[#D62865]'
                      : 'border-[#EAE3E0] opacity-75 hover:opacity-100'
                  }`}
                >
                  <img
                    src={img}
                    alt={`${product.title} view ${idx + 1}`}
                    referrerPolicy="no-referrer"
                    className="h-full w-full object-cover"
                  />
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-hidden bg-[#FAF8F7]">
              <img
                src={product.images[activeImageIdx] || product.images[0]}
                alt={product.title}
                referrerPolicy="no-referrer"
                className="aspect-[3/4] w-full object-cover object-center"
              />
            </div>
          </div>
        </div>

        {/* Sticky Purchase Panel Right */}
        <div className="lg:col-span-5">
          <div className="lg:sticky lg:top-28 space-y-6">
            <div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold tracking-[0.18em] text-[#D62865] uppercase">
                  {product.brand}
                </span>
                <span className="font-mono text-xs text-[#6D6366]">SKU: {product.sku}</span>
              </div>
              <h1
                className="mt-2 font-editorial text-3xl sm:text-4xl font-semibold leading-tight text-[#181415]"
                style={{ textWrap: 'balance' }}
              >
                {product.title}
              </h1>

              <div className="mt-3 flex items-center gap-3 text-xs">
                <span className="inline-flex items-center gap-1 bg-[#FAF8F7] border border-[#EAE3E0] px-2.5 py-1 font-semibold text-[#181415] tabular-nums">
                  <Star className="h-3.5 w-3.5 fill-[#D62865] text-[#D62865]" />
                  {product.rating.toFixed(1)}
                </span>
                <span className="text-[#6D6366] tabular-nums">
                  {product.review_count} Verified Reviews
                </span>
                <span aria-hidden="true">·</span>
                <span className={product.stock > 0 ? 'text-[#16A34A] font-medium' : 'text-[#DC2626] font-medium'}>
                  {product.stock > 10
                    ? 'In Stock'
                    : product.stock > 0
                    ? `Only ${product.stock} left`
                    : 'Out of Stock'}
                </span>
              </div>
            </div>

            {/* Pricing Block */}
            <div className="border-y border-[#EAE3E0] py-4">
              <div className="flex items-baseline gap-3 tabular-nums">
                <span className="text-2xl font-bold text-[#181415]">
                  {formatINR(product.discounted_price)}
                </span>
                {product.discount_percent > 0 && (
                  <>
                    <span className="text-base text-[#8E8285] line-through">
                      {formatINR(product.original_price)}
                    </span>
                    <span className="text-sm font-semibold text-[#D62865]">
                      ({product.discount_percent}% OFF)
                    </span>
                  </>
                )}
              </div>
              <p className="mt-1 text-xs text-[#6D6366]">Inclusive of all taxes</p>
            </div>

            {/* Colour Selector */}
            {product.colors.length > 0 && (
              <div>
                <p className="text-xs font-semibold tracking-wider text-[#181415] uppercase">
                  Colour: <span className="font-normal text-[#6D6366]">{selectedColor}</span>
                </p>
                <div className="mt-2.5 flex flex-wrap items-center gap-3">
                  {product.colors.map((c) => {
                    const active = selectedColor === c.name;
                    return (
                      <button
                        key={c.name}
                        type="button"
                        onClick={() => setSelectedColor(c.name)}
                        title={c.name}
                        aria-label={`Select colour ${c.name}`}
                        className={`flex h-9 w-9 items-center justify-center rounded-full border transition-all ${
                          active ? 'border-[#181415] ring-2 ring-[#D62865] ring-offset-2' : 'border-[#D5CCC9]'
                        }`}
                        style={{ backgroundColor: c.hex }}
                      >
                        {active && <Check className="h-3.5 w-3.5 text-[#181415] drop-shadow-xs" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Size Selector */}
            {product.sizes.length > 0 && (
              <div>
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold tracking-wider text-[#181415] uppercase">
                    Select Size
                  </p>
                  <span className="text-xs text-[#6D6366]">True to size fit</span>
                </div>
                <div className="mt-2.5 flex flex-wrap gap-2">
                  {product.sizes.map((size) => {
                    const active = selectedSize === size;
                    return (
                      <button
                        key={size}
                        type="button"
                        onClick={() => setSelectedSize(size)}
                        className={`min-w-12 border px-3.5 py-2 text-xs font-semibold transition-colors ${
                          active
                            ? 'border-[#181415] bg-[#181415] text-white'
                            : 'border-[#E2D8D5] bg-white text-[#181415] hover:border-[#181415]'
                        }`}
                      >
                        {size}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Quantity & CTA Buttons */}
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="flex h-12 items-center border border-[#E2D8D5] bg-white">
                  <button
                    type="button"
                    aria-label="Decrease quantity"
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    className="flex h-full w-10 items-center justify-center text-[#181415] hover:bg-[#FAF8F7]"
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </button>
                  <span className="w-10 text-center text-sm font-semibold tabular-nums">
                    {quantity}
                  </span>
                  <button
                    type="button"
                    aria-label="Increase quantity"
                    onClick={() => setQuantity((q) => Math.min(Math.max(1, product.stock), q + 1))}
                    className="flex h-full w-10 items-center justify-center text-[#181415] hover:bg-[#FAF8F7]"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>

                <button
                  type="button"
                  disabled={product.stock <= 0}
                  onClick={() => onAddToCart(product, selectedSize, selectedColor, quantity, true)}
                  className="flex h-12 flex-1 items-center justify-center gap-2 bg-[#181415] px-6 text-xs font-semibold tracking-wider text-white uppercase transition-colors hover:bg-[#D62865] disabled:bg-neutral-400"
                >
                  <ShoppingBag className="h-4 w-4" />
                  <span>{product.stock > 0 ? 'Add to Bag' : 'Out of Stock'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => onToggleWishlist(product)}
                  aria-label="Toggle wishlist"
                  className={`flex h-12 w-12 items-center justify-center border transition-colors ${
                    isWishlisted
                      ? 'border-[#D62865] bg-[#FDF2F5] text-[#D62865]'
                      : 'border-[#E2D8D5] bg-white text-[#181415] hover:border-[#181415]'
                  }`}
                >
                  <Heart className={`h-4 w-4 ${isWishlisted ? 'fill-[#D62865]' : ''}`} />
                </button>
              </div>

              <button
                type="button"
                disabled={product.stock <= 0}
                onClick={() => {
                  onAddToCart(product, selectedSize, selectedColor, quantity, false);
                  onNavigate({ name: 'checkout' });
                }}
                className="flex h-12 w-full items-center justify-center bg-[#D62865] px-6 text-xs font-semibold tracking-wider text-white uppercase transition-colors hover:bg-[#B81D53] disabled:bg-neutral-400"
              >
                Buy Now — Express Checkout
              </button>
            </div>

            {/* Delivery PIN Code Checker */}
            <div className="border border-[#EAE3E0] bg-[#FAF8F7] p-4">
              <div className="flex items-center gap-2 text-xs font-semibold tracking-wider text-[#181415] uppercase">
                <MapPin className="h-4 w-4 text-[#D62865]" />
                <span>Check Delivery &amp; COD Availability</span>
              </div>
              <form onSubmit={checkPincode} className="mt-3 flex gap-2">
                <input
                  type="text"
                  maxLength={6}
                  value={pincode}
                  onChange={(e) => setPincode(e.target.value.replace(/\D/g, ''))}
                  placeholder="Enter 6-digit PIN code (e.g. 416008)"
                  className="flex-1 border border-[#E2D8D5] bg-white px-3 py-2 text-xs font-medium text-[#181415] focus:border-[#D62865] focus:outline-none tabular-nums"
                />
                <button
                  type="submit"
                  className="bg-[#181415] px-4 py-2 text-xs font-semibold text-white hover:bg-[#D62865] transition-colors"
                >
                  Check
                </button>
              </form>
              {pincodeError && <p className="mt-2 text-xs text-[#DC2626]">{pincodeError}</p>}
              {pincodeResult && (
                <div className="mt-3 space-y-1 text-xs text-[#181415]">
                  <p className="flex items-center gap-1.5 font-medium text-[#16A34A]">
                    <Truck className="h-3.5 w-3.5" />
                    Estimated Delivery in {pincodeResult.estimatedDelivery} ({pincodeResult.dispatchType})
                  </p>
                  <p className="flex items-center gap-1.5 text-[#4A4143]">
                    <ShieldCheck className="h-3.5 w-3.5 text-[#D62865]" />
                    Cash on Delivery available · Free shipping above ₹1,999
                  </p>
                </div>
              )}
            </div>

            {/* Description */}
            <div className="border-t border-[#EAE3E0] pt-5">
              <h2 className="text-xs font-semibold tracking-wider text-[#181415] uppercase">
                Design &amp; Craftsmanship
              </h2>
              <p className="mt-2.5 text-sm leading-relaxed text-[#4A4143]">{product.description}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Ratings & Reviews */}
      <section className="mt-16 border-t border-[#EAE3E0] pt-12">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <h2 className="font-editorial text-3xl font-semibold text-[#181415]">
              Customer Reviews
            </h2>
            <div className="mt-3 flex items-baseline gap-3">
              <span className="text-4xl font-bold text-[#181415] tabular-nums">
                {product.rating.toFixed(1)}
              </span>
              <span className="text-xs text-[#6D6366]">out of 5 · {product.review_count} ratings</span>
            </div>

            <form onSubmit={handleReviewSubmit} className="mt-6 space-y-3 border border-[#EAE3E0] bg-[#FAF8F7] p-5">
              <h3 className="text-xs font-semibold tracking-wider text-[#181415] uppercase">
                Write a Review
              </h3>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setReviewRating(star)}
                    className="p-0.5"
                    aria-label={`Rate ${star} stars`}
                  >
                    <Star
                      className={`h-5 w-5 ${
                        star <= reviewRating ? 'fill-[#D62865] text-[#D62865]' : 'text-[#CFC6C3]'
                      }`}
                    />
                  </button>
                ))}
              </div>
              <input
                type="text"
                required
                value={reviewTitle}
                onChange={(e) => setReviewTitle(e.target.value)}
                placeholder="Review headline"
                className="w-full border border-[#E2D8D5] bg-white px-3 py-2 text-xs focus:border-[#D62865] focus:outline-none"
              />
              <textarea
                required
                rows={3}
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                placeholder="Share fit, fabric quality, and styling notes..."
                className="w-full border border-[#E2D8D5] bg-white px-3 py-2 text-xs focus:border-[#D62865] focus:outline-none"
              />
              <button
                type="submit"
                className="w-full bg-[#181415] py-2.5 text-xs font-semibold tracking-wider text-white uppercase hover:bg-[#D62865]"
              >
                {user ? 'Publish Review' : 'Sign In to Review'}
              </button>
              {reviewMsg && <p className="text-xs text-[#D62865]">{reviewMsg}</p>}
            </form>
          </div>

          <div className="space-y-4 lg:col-span-8">
            {reviews.length === 0 ? (
              <p className="text-sm text-[#6D6366]">No written reviews yet. Be the first to review this piece.</p>
            ) : (
              reviews.map((rev) => (
                <div key={rev.id} className="border-b border-[#EAE3E0] pb-5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-0.5 bg-[#181415] px-2 py-0.5 text-xs font-semibold text-white tabular-nums">
                        {rev.rating} <Star className="h-3 w-3 fill-white" />
                      </span>
                      <h4 className="text-sm font-semibold text-[#181415]">{rev.title}</h4>
                    </div>
                    <span className="text-xs text-[#6D6366]">
                      {rev.user_name} · Verified Buyer
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-[#4A4143]">{rev.comment}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* Related Products */}
      {related.length > 0 && (
        <section className="mt-16 border-t border-[#EAE3E0] pt-12">
          <h2 className="font-editorial text-3xl font-semibold text-[#181415]">
            You May Also Adore
          </h2>
          <div className="mt-8 grid grid-cols-2 gap-x-4 gap-y-8 sm:gap-x-6 lg:grid-cols-4">
            {related.map((p) => (
              <ProductCard
                key={p.id}
                product={p}
                isWishlisted={wishlistIds.has(p.id)}
                onToggleWishlist={onToggleWishlist}
                onOpenProduct={(slug) => onNavigate({ name: 'product', idOrSlug: slug })}
                onQuickAdd={(prod) =>
                  onAddToCart(prod, prod.sizes[0] || 'Standard', prod.colors[0]?.name || 'Default', 1, true)
                }
              />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
