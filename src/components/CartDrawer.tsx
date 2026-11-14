import { Minus, Plus, ShoppingBag, Trash2, X } from 'lucide-react';
import type { CartItem } from '../types';
import { formatINR } from '../utils/api';

interface CartDrawerProps {
  open: boolean;
  items: CartItem[];
  onClose: () => void;
  onUpdateQty: (index: number, delta: number) => void;
  onRemoveItem: (index: number) => void;
  onCheckout: () => void;
}

export function CartDrawer({
  open,
  items,
  onClose,
  onUpdateQty,
  onRemoveItem,
  onCheckout,
}: CartDrawerProps) {
  if (!open) return null;

  const subtotal = items.reduce((sum, i) => sum + i.product.discounted_price * i.quantity, 0);
  const freeShippingThreshold = 1999;
  const remaining = Math.max(0, freeShippingThreshold - subtotal);
  const progress = Math.min(100, Math.round((subtotal / freeShippingThreshold) * 100));

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-[1px]" onClick={onClose} />
      <aside
        aria-label="Shopping Bag"
        className="relative flex h-full w-full max-w-md flex-col bg-white shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-[#EAE3E0] px-6 py-4">
          <div className="flex items-center gap-2.5">
            <ShoppingBag className="h-5 w-5 text-[#181415]" />
            <h2 className="font-editorial text-2xl font-semibold text-[#181415]">
              Shopping Bag ({items.reduce((s, i) => s + i.quantity, 0)})
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close bag"
            className="p-2 text-[#6D6366] hover:text-[#181415]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Free Shipping Meter */}
        <div className="border-b border-[#F3ECEA] bg-[#FAF8F7] px-6 py-3">
          <p className="text-xs font-medium text-[#181415]">
            {remaining === 0
              ? 'You have unlocked Complimentary Express Shipping!'
              : `Add ${formatINR(remaining)} more for Complimentary Express Shipping`}
          </p>
          <div className="mt-2 h-1.5 w-full overflow-hidden bg-[#E5DCDA]">
            <div
              className="h-full bg-[#D62865] transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 izho-scroll">
          {items.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <ShoppingBag className="h-10 w-10 text-[#C8BDB9]" />
              <h3 className="mt-4 font-editorial text-2xl font-semibold text-[#181415]">
                Your bag is empty
              </h3>
              <p className="mt-2 max-w-xs text-xs leading-relaxed text-[#6D6366]">
                Explore our curated sarees, kurtis, dresses, menswear, jewellery, and footwear to begin your order.
              </p>
              <button
                type="button"
                onClick={onClose}
                className="mt-6 bg-[#181415] px-6 py-3 text-xs font-semibold tracking-wider text-white uppercase hover:bg-[#D62865]"
              >
                Continue Shopping
              </button>
            </div>
          ) : (
            <div className="divide-y divide-[#F0EAE7]">
              {items.map((item, idx) => (
                <div key={`${item.product.id}-${item.size}-${item.color}`} className="flex gap-4 py-4">
                  <img
                    src={item.product.images[0]}
                    alt={item.product.title}
                    referrerPolicy="no-referrer"
                    className="h-24 w-20 shrink-0 object-cover bg-[#FAF8F7]"
                  />
                  <div className="flex flex-1 flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-sm font-medium text-[#181415] line-clamp-1">
                          {item.product.title}
                        </h3>
                        <button
                          type="button"
                          onClick={() => onRemoveItem(idx)}
                          aria-label={`Remove ${item.product.title}`}
                          className="text-[#8E8285] hover:text-[#DC2626]"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      <p className="mt-0.5 text-xs text-[#6D6366]">
                        {item.color} · Size {item.size}
                      </p>
                    </div>

                    <div className="mt-3 flex items-center justify-between">
                      <div className="flex items-center border border-[#E2D8D5]">
                        <button
                          type="button"
                          onClick={() => onUpdateQty(idx, -1)}
                          aria-label="Decrease quantity"
                          className="flex h-7 w-7 items-center justify-center text-[#181415] hover:bg-[#FAF8F7]"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="w-7 text-center text-xs font-semibold tabular-nums">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => onUpdateQty(idx, 1)}
                          aria-label="Increase quantity"
                          className="flex h-7 w-7 items-center justify-center text-[#181415] hover:bg-[#FAF8F7]"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                      <span className="text-sm font-semibold text-[#181415] tabular-nums">
                        {formatINR(item.product.discounted_price * item.quantity)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {items.length > 0 && (
          <div className="border-t border-[#EAE3E0] bg-white p-6">
            <div className="flex items-center justify-between text-sm">
              <span className="text-[#6D6366]">Bag Subtotal</span>
              <span className="text-lg font-bold text-[#181415] tabular-nums">
                {formatINR(subtotal)}
              </span>
            </div>
            <p className="mt-1 text-xs text-[#6D6366]">
              Coupons &amp; Razorpay / COD options available at checkout.
            </p>
            <button
              type="button"
              onClick={onCheckout}
              className="mt-4 w-full bg-[#D62865] py-3.5 text-xs font-semibold tracking-wider text-white uppercase transition-colors hover:bg-[#B81D53]"
            >
              Proceed to Checkout
            </button>
          </div>
        )}
      </aside>
    </div>
  );
}
