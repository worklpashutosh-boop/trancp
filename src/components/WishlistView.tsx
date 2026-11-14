import { Heart } from 'lucide-react';
import type { AppView, Product } from '../types';
import { ProductCard } from './ProductCard';

interface WishlistViewProps {
  items: Product[];
  wishlistIds: Set<number>;
  onNavigate: (view: AppView) => void;
  onToggleWishlist: (product: Product) => void;
  onQuickAdd: (product: Product) => void;
}

export function WishlistView({
  items,
  wishlistIds,
  onNavigate,
  onToggleWishlist,
  onQuickAdd,
}: WishlistViewProps) {
  return (
    <main className="mx-auto max-w-[1440px] px-4 py-10 sm:px-8">
      <div className="border-b border-[#EAE3E0] pb-5">
        <p className="text-xs font-medium tracking-[0.18em] text-[#D62865] uppercase">
          Saved Pieces
        </p>
        <h1 className="mt-1 font-editorial text-3xl sm:text-4xl font-semibold text-[#181415]">
          Your Wishlist ({items.length})
        </h1>
      </div>

      {items.length === 0 ? (
        <div className="mt-12 flex flex-col items-center justify-center border border-[#EAE3E0] bg-[#FAF8F7] px-6 py-16 text-center">
          <Heart className="h-10 w-10 text-[#C8BDB9]" />
          <h2 className="mt-4 font-editorial text-2xl font-semibold text-[#181415]">
            No pieces saved yet
          </h2>
          <p className="mt-2 max-w-md text-sm text-[#6D6366]">
            Tap the heart icon on any IZHO garment, jewel, or accessory to curate your personal edit.
          </p>
          <button
            type="button"
            onClick={() => onNavigate({ name: 'catalog', category: 'All' })}
            className="mt-6 bg-[#181415] px-7 py-3.5 text-xs font-semibold tracking-wider text-white uppercase hover:bg-[#D62865]"
          >
            Explore Collections
          </button>
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-2 gap-x-4 gap-y-8 sm:gap-x-6 md:grid-cols-3 lg:grid-cols-4">
          {items.map((product) => (
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
      )}
    </main>
  );
}
