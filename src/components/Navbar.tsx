import {
  Heart,
  Menu,
  Package,
  Search,
  ShieldCheck,
  ShoppingBag,
  User as UserIcon,
  X,
} from 'lucide-react';
import { useState, type FormEvent } from 'react';
import type { AppView, User } from '../types';

export const NAV_CATEGORIES = [
  'Women',
  'Men',
  'Kids',
  'Beauty',
  'Footwear',
  'Jewellery',
  'Accessories',
  'Home & Living',
];

interface NavbarProps {
  user: User | null;
  cartCount: number;
  wishlistCount: number;
  activeCategory?: string;
  onNavigate: (view: AppView) => void;
  onOpenCart: () => void;
  onOpenAccount: () => void;
}

export function Navbar({
  user,
  cartCount,
  wishlistCount,
  activeCategory,
  onNavigate,
  onOpenCart,
  onOpenAccount,
}: NavbarProps) {
  const [showAnnouncement, setShowAnnouncement] = useState(true);
  const [searchInput, setSearchInput] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSearch = (e: FormEvent) => {
    e.preventDefault();
    onNavigate({ name: 'catalog', search: searchInput.trim() });
    setMobileMenuOpen(false);
  };

  return (
    <div className="sticky top-0 z-40 bg-white border-b border-[#EAE3E0]">
      {/* Slim Dismissible Announcement Bar */}
      {showAnnouncement && (
        <div className="relative flex h-9 items-center justify-center bg-[#181415] px-8 text-center text-[11px] sm:text-xs font-medium tracking-wide text-white">
          <p className="truncate">
            Complimentary Express Shipping on orders above ₹1,999 · Use code{' '}
            <span className="font-semibold text-[#F6B2C8]">IZHO15</span> for 15% off
          </p>
          <button
            type="button"
            onClick={() => setShowAnnouncement(false)}
            aria-label="Dismiss announcement"
            className="absolute right-3 p-1 text-white/70 hover:text-white"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Primary Header Row */}
      <header className="mx-auto flex max-w-[1440px] items-center justify-between gap-4 px-4 py-3 sm:px-8">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            aria-label="Open navigation menu"
            className="flex h-10 w-10 items-center justify-center text-[#181415] lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>

          <button
            type="button"
            onClick={() => onNavigate({ name: 'home' })}
            className="font-editorial text-2xl sm:text-3xl font-bold tracking-[0.14em] text-[#181415] whitespace-nowrap shrink-0"
          >
            IZHO
          </button>
        </div>

        {/* Live Search Bar */}
        <form
          onSubmit={handleSearch}
          className="hidden md:flex flex-1 max-w-md items-center border border-[#E2D8D5] bg-[#FAF8F7] px-3.5 py-2 focus-within:border-[#D62865] focus-within:bg-white transition-colors"
        >
          <Search className="h-4 w-4 text-[#6D6366] shrink-0" />
          <input
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search sarees, kurtis, dresses, watches..."
            className="ml-2.5 w-full bg-transparent text-sm text-[#181415] placeholder:text-[#8E8285] focus:outline-none"
          />
          {searchInput && (
            <button
              type="submit"
              className="ml-2 text-xs font-semibold text-[#D62865] whitespace-nowrap shrink-0"
            >
              Search
            </button>
          )}
        </form>

        {/* Action Controls */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          {user?.role === 'admin' && (
            <button
              type="button"
              onClick={() => onNavigate({ name: 'admin' })}
              className="hidden sm:inline-flex items-center gap-1.5 bg-[#FDF2F5] px-3 py-2 text-xs font-semibold text-[#D62865] hover:bg-[#FADCE6] transition-colors whitespace-nowrap shrink-0"
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>Admin Panel</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => onNavigate({ name: 'track' })}
            className="hidden xl:inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-[#4A4143] hover:text-[#D62865] transition-colors whitespace-nowrap shrink-0"
          >
            <Package className="h-4 w-4" />
            <span>Track Order</span>
          </button>

          <button
            type="button"
            onClick={onOpenAccount}
            className="inline-flex h-10 items-center gap-1.5 px-2.5 text-xs font-medium text-[#181415] hover:text-[#D62865] transition-colors whitespace-nowrap shrink-0"
            aria-label="Account"
          >
            <UserIcon className="h-4 w-4" />
            <span className="hidden sm:inline">{user ? user.name.split(' ')[0] : 'Account'}</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigate({ name: 'wishlist' })}
            className="relative inline-flex h-10 items-center gap-1.5 px-2.5 text-xs font-medium text-[#181415] hover:text-[#D62865] transition-colors whitespace-nowrap shrink-0"
            aria-label="Wishlist"
          >
            <Heart className="h-4 w-4" />
            <span className="hidden sm:inline">Wishlist</span>
            {wishlistCount > 0 && (
              <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-[#D62865] px-1 text-[10px] font-semibold text-white tabular-nums">
                {wishlistCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={onOpenCart}
            className="relative inline-flex h-10 items-center gap-1.5 bg-[#181415] px-3.5 text-xs font-medium text-white hover:bg-[#D62865] transition-colors whitespace-nowrap shrink-0"
            aria-label="Shopping Bag"
          >
            <ShoppingBag className="h-4 w-4" />
            <span className="hidden sm:inline">Bag</span>
            <span className="tabular-nums font-semibold">({cartCount})</span>
          </button>
        </div>
      </header>

      {/* Desktop Category Navigation Bar */}
      <nav
        aria-label="Primary Categories"
        className="hidden lg:block border-t border-[#F3ECEA] bg-[#FAF8F7]/80"
      >
        <div className="mx-auto flex max-w-[1440px] items-center justify-center gap-8 px-8 py-2.5">
          <button
            type="button"
            onClick={() => onNavigate({ name: 'catalog', category: 'All' })}
            className={`text-[13px] font-medium tracking-wide transition-colors whitespace-nowrap shrink-0 border-b-2 pb-0.5 ${
              activeCategory === 'All'
                ? 'border-[#D62865] text-[#D62865]'
                : 'border-transparent text-[#3B3335] hover:text-[#D62865]'
            }`}
          >
            All Fashion
          </button>
          {NAV_CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => onNavigate({ name: 'catalog', category: cat })}
              className={`text-[13px] font-medium tracking-wide transition-colors whitespace-nowrap shrink-0 border-b-2 pb-0.5 ${
                activeCategory === cat
                  ? 'border-[#D62865] text-[#D62865]'
                  : 'border-transparent text-[#3B3335] hover:text-[#D62865]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </nav>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="fixed inset-0 bg-black/40"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative flex w-80 max-w-[85vw] flex-col bg-white p-6 shadow-xl overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#EAE3E0] pb-4">
              <span className="font-editorial text-2xl font-bold tracking-[0.14em] text-[#181415]">
                IZHO
              </span>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                aria-label="Close menu"
                className="p-2 text-[#181415]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSearch} className="mt-4 flex items-center border border-[#E2D8D5] bg-[#FAF8F7] px-3 py-2">
              <Search className="h-4 w-4 text-[#6D6366]" />
              <input
                type="search"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search IZHO..."
                className="ml-2 w-full bg-transparent text-sm focus:outline-none"
              />
            </form>

            <div className="mt-6 flex flex-col gap-1">
              <button
                type="button"
                onClick={() => {
                  onNavigate({ name: 'catalog', category: 'All' });
                  setMobileMenuOpen(false);
                }}
                className="py-2.5 text-left text-sm font-semibold text-[#D62865] border-b border-[#F3ECEA]"
              >
                Shop All Collections
              </button>
              {NAV_CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => {
                    onNavigate({ name: 'catalog', category: cat });
                    setMobileMenuOpen(false);
                  }}
                  className="py-2.5 text-left text-sm font-medium text-[#181415] border-b border-[#F3ECEA]"
                >
                  {cat}
                </button>
              ))}
              <button
                type="button"
                onClick={() => {
                  onNavigate({ name: 'track' });
                  setMobileMenuOpen(false);
                }}
                className="py-2.5 text-left text-sm font-medium text-[#4A4143] border-b border-[#F3ECEA]"
              >
                Track Order
              </button>
              {user?.role === 'admin' && (
                <button
                  type="button"
                  onClick={() => {
                    onNavigate({ name: 'admin' });
                    setMobileMenuOpen(false);
                  }}
                  className="mt-2 bg-[#FDF2F5] px-3 py-2.5 text-left text-sm font-semibold text-[#D62865]"
                >
                  Admin Dashboard
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
