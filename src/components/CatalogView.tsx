import { Filter, Search, SlidersHorizontal, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { AppView, Category, Product } from '../types';
import { apiFetch } from '../utils/api';
import { NAV_CATEGORIES } from './Navbar';
import { ProductCard } from './ProductCard';

interface CatalogViewProps {
  initialCategory?: string;
  initialSubcategory?: string;
  initialCollection?: string;
  initialSearch?: string;
  categories: Category[];
  wishlistIds: Set<number>;
  onNavigate: (view: AppView) => void;
  onToggleWishlist: (product: Product) => void;
  onQuickAdd: (product: Product) => void;
}

export function CatalogView({
  initialCategory = 'All',
  initialSubcategory = 'All',
  initialCollection = 'All',
  initialSearch = '',
  categories,
  wishlistIds,
  onNavigate,
  onToggleWishlist,
  onQuickAdd,
}: CatalogViewProps) {
  const [search, setSearch] = useState(initialSearch);
  const [category, setCategory] = useState(initialCategory);
  const [subcategory, setSubcategory] = useState(initialSubcategory);
  const [collection, setCollection] = useState(initialCollection);
  const [priceRange, setPriceRange] = useState<'all' | 'under5k' | '5kto10k' | 'above10k'>('all');
  const [sort, setSort] = useState('popularity');
  const [page, setPage] = useState(1);

  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  useEffect(() => {
    setCategory(initialCategory || 'All');
    setSubcategory(initialSubcategory || 'All');
    setCollection(initialCollection || 'All');
    setSearch(initialSearch || '');
    setPage(1);
  }, [initialCategory, initialSubcategory, initialCollection, initialSearch]);

  useEffect(() => {
    let active = true;
    setLoading(true);

    const params = new URLSearchParams();
    if (search) params.set('q', search);
    if (category !== 'All') params.set('category', category);
    if (subcategory !== 'All') params.set('subcategory', subcategory);
    if (collection !== 'All') params.set('collection', collection);
    if (priceRange === 'under5k') params.set('maxPrice', '5000');
    if (priceRange === '5kto10k') {
      params.set('minPrice', '5000');
      params.set('maxPrice', '10000');
    }
    if (priceRange === 'above10k') params.set('minPrice', '10000');
    params.set('sort', sort);
    params.set('page', String(page));
    params.set('limit', '12');

    apiFetch<{ products: Product[]; total: number; totalPages: number }>(`/api/products?${params.toString()}`)
      .then((res) => {
        if (!active) return;
        setProducts(res.products);
        setTotal(res.total);
        setTotalPages(res.totalPages);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [search, category, subcategory, collection, priceRange, sort, page]);

  const clearFilters = () => {
    setSearch('');
    setCategory('All');
    setSubcategory('All');
    setCollection('All');
    setPriceRange('all');
    setSort('popularity');
    setPage(1);
  };

  const activeTitle =
    subcategory !== 'All'
      ? subcategory
      : category !== 'All'
      ? category
      : collection !== 'All'
      ? `${collection} Collection`
      : search
      ? `Results for "${search}"`
      : 'All Collections';

  const filterSidebar = (
    <div className="space-y-7">
      <div>
        <h3 className="text-xs font-semibold tracking-wider text-[#181415] uppercase">
          Search Catalogue
        </h3>
        <div className="mt-2.5 flex items-center border border-[#E2D8D5] bg-[#FAF8F7] px-3 py-2">
          <Search className="h-4 w-4 text-[#6D6366]" />
          <input
            type="search"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Keyword, brand, weave..."
            className="ml-2 w-full bg-transparent text-sm focus:outline-none"
          />
        </div>
      </div>

      <div>
        <h3 className="text-xs font-semibold tracking-wider text-[#181415] uppercase">
          Department
        </h3>
        <div className="mt-2.5 flex flex-col gap-1.5">
          {['All', ...NAV_CATEGORIES].map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => {
                setCategory(cat);
                setSubcategory('All');
                setPage(1);
              }}
              className={`py-1 text-left text-sm transition-colors ${
                category === cat
                  ? 'font-semibold text-[#D62865]'
                  : 'text-[#4A4143] hover:text-[#181415]'
              }`}
            >
              {cat === 'All' ? 'All Departments' : cat}
            </button>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-xs font-semibold tracking-wider text-[#181415] uppercase">
          Subcategory
        </h3>
        <div className="mt-2.5 flex flex-col gap-1.5 max-h-56 overflow-y-auto izho-scroll pr-1">
          <button
            type="button"
            onClick={() => {
              setSubcategory('All');
              setPage(1);
            }}
            className={`py-1 text-left text-sm transition-colors ${
              subcategory === 'All'
                ? 'font-semibold text-[#D62865]'
                : 'text-[#4A4143] hover:text-[#181415]'
            }`}
          >
            All Subcategories
          </button>
          {categories.map((sub) => (
            <button
              key={sub.id}
              type="button"
              onClick={() => {
                setSubcategory(sub.name);
                setCategory('All');
                setPage(1);
              }}
              className={`py-1 text-left text-sm transition-colors ${
                subcategory === sub.name
                  ? 'font-semibold text-[#D62865]'
                  : 'text-[#4A4143] hover:text-[#181415]'
              }`}
            >
              {sub.name}
            </button>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-xs font-semibold tracking-wider text-[#181415] uppercase">
          Curated Edit
        </h3>
        <div className="mt-2.5 flex flex-col gap-1.5">
          {['All', 'Trending', 'Best Seller', 'New Arrival', 'Exclusive'].map((col) => (
            <button
              key={col}
              type="button"
              onClick={() => {
                setCollection(col);
                setPage(1);
              }}
              className={`py-1 text-left text-sm transition-colors ${
                collection === col
                  ? 'font-semibold text-[#D62865]'
                  : 'text-[#4A4143] hover:text-[#181415]'
              }`}
            >
              {col === 'All' ? 'All Edits' : col}
            </button>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-xs font-semibold tracking-wider text-[#181415] uppercase">
          Price Range
        </h3>
        <div className="mt-2.5 flex flex-col gap-1.5">
          {[
            { id: 'all', label: 'All Prices' },
            { id: 'under5k', label: 'Under ₹5,000' },
            { id: '5kto10k', label: '₹5,000 – ₹10,000' },
            { id: 'above10k', label: 'Above ₹10,000' },
          ].map((pr) => (
            <button
              key={pr.id}
              type="button"
              onClick={() => {
                setPriceRange(pr.id as any);
                setPage(1);
              }}
              className={`py-1 text-left text-sm transition-colors ${
                priceRange === pr.id
                  ? 'font-semibold text-[#D62865]'
                  : 'text-[#4A4143] hover:text-[#181415]'
              }`}
            >
              {pr.label}
            </button>
          ))}
        </div>
      </div>

      <button
        type="button"
        onClick={clearFilters}
        className="w-full border border-[#181415] py-2.5 text-xs font-semibold tracking-wider text-[#181415] uppercase hover:bg-[#181415] hover:text-white transition-colors"
      >
        Reset All Filters
      </button>
    </div>
  );

  return (
    <main className="mx-auto max-w-[1440px] px-4 py-10 sm:px-8">
      {/* Header & Sort Bar */}
      <div className="flex flex-col gap-4 border-b border-[#EAE3E0] pb-6 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-medium tracking-[0.16em] text-[#6D6366] uppercase">
            IZHO Catalogue · <span className="tabular-nums">{total}</span> Styles
          </p>
          <h1 className="mt-1 font-editorial text-3xl sm:text-4xl font-semibold text-[#181415]">
            {activeTitle}
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => setMobileFiltersOpen(true)}
            className="inline-flex items-center gap-2 border border-[#E2D8D5] bg-white px-4 py-2.5 text-xs font-semibold text-[#181415] lg:hidden"
          >
            <SlidersHorizontal className="h-4 w-4" />
            <span>Filters</span>
          </button>

          <label className="flex items-center gap-2 text-xs text-[#6D6366]">
            <span>Sort by:</span>
            <select
              value={sort}
              onChange={(e) => {
                setSort(e.target.value);
                setPage(1);
              }}
              className="border border-[#E2D8D5] bg-white px-3 py-2 text-xs font-semibold text-[#181415] focus:border-[#D62865] focus:outline-none"
            >
              <option value="popularity">Popularity</option>
              <option value="newest">Newest Arrivals</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
              <option value="discount">Highest Discount</option>
            </select>
          </label>
        </div>
      </div>

      {/* Main Grid with Sidebar */}
      <div className="mt-8 grid grid-cols-1 gap-10 lg:grid-cols-12">
        <aside className="hidden lg:block lg:col-span-3 border-r border-[#F0EAE7] pr-6">
          {filterSidebar}
        </aside>

        <div className="lg:col-span-9">
          {loading ? (
            <div className="grid grid-cols-2 gap-6 md:grid-cols-3">
              {Array.from({ length: 6 }).map((_, idx) => (
                <div key={idx} className="animate-pulse">
                  <div className="aspect-[3/4] bg-[#F3ECEA]" />
                  <div className="mt-3 h-3 w-20 bg-[#F3ECEA]" />
                  <div className="mt-2 h-4 w-3/4 bg-[#F3ECEA]" />
                  <div className="mt-2 h-4 w-1/3 bg-[#F3ECEA]" />
                </div>
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="flex flex-col items-center justify-center border border-[#EAE3E0] bg-[#FAF8F7] px-6 py-16 text-center">
              <Filter className="h-8 w-8 text-[#8E8285]" />
              <h2 className="mt-4 font-editorial text-2xl font-semibold text-[#181415]">
                No matching styles found
              </h2>
              <p className="mt-2 max-w-md text-sm text-[#6D6366]">
                Try clearing one of your active filters or explore our full curated collection.
              </p>
              <button
                type="button"
                onClick={clearFilters}
                className="mt-6 bg-[#181415] px-6 py-3 text-xs font-semibold tracking-wider text-white uppercase hover:bg-[#D62865]"
              >
                Clear All Filters
              </button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:gap-x-6 md:grid-cols-3">
                {products.map((product) => (
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

              {totalPages > 1 && (
                <div className="mt-12 flex items-center justify-center gap-2 border-t border-[#EAE3E0] pt-8">
                  <button
                    type="button"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                    className="border border-[#E2D8D5] px-4 py-2 text-xs font-semibold text-[#181415] disabled:opacity-40"
                  >
                    Previous
                  </button>
                  <span className="px-4 text-xs font-medium text-[#6D6366] tabular-nums">
                    Page {page} of {totalPages}
                  </span>
                  <button
                    type="button"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => p + 1)}
                    className="border border-[#E2D8D5] px-4 py-2 text-xs font-semibold text-[#181415] disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Mobile Filters Modal */}
      {mobileFiltersOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div className="fixed inset-0 bg-black/40" onClick={() => setMobileFiltersOpen(false)} />
          <div className="relative ml-auto flex h-full w-80 max-w-[85vw] flex-col bg-white p-6 overflow-y-auto">
            <div className="mb-6 flex items-center justify-between border-b border-[#EAE3E0] pb-4">
              <span className="text-sm font-semibold tracking-wider uppercase text-[#181415]">
                Filter Catalogue
              </span>
              <button
                type="button"
                onClick={() => setMobileFiltersOpen(false)}
                aria-label="Close filters"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            {filterSidebar}
          </div>
        </div>
      )}
    </main>
  );
}
