import { CheckCircle2, CreditCard, Lock, ShieldCheck, Tag, Truck, X } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import type { Address, AppView, CartItem, Order, User } from '../types';
import { apiFetch, formatINR } from '../utils/api';

declare global {
  interface Window {
    Razorpay?: any;
  }
}

interface CheckoutViewProps {
  items: CartItem[];
  user: User | null;
  onClearCart: () => void;
  onNavigate: (view: AppView) => void;
}

export function CheckoutView({ items, user, onClearCart, onNavigate }: CheckoutViewProps) {
  const [savedAddresses, setSavedAddresses] = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<number | 'new'>('new');

  const [fullName, setFullName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [line1, setLine1] = useState('');
  const [line2, setLine2] = useState('');
  const [city, setCity] = useState('');
  const [stateName, setStateName] = useState('');
  const [pincode, setPincode] = useState('');
  const [saveAddress, setSaveAddress] = useState(true);

  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discountAmount: number } | null>(null);
  const [couponMsg, setCouponMsg] = useState('');
  const [availableCoupons, setAvailableCoupons] = useState<any[]>([]);

  const [paymentMethod, setPaymentMethod] = useState<'RAZORPAY' | 'COD'>('RAZORPAY');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [confirmedOrder, setConfirmedOrder] = useState<Order | null>(null);

  // Razorpay Sandbox Modal State (when live RAZORPAY_KEY_ID is not configured)
  const [rzpModal, setRzpModal] = useState<{
    orderId: string;
    amount: number;
    tab: 'upi' | 'card' | 'netbanking';
    upiId: string;
  } | null>(null);

  useEffect(() => {
    apiFetch<{ coupons: any[] }>('/api/coupons/active')
      .then((res) => setAvailableCoupons(res.coupons))
      .catch(() => {});

    if (user) {
      setFullName((v) => v || user.name);
      setEmail((v) => v || user.email);
      setPhone((v) => v || user.phone || '');
      apiFetch<{ addresses: Address[] }>('/api/addresses')
        .then((res) => {
          setSavedAddresses(res.addresses);
          if (res.addresses.length > 0) {
            const def = res.addresses[0];
            setSelectedAddressId(def.id);
          }
        })
        .catch(() => {});
    }
  }, [user]);

  const subtotal = items.reduce((sum, i) => sum + i.product.discounted_price * i.quantity, 0);
  const discount = appliedCoupon?.discountAmount || 0;
  const afterDiscount = Math.max(0, subtotal - discount);
  const shippingFee = afterDiscount >= 1999 || items.length === 0 ? 0 : 99;
  const totalAmount = afterDiscount + shippingFee;

  const handleApplyCoupon = async (codeOverride?: string) => {
    const codeToTry = (codeOverride ?? couponInput).trim().toUpperCase();
    if (!codeToTry) return;
    setCouponMsg('');
    try {
      const res = await apiFetch<{ code: string; discountAmount: number; description: string }>(
        '/api/coupons/validate',
        {
          method: 'POST',
          body: JSON.stringify({ code: codeToTry, subtotal }),
        }
      );
      setAppliedCoupon({ code: res.code, discountAmount: res.discountAmount });
      setCouponInput(res.code);
      setCouponMsg(`Applied ${res.code} — You save ${formatINR(res.discountAmount)}`);
    } catch (err: any) {
      setAppliedCoupon(null);
      setCouponMsg(err.message);
    }
  };

  const getShippingAddressPayload = () => {
    if (selectedAddressId !== 'new') {
      const addr = savedAddresses.find((a) => a.id === selectedAddressId);
      if (addr) return addr;
    }
    return {
      full_name: fullName,
      phone,
      line1,
      line2,
      city,
      state: stateName,
      pincode,
    };
  };

  const finalizeOrder = async (rzpPayment?: {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
  }) => {
    setSubmitting(true);
    setErrorMsg('');
    try {
      const shippingAddr = getShippingAddressPayload();
      if (user && selectedAddressId === 'new' && saveAddress) {
        await apiFetch('/api/addresses', {
          method: 'POST',
          body: JSON.stringify({ ...shippingAddr, is_default: savedAddresses.length === 0 }),
        }).catch(() => {});
      }

      const res = await apiFetch<{ order: Order }>('/api/orders', {
        method: 'POST',
        body: JSON.stringify({
          customer_name: shippingAddr.full_name || fullName,
          customer_email: email,
          customer_phone: shippingAddr.phone || phone,
          shipping_address: shippingAddr,
          items: items.map((i) => ({
            product_id: i.product.id,
            size: i.size,
            color: i.color,
            quantity: i.quantity,
          })),
          coupon_code: appliedCoupon?.code || '',
          payment_method: paymentMethod,
          ...(rzpPayment || {}),
        }),
      });

      setConfirmedOrder(res.order);
      onClearCart();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCheckoutSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    const addr = getShippingAddressPayload();
    if (!addr.full_name || !email || !addr.phone || !addr.line1 || !addr.city || !addr.state || !addr.pincode) {
      setErrorMsg('Please complete all required shipping address and contact fields.');
      return;
    }

    if (paymentMethod === 'COD') {
      await finalizeOrder();
      return;
    }

    // Razorpay flow
    setSubmitting(true);
    try {
      const rzpOrder = await apiFetch<{
        mode: 'live' | 'simulated';
        keyId: string;
        orderId: string;
        amount: number;
        currency: string;
      }>('/api/payments/razorpay/order', {
        method: 'POST',
        body: JSON.stringify({ amount: totalAmount }),
      });

      if (rzpOrder.mode === 'live' && window.Razorpay) {
        const options = {
          key: rzpOrder.keyId,
          amount: rzpOrder.amount,
          currency: rzpOrder.currency,
          name: 'IZHO Fashion',
          description: 'IZHO Atelier Order Payment',
          order_id: rzpOrder.orderId,
          prefill: { name: addr.full_name, email, contact: addr.phone },
          theme: { color: '#D62865' },
          handler: async (response: any) => {
            await finalizeOrder({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });
          },
          modal: {
            ondismiss: () => setSubmitting(false),
          },
        };
        const instance = new window.Razorpay(options);
        instance.open();
      } else {
        setSubmitting(false);
        setRzpModal({
          orderId: rzpOrder.orderId,
          amount: totalAmount,
          tab: 'upi',
          upiId: 'izho.customer@okhdfcbank',
        });
      }
    } catch (err: any) {
      setSubmitting(false);
      setErrorMsg(err.message);
    }
  };

  if (confirmedOrder) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-14 sm:px-8">
        <div className="border border-[#EAE3E0] bg-white p-8 sm:p-10">
          <div className="flex items-center gap-3 text-[#16A34A]">
            <CheckCircle2 className="h-8 w-8" />
            <div>
              <p className="text-xs font-semibold tracking-wider uppercase">Order Confirmed</p>
              <h1 className="font-editorial text-3xl font-semibold text-[#181415]">
                Thank you, {confirmedOrder.customer_name}
              </h1>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 border-y border-[#EAE3E0] bg-[#FAF8F7] p-5 sm:grid-cols-3 text-xs">
            <div>
              <p className="text-[#6D6366] uppercase">Order Number</p>
              <p className="mt-1 font-mono text-sm font-semibold text-[#181415]">
                {confirmedOrder.order_number}
              </p>
            </div>
            <div>
              <p className="text-[#6D6366] uppercase">Payment Method</p>
              <p className="mt-1 font-semibold text-[#181415]">
                {confirmedOrder.payment_method} ({confirmedOrder.payment_status})
              </p>
            </div>
            <div>
              <p className="text-[#6D6366] uppercase">Total Paid / Payable</p>
              <p className="mt-1 font-semibold text-[#181415] tabular-nums">
                {formatINR(confirmedOrder.total_amount)}
              </p>
            </div>
          </div>

          <div className="mt-6 space-y-3">
            <h2 className="text-xs font-semibold tracking-wider text-[#181415] uppercase">
              Items in this Shipment
            </h2>
            {confirmedOrder.items.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between gap-4 border-b border-[#F3ECEA] pb-3 text-sm">
                <div className="flex items-center gap-3">
                  <img src={item.image} alt={item.title} className="h-14 w-11 object-cover bg-[#FAF8F7]" />
                  <div>
                    <p className="font-medium text-[#181415]">{item.title}</p>
                    <p className="text-xs text-[#6D6366]">
                      {item.color} · Size {item.size} · Qty {item.quantity}
                    </p>
                  </div>
                </div>
                <span className="font-semibold tabular-nums">{formatINR(item.price * item.quantity)}</span>
              </div>
            ))}
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => onNavigate({ name: 'track', orderNumber: confirmedOrder.order_number })}
              className="bg-[#D62865] px-6 py-3 text-xs font-semibold tracking-wider text-white uppercase hover:bg-[#B81D53]"
            >
              Track Order Live
            </button>
            <button
              type="button"
              onClick={() => onNavigate({ name: 'home' })}
              className="border border-[#181415] px-6 py-3 text-xs font-semibold tracking-wider text-[#181415] uppercase hover:bg-[#181415] hover:text-white"
            >
              Continue Shopping
            </button>
          </div>
        </div>
      </main>
    );
  }

  if (items.length === 0) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-20 text-center sm:px-8">
        <h1 className="font-editorial text-3xl font-semibold text-[#181415]">Your shopping bag is empty</h1>
        <p className="mt-2 text-sm text-[#6D6366]">Add curated fashion pieces to proceed to checkout.</p>
        <button
          type="button"
          onClick={() => onNavigate({ name: 'catalog', category: 'All' })}
          className="mt-6 bg-[#181415] px-7 py-3.5 text-xs font-semibold tracking-wider text-white uppercase hover:bg-[#D62865]"
        >
          Browse Catalogue
        </button>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-[1440px] px-4 py-10 sm:px-8">
      <div className="border-b border-[#EAE3E0] pb-5">
        <p className="text-xs font-medium tracking-[0.18em] text-[#D62865] uppercase">
          Encrypted Checkout
        </p>
        <h1 className="mt-1 font-editorial text-3xl sm:text-4xl font-semibold text-[#181415]">
          Shipping &amp; Payment
        </h1>
      </div>

      <form onSubmit={handleCheckoutSubmit} className="mt-8 grid grid-cols-1 gap-10 lg:grid-cols-12">
        <div className="space-y-8 lg:col-span-7">
          {/* Saved Addresses */}
          {savedAddresses.length > 0 && (
            <section className="border border-[#EAE3E0] bg-white p-6">
              <h2 className="text-xs font-semibold tracking-wider text-[#181415] uppercase">
                Select Delivery Address
              </h2>
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {savedAddresses.map((addr) => (
                  <button
                    key={addr.id}
                    type="button"
                    onClick={() => setSelectedAddressId(addr.id)}
                    className={`border p-4 text-left transition-colors ${
                      selectedAddressId === addr.id
                        ? 'border-[#D62865] bg-[#FDF2F5]/50'
                        : 'border-[#E2D8D5] hover:border-[#181415]'
                    }`}
                  >
                    <p className="text-sm font-semibold text-[#181415]">{addr.full_name}</p>
                    <p className="mt-1 text-xs text-[#4A4143]">
                      {addr.line1}{addr.line2 ? `, ${addr.line2}` : ''}
                    </p>
                    <p className="text-xs text-[#4A4143]">
                      {addr.city}, {addr.state} — {addr.pincode}
                    </p>
                    <p className="mt-1 text-xs text-[#6D6366] tabular-nums">Phone: {addr.phone}</p>
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setSelectedAddressId('new')}
                  className={`flex items-center justify-center border border-dashed p-4 text-xs font-semibold uppercase tracking-wider ${
                    selectedAddressId === 'new'
                      ? 'border-[#D62865] bg-[#FDF2F5]/50 text-[#D62865]'
                      : 'border-[#CFC6C3] text-[#4A4143] hover:border-[#181415]'
                  }`}
                >
                  + Deliver to a New Address
                </button>
              </div>
            </section>
          )}

          {/* Contact & Address Form */}
          <section className="border border-[#EAE3E0] bg-white p-6">
            <h2 className="text-xs font-semibold tracking-wider text-[#181415] uppercase">
              Contact &amp; Delivery Details
            </h2>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-medium text-[#4A4143]">Full Name *</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="mt-1.5 w-full border border-[#E2D8D5] px-3 py-2.5 text-sm focus:border-[#D62865] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#4A4143]">Email Address *</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1.5 w-full border border-[#E2D8D5] px-3 py-2.5 text-sm focus:border-[#D62865] focus:outline-none"
                />
              </div>
            </div>

            {selectedAddressId === 'new' && (
              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-medium text-[#4A4143]">Mobile Number *</label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="10-digit mobile"
                    className="mt-1.5 w-full border border-[#E2D8D5] px-3 py-2.5 text-sm focus:border-[#D62865] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#4A4143]">PIN Code *</label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={pincode}
                    onChange={(e) => setPincode(e.target.value.replace(/\D/g, ''))}
                    placeholder="e.g. 416008"
                    className="mt-1.5 w-full border border-[#E2D8D5] px-3 py-2.5 text-sm focus:border-[#D62865] focus:outline-none tabular-nums"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-[#4A4143]">
                    Address Line 1 (House / Flat / Street) *
                  </label>
                  <input
                    type="text"
                    required
                    value={line1}
                    onChange={(e) => setLine1(e.target.value)}
                    className="mt-1.5 w-full border border-[#E2D8D5] px-3 py-2.5 text-sm focus:border-[#D62865] focus:outline-none"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-[#4A4143]">Landmark / Apartment</label>
                  <input
                    type="text"
                    value={line2}
                    onChange={(e) => setLine2(e.target.value)}
                    className="mt-1.5 w-full border border-[#E2D8D5] px-3 py-2.5 text-sm focus:border-[#D62865] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#4A4143]">City *</label>
                  <input
                    type="text"
                    required
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="mt-1.5 w-full border border-[#E2D8D5] px-3 py-2.5 text-sm focus:border-[#D62865] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#4A4143]">State *</label>
                  <input
                    type="text"
                    required
                    value={stateName}
                    onChange={(e) => setStateName(e.target.value)}
                    className="mt-1.5 w-full border border-[#E2D8D5] px-3 py-2.5 text-sm focus:border-[#D62865] focus:outline-none"
                  />
                </div>
                {user && (
                  <label className="sm:col-span-2 flex items-center gap-2 text-xs text-[#4A4143]">
                    <input
                      type="checkbox"
                      checked={saveAddress}
                      onChange={(e) => setSaveAddress(e.target.checked)}
                      className="accent-[#D62865]"
                    />
                    Save this address to my IZHO Address Book
                  </label>
                )}
              </div>
            )}
          </section>

          {/* Payment Method */}
          <section className="border border-[#EAE3E0] bg-white p-6">
            <h2 className="text-xs font-semibold tracking-wider text-[#181415] uppercase">
              Payment Method
            </h2>
            <div className="mt-4 space-y-3">
              <label
                className={`flex cursor-pointer items-start gap-3 border p-4 transition-colors ${
                  paymentMethod === 'RAZORPAY'
                    ? 'border-[#D62865] bg-[#FDF2F5]/50'
                    : 'border-[#E2D8D5]'
                }`}
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  checked={paymentMethod === 'RAZORPAY'}
                  onChange={() => setPaymentMethod('RAZORPAY')}
                  className="mt-1 accent-[#D62865]"
                />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-[#181415]">
                      Razorpay Secure — UPI, Cards, Netbanking &amp; Wallets
                    </span>
                    <CreditCard className="h-4 w-4 text-[#D62865]" />
                  </div>
                  <p className="mt-1 text-xs text-[#6D6366]">
                    Instant payment confirmation via GPay, PhonePe, Visa/Mastercard/RuPay &amp; Netbanking.
                  </p>
                </div>
              </label>

              <label
                className={`flex cursor-pointer items-start gap-3 border p-4 transition-colors ${
                  paymentMethod === 'COD' ? 'border-[#D62865] bg-[#FDF2F5]/50' : 'border-[#E2D8D5]'
                }`}
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  checked={paymentMethod === 'COD'}
                  onChange={() => setPaymentMethod('COD')}
                  className="mt-1 accent-[#D62865]"
                />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-[#181415]">Cash on Delivery (COD)</span>
                    <Truck className="h-4 w-4 text-[#181415]" />
                  </div>
                  <p className="mt-1 text-xs text-[#6D6366]">
                    Pay in cash or via courier UPI link at the time of doorstep delivery.
                  </p>
                </div>
              </label>
            </div>
          </section>
        </div>

        {/* Sticky Order Summary Right */}
        <aside className="lg:col-span-5">
          <div className="lg:sticky lg:top-28 border border-[#EAE3E0] bg-[#FAF8F7] p-6 space-y-6">
            <h2 className="font-editorial text-2xl font-semibold text-[#181415]">
              Order Summary ({items.reduce((s, i) => s + i.quantity, 0)} items)
            </h2>

            <div className="max-h-64 space-y-3 overflow-y-auto izho-scroll pr-1">
              {items.map((item, idx) => (
                <div key={idx} className="flex items-center gap-3 border-b border-[#EAE3E0] pb-3 text-xs">
                  <img
                    src={item.product.images[0]}
                    alt={item.product.title}
                    className="h-14 w-11 shrink-0 object-cover bg-white"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="truncate font-medium text-[#181415]">{item.product.title}</p>
                    <p className="text-[#6D6366]">
                      {item.color} · {item.size} · Qty {item.quantity}
                    </p>
                  </div>
                  <span className="font-semibold text-[#181415] tabular-nums">
                    {formatINR(item.product.discounted_price * item.quantity)}
                  </span>
                </div>
              ))}
            </div>

            {/* Coupon Section */}
            <div className="border-t border-[#EAE3E0] pt-4">
              <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[#181415]">
                <Tag className="h-3.5 w-3.5 text-[#D62865]" />
                <span>Apply Coupon</span>
              </div>
              <div className="mt-2.5 flex gap-2">
                <input
                  type="text"
                  value={couponInput}
                  onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                  placeholder="Enter code (e.g. IZHO15)"
                  className="flex-1 border border-[#E2D8D5] bg-white px-3 py-2 text-xs font-mono uppercase focus:border-[#D62865] focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => handleApplyCoupon()}
                  className="bg-[#181415] px-4 py-2 text-xs font-semibold text-white hover:bg-[#D62865]"
                >
                  Apply
                </button>
              </div>
              {couponMsg && (
                <p className={`mt-2 text-xs ${appliedCoupon ? 'text-[#16A34A]' : 'text-[#DC2626]'}`}>
                  {couponMsg}
                </p>
              )}
              {availableCoupons.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {availableCoupons.map((c) => (
                    <button
                      key={c.code}
                      type="button"
                      onClick={() => handleApplyCoupon(c.code)}
                      className="border border-dashed border-[#D62865] bg-white px-2.5 py-1 text-[11px] font-mono font-semibold text-[#D62865] hover:bg-[#FDF2F5]"
                      title={c.description}
                    >
                      {c.code}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Price Breakdown */}
            <div className="space-y-2.5 border-t border-[#EAE3E0] pt-4 text-sm tabular-nums">
              <div className="flex justify-between text-[#4A4143]">
                <span>Bag Subtotal</span>
                <span>{formatINR(subtotal)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-[#16A34A] font-medium">
                  <span>Coupon Discount ({appliedCoupon?.code})</span>
                  <span>-{formatINR(discount)}</span>
                </div>
              )}
              <div className="flex justify-between text-[#4A4143]">
                <span>Express Shipping</span>
                <span>{shippingFee === 0 ? 'Complimentary' : formatINR(shippingFee)}</span>
              </div>
              <div className="flex justify-between border-t border-[#EAE3E0] pt-3 text-base font-bold text-[#181415]">
                <span>Total Payable</span>
                <span>{formatINR(totalAmount)}</span>
              </div>
            </div>

            {errorMsg && <p className="text-xs font-medium text-[#DC2626]">{errorMsg}</p>}

            <button
              type="submit"
              disabled={submitting}
              className="flex w-full items-center justify-center gap-2 bg-[#D62865] py-4 text-xs font-semibold tracking-wider text-white uppercase transition-colors hover:bg-[#B81D53] disabled:opacity-60"
            >
              <Lock className="h-3.5 w-3.5" />
              <span>
                {submitting
                  ? 'Processing...'
                  : paymentMethod === 'RAZORPAY'
                  ? `Pay ${formatINR(totalAmount)} with Razorpay`
                  : `Place COD Order (${formatINR(totalAmount)})`}
              </span>
            </button>

            <p className="flex items-center justify-center gap-1.5 text-[11px] text-[#6D6366]">
              <ShieldCheck className="h-3.5 w-3.5 text-[#D62865]" />
              256-bit SSL Encrypted Checkout · 14-Day Easy Returns
            </p>
          </div>
        </aside>
      </form>

      {/* Interactive Razorpay Checkout Modal (when live key is omitted) */}
      {rzpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4">
          <div className="w-full max-w-md bg-white shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between bg-[#181415] px-6 py-4 text-white">
              <div>
                <p className="text-[11px] tracking-wider text-[#F6B2C8] uppercase">Razorpay Trusted Business</p>
                <h3 className="font-editorial text-xl font-semibold">IZHO Fashion Checkout</h3>
              </div>
              <button
                type="button"
                onClick={() => setRzpModal(null)}
                aria-label="Cancel Razorpay payment"
                className="text-white/70 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="border-b border-[#EAE3E0] bg-[#FAF8F7] px-6 py-3 flex items-center justify-between">
              <span className="font-mono text-xs text-[#6D6366]">{rzpModal.orderId}</span>
              <span className="text-lg font-bold text-[#181415] tabular-nums">
                {formatINR(rzpModal.amount)}
              </span>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'upi', label: 'UPI / QR' },
                  { id: 'card', label: 'Card' },
                  { id: 'netbanking', label: 'Netbanking' },
                ].map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setRzpModal({ ...rzpModal, tab: t.id as any })}
                    className={`border py-2 text-xs font-semibold ${
                      rzpModal.tab === t.id
                        ? 'border-[#D62865] bg-[#FDF2F5] text-[#D62865]'
                        : 'border-[#E2D8D5] text-[#4A4143]'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {rzpModal.tab === 'upi' && (
                <div>
                  <label className="block text-xs font-medium text-[#4A4143]">UPI ID / VPA</label>
                  <input
                    type="text"
                    value={rzpModal.upiId}
                    onChange={(e) => setRzpModal({ ...rzpModal, upiId: e.target.value })}
                    className="mt-1.5 w-full border border-[#E2D8D5] px-3 py-2.5 text-sm font-mono focus:border-[#D62865] focus:outline-none"
                  />
                  <p className="mt-1.5 text-[11px] text-[#6D6366]">
                    Supports Google Pay, PhonePe, Paytm &amp; BHIM UPI
                  </p>
                </div>
              )}

              {rzpModal.tab === 'card' && (
                <div className="space-y-3 text-xs">
                  <input
                    type="text"
                    defaultValue="4111 •••• •••• 1111"
                    className="w-full border border-[#E2D8D5] px-3 py-2.5 text-sm font-mono"
                    aria-label="Card number"
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="text"
                      defaultValue="12/28"
                      className="border border-[#E2D8D5] px-3 py-2.5 text-sm font-mono"
                      aria-label="Expiry"
                    />
                    <input
                      type="text"
                      defaultValue="842"
                      className="border border-[#E2D8D5] px-3 py-2.5 text-sm font-mono"
                      aria-label="CVV"
                    />
                  </div>
                </div>
              )}

              {rzpModal.tab === 'netbanking' && (
                <select className="w-full border border-[#E2D8D5] px-3 py-2.5 text-sm">
                  <option>HDFC Bank Retail</option>
                  <option>ICICI Bank Netbanking</option>
                  <option>State Bank of India</option>
                  <option>Axis Bank</option>
                </select>
              )}

              <button
                type="button"
                onClick={async () => {
                  const orderId = rzpModal.orderId;
                  setRzpModal(null);
                  await finalizeOrder({
                    razorpay_order_id: orderId,
                    razorpay_payment_id: `pay_IZHO_${Date.now().toString().slice(-6)}`,
                    razorpay_signature: 'verified_test_signature',
                  });
                }}
                className="w-full bg-[#D62865] py-3.5 text-xs font-semibold tracking-wider text-white uppercase hover:bg-[#B81D53]"
              >
                Authorize &amp; Pay {formatINR(rzpModal.amount)}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
