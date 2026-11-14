import { useEffect, useMemo, useState } from 'react';
import { AccountModal } from './components/AccountModal';
import { AdminDashboard } from './components/AdminDashboard';
import { CartDrawer } from './components/CartDrawer';
import { CatalogView } from './components/CatalogView';
import { CheckoutView } from './components/CheckoutView';
import { Footer } from './components/Footer';
import { HomeView } from './components/HomeView';
import { InfoView } from './components/InfoView';
import { Navbar } from './components/Navbar';
import { OrderTrackingView } from './components/OrderTrackingView';
import { ProductDetailView } from './components/ProductDetailView';
import { WishlistView } from './components/WishlistView';
import type { AppView, Banner, CartItem, Category, Product, User } from './types';
import { apiFetch, getStoredToken, setStoredToken } from './utils/api';

export default function App() {
  const [view, setView] = useState<AppView>({ name: 'home' });
  const [user, setUser] = useState<User | null>(null);

  const [banners, setBanners] = useState<Banner[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem('izho_cart');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [wishlist, setWishlist] = useState<Product[]>(() => {
    try {
      const saved = localStorage.getItem('izho_wishlist');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [cartOpen, setCartOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [toast, setToast] = useState('');

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2800);
  };

  const loadStorefront = async () => {
    try {
      const [bRes, cRes, pRes] = await Promise.all([
        apiFetch<{ banners: Banner[] }>('/api/banners'),
        apiFetch<{ categories: Category[] }>('/api/categories'),
        apiFetch<{ products: Product[] }>('/api/products?limit=48'),
      ]);
      setBanners(bRes.banners);
      setCategories(cRes.categories);
      setProducts(pRes.products);
    } catch {
      // Keep graceful UI
    }
  };

  useEffect(() => {
    loadStorefront();
    const token = getStoredToken();
    if (token) {
      apiFetch<{ user: User }>('/api/auth/me')
        .then((res) => {
          setUser(res.user);
          return apiFetch<{ items: Product[] }>('/api/wishlist');
        })
        .then((wRes) => {
          if (wRes?.items) setWishlist(wRes.items);
        })
        .catch(() => {
          setStoredToken(null);
        });
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('izho_cart', JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    localStorage.setItem('izho_wishlist', JSON.stringify(wishlist));
  }, [wishlist]);

  const wishlistIds = useMemo(() => new Set(wishlist.map((p) => p.id)), [wishlist]);

  const navigate = (next: AppView) => {
    setView(next);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleToggleWishlist = async (product: Product) => {
    if (user) {
      try {
        const res = await apiFetch<{ items: Product[]; wishlisted: boolean }>('/api/wishlist/toggle', {
          method: 'POST',
          body: JSON.stringify({ productId: product.id }),
        });
        setWishlist(res.items);
        showToast(res.wishlisted ? 'Saved to your Wishlist' : 'Removed from Wishlist');
        return;
      } catch {
        // Fallback to local state
      }
    }
    setWishlist((prev) => {
      const exists = prev.some((p) => p.id === product.id);
      showToast(exists ? 'Removed from Wishlist' : 'Saved to your Wishlist');
      return exists ? prev.filter((p) => p.id !== product.id) : [product, ...prev];
    });
  };

  const handleAddToCart = (
    product: Product,
    size: string,
    color: string,
    quantity: number,
    openDrawer = true
  ) => {
    setCart((prev) => {
      const idx = prev.findIndex(
        (i) => i.product.id === product.id && i.size === size && i.color === color
      );
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = { ...updated[idx], quantity: updated[idx].quantity + quantity };
        return updated;
      }
      return [...prev, { product, size, color, quantity }];
    });
    if (openDrawer) {
      setCartOpen(true);
    }
    showToast(`Added ${product.title} to your Bag`);
  };

  const handleQuickAdd = (product: Product) => {
    const defaultSize = product.sizes[0] || 'Standard';
    const defaultColor = product.colors[0]?.name || 'Default';
    handleAddToCart(product, defaultSize, defaultColor, 1, true);
  };

  const handleUpdateQty = (index: number, delta: number) => {
    setCart((prev) =>
      prev
        .map((item, idx) =>
          idx === index ? { ...item, quantity: item.quantity + delta } : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  const handleRemoveCartItem = (index: number) => {
    setCart((prev) => prev.filter((_, idx) => idx !== index));
  };

  const cartCount = cart.reduce((sum, i) => sum + i.quantity, 0);

  if (view.name === 'admin') {
    return (
      <AdminDashboard
        user={user}
        onExitAdmin={() => navigate({ name: 'home' })}
        onDataMutated={loadStorefront}
      />
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-white text-[#181415]">
      <Navbar
        user={user}
        cartCount={cartCount}
        wishlistCount={wishlist.length}
        activeCategory={view.name === 'catalog' ? view.category || 'All' : undefined}
        onNavigate={navigate}
        onOpenCart={() => setCartOpen(true)}
        onOpenAccount={() => setAccountOpen(true)}
      />

      <div className="flex-1">
        {view.name === 'home' && (
          <HomeView
            banners={banners}
            categories={categories}
            products={products}
            wishlistIds={wishlistIds}
            onNavigate={navigate}
            onToggleWishlist={handleToggleWishlist}
            onQuickAdd={handleQuickAdd}
          />
        )}

        {view.name === 'catalog' && (
          <CatalogView
            initialCategory={view.category}
            initialSubcategory={view.subcategory}
            initialCollection={view.collection}
            initialSearch={view.search}
            categories={categories}
            wishlistIds={wishlistIds}
            onNavigate={navigate}
            onToggleWishlist={handleToggleWishlist}
            onQuickAdd={handleQuickAdd}
          />
        )}

        {view.name === 'product' && (
          <ProductDetailView
            idOrSlug={view.idOrSlug}
            user={user}
            wishlistIds={wishlistIds}
            onNavigate={navigate}
            onAddToCart={handleAddToCart}
            onToggleWishlist={handleToggleWishlist}
            onRequireAuth={() => setAccountOpen(true)}
          />
        )}

        {view.name === 'wishlist' && (
          <WishlistView
            items={wishlist}
            wishlistIds={wishlistIds}
            onNavigate={navigate}
            onToggleWishlist={handleToggleWishlist}
            onQuickAdd={handleQuickAdd}
          />
        )}

        {view.name === 'checkout' && (
          <CheckoutView
            items={cart}
            user={user}
            onClearCart={() => setCart([])}
            onNavigate={navigate}
          />
        )}

        {view.name === 'track' && <OrderTrackingView initialOrderNumber={view.orderNumber} />}

        {view.name === 'info' && <InfoView page={view.page} onNavigate={navigate} />}
      </div>

      <Footer onNavigate={navigate} />

      <CartDrawer
        open={cartOpen}
        items={cart}
        onClose={() => setCartOpen(false)}
        onUpdateQty={handleUpdateQty}
        onRemoveItem={handleRemoveCartItem}
        onCheckout={() => {
          setCartOpen(false);
          navigate({ name: 'checkout' });
        }}
      />

      <AccountModal
        open={accountOpen}
        user={user}
        onClose={() => setAccountOpen(false)}
        onAuthSuccess={(authedUser) => {
          setUser(authedUser);
          apiFetch<{ items: Product[] }>('/api/wishlist')
            .then((wRes) => setWishlist(wRes.items))
            .catch(() => {});
          showToast(`Welcome back, ${authedUser.name}`);
        }}
        onLogout={() => {
          setStoredToken(null);
          setUser(null);
          setAccountOpen(false);
          showToast('Signed out of IZHO');
        }}
        onNavigate={navigate}
      />

      {toast && (
        <div
          role="status"
          className="fixed right-5 bottom-5 z-50 bg-[#181415] px-5 py-3 text-xs font-medium text-white shadow-xl"
        >
          {toast}
        </div>
      )}
    </div>
  );
}
