/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { 
  FileText, 
  Printer, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  DollarSign, 
  ChefHat, 
  X, 
  Calendar, 
  User, 
  TrendingUp, 
  AlertCircle,
  Sparkles,
  ShieldCheck
} from 'lucide-react';
import { KitchenEODReport } from '../types';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

interface KitchenEODSettlementModalProps {
  report: KitchenEODReport;
  onClose: () => void;
  onSaved?: (savedReport: KitchenEODReport) => void;
  isReadOnly?: boolean;
}

export default function KitchenEODSettlementModal({
  report: initialReport,
  onClose,
  onSaved,
  isReadOnly = false
}: KitchenEODSettlementModalProps) {
  const [report, setReport] = useState<KitchenEODReport>(initialReport);
  const [notesInput, setNotesInput] = useState<string>(report.notes || '');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(isReadOnly);
  const modalScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Ensure modal opens at the absolute top so Section 1 and header are fully visible immediately
    if (modalScrollRef.current) {
      modalScrollRef.current.scrollTop = 0;
    }
  }, []);

  const handleSaveReport = async () => {
    setIsSaving(true);
    const updated = {
      ...report,
      notes: notesInput,
      closedAt: new Date().toISOString(),
      status: 'settled' as const
    };

    try {
      await setDoc(doc(db, 'kitchen_eod_reports', updated.id), updated);
      setReport(updated);
      setSavedSuccess(true);
      if (onSaved) {
        onSaved(updated);
      }
    } catch (e) {
      console.warn("Failed to save EOD report to Firestore:", e);
    } finally {
      setIsSaving(false);
    }
  };

  const handlePrintReport = () => {
    window.print();
  };

  const isVarianceZero = Math.abs(report.cashReconciliationVariance) < 1;
  const isCashShort = report.cashReconciliationVariance < 0;

  return (
    <div 
      ref={modalScrollRef}
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md overflow-y-auto p-3 sm:p-6 print:p-0 print:bg-white print:static"
    >
      <div className="min-h-full flex items-start justify-center py-4 sm:py-8">
        {/* Container - Printable Card */}
        <div className="w-full max-w-3xl bg-[#121820] text-white border border-white/15 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl print:border-none print:shadow-none print:bg-white print:text-black print:p-4 my-auto">
        
        {/* TOP BAR / ACTIONS */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4 print:hidden">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-brand-orange/20 border border-brand-orange/40 text-brand-orange flex items-center justify-center font-black">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black uppercase tracking-wider text-white">
                End-of-Day Kitchen Shift Settlement
              </h3>
              <span className="text-[10px] text-gray-400 font-mono">
                Audit Record ID: {report.id}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrintReport}
              className="px-3.5 py-2 bg-white/10 hover:bg-white/15 text-gray-200 border border-white/20 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
              title="Print formatted PDF shift audit"
            >
              <Printer className="w-4 h-4 text-brand-orange" />
              <span>Print PDF Report</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-white rounded-xl hover:bg-white/5 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* PRINTABLE HEADER (VISIBLE IN PRINT AND SCREEN) */}
        <div className="text-center space-y-1.5 border-b border-dashed border-white/20 pb-4 print:border-black print:text-black">
          <div className="flex items-center justify-center gap-2">
            <ChefHat className="w-5 h-5 text-brand-orange print:text-black" />
            <h2 className="text-lg font-black uppercase tracking-wider">
              TAASH BHATTI CLOUD KITCHENS
            </h2>
          </div>
          <p className="text-xs font-black uppercase text-brand-green print:text-black">
            Official EOD Shift Settlement & Kitchen Audit Report
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4 text-[11px] font-mono text-gray-400 print:text-gray-700 pt-1">
            <span>Branch: <strong className="text-white print:text-black">{report.kitchenName}</strong></span>
            <span>•</span>
            <span>Date: <strong className="text-white print:text-black">{report.reportDate}</strong></span>
            <span>•</span>
            <span>Shift: <strong className="text-white uppercase print:text-black">{report.shiftType.replace('_', ' ')}</strong></span>
            <span>•</span>
            <span>Auditor: <strong className="text-white print:text-black">{report.managerName}</strong></span>
          </div>
        </div>

        {/* 1. ORDER & REVENUE FULFILLMENT AUDIT */}
        <div className="space-y-2.5">
          <h4 className="text-xs font-black uppercase tracking-wider text-gray-300 print:text-black flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-brand-green print:text-black" />
            <span>1. Ticket Throughput & Revenue</span>
          </h4>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 print:grid-cols-4">
            <div className="bg-[#0A0E13] p-3 rounded-xl border border-white/5 print:border-black print:bg-gray-100">
              <span className="text-[9px] font-black uppercase text-gray-400 print:text-gray-600 block">Total Orders</span>
              <span className="text-base font-mono font-black text-white print:text-black">{report.totalOrdersReceived}</span>
            </div>
            <div className="bg-[#0A0E13] p-3 rounded-xl border border-emerald-500/20 print:border-black print:bg-gray-100">
              <span className="text-[9px] font-black uppercase text-emerald-400 print:text-gray-600 block">Fulfilled / Delivered</span>
              <span className="text-base font-mono font-black text-emerald-400 print:text-black">{report.totalOrdersFulfilled}</span>
            </div>
            <div className="bg-[#0A0E13] p-3 rounded-xl border border-white/5 print:border-black print:bg-gray-100">
              <span className="text-[9px] font-black uppercase text-gray-400 print:text-gray-600 block">Takeaway vs Delivery</span>
              <span className="text-xs font-mono font-black text-white print:text-black">{report.takeawayOrdersCount} Pickups • {report.deliveryOrdersCount} Rides</span>
            </div>
            <div className="bg-[#0A0E13] p-3 rounded-xl border border-brand-orange/30 print:border-black print:bg-gray-100">
              <span className="text-[9px] font-black uppercase text-brand-orange print:text-gray-600 block">Gross Shift Revenue</span>
              <span className="text-base font-mono font-black text-brand-orange print:text-black">₹{report.grossRevenue.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* 2. PREP EFFICIENCY & STATIONS AUDIT */}
        <div className="space-y-2.5">
          <h4 className="text-xs font-black uppercase tracking-wider text-gray-300 print:text-black flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-400 print:text-black" />
            <span>2. Prep Times & Station Efficiency</span>
          </h4>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 print:grid-cols-4">
            <div className="bg-[#0A0E13] p-3 rounded-xl border border-white/5 print:border-black print:bg-gray-100">
              <span className="text-[9px] font-black uppercase text-gray-400 print:text-gray-600 block">Avg Prep Time</span>
              <span className="text-base font-mono font-black text-amber-400 print:text-black">{report.avgPrepTimeMinutes} mins</span>
            </div>
            <div className="bg-[#0A0E13] p-3 rounded-xl border border-white/5 print:border-black print:bg-gray-100">
              <span className="text-[9px] font-black uppercase text-gray-400 print:text-gray-600 block">Lane A (Veg Sauté)</span>
              <span className="text-base font-mono font-black text-white print:text-black">{report.laneAPrepCount} dishes</span>
            </div>
            <div className="bg-[#0A0E13] p-3 rounded-xl border border-white/5 print:border-black print:bg-gray-100">
              <span className="text-[9px] font-black uppercase text-gray-400 print:text-gray-600 block">Lane B (Meat Grill)</span>
              <span className="text-base font-mono font-black text-white print:text-black">{report.laneBPrepCount} dishes</span>
            </div>
            <div className="bg-[#0A0E13] p-3 rounded-xl border border-white/5 print:border-black print:bg-gray-100">
              <span className="text-[9px] font-black uppercase text-gray-400 print:text-gray-600 block">Peak Rush Delay</span>
              <span className="text-base font-mono font-black text-white print:text-black">+{report.peakRushBufferUsedMinutes}m buffer</span>
            </div>
          </div>
        </div>

        {/* 3. CASH COLLECTION & FINANCIAL RECONCILIATION */}
        <div className="space-y-2.5">
          <h4 className="text-xs font-black uppercase tracking-wider text-gray-300 print:text-black flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-emerald-400 print:text-black" />
            <span>3. Shift Cash Reconciliation (Cashier vs Fleet)</span>
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 print:grid-cols-3">
            <div className="bg-[#0A0E13] p-3 rounded-xl border border-white/5 print:border-black print:bg-gray-100">
              <span className="text-[9px] font-black uppercase text-gray-400 print:text-gray-600 block">COD Billed on Tickets</span>
              <span className="text-lg font-mono font-black text-white print:text-black">₹{report.codCollectedByFleet.toLocaleString()}</span>
              <span className="text-[8px] text-gray-500 print:text-gray-600 block">Collected by fleet riders</span>
            </div>

            <div className="bg-[#0A0E13] p-3 rounded-xl border border-emerald-500/30 print:border-black print:bg-gray-100">
              <span className="text-[9px] font-black uppercase text-emerald-400 print:text-gray-600 block">Verified Cash in Register</span>
              <span className="text-lg font-mono font-black text-emerald-400 print:text-black">₹{report.cashDepositedAtKitchen.toLocaleString()}</span>
              <span className="text-[8px] text-gray-500 print:text-gray-600 block">Handed over & approved at desk</span>
            </div>

            <div className={`p-3 rounded-xl border print:border-black print:bg-gray-100 ${
              isVarianceZero 
                ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-400' 
                : isCashShort
                  ? 'bg-rose-950/40 border-rose-500/40 text-rose-400'
                  : 'bg-blue-950/40 border-blue-500/40 text-blue-300'
            }`}>
              <span className="text-[9px] font-black uppercase block tracking-wider">
                Variance / Discrepancy
              </span>
              <span className="text-lg font-mono font-black block">
                {report.cashReconciliationVariance >= 0 ? `+₹${report.cashReconciliationVariance}` : `-₹${Math.abs(report.cashReconciliationVariance)}`}
              </span>
              <span className="text-[8px] block mt-0.5">
                {isVarianceZero ? '✓ Perfectly Balanced (0 variance)' : isCashShort ? '⚠️ Register Cash Shortage' : 'ℹ️ Surplus Deposit Handover'}
              </span>
            </div>
          </div>
        </div>

        {/* 4. AUDITOR NOTES & SIGN-OFF */}
        <div className="space-y-2 border-t border-white/10 pt-4 print:border-black">
          <label className="text-[10px] font-black uppercase tracking-wider text-gray-400 print:text-black block">
            4. Shift Manager Closing Remarks & Certification
          </label>
          {isReadOnly ? (
            <div className="bg-[#0A0E13] p-3 rounded-xl border border-white/5 text-xs text-gray-300 italic print:text-black print:border-black print:bg-white">
              "{report.notes}"
            </div>
          ) : (
            <textarea
              rows={2}
              value={notesInput}
              onChange={(e) => setNotesInput(e.target.value)}
              placeholder="e.g. All stoves deep-cleaned. Meat inventory restock arriving at 6:00 AM tomorrow."
              className="w-full p-3 bg-[#0A0E13] border border-white/10 rounded-xl text-xs text-white placeholder-gray-600 focus:outline-none focus:border-brand-green print:hidden"
            />
          )}

          <div className="pt-4 flex items-center justify-between text-[11px] font-mono border-t border-dashed border-white/20 print:border-black print:text-black">
            <div>
              <span className="text-gray-500 block">Signed By:</span>
              <strong className="text-white print:text-black">{report.managerName} (Kitchen Manager)</strong>
            </div>
            <div className="text-right">
              <span className="text-gray-500 block">Timestamp:</span>
              <strong className="text-white print:text-black">{new Date(report.closedAt).toLocaleString()}</strong>
            </div>
          </div>
        </div>

        {/* FOOTER ACTIONS (HIDDEN IN PRINT) */}
        <div className="border-t border-white/10 pt-4 flex flex-col sm:flex-row items-center justify-between gap-3 print:hidden">
          <div className="flex items-center gap-2">
            {savedSuccess ? (
              <span className="text-xs font-black text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" />
                <span>Shift Settlement Record Saved to Firestore!</span>
              </span>
            ) : (
              <span className="text-[10px] text-gray-400 font-mono">
                Click "Finalize & Save" to seal shift records permanently.
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-none px-4 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-bold rounded-xl cursor-pointer"
            >
              Close Window
            </button>

            {!savedSuccess && (
              <button
                type="button"
                disabled={isSaving}
                onClick={handleSaveReport}
                className="flex-1 sm:flex-none px-5 py-2.5 bg-brand-green hover:bg-brand-green/90 text-brand-charcoal text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-md cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {isSaving ? (
                  <span>Recording Settlement...</span>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Finalize & Save Settlement</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>

      </div>
      </div>
    </div>
  );
}
