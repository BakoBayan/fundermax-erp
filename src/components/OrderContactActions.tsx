'use client';

import React from 'react';
import { Phone, MessageCircle } from 'lucide-react';
import { OrderAllocation, PanelTransaction } from '../types/inventory';
import { findCustomerPhone, buildOrderReadyWhatsAppUrl } from '../utils/customerContact';

interface OrderContactActionsProps {
  order: OrderAllocation;
  transactions: PanelTransaction[];
  isKu: boolean;
}

/** 1-tap call + WhatsApp "ready for pickup" actions. Renders nothing if no phone is known. */
export const OrderContactActions: React.FC<OrderContactActionsProps> = ({ order, transactions, isKu }) => {
  const phone = findCustomerPhone(order, transactions);
  if (!phone) return null;
  const wa = buildOrderReadyWhatsAppUrl(phone, isKu, order.client, order.orderNumber);
  return (
    <span className="inline-flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
      <a
        href={`tel:${phone}`}
        className="inline-flex items-center gap-1 font-mono text-xs font-bold text-sky-700 dark:text-sky-400 hover:underline"
        title={isKu ? 'پەیوەندی' : 'Call'}
      >
        <Phone className="w-3 h-3" />
        <span dir="ltr">{phone}</span>
      </a>
      <button
        type="button"
        onClick={() => {
          const cleanPhone = (phone || '').replace(/\D/g, '');
          const message = buildOrderReadyWhatsAppUrl(phone, isKu, order.client, order.orderNumber);
          window.open(message, '_blank', 'noopener,noreferrer');
        }}
        className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
        title={isKu ? 'ناردن بە واتسئاپ' : 'WhatsApp'}
      >
        <MessageCircle className="w-3.5 h-3.5" />
      </button>
    </span>
  );
};
