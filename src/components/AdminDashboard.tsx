import {
  BarChart3,
  Edit3,
  Image as ImageIcon,
  Layers,
  Package,
  Plus,
  ShoppingBag,
  Tag,
  Trash2,
  Upload,
  Users,
  X,
} from 'lucide-react';
import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import type { Banner, Category, Coupon, Order, Product, User } from '../types';
import { apiFetch, formatINR } from '../utils/api';

interface AdminDashboardProps {
  user: User | null;
  onExitAdmin: () => void;
  onDataMutated: () => void;
}

type AdminTab = 'overview' | 'products' | 'categories' | 'orders' | 'customers' | 'coupons' | 'banners';

export function AdminDashboard({ user, onExitAdmin, onDataMutated }: AdminDashboardProps) {
  const [tab, setTab] = useState<AdminTab>('overview');
  const [overview, setOverview] = useState<any>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [toast, setToast] = useState('');

  // Product Form Modal
  const [editingProduct, setEditingProduct] = useState<Partial<Product> | null>(null);
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);

  // Quick forms
  const [newCat, setNewCat] = useState({ name: '', parent_group: 'Women', image: '/src/assets/images/prod_midi_dress_1794649862784.jpg' });
  const [newCoupon, setNewCoupon] = useState({
    code: '',
    description: '',
    discount_type: 'percent',
    discount_value: 15,
    min_order: 1999,
    max_discount: 1500,
    expires_at: '2027-12-31',
  });
  const [newBanner, setNewBanner] = useState({
    title: '',
    subtitle: '',
    cta_text: 'Explore Collection',
    cta_link: 'All',
    image_url: '/src/assets/images/hero_izho_atelier_1794649860908.jpg',
    placement: 'hero',
  });

  const notify = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const loadAllAdminData = async () => {
    try {
      const [ov, pr, ca, or, cu, cp, bn] = await Promise.all([
        apiFetch('/api/admin/overview'),
        apiFetch<{ products: Product[] }>('/api/products?limit=100'),
        apiFetch<{ categories: Category[] }>('/api/categories'),
        apiFetch<{ orders: Order[] }>('/api/admin/orders'),
        apiFetch<{ customers: any[] }>('/api/admin/customers'),
        apiFetch<{ coupons: Coupon[] }>('/api/admin/coupons'),
        apiFetch<{ banners: Banner[] }>('/api/banners?all=true'),
      ]);
      setOverview(ov);
      setProducts(pr.products);
      setCategories(ca.categories);
      setOrders(or.orders);
      setCustomers(cu.customers);
      setCoupons(cp.coupons);
      setBanners(bn.banners);
    } catch (err: any) {
      notify(err.message);
    }
  };

  useEffect(() => {
    if (user?.role === 'admin') {
      loadAllAdminData();
    }
  }, [user]);

  if (user?.role !== 'admin') {
    return (
      <main className="mx-auto max-w-xl px-4 py-20 text-center">
        <h1 className="font-editorial text-3xl font-semibold text-[#181415]">Admin Access Required</h1>
        <p className="mt-2 text-sm text-[#6D6366]">
          Please sign in with the store owner account (kolhapurpan1@gmail.com) via Account.
        </p>
        <button
          type="button"
          onClick={onExitAdmin}
          className="mt-6 bg-[#181415] px-6 py-3 text-xs font-semibold text-white uppercase"
        >
          Back to Storefront
        </button>
      </main>
    );
  }

  const openNewProductModal = () => {
    setEditingProduct({
      title: '',
      brand: 'IZHO Atelier',
      category: 'Women',
      subcategory: 'Dresses',
      collection_tag: 'New Arrival',
      description: '',
      original_price: 5990,
      discounted_price: 4190,
      stock: 25,
      sizes: ['XS', 'S', 'M', 'L', 'XL'],
      colors: [{ name: 'Dusty Rose', hex: '#D6A4AC' }],
      images: ['/src/assets/images/prod_midi_dress_1794649862784.jpg'],
      sku: `IZH-${Date.now().toString().slice(-4)}`,
      is_featured: true,
    });
    setProductModalOpen(true);
  };

  const handleMultiImageUpload = async (e: ChangeEvent<HTMLInputElement>, target: 'product' | 'banner') => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploadingImages(true);
    try {
      const formData = new FormData();
      Array.from(files).forEach((f) => formData.append('images', f));
      const res = await apiFetch<{ urls: string[] }>('/api/admin/upload', {
        method: 'POST',
        body: formData,
      });
      if (target === 'product' && editingProduct) {
        setEditingProduct({
          ...editingProduct,
          images: [...(editingProduct.images || []), ...res.urls],
        });
      } else if (target === 'banner' && res.urls[0]) {
        setNewBanner({ ...newBanner, image_url: res.urls[0] });
      }
      notify(`Uploaded ${res.urls.length} image(s)`);
    } catch (err: any) {
      notify(err.message);
    } finally {
      setUploadingImages(false);
    }
  };

  const handleSaveProduct = async (e: FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    try {
      if (editingProduct.id) {
        await apiFetch(`/api/admin/products/${editingProduct.id}`, {
          method: 'PUT',
          body: JSON.stringify(editingProduct),
        });
        notify('Product updated successfully');
      } else {
        await apiFetch('/api/admin/products', {
          method: 'POST',
          body: JSON.stringify(editingProduct),
        });
        notify('New product published to storefront');
      }
      setProductModalOpen(false);
      await loadAllAdminData();
      onDataMutated();
    } catch (err: any) {
      notify(err.message);
    }
  };

  const handleDeleteProduct = async (id: number) => {
    await apiFetch(`/api/admin/products/${id}`, { method: 'DELETE' });
    notify('Product deleted');
    await loadAllAdminData();
    onDataMutated();
  };

  const handleOrderStatusChange = async (orderId: number, status: string) => {
    await apiFetch(`/api/admin/orders/${orderId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ order_status: status }),
    });
    notify(`Order updated to ${status}`);
    await loadAllAdminData();
  };

  const sidebarItems: Array<{ id: AdminTab; label: string; icon: any }> = [
    { id: 'overview', label: 'Sales & Reports', icon: BarChart3 },
    { id: 'products', label: 'Products & Inventory', icon: ShoppingBag },
    { id: 'orders', label: 'Customer Orders', icon: Package },
    { id: 'categories', label: 'Categories', icon: Layers },
    { id: 'customers', label: 'Customers', icon: Users },
    { id: 'coupons', label: 'Coupons & Discounts', icon: Tag },
    { id: 'banners', label: 'Homepage Banners', icon: ImageIcon },
  ];

  return (
    <div className="min-h-screen bg-[#FAF8F7] text-[#181415]">
      {/* Admin Top Bar */}
      <div className="sticky top-0 z-30 flex items-center justify-between border-b border-[#EAE3E0] bg-white px-4 py-3 sm:px-8">
        <div className="flex items-center gap-3">
          <span className="font-editorial text-2xl font-bold tracking-[0.14em]">IZHO</span>
          <span className="text-xs font-medium text-[#6D6366]">/ Merchant Control Center</span>
        </div>
        <div className="flex items-center gap-3">
          {toast && (
            <span className="bg-[#181415] px-3 py-1.5 text-xs font-medium text-white">{toast}</span>
          )}
          <button
            type="button"
            onClick={onExitAdmin}
            className="border border-[#181415] px-4 py-2 text-xs font-semibold uppercase tracking-wider hover:bg-[#181415] hover:text-white transition-colors"
          >
            View Live Storefront
          </button>
        </div>
      </div>

      <div className="mx-auto grid max-w-[1440px] grid-cols-1 lg:grid-cols-12">
        {/* Sidebar */}
        <aside className="border-b border-[#EAE3E0] bg-white p-4 lg:col-span-3 lg:min-h-[calc(100vh-57px)] lg:border-r lg:border-b-0 xl:col-span-2">
          <nav className="flex flex-row gap-1 overflow-x-auto lg:flex-col">
            {sidebarItems.map((item) => {
              const Icon = item.icon;
              const active = tab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setTab(item.id)}
                  className={`flex items-center gap-2.5 px-3 py-2.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                    active
                      ? 'bg-[#FDF2F5] text-[#D62865]'
                      : 'text-[#4A4143] hover:bg-[#FAF8F7] hover:text-[#181415]'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Main Workspace */}
        <div className="p-4 sm:p-8 lg:col-span-9 xl:col-span-10 space-y-8">
          {/* OVERVIEW */}
          {tab === 'overview' && overview && (
            <div className="space-y-8">
              <div>
                <h1 className="font-editorial text-3xl font-semibold">Sales &amp; Revenue Overview</h1>
                <p className="text-xs text-[#6D6366]">Real-time storefront metrics backed by SQLite</p>
              </div>

              <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
                <div className="border border-[#EAE3E0] bg-white p-5">
                  <p className="text-xs text-[#6D6366] uppercase">Total Revenue</p>
                  <p className="mt-2 font-mono text-2xl font-bold tabular-nums">
                    {formatINR(overview.metrics.totalRevenue)}
                  </p>
                </div>
                <div className="border border-[#EAE3E0] bg-white p-5">
                  <p className="text-xs text-[#6D6366] uppercase">Total Orders</p>
                  <p className="mt-2 font-mono text-2xl font-bold tabular-nums">
                    {overview.metrics.totalOrders}
                  </p>
                </div>
                <div className="border border-[#EAE3E0] bg-white p-5">
                  <p className="text-xs text-[#6D6366] uppercase">Active Catalogue SKUs</p>
                  <p className="mt-2 font-mono text-2xl font-bold tabular-nums">
                    {overview.metrics.totalProducts}
                  </p>
                </div>
                <div className="border border-[#EAE3E0] bg-white p-5">
                  <p className="text-xs text-[#6D6366] uppercase">Registered Customers</p>
                  <p className="mt-2 font-mono text-2xl font-bold tabular-nums">
                    {overview.metrics.totalCustomers}
                  </p>
                </div>
              </div>

              {/* Category Revenue Breakdown */}
              <div className="border border-[#EAE3E0] bg-white p-6">
                <h2 className="text-xs font-semibold tracking-wider uppercase text-[#181415]">
                  Revenue &amp; Catalogue Distribution by Department
                </h2>
                <div className="mt-5 space-y-4">
                  {overview.revenueByCategory.map((row: any) => {
                    const maxVal = Math.max(...overview.revenueByCategory.map((r: any) => r.est_sales || 1));
                    const widthPct = Math.max(8, Math.round(((row.est_sales || 0) / maxVal) * 100));
                    return (
                      <div key={row.category} className="space-y-1.5">
                        <div className="flex justify-between text-xs">
                          <span className="font-medium text-[#181415]">
                            {row.category} ({row.sku_count} SKUs)
                          </span>
                          <span className="font-mono font-semibold tabular-nums">
                            {formatINR(row.est_sales || 0)}
                          </span>
                        </div>
                        <div className="h-2 w-full bg-[#F3ECEA]">
                          <div className="h-full bg-[#D62865]" style={{ width: `${widthPct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* PRODUCTS & INVENTORY */}
          {tab === 'products' && (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h1 className="font-editorial text-3xl font-semibold">Products &amp; Inventory</h1>
                  <p className="text-xs text-[#6D6366]">
                    Manage catalogue pricing, discounts, multi-image galleries, and stock levels
                  </p>
                </div>
                <button
                  type="button"
                  onClick={openNewProductModal}
                  className="inline-flex items-center gap-2 bg-[#D62865] px-5 py-2.5 text-xs font-semibold tracking-wider text-white uppercase hover:bg-[#B81D53]"
                >
                  <Plus className="h-4 w-4" />
                  <span>Add New Product</span>
                </button>
              </div>

              <div className="overflow-x-auto border border-[#EAE3E0] bg-white">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-[#EAE3E0] bg-[#FAF8F7] text-[#6D6366] uppercase">
                    <tr>
                      <th className="px-4 py-3">Product</th>
                      <th className="px-4 py-3">Category</th>
                      <th className="px-4 py-3 text-right">MRP</th>
                      <th className="px-4 py-3 text-right">Sale Price</th>
                      <th className="px-4 py-3 text-right">Stock</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F3ECEA]">
                    {products.map((p) => (
                      <tr key={p.id} className="hover:bg-[#FAF8F7]/60">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <img
                              src={p.images[0]}
                              alt={p.title}
                              className="h-11 w-9 shrink-0 object-cover bg-[#FAF8F7]"
                            />
                            <div>
                              <p className="font-semibold text-[#181415]">{p.title}</p>
                              <p className="font-mono text-[11px] text-[#6D6366]">
                                {p.sku} · {p.collection_tag}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-[#4A4143]">
                          {p.category} / {p.subcategory}
                        </td>
                        <td className="px-4 py-3 text-right font-mono tabular-nums text-[#8E8285]">
                          {formatINR(p.original_price)}
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-semibold tabular-nums">
                          {formatINR(p.discounted_price)} ({p.discount_percent}%)
                        </td>
                        <td className="px-4 py-3 text-right font-mono tabular-nums">
                          <span className={p.stock <= 10 ? 'font-bold text-[#DC2626]' : 'text-[#16A34A]'}>
                            {p.stock}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="inline-flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingProduct(p);
                                setProductModalOpen(true);
                              }}
                              aria-label={`Edit ${p.title}`}
                              className="p-1.5 text-[#181415] hover:text-[#D62865]"
                            >
                              <Edit3 className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteProduct(p.id)}
                              aria-label={`Delete ${p.title}`}
                              className="p-1.5 text-[#8E8285] hover:text-[#DC2626]"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ORDERS */}
          {tab === 'orders' && (
            <div className="space-y-6">
              <h1 className="font-editorial text-3xl font-semibold">Customer Orders</h1>
              <div className="overflow-x-auto border border-[#EAE3E0] bg-white">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-[#EAE3E0] bg-[#FAF8F7] text-[#6D6366] uppercase">
                    <tr>
                      <th className="px-4 py-3">Order #</th>
                      <th className="px-4 py-3">Customer</th>
                      <th className="px-4 py-3">Items</th>
                      <th className="px-4 py-3">Payment</th>
                      <th className="px-4 py-3 text-right">Total</th>
                      <th className="px-4 py-3">Update Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F3ECEA]">
                    {orders.map((o) => (
                      <tr key={o.id}>
                        <td className="px-4 py-3 font-mono font-semibold">{o.order_number}</td>
                        <td className="px-4 py-3">
                          <p className="font-semibold text-[#181415]">{o.customer_name}</p>
                          <p className="text-[#6D6366]">{o.customer_phone} · {o.shipping_address.city}</p>
                        </td>
                        <td className="px-4 py-3 max-w-xs truncate">
                          {o.items.map((i) => `${i.title} (x${i.quantity})`).join(', ')}
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-semibold">{o.payment_method}</span>
                          <span className="block text-[11px] text-[#6D6366]">{o.payment_status}</span>
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-semibold tabular-nums">
                          {formatINR(o.total_amount)}
                        </td>
                        <td className="px-4 py-3">
                          <select
                            value={o.order_status}
                            onChange={(e) => handleOrderStatusChange(o.id, e.target.value)}
                            className="border border-[#E2D8D5] bg-white px-2.5 py-1.5 text-xs font-semibold"
                          >
                            {['PLACED', 'CONFIRMED', 'PACKED', 'SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED'].map(
                              (st) => (
                                <option key={st} value={st}>
                                  {st}
                                </option>
                              )
                            )}
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* CATEGORIES */}
          {tab === 'categories' && (
            <div className="space-y-6">
              <h1 className="font-editorial text-3xl font-semibold">Categories Management</h1>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  await apiFetch('/api/admin/categories', { method: 'POST', body: JSON.stringify(newCat) });
                  setNewCat({ ...newCat, name: '' });
                  notify('Category added');
                  await loadAllAdminData();
                  onDataMutated();
                }}
                className="flex flex-wrap gap-3 border border-[#EAE3E0] bg-white p-4"
              >
                <input
                  type="text"
                  required
                  placeholder="Category Name (e.g. Bridal Lehengas)"
                  value={newCat.name}
                  onChange={(e) => setNewCat({ ...newCat, name: e.target.value })}
                  className="flex-1 min-w-48 border border-[#E2D8D5] px-3 py-2 text-xs"
                />
                <select
                  value={newCat.parent_group}
                  onChange={(e) => setNewCat({ ...newCat, parent_group: e.target.value })}
                  className="border border-[#E2D8D5] px-3 py-2 text-xs"
                >
                  {['Women', 'Men', 'Kids', 'Beauty', 'Footwear', 'Jewellery', 'Accessories', 'Home & Living'].map(
                    (g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    )
                  )}
                </select>
                <button
                  type="submit"
                  className="bg-[#181415] px-5 py-2 text-xs font-semibold text-white uppercase hover:bg-[#D62865]"
                >
                  Add Category
                </button>
              </form>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {categories.map((c) => (
                  <div key={c.id} className="flex items-center justify-between border border-[#EAE3E0] bg-white p-4">
                    <div className="flex items-center gap-3">
                      <img src={c.image} alt={c.name} className="h-12 w-10 object-cover" />
                      <div>
                        <p className="text-sm font-semibold">{c.name}</p>
                        <p className="text-xs text-[#6D6366]">
                          {c.parent_group} · {c.product_count ?? 0} products
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={async () => {
                        await apiFetch(`/api/admin/categories/${c.id}`, { method: 'DELETE' });
                        notify('Category deleted');
                        await loadAllAdminData();
                        onDataMutated();
                      }}
                      className="text-[#8E8285] hover:text-[#DC2626]"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* CUSTOMERS */}
          {tab === 'customers' && (
            <div className="space-y-6">
              <h1 className="font-editorial text-3xl font-semibold">Customers Directory</h1>
              <div className="overflow-x-auto border border-[#EAE3E0] bg-white">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-[#EAE3E0] bg-[#FAF8F7] text-[#6D6366] uppercase">
                    <tr>
                      <th className="px-4 py-3">Name</th>
                      <th className="px-4 py-3">Email</th>
                      <th className="px-4 py-3">Phone</th>
                      <th className="px-4 py-3">Role</th>
                      <th className="px-4 py-3 text-right">Orders</th>
                      <th className="px-4 py-3 text-right">Lifetime Spend</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F3ECEA]">
                    {customers.map((c) => (
                      <tr key={c.id}>
                        <td className="px-4 py-3 font-semibold">{c.name}</td>
                        <td className="px-4 py-3">{c.email}</td>
                        <td className="px-4 py-3 font-mono">{c.phone || '—'}</td>
                        <td className="px-4 py-3 uppercase">{c.role}</td>
                        <td className="px-4 py-3 text-right font-mono tabular-nums">{c.order_count}</td>
                        <td className="px-4 py-3 text-right font-mono font-semibold tabular-nums">
                          {formatINR(c.total_spent)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* COUPONS */}
          {tab === 'coupons' && (
            <div className="space-y-6">
              <h1 className="font-editorial text-3xl font-semibold">Discount Coupons</h1>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  await apiFetch('/api/admin/coupons', { method: 'POST', body: JSON.stringify(newCoupon) });
                  setNewCoupon({ ...newCoupon, code: '', description: '' });
                  notify('Coupon created');
                  await loadAllAdminData();
                }}
                className="grid grid-cols-1 gap-3 border border-[#EAE3E0] bg-white p-5 sm:grid-cols-3"
              >
                <input
                  type="text"
                  required
                  placeholder="Code (e.g. LUXE25)"
                  value={newCoupon.code}
                  onChange={(e) => setNewCoupon({ ...newCoupon, code: e.target.value.toUpperCase() })}
                  className="border border-[#E2D8D5] px-3 py-2 text-xs font-mono uppercase"
                />
                <select
                  value={newCoupon.discount_type}
                  onChange={(e) => setNewCoupon({ ...newCoupon, discount_type: e.target.value })}
                  className="border border-[#E2D8D5] px-3 py-2 text-xs"
                >
                  <option value="percent">Percentage (%)</option>
                  <option value="flat">Flat INR (₹)</option>
                </select>
                <input
                  type="number"
                  required
                  placeholder="Value"
                  value={newCoupon.discount_value}
                  onChange={(e) => setNewCoupon({ ...newCoupon, discount_value: Number(e.target.value) })}
                  className="border border-[#E2D8D5] px-3 py-2 text-xs"
                />
                <input
                  type="number"
                  placeholder="Min Order ₹"
                  value={newCoupon.min_order}
                  onChange={(e) => setNewCoupon({ ...newCoupon, min_order: Number(e.target.value) })}
                  className="border border-[#E2D8D5] px-3 py-2 text-xs"
                />
                <input
                  type="text"
                  placeholder="Description"
                  value={newCoupon.description}
                  onChange={(e) => setNewCoupon({ ...newCoupon, description: e.target.value })}
                  className="border border-[#E2D8D5] px-3 py-2 text-xs"
                />
                <button
                  type="submit"
                  className="bg-[#D62865] py-2 text-xs font-semibold text-white uppercase hover:bg-[#B81D53]"
                >
                  Create Coupon
                </button>
              </form>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {coupons.map((cp) => (
                  <div key={cp.id} className="flex items-center justify-between border border-[#EAE3E0] bg-white p-4">
                    <div>
                      <p className="font-mono text-sm font-bold text-[#D62865]">{cp.code}</p>
                      <p className="text-xs text-[#4A4143]">{cp.description}</p>
                      <p className="mt-1 text-[11px] text-[#6D6366] tabular-nums">
                        Min order {formatINR(cp.min_order)} · Used {cp.usage_count} times
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={async () => {
                          await apiFetch(`/api/admin/coupons/${cp.id}/toggle`, { method: 'PUT' });
                          await loadAllAdminData();
                        }}
                        className={`px-3 py-1 text-xs font-semibold ${
                          cp.active ? 'bg-[#16A34A]/10 text-[#16A34A]' : 'bg-neutral-200 text-neutral-600'
                        }`}
                      >
                        {cp.active ? 'Active' : 'Paused'}
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          await apiFetch(`/api/admin/coupons/${cp.id}`, { method: 'DELETE' });
                          await loadAllAdminData();
                        }}
                        className="text-[#8E8285] hover:text-[#DC2626]"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* BANNERS */}
          {tab === 'banners' && (
            <div className="space-y-6">
              <h1 className="font-editorial text-3xl font-semibold">Homepage Banners</h1>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  await apiFetch('/api/admin/banners', { method: 'POST', body: JSON.stringify(newBanner) });
                  setNewBanner({ ...newBanner, title: '', subtitle: '' });
                  notify('Banner published');
                  await loadAllAdminData();
                  onDataMutated();
                }}
                className="grid grid-cols-1 gap-3 border border-[#EAE3E0] bg-white p-5 sm:grid-cols-2"
              >
                <input
                  type="text"
                  required
                  placeholder="Banner Headline"
                  value={newBanner.title}
                  onChange={(e) => setNewBanner({ ...newBanner, title: e.target.value })}
                  className="border border-[#E2D8D5] px-3 py-2 text-xs"
                />
                <select
                  value={newBanner.placement}
                  onChange={(e) => setNewBanner({ ...newBanner, placement: e.target.value })}
                  className="border border-[#E2D8D5] px-3 py-2 text-xs"
                >
                  <option value="hero">Hero Banner (Top)</option>
                  <option value="promo">Promotional Banner (Mid-Page)</option>
                </select>
                <input
                  type="text"
                  placeholder="Subtitle / Offer text"
                  value={newBanner.subtitle}
                  onChange={(e) => setNewBanner({ ...newBanner, subtitle: e.target.value })}
                  className="sm:col-span-2 border border-[#E2D8D5] px-3 py-2 text-xs"
                />
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Image URL"
                    value={newBanner.image_url}
                    onChange={(e) => setNewBanner({ ...newBanner, image_url: e.target.value })}
                    className="flex-1 border border-[#E2D8D5] px-3 py-2 text-xs"
                  />
                  <label className="cursor-pointer border border-[#181415] px-3 py-2 text-xs font-semibold hover:bg-[#181415] hover:text-white">
                    Upload
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleMultiImageUpload(e, 'banner')}
                      className="hidden"
                    />
                  </label>
                </div>
                <button
                  type="submit"
                  className="bg-[#181415] py-2 text-xs font-semibold text-white uppercase hover:bg-[#D62865]"
                >
                  Publish Banner
                </button>
              </form>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {banners.map((b) => (
                  <div key={b.id} className="border border-[#EAE3E0] bg-white overflow-hidden">
                    <img src={b.image_url} alt={b.title} className="h-44 w-full object-cover" />
                    <div className="p-4 flex items-start justify-between gap-4">
                      <div>
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-[#D62865]">
                          {b.placement}
                        </span>
                        <h3 className="font-semibold text-sm">{b.title}</h3>
                        <p className="mt-1 text-xs text-[#6D6366] line-clamp-2">{b.subtitle}</p>
                      </div>
                      <button
                        type="button"
                        onClick={async () => {
                          await apiFetch(`/api/admin/banners/${b.id}`, { method: 'DELETE' });
                          await loadAllAdminData();
                          onDataMutated();
                        }}
                        className="text-[#8E8285] hover:text-[#DC2626]"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add / Edit Product Modal with Multi-Image Upload */}
      {productModalOpen && editingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="relative max-h-[92vh] w-full max-w-2xl overflow-y-auto bg-white p-6 shadow-2xl izho-scroll">
            <button
              type="button"
              onClick={() => setProductModalOpen(false)}
              className="absolute top-4 right-4 p-2 text-[#6D6366]"
            >
              <X className="h-5 w-5" />
            </button>

            <h2 className="font-editorial text-2xl font-semibold">
              {editingProduct.id ? 'Edit Product' : 'Add New Product'}
            </h2>

            <form onSubmit={handleSaveProduct} className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-[#4A4143]">Product Title *</label>
                <input
                  type="text"
                  required
                  value={editingProduct.title || ''}
                  onChange={(e) => setEditingProduct({ ...editingProduct, title: e.target.value })}
                  className="mt-1 w-full border border-[#E2D8D5] px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#4A4143]">Brand</label>
                <input
                  type="text"
                  value={editingProduct.brand || ''}
                  onChange={(e) => setEditingProduct({ ...editingProduct, brand: e.target.value })}
                  className="mt-1 w-full border border-[#E2D8D5] px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#4A4143]">Collection Tag</label>
                <select
                  value={editingProduct.collection_tag || 'New Arrival'}
                  onChange={(e) =>
                    setEditingProduct({ ...editingProduct, collection_tag: e.target.value as any })
                  }
                  className="mt-1 w-full border border-[#E2D8D5] px-3 py-2 text-sm"
                >
                  {['Trending', 'Best Seller', 'New Arrival', 'Exclusive'].map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-[#4A4143]">Department</label>
                <select
                  value={editingProduct.category || 'Women'}
                  onChange={(e) => setEditingProduct({ ...editingProduct, category: e.target.value })}
                  className="mt-1 w-full border border-[#E2D8D5] px-3 py-2 text-sm"
                >
                  {['Women', 'Men', 'Kids', 'Beauty', 'Footwear', 'Jewellery', 'Accessories', 'Home & Living'].map(
                    (c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    )
                  )}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-[#4A4143]">Subcategory</label>
                <input
                  type="text"
                  required
                  value={editingProduct.subcategory || ''}
                  onChange={(e) => setEditingProduct({ ...editingProduct, subcategory: e.target.value })}
                  className="mt-1 w-full border border-[#E2D8D5] px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#4A4143]">Original MRP (₹) *</label>
                <input
                  type="number"
                  required
                  value={editingProduct.original_price || 0}
                  onChange={(e) =>
                    setEditingProduct({ ...editingProduct, original_price: Number(e.target.value) })
                  }
                  className="mt-1 w-full border border-[#E2D8D5] px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#4A4143]">Discounted Price (₹) *</label>
                <input
                  type="number"
                  required
                  value={editingProduct.discounted_price || 0}
                  onChange={(e) =>
                    setEditingProduct({ ...editingProduct, discounted_price: Number(e.target.value) })
                  }
                  className="mt-1 w-full border border-[#E2D8D5] px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#4A4143]">Stock Quantity</label>
                <input
                  type="number"
                  required
                  value={editingProduct.stock ?? 25}
                  onChange={(e) => setEditingProduct({ ...editingProduct, stock: Number(e.target.value) })}
                  className="mt-1 w-full border border-[#E2D8D5] px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#4A4143]">Sizes (comma-separated)</label>
                <input
                  type="text"
                  value={(editingProduct.sizes || []).join(', ')}
                  onChange={(e) =>
                    setEditingProduct({
                      ...editingProduct,
                      sizes: e.target.value
                        .split(',')
                        .map((s) => s.trim())
                        .filter(Boolean),
                    })
                  }
                  className="mt-1 w-full border border-[#E2D8D5] px-3 py-2 text-sm"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-[#4A4143]">Description</label>
                <textarea
                  rows={3}
                  value={editingProduct.description || ''}
                  onChange={(e) => setEditingProduct({ ...editingProduct, description: e.target.value })}
                  className="mt-1 w-full border border-[#E2D8D5] px-3 py-2 text-sm"
                />
              </div>

              {/* Multi-Image Upload & Gallery */}
              <div className="sm:col-span-2 border border-[#EAE3E0] bg-[#FAF8F7] p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider">
                    Product Images ({editingProduct.images?.length || 0})
                  </span>
                  <label className="inline-flex cursor-pointer items-center gap-1.5 bg-[#181415] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#D62865]">
                    <Upload className="h-3.5 w-3.5" />
                    <span>{uploadingImages ? 'Uploading...' : 'Upload Multiple Images'}</span>
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={(e) => handleMultiImageUpload(e, 'product')}
                      className="hidden"
                    />
                  </label>
                </div>

                <div className="flex flex-wrap gap-3">
                  {(editingProduct.images || []).map((img, i) => (
                    <div key={i} className="relative h-20 w-16 border border-[#E2D8D5] bg-white">
                      <img src={img} alt="" className="h-full w-full object-cover" />
                      <button
                        type="button"
                        onClick={() =>
                          setEditingProduct({
                            ...editingProduct,
                            images: (editingProduct.images || []).filter((_, idx) => idx !== i),
                          })
                        }
                        className="absolute -top-2 -right-2 rounded-full bg-[#181415] p-0.5 text-white"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="sm:col-span-2 flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setProductModalOpen(false)}
                  className="border border-[#E2D8D5] px-5 py-2.5 text-xs font-semibold uppercase"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-[#D62865] px-6 py-2.5 text-xs font-semibold text-white uppercase hover:bg-[#B81D53]"
                >
                  Save Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
