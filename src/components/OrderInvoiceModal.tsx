/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion } from 'motion/react';
import { X, Printer, Download, CheckCircle, ShieldCheck, Flame, MapPin, Phone, Mail, FileText, Utensils, Star, AlertTriangle } from 'lucide-react';
import { Order } from '../types';

interface OrderInvoiceModalProps {
  order: Order;
  isOpen: boolean;
  onClose: () => void;
  onOpenRating?: (order: Order) => void;
  onReportIssue?: (order: Order) => void;
}

export default function OrderInvoiceModal({
  order,
  isOpen,
  onClose,
  onOpenRating,
  onReportIssue,
}: OrderInvoiceModalProps) {
  if (!isOpen || !order) return null;

  const handlePrint = () => {
    window.print();
  };

  const invoiceNumber = `TB-INV-${order.id.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 10)}`;
  const invoiceDate = order.date || new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  const itemsSubtotal = order.items.reduce((acc, it) => acc + (it.meal?.price || 0) * (it.quantity || 1), 0);
  const packagingFee = 20;
  const deliveryFee = order.fulfillmentMode === 'takeaway' ? 0 : 35;
  const taxesGst = Math.round(itemsSubtotal * 0.05); // 5% GST on Restaurant Dining
  const discountAmount = Math.max(0, (itemsSubtotal + packagingFee + deliveryFee + taxesGst) - (order.total || itemsSubtotal));

  const riderName = order.deliveryPartnerName || (order as any).assignedRiderName;
  const riderPhone = order.deliveryPartnerPhone || (order as any).assignedRiderPhone;
  const riderVehicle = (order as any).deliveryPartnerVehicle || (order as any).assignedRiderVehicle || (order.deliveryVehicleNumber ? 'Motorbike' : 'Express Runner');
  const vehicleNumber = order.deliveryVehicleNumber || (order as any).assignedRiderVehicleNumber;
  const kitchenName = order.acceptedKitchenName || order.kitchenName || 'Taash Bhatti Central Kitchen Hub';

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto print:p-0 print:bg-white print:fixed print:inset-0">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="bg-white text-slate-900 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden border border-amber-900/15 flex flex-col my-auto max-h-[92vh] print:max-h-none print:shadow-none print:border-none print:rounded-none"
        id="order-tax-invoice"
      >
        {/* Top Control Bar (Hidden in Print) */}
        <div className="bg-[#101720] text-white px-5 py-3.5 flex items-center justify-between border-b border-amber-500/20 shrink-0 print:hidden">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-black uppercase tracking-wider text-amber-300">
              Tax Invoice & Delivery Receipt
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 font-black text-xs px-3.5 py-1.5 rounded-xl transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / PDF</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Invoice Body */}
        <div className="p-6 sm:p-8 overflow-y-auto space-y-6 text-slate-800 text-xs print:p-8 print:overflow-visible">
          
          {/* Official Invoice Header & Brand Logo */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b-2 border-amber-500/30 pb-5">
            <div className="space-y-1">
              {/* Brand Logo Emblem */}
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-500 via-amber-600 to-rose-600 text-white flex items-center justify-center font-black text-xl shadow-md border border-amber-300/40">
                  ♠
                </div>
                <div>
                  <h1 className="text-xl font-black text-slate-950 tracking-tight leading-none">
                    TAASH BHATTI
                  </h1>
                  <span className="text-[9px] font-black text-amber-700 uppercase tracking-widest block mt-0.5">
                    SMOKED TANDOORI & CLAY-OVEN CUISINE
                  </span>
                </div>
              </div>
              <p className="text-[10px] text-slate-500 leading-tight pt-1">
                Taash Bhatti Culinary Co. Pvt Ltd • FSSAI Lic: 10021011000458
              </p>
              <p className="text-[10px] text-slate-500 font-mono">
                GSTIN: 07AAACT8819Q1ZT • Support: support@taashbhatti.com
              </p>
            </div>

            <div className="sm:text-right space-y-0.5 bg-amber-500/10 p-3 sm:p-3.5 rounded-2xl border border-amber-500/20 shrink-0">
              <span className="text-[9px] font-black text-amber-800 uppercase tracking-widest block">
                ORIGINAL TAX INVOICE
              </span>
              <p className="text-sm font-black font-mono text-slate-950">
                {invoiceNumber}
              </p>
              <p className="text-[10px] font-medium text-slate-600">
                Date: <strong className="text-slate-900">{invoiceDate}</strong>
              </p>
              <span className="inline-block mt-1 text-[9px] font-black text-emerald-800 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-full uppercase">
                {order.status === 'delivered' ? '✓ Order Delivered' : `Status: ${order.status}`}
              </span>
            </div>
          </div>

          {/* Billed To & Dispatched From Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-slate-700">
            {/* Customer Details */}
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
              <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider block">
                CUSTOMER / BILLED TO
              </span>
              <h4 className="font-extrabold text-slate-900 text-sm">
                {order.customerName || 'Gourmet Patron'}
              </h4>
              {order.customerPhone && (
                <p className="text-[11px] font-mono text-slate-600">
                  📞 {order.customerPhone}
                </p>
              )}
              <p className="text-[11px] text-slate-600 leading-snug">
                📍 {order.address || 'Address on file'}
              </p>
            </div>

            {/* Kitchen & Dispatch Rider Logistics */}
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
              <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider block">
                FULFILLMENT & DISPATCH HUB
              </span>
              <h4 className="font-extrabold text-slate-900 text-sm">
                {kitchenName}
              </h4>
              <p className="text-[11px] text-slate-600">
                Mode: <strong className="text-amber-800 uppercase">{order.fulfillmentMode === 'takeaway' ? 'Self Takeaway / Counter Pickup' : 'Express Doorstep Delivery'}</strong>
              </p>
              {riderName && order.fulfillmentMode !== 'takeaway' && (
                <p className="text-[11px] text-emerald-800 font-medium pt-0.5">
                  🛵 Rider: <strong className="text-slate-900">{riderName}</strong>
                  {vehicleNumber && <span className="font-mono text-slate-600"> ({vehicleNumber})</span>}
                </p>
              )}
            </div>
          </div>

          {/* Itemized Dishes Table */}
          <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100/90 text-slate-700 text-[10px] font-black uppercase tracking-wider border-b border-slate-200">
                  <th className="py-2.5 px-3">#</th>
                  <th className="py-2.5 px-3">Dish / Item Description</th>
                  <th className="py-2.5 px-3 text-center">Qty</th>
                  <th className="py-2.5 px-3 text-right">Price</th>
                  <th className="py-2.5 px-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-[11px]">
                {order.items.map((item, idx) => {
                  const unitPrice = item.meal?.price || 0;
                  const lineTotal = unitPrice * (item.quantity || 1);
                  const custom = item.customization;

                  return (
                    <tr key={idx} className="hover:bg-slate-50/50">
                      <td className="py-2.5 px-3 font-mono text-slate-400 text-[10px]">{idx + 1}</td>
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-1.5">
                          <span className={`w-2 h-2 rounded-full shrink-0 ${item.meal?.isVeg ? 'bg-emerald-500' : 'bg-red-500'}`} />
                          <span className="font-bold text-slate-900">{item.meal?.name || 'Chef Specialty'}</span>
                        </div>
                        {custom && (
                          <div className="text-[9px] text-amber-700 font-medium pl-3.5 mt-0.5 flex flex-wrap gap-1">
                            {custom.portionSize && <span>[{custom.portionSize}]</span>}
                            {custom.spiceLevel && <span>[{custom.spiceLevel}]</span>}
                            {custom.cookingInstruction && <span>• Note: "{custom.cookingInstruction}"</span>}
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center font-bold text-slate-900 font-mono">
                        {item.quantity || 1}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-600">
                        ₹{unitPrice}
                      </td>
                      <td className="py-2.5 px-3 text-right font-black font-mono text-slate-900">
                        ₹{lineTotal}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Ledger Calculation Breakdown & Payment */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start pt-1">
            {/* Payment Mode & Thermal Seal Statement */}
            <div className="p-3.5 bg-amber-50/60 rounded-2xl border border-amber-200/80 space-y-2">
              <div className="flex items-center gap-2 text-amber-900 font-extrabold text-[11px]">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Payment Verified: {order.paymentMethod || 'Prepaid / Online UPI'}</span>
              </div>
              <p className="text-[10px] text-slate-600 leading-relaxed">
                480°C Clay Oven Smoked • Packed in certified food-grade thermal containers. Thank you for dining with Taash Bhatti!
              </p>
              {order.deliveryRating && (
                <div className="text-[10px] font-bold text-amber-800 bg-white p-2 rounded-xl border border-amber-200 flex items-center justify-between">
                  <span>Diner Review: ★ {order.deliveryRating.rating}/5</span>
                  <span className="text-[9px] text-slate-500">{order.deliveryRating.ratedAt}</span>
                </div>
              )}
            </div>

            {/* Cost Math */}
            <div className="space-y-1.5 text-[11px] bg-slate-50 p-3.5 rounded-2xl border border-slate-200 font-medium">
              <div className="flex justify-between text-slate-600">
                <span>Items Subtotal</span>
                <span className="font-mono font-bold text-slate-900">₹{itemsSubtotal}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Restaurant Packaging & Thermal Seal</span>
                <span className="font-mono text-slate-900">₹{packagingFee}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Delivery & Logistics Fee</span>
                <span className="font-mono text-slate-900">
                  {deliveryFee === 0 ? 'FREE' : `₹${deliveryFee}`}
                </span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Taxes (CGST 2.5% + SGST 2.5%)</span>
                <span className="font-mono text-slate-900">₹{taxesGst}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-emerald-700 font-bold">
                  <span>Special Promo / Club Discount</span>
                  <span className="font-mono">-₹{discountAmount}</span>
                </div>
              )}
              <div className="border-t-2 border-slate-300 pt-2 flex justify-between items-center text-sm font-black text-slate-950">
                <span className="uppercase tracking-tight">Grand Total Paid</span>
                <span className="text-base font-black font-mono text-amber-600">
                  ₹{order.total || itemsSubtotal}
                </span>
              </div>
            </div>
          </div>

          {/* Footer Computer-Generated Disclaimer */}
          <div className="text-center pt-2 text-[9px] text-slate-400 font-mono border-t border-slate-100">
            This is a computer-generated tax invoice and does not require a physical signature. Registered under the Food Safety and Standards Authority of India.
          </div>
        </div>

        {/* Action Bar at Bottom (Hidden in Print) */}
        <div className="p-4 bg-slate-100 border-t border-slate-200 shrink-0 flex flex-wrap items-center justify-between gap-2.5 print:hidden">
          <div className="flex items-center gap-2">
            {order.status === 'delivered' && onOpenRating && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenRating(order);
                }}
                className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Star className="w-3.5 h-3.5 fill-slate-950" />
                <span>{order.deliveryRating ? 'Edit Review' : 'Rate & Review Order'}</span>
              </button>
            )}

            {onReportIssue && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onReportIssue(order);
                }}
                className="px-3 py-2 bg-white hover:bg-red-50 text-red-700 border border-red-200 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
                <span>Report Issue</span>
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl transition-all cursor-pointer ml-auto"
          >
            Close Invoice
          </button>
        </div>
      </motion.div>
    </div>
  );
}
