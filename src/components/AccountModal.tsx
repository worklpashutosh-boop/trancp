import { LogOut, MapPin, Package, ShieldCheck, Trash2, X } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import type { Address, AppView, Order, User } from '../types';
import { apiFetch, formatINR, setStoredToken } from '../utils/api';

interface AccountModalProps {
  open: boolean;
  user: User | null;
  onClose: () => void;
  onAuthSuccess: (user: User, token: string) => void;
  onLogout: () => void;
  onNavigate: (view: AppView) => void;
}

export function AccountModal({
  open,
  user,
  onClose,
  onAuthSuccess,
  onLogout,
  onNavigate,
}: AccountModalProps) {
  const [authTab, setAuthTab] = useState<'login' | 'register'>('login');
  const [profileTab, setProfileTab] = useState<'orders' | 'addresses'>('orders');

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [orders, setOrders] = useState<Order[]>([]);
  const [addresses, setAddresses] = useState<Address[]>([]);

  const [newAddr, setNewAddr] = useState({
    full_name: '',
    phone: '',
    line1: '',
    line2: '',
    city: '',
    state: '',
    pincode: '',
  });

  useEffect(() => {
    if (!open || !user) return;
    apiFetch<{ orders: Order[] }>('/api/orders/my')
      .then((res) => setOrders(res.orders))
      .catch(() => {});
    apiFetch<{ addresses: Address[] }>('/api/addresses')
      .then((res) => setAddresses(res.addresses))
      .catch(() => {});
  }, [open, user]);

  if (!open) return null;

  const submitAuth = async (e: FormEvent, overrideEmail?: string, overridePassword?: string) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const endpoint = authTab === 'login' || overrideEmail ? '/api/auth/login' : '/api/auth/register';
      const body =
        authTab === 'login' || overrideEmail
          ? { email: overrideEmail || email, password: overridePassword || password }
          : { name, email, phone, password };

      const res = await apiFetch<{ token: string; user: User }>(endpoint, {
        method: 'POST',
        body: JSON.stringify(body),
      });
      setStoredToken(res.token);
      onAuthSuccess(res.user, res.token);
      if (res.user.role === 'admin') {
        onClose();
        onNavigate({ name: 'admin' });
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddAddress = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiFetch<{ addresses: Address[] }>('/api/addresses', {
        method: 'POST',
        body: JSON.stringify({ ...newAddr, is_default: addresses.length === 0 }),
      });
      setAddresses(res.addresses);
      setNewAddr({ full_name: '', phone: '', line1: '', line2: '', city: '', state: '', pincode: '' });
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDeleteAddress = async (id: number) => {
    const res = await apiFetch<{ addresses: Address[] }>(`/api/addresses/${id}`, { method: 'DELETE' });
    setAddresses(res.addresses);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto bg-white p-6 sm:p-8 shadow-2xl izho-scroll">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close account modal"
          className="absolute top-5 right-5 p-2 text-[#6D6366] hover:text-[#181415]"
        >
          <X className="h-5 w-5" />
        </button>

        {!user ? (
          <div>
            <p className="text-xs font-semibold tracking-[0.2em] text-[#D62865] uppercase">
              IZHO Atelier Membership
            </p>
            <h2 className="mt-1 font-editorial text-3xl font-semibold text-[#181415]">
              {authTab === 'login' ? 'Sign In to Your Account' : 'Create an IZHO Account'}
            </h2>

            <div className="mt-5 flex border-b border-[#EAE3E0]">
              <button
                type="button"
                onClick={() => {
                  setAuthTab('login');
                  setError('');
                }}
                className={`px-5 py-2.5 text-xs font-semibold uppercase tracking-wider border-b-2 ${
                  authTab === 'login'
                    ? 'border-[#D62865] text-[#D62865]'
                    : 'border-transparent text-[#6D6366]'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthTab('register');
                  setError('');
                }}
                className={`px-5 py-2.5 text-xs font-semibold uppercase tracking-wider border-b-2 ${
                  authTab === 'register'
                    ? 'border-[#D62865] text-[#D62865]'
                    : 'border-transparent text-[#6D6366]'
                }`}
              >
                Register
              </button>
            </div>

            <form onSubmit={(e) => submitAuth(e)} className="mt-6 space-y-4">
              {authTab === 'register' && (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-medium text-[#4A4143]">Full Name</label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="mt-1 w-full border border-[#E2D8D5] px-3 py-2.5 text-sm focus:border-[#D62865] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#4A4143]">Phone Number</label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="mt-1 w-full border border-[#E2D8D5] px-3 py-2.5 text-sm focus:border-[#D62865] focus:outline-none"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-[#4A4143]">Email Address</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 w-full border border-[#E2D8D5] px-3 py-2.5 text-sm focus:border-[#D62865] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#4A4143]">Password</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1 w-full border border-[#E2D8D5] px-3 py-2.5 text-sm focus:border-[#D62865] focus:outline-none"
                />
              </div>

              {error && <p className="text-xs font-medium text-[#DC2626]">{error}</p>}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#181415] py-3.5 text-xs font-semibold tracking-wider text-white uppercase hover:bg-[#D62865]"
              >
                {loading ? 'Please wait...' : authTab === 'login' ? 'Sign In' : 'Create Account'}
              </button>
            </form>

            {/* Quick Access Credentials for Store Owner & Demo Customer */}
            <div className="mt-6 border-t border-[#EAE3E0] pt-5">
              <p className="text-[11px] font-semibold tracking-wider text-[#6D6366] uppercase">
                Quick Access Accounts
              </p>
              <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={(e) => submitAuth(e, 'ananya@izho.in', 'Customer@2026')}
                  className="border border-[#E2D8D5] bg-[#FAF8F7] px-3 py-2.5 text-left text-xs hover:border-[#181415]"
                >
                  <span className="block font-semibold text-[#181415]">Customer Sign-In</span>
                  <span className="text-[#6D6366]">ananya@izho.in</span>
                </button>
                <button
                  type="button"
                  onClick={(e) => submitAuth(e, 'kolhapurpan1@gmail.com', 'IzhoAdmin@2026')}
                  className="border border-[#E2D8D5] bg-[#FDF2F5] px-3 py-2.5 text-left text-xs hover:border-[#D62865]"
                >
                  <span className="block font-semibold text-[#D62865]">Owner Admin Dashboard</span>
                  <span className="text-[#6D6366]">kolhapurpan1@gmail.com</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div>
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#EAE3E0] pb-4 pr-8">
              <div>
                <p className="text-xs font-semibold tracking-wider text-[#D62865] uppercase">
                  {user.role === 'admin' ? 'Store Owner / Admin' : 'Verified Member'}
                </p>
                <h2 className="font-editorial text-2xl font-semibold text-[#181415]">{user.name}</h2>
                <p className="text-xs text-[#6D6366]">{user.email}</p>
              </div>
              <div className="flex items-center gap-2">
                {user.role === 'admin' && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onNavigate({ name: 'admin' });
                    }}
                    className="inline-flex items-center gap-1.5 bg-[#D62865] px-4 py-2 text-xs font-semibold text-white hover:bg-[#B81D53]"
                  >
                    <ShieldCheck className="h-3.5 w-3.5" />
                    <span>Open Admin Panel</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={onLogout}
                  className="inline-flex items-center gap-1.5 border border-[#E2D8D5] px-3 py-2 text-xs font-semibold text-[#181415] hover:border-[#181415]"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>

            <div className="mt-4 flex gap-4 border-b border-[#EAE3E0]">
              <button
                type="button"
                onClick={() => setProfileTab('orders')}
                className={`flex items-center gap-1.5 border-b-2 pb-2.5 text-xs font-semibold uppercase tracking-wider ${
                  profileTab === 'orders'
                    ? 'border-[#D62865] text-[#D62865]'
                    : 'border-transparent text-[#6D6366]'
                }`}
              >
                <Package className="h-3.5 w-3.5" />
                <span>My Orders ({orders.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setProfileTab('addresses')}
                className={`flex items-center gap-1.5 border-b-2 pb-2.5 text-xs font-semibold uppercase tracking-wider ${
                  profileTab === 'addresses'
                    ? 'border-[#D62865] text-[#D62865]'
                    : 'border-transparent text-[#6D6366]'
                }`}
              >
                <MapPin className="h-3.5 w-3.5" />
                <span>Address Book ({addresses.length})</span>
              </button>
            </div>

            {profileTab === 'orders' ? (
              <div className="mt-5 space-y-4">
                {orders.length === 0 ? (
                  <p className="text-sm text-[#6D6366]">You have not placed any orders yet.</p>
                ) : (
                  orders.map((ord) => (
                    <div key={ord.id} className="border border-[#EAE3E0] p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#F3ECEA] pb-2.5 text-xs">
                        <span className="font-mono font-semibold text-[#181415]">{ord.order_number}</span>
                        <span className="font-semibold text-[#D62865]">{ord.order_status}</span>
                        <span className="font-semibold tabular-nums">{formatINR(ord.total_amount)}</span>
                      </div>
                      <div className="mt-3 flex items-center justify-between gap-4">
                        <p className="text-xs text-[#4A4143]">
                          {ord.items.map((i) => `${i.title} (x${i.quantity})`).join(', ')}
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            onClose();
                            onNavigate({ name: 'track', orderNumber: ord.order_number });
                          }}
                          className="shrink-0 text-xs font-semibold text-[#181415] underline hover:text-[#D62865]"
                        >
                          Track
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            ) : (
              <div className="mt-5 space-y-6">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {addresses.map((addr) => (
                    <div key={addr.id} className="relative border border-[#EAE3E0] p-4 text-xs">
                      <button
                        type="button"
                        onClick={() => handleDeleteAddress(addr.id)}
                        aria-label="Delete address"
                        className="absolute top-3 right-3 text-[#8E8285] hover:text-[#DC2626]"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                      <p className="font-semibold text-[#181415]">{addr.full_name}</p>
                      <p className="mt-1 text-[#4A4143]">{addr.line1}</p>
                      <p className="text-[#4A4143]">
                        {addr.city}, {addr.state} — {addr.pincode}
                      </p>
                      <p className="mt-1 text-[#6D6366]">{addr.phone}</p>
                    </div>
                  ))}
                </div>

                <form onSubmit={handleAddAddress} className="border border-[#EAE3E0] bg-[#FAF8F7] p-4 space-y-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-[#181415]">
                    Add New Address
                  </h3>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <input
                      type="text"
                      required
                      placeholder="Full Name"
                      value={newAddr.full_name}
                      onChange={(e) => setNewAddr({ ...newAddr, full_name: e.target.value })}
                      className="border border-[#E2D8D5] bg-white px-3 py-2 text-xs"
                    />
                    <input
                      type="tel"
                      required
                      placeholder="Phone Number"
                      value={newAddr.phone}
                      onChange={(e) => setNewAddr({ ...newAddr, phone: e.target.value })}
                      className="border border-[#E2D8D5] bg-white px-3 py-2 text-xs"
                    />
                    <input
                      type="text"
                      required
                      placeholder="Address Line 1"
                      value={newAddr.line1}
                      onChange={(e) => setNewAddr({ ...newAddr, line1: e.target.value })}
                      className="sm:col-span-2 border border-[#E2D8D5] bg-white px-3 py-2 text-xs"
                    />
                    <input
                      type="text"
                      required
                      placeholder="City"
                      value={newAddr.city}
                      onChange={(e) => setNewAddr({ ...newAddr, city: e.target.value })}
                      className="border border-[#E2D8D5] bg-white px-3 py-2 text-xs"
                    />
                    <input
                      type="text"
                      required
                      placeholder="State"
                      value={newAddr.state}
                      onChange={(e) => setNewAddr({ ...newAddr, state: e.target.value })}
                      className="border border-[#E2D8D5] bg-white px-3 py-2 text-xs"
                    />
                    <input
                      type="text"
                      required
                      maxLength={6}
                      placeholder="PIN Code"
                      value={newAddr.pincode}
                      onChange={(e) => setNewAddr({ ...newAddr, pincode: e.target.value.replace(/\D/g, '') })}
                      className="border border-[#E2D8D5] bg-white px-3 py-2 text-xs"
                    />
                    <button
                      type="submit"
                      className="bg-[#181415] py-2 text-xs font-semibold text-white uppercase hover:bg-[#D62865]"
                    >
                      Save Address
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
