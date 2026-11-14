import { Heart, ShoppingBag, Star } from 'lucide-react';
import { useState } from 'react';
import type { Product } from '../types';
import { formatINR } from '../utils/api';

interface ProductCardProps {
  product: Product;
  isWishlisted: boolean;
  onToggleWishlist: (product: Product) => void;
  onOpenProduct: (slug: string) => void;
  onQuickAdd: (product: Product) => void;
}

export function ProductCard({
  product,
  isWishlisted,
  onToggleWishlist,
  onOpenProduct,
  onQuickAdd,
}: ProductCardProps) {
  const [imgError, setImgError] = useState(false);
  const [hovered, setHovered] = useState(false);

  const primaryImage = product.images[0] || '';
  const secondaryImage = product.images[1] || primaryImage;
  const displayImage = hovered && secondaryImage ? secondaryImage : primaryImage;

  return (
    <article
      className="group flex flex-col bg-white transition-transform duration-200 ease-out hover:-translate-y-0.5"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="relative aspect-[3/4] w-full overflow-hidden bg-[#FAF8F7]">
        <button
          type="button"
          onClick={() => onOpenProduct(product.slug)}
          className="block h-full w-full text-left focus-visible:outline-2 focus-visible:outline-[#D62865]"
          aria-label={`View ${product.title}`}
        >
          {!imgError && displayImage ? (
            <img
              src={displayImage}
              alt={product.title}
              referrerPolicy="no-referrer"
              loading="lazy"
              onError={() => setImgError(true)}
              className="h-full w-full object-cover object-center transition-transform duration-500 ease-out group-hover:scale-[1.03]"
            />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-[#F7F1EF] to-[#EDE4E1] p-4 text-center">
              <span className="font-editorial text-2xl font-semibold text-[#181415]">IZHO</span>
              <span className="mt-1 text-xs text-[#6D6366]">{product.subcategory}</span>
            </div>
          )}
        </button>

        {/* Single quiet editorial tag */}
        <span className="pointer-events-none absolute top-3 left-3 bg-white/92 px-2.5 py-1 text-[11px] font-medium tracking-wide text-[#181415] backdrop-blur-xs">
          {product.collection_tag}
        </span>

        {/* Wishlist button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleWishlist(product);
          }}
          aria-label={isWishlisted ? `Remove ${product.title} from wishlist` : `Save ${product.title} to wishlist`}
          className={`absolute top-3 right-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/92 shadow-xs transition-colors hover:bg-white ${
            isWishlisted ? 'text-[#D62865]' : 'text-[#181415]'
          }`}
        >
          <Heart className={`h-4 w-4 ${isWishlisted ? 'fill-[#D62865]' : ''}`} />
        </button>

        {/* Subtle Quick Add bar on hover / focus */}
        <div className="absolute inset-x-3 bottom-3 opacity-0 transition-opacity duration-200 group-hover:opacity-100 focus-within:opacity-100">
          <button
            type="button"
            disabled={product.stock <= 0}
            onClick={(e) => {
              e.stopPropagation();
              onQuickAdd(product);
            }}
            className="flex w-full items-center justify-center gap-2 bg-[#181415]/92 px-4 py-2.5 text-xs font-medium tracking-wide text-white backdrop-blur-xs transition-colors hover:bg-[#D62865] disabled:bg-neutral-400"
          >
            <ShoppingBag className="h-3.5 w-3.5" />
            <span>{product.stock > 0 ? 'Quick Add to Bag' : 'Out of Stock'}</span>
          </button>
        </div>
      </div>

      <div className="flex flex-1 flex-col pt-3.5">
        <div className="flex items-center justify-between gap-2 text-[11px] font-medium tracking-wider text-[#6D6366] uppercase">
          <span className="truncate">{product.brand}</span>
          <span className="flex shrink-0 items-center gap-1 tabular-nums text-[#181415]">
            <Star className="h-3 w-3 fill-[#D62865] text-[#D62865]" />
            {product.rating.toFixed(1)}
          </span>
        </div>

        <button
          type="button"
          onClick={() => onOpenProduct(product.slug)}
          className="mt-1 text-left text-[15px] leading-snug font-medium text-[#181415] transition-colors hover:text-[#D62865] line-clamp-1"
        >
          {product.title}
        </button>

        <div className="mt-1.5 flex items-baseline gap-2 tabular-nums">
          <span className="text-[15px] font-semibold text-[#181415]">
            {formatINR(product.discounted_price)}
          </span>
          {product.discount_percent > 0 && (
            <>
              <span className="text-xs text-[#8E8285] line-through">
                {formatINR(product.original_price)}
              </span>
              <span className="text-xs font-semibold text-[#D62865]">
                {product.discount_percent}% OFF
              </span>
            </>
          )}
        </div>
      </div>
    </article>
  );
}
