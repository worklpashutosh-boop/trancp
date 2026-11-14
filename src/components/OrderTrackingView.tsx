import { CheckCircle2, Package, Search, Truck } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import type { Order } from '../types';
import { apiFetch, formatINR } from '../utils/api';

const ORDER_STEPS = ['PLACED', 'CONFIRMED', 'PACKED', 'SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED'];

interface OrderTrackingViewProps {
  initialOrderNumber?: string;
}

export function OrderTrackingView({ initialOrderNumber = 'IZH-2026-8410' }: OrderTrackingViewProps) {
  const [query, setQuery] = useState(initialOrderNumber);
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const lookupOrder = async (orderNum: string) => {
    if (!orderNum.trim()) return;
    setLoading(true);
    setError('');
    try {
      const res = await apiFetch<{ order: Order }>(
        `/api/orders/track/${encodeURIComponent(orderNum.trim())}`
      );
      setOrder(res.order);
    } catch (err: any) {
      setOrder(null);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialOrderNumber) {
      setQuery(initialOrderNumber);
      lookupOrder(initialOrderNumber);
    }
  }, [initialOrderNumber]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    lookupOrder(query);
  };

  const currentStepIdx = order ? Math.max(0, ORDER_STEPS.indexOf(order.order_status)) : -1;

  return (
    <main className="mx-auto max-w-4xl px-4 py-12 sm:px-8">
      <div className="text-center">
        <p className="text-xs font-semibold tracking-[0.2em] text-[#D62865] uppercase">
          Live Logistics Concierge
        </p>
        <h1 className="mt-1 font-editorial text-4xl font-semibold text-[#181415]">
          Track Your IZHO Order
        </h1>
        <p className="mt-2 text-sm text-[#6D6366]">
          Enter your order number (e.g. <span className="font-mono">IZH-2026-8410</span>) to view live dispatch status.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="mx-auto mt-8 flex max-w-lg gap-2">
        <div className="flex flex-1 items-center border border-[#E2D8D5] bg-[#FAF8F7] px-3.5">
          <Search className="h-4 w-4 text-[#6D6366]" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value.toUpperCase())}
            placeholder="IZH-2026-8410"
            className="ml-2.5 w-full bg-transparent py-3 text-sm font-mono uppercase focus:outline-none"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="bg-[#181415] px-6 py-3 text-xs font-semibold tracking-wider text-white uppercase hover:bg-[#D62865]"
        >
          {loading ? 'Searching...' : 'Track'}
        </button>
      </form>

      {error && (
        <div className="mx-auto mt-6 max-w-lg border border-[#FECACA] bg-[#FEF2F2] p-4 text-center text-xs text-[#DC2626]">
          {error}
        </div>
      )}

      {order && (
        <div className="mt-10 border border-[#EAE3E0] bg-white p-6 sm:p-8 space-y-8">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#EAE3E0] pb-5">
            <div>
              <p className="text-xs text-[#6D6366] uppercase">Order Number</p>
              <p className="font-mono text-lg font-bold text-[#181415]">{order.order_number}</p>
            </div>
            <div>
              <p className="text-xs text-[#6D6366] uppercase">Current Status</p>
              <p className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#D62865]">
                <Truck className="h-4 w-4" />
                {order.order_status.replace(/_/g, ' ')}
              </p>
            </div>
            <div>
              <p className="text-xs text-[#6D6366] uppercase">Order Total</p>
              <p className="text-base font-bold text-[#181415] tabular-nums">
                {formatINR(order.total_amount)} ({order.payment_method})
              </p>
            </div>
          </div>

          {/* Visual Progress Bar */}
          {order.order_status !== 'CANCELLED' && (
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
              {ORDER_STEPS.map((step, idx) => {
                const done = idx <= currentStepIdx;
                return (
                  <div key={step} className="flex flex-col items-center text-center">
                    <div
                      className={`flex h-8 w-8 items-center justify-center rounded-full border text-xs font-semibold ${
                        done
                          ? 'border-[#D62865] bg-[#D62865] text-white'
                          : 'border-[#E2D8D5] bg-white text-[#8E8285]'
                      }`}
                    >
                      {done ? <CheckCircle2 className="h-4 w-4" /> : idx + 1}
                    </div>
                    <span
                      className={`mt-2 text-[10px] font-semibold uppercase tracking-wide ${
                        done ? 'text-[#181415]' : 'text-[#8E8285]'
                      }`}
                    >
                      {step.replace(/_/g, ' ')}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Timeline Events */}
          <div className="grid grid-cols-1 gap-8 border-t border-[#EAE3E0] pt-6 md:grid-cols-2">
            <div>
              <h2 className="text-xs font-semibold tracking-wider text-[#181415] uppercase">
                Tracking Activity
              </h2>
              <div className="mt-4 space-y-4">
                {[...order.tracking_history].reverse().map((ev, idx) => (
                  <div key={idx} className="flex items-start gap-3">
                    <Package className="mt-0.5 h-4 w-4 shrink-0 text-[#D62865]" />
                    <div>
                      <p className="text-xs font-semibold text-[#181415]">
                        {ev.status.replace(/_/g, ' ')}
                      </p>
                      <p className="text-xs text-[#4A4143]">{ev.note}</p>
                      <p className="font-mono text-[11px] text-[#8E8285]">{ev.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h2 className="text-xs font-semibold tracking-wider text-[#181415] uppercase">
                Delivery Destination &amp; Items
              </h2>
              <div className="mt-3 border border-[#F0EAE7] bg-[#FAF8F7] p-4 text-xs text-[#4A4143]">
                <p className="font-semibold text-[#181415]">{order.shipping_address.full_name}</p>
                <p className="mt-1">{order.shipping_address.line1}</p>
                <p>
                  {order.shipping_address.city}, {order.shipping_address.state} —{' '}
                  {order.shipping_address.pincode}
                </p>
                <p className="mt-1">Phone: {order.shipping_address.phone}</p>
              </div>
              <div className="mt-4 space-y-2.5">
                {order.items.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs">
                    <span className="text-[#181415]">
                      {item.title} ({item.size} × {item.quantity})
                    </span>
                    <span className="font-semibold tabular-nums">
                      {formatINR(item.price * item.quantity)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
