import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Home, Briefcase, Building2, CheckCircle2, PlusCircle, X, ChevronRight, Sparkles } from 'lucide-react';

interface SelectDeliveryAddressModalProps {
  isOpen: boolean;
  onClose: () => void;
  savedAddresses: string[];
  currentAddress?: string;
  onSelectAddress: (address: string) => void;
  onAddNewAddress: () => void;
}

export default function SelectDeliveryAddressModal({
  isOpen,
  onClose,
  savedAddresses = [],
  currentAddress,
  onSelectAddress,
  onAddNewAddress,
}: SelectDeliveryAddressModalProps) {
  const [selectedAddr, setSelectedAddr] = useState<string>(
    currentAddress || savedAddresses[0] || ''
  );

  // Sync selected address if currentAddress changes
  React.useEffect(() => {
    if (currentAddress && savedAddresses.includes(currentAddress)) {
      setSelectedAddr(currentAddress);
    } else if (savedAddresses.length > 0 && !selectedAddr) {
      setSelectedAddr(savedAddresses[0]);
    }
  }, [currentAddress, savedAddresses]);

  if (!isOpen) return null;

  const handleConfirm = (addr: string) => {
    setSelectedAddr(addr);
    onSelectAddress(addr);
    onClose();
  };

  const getAddressIcon = (addressText: string, index: number) => {
    const lower = addressText.toLowerCase();
    if (lower.includes('office') || lower.includes('work') || lower.includes('corporate') || lower.includes('desk')) {
      return <Briefcase className="w-4 h-4 text-amber-600 shrink-0" />;
    }
    if (lower.includes('gym') || lower.includes('fitness') || lower.includes('club')) {
      return <Building2 className="w-4 h-4 text-emerald-600 shrink-0" />;
    }
    if (index === 0 || lower.includes('home') || lower.includes('flat') || lower.includes('house') || lower.includes('residence')) {
      return <Home className="w-4 h-4 text-brand-orange shrink-0" />;
    }
    return <MapPin className="w-4 h-4 text-brand-green shrink-0" />;
  };

  const getAddressLabel = (addressText: string, index: number) => {
    const lower = addressText.toLowerCase();
    if (lower.includes('office') || lower.includes('work')) return 'Work / Office';
    if (lower.includes('gym') || lower.includes('fitness')) return 'Fitness Club';
    if (index === 0) return 'Primary Address';
    return `Saved Location #${index + 1}`;
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/60 backdrop-blur-xs"
        />

        {/* Modal Sheet / Dialog */}
        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 40, scale: 0.96 }}
          transition={{ type: 'spring', damping: 26, stiffness: 320 }}
          className="relative w-full max-w-lg bg-white rounded-t-[32px] sm:rounded-3xl shadow-2xl border border-brand-green/10 overflow-hidden z-10 max-h-[90vh] flex flex-col"
          id="select-delivery-address-modal"
        >
          {/* Header */}
          <div className="p-5 pb-4 border-b border-brand-green/10 bg-brand-cream/30">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-xl bg-brand-orange/10 flex items-center justify-center text-brand-orange">
                    <MapPin className="w-4 h-4 text-brand-orange" />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-brand-orange">
                    Delivery Destination
                  </span>
                </div>
                <h3 className="text-lg font-black text-brand-charcoal tracking-tight">
                  Where do you want your order delivered?
                </h3>
                <p className="text-xs text-brand-charcoal/60 leading-relaxed font-medium">
                  Select which of your saved addresses you would like to receive food at today.
                </p>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-full text-brand-charcoal/50 hover:text-brand-charcoal hover:bg-black/5 transition-colors cursor-pointer"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Body / List of Saved Addresses */}
          <div className="p-5 overflow-y-auto space-y-3 flex-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-brand-charcoal/40">
                Your Saved Addresses ({savedAddresses.length})
              </span>
              <span className="text-[10px] text-brand-green font-bold flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> Quick Switch
              </span>
            </div>

            <div className="space-y-2">
              {savedAddresses.map((addr, idx) => {
                const isSelected = selectedAddr === addr;
                return (
                  <button
                    key={`addr-opt-${idx}`}
                    type="button"
                    onClick={() => handleConfirm(addr)}
                    className={`w-full text-left p-3.5 rounded-2xl border transition-all cursor-pointer flex items-start justify-between gap-3 group ${
                      isSelected
                        ? 'border-2 border-brand-green bg-brand-green/[0.04] shadow-xs'
                        : 'border-brand-green/10 bg-white hover:bg-brand-cream/30 hover:border-brand-green/30'
                    }`}
                  >
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <div
                        className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                          isSelected
                            ? 'bg-brand-green/15 text-brand-green'
                            : 'bg-brand-cream/60 text-brand-charcoal/60 group-hover:bg-brand-orange/10 group-hover:text-brand-orange'
                        }`}
                      >
                        {getAddressIcon(addr, idx)}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-[10px] font-black uppercase tracking-wider ${
                              isSelected ? 'text-brand-green' : 'text-brand-charcoal/50'
                            }`}
                          >
                            {getAddressLabel(addr, idx)}
                          </span>
                          {isSelected && (
                            <span className="px-1.5 py-0.5 rounded-full bg-brand-green/15 text-brand-green text-[9px] font-black uppercase">
                              Active
                            </span>
                          )}
                        </div>
                        <p className="text-xs font-semibold text-brand-charcoal mt-0.5 leading-snug line-clamp-2">
                          {addr}
                        </p>
                      </div>
                    </div>

                    <div className="shrink-0 pt-1 flex items-center">
                      {isSelected ? (
                        <div className="w-6 h-6 rounded-full bg-brand-green flex items-center justify-center text-white shadow-xs">
                          <CheckCircle2 className="w-4 h-4" />
                        </div>
                      ) : (
                        <div className="w-6 h-6 rounded-full border border-gray-300 group-hover:border-brand-green flex items-center justify-center text-transparent group-hover:text-brand-green/60 transition-colors">
                          <ChevronRight className="w-3.5 h-3.5 text-gray-400 group-hover:text-brand-green" />
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Add New Address on Map Button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onAddNewAddress();
                }}
                className="w-full py-3 px-4 rounded-2xl border border-dashed border-brand-green/40 text-brand-green bg-brand-green/[0.02] hover:bg-brand-green/[0.07] font-extrabold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <PlusCircle className="w-4 h-4 text-brand-green" />
                Add & Pinpoint New Location on Map
              </button>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="p-4 bg-brand-cream/20 border-t border-brand-green/10 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-brand-green/15 text-brand-charcoal/70 hover:bg-brand-cream/40 font-bold text-xs cursor-pointer transition-colors"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={() => handleConfirm(selectedAddr || savedAddresses[0])}
              disabled={!selectedAddr && savedAddresses.length === 0}
              className="flex-1 py-2.5 px-4 bg-brand-green hover:bg-brand-green/90 disabled:opacity-50 text-white font-extrabold text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              <span>Confirm & Continue Shopping</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
