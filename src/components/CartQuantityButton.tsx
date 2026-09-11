/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Plus, Minus } from 'lucide-react';

interface CartQuantityButtonProps {
  quantity: number;
  onAdd: () => void;
  onIncrement: () => void;
  onDecrement: () => void;
  disabled?: boolean;
  disabledLabel?: string;
  addLabel?: string;
  size?: 'sm' | 'md';
  className?: string;
}

export const CartQuantityButton: React.FC<CartQuantityButtonProps> = ({
  quantity,
  onAdd,
  onIncrement,
  onDecrement,
  disabled = false,
  disabledLabel = 'Sold Out',
  addLabel = 'Add',
  size = 'md',
  className = '',
}) => {
  if (disabled) {
    return (
      <button
        type="button"
        disabled
        className={`px-3 py-2 bg-brand-charcoal/10 text-brand-charcoal/40 font-black text-xs rounded-xl cursor-not-allowed border border-brand-charcoal/5 flex items-center justify-center gap-1 opacity-70 ${className}`}
      >
        {disabledLabel}
      </button>
    );
  }

  const isSmall = size === 'sm';
  const heightClass = isSmall ? 'h-7.5' : 'h-9';
  const textClass = isSmall ? 'text-[11px]' : 'text-xs';
  const iconSizeClass = isSmall ? 'w-3 h-3 stroke-[3px]' : 'w-3.5 h-3.5 stroke-[3px]';
  const padClass = isSmall ? 'px-2' : 'px-2.5';

  if (quantity > 0) {
    return (
      <div
        className={`inline-flex items-center ${heightClass} bg-brand-green text-white rounded-xl shadow-xs border border-brand-green/90 overflow-hidden fade-in-simple ${className}`}
        role="group"
        aria-label="Quantity in cart"
      >
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDecrement();
          }}
          className={`${heightClass} ${padClass} hover:bg-emerald-800 active:bg-emerald-900 transition-colors flex items-center justify-center cursor-pointer text-white focus:outline-none`}
          title={quantity === 1 ? 'Remove from cart' : 'Decrease quantity'}
          aria-label={quantity === 1 ? 'Remove from cart' : 'Decrease quantity'}
        >
          <Minus className={iconSizeClass} />
        </button>

        <span
          className={`px-2 ${textClass} font-black min-w-[20px] text-center select-none text-white tabular-nums`}
          aria-live="polite"
        >
          {quantity}
        </span>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onIncrement();
          }}
          className={`${heightClass} ${padClass} hover:bg-emerald-800 active:bg-emerald-900 transition-colors flex items-center justify-center cursor-pointer text-white focus:outline-none`}
          title="Increase quantity"
          aria-label="Increase quantity"
        >
          <Plus className={iconSizeClass} />
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onAdd();
      }}
      className={`inline-flex items-center justify-center gap-1 ${heightClass} px-3.5 bg-brand-green hover:bg-brand-green/90 text-white font-black ${textClass} rounded-xl shadow-xs fade-in-simple cursor-pointer active:scale-98 focus:outline-none ${className}`}
      title={`Add ${addLabel} to cart`}
    >
      <Plus className={iconSizeClass} />
      <span>{addLabel}</span>
    </button>
  );
};

export default CartQuantityButton;
