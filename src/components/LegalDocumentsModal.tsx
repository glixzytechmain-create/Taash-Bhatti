/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  FileText,
  ShieldCheck,
  Search,
  Printer,
  Copy,
  Check,
  Phone,
  Mail,
  MapPin,
  Clock,
  Sparkles,
  ExternalLink,
  ChevronRight,
  ShieldAlert,
  Flame,
} from 'lucide-react';
import { LegalDocument } from '../types';
import { subscribeToLegalDocument } from '../lib/legalService';
import { motion, AnimatePresence } from 'motion/react';

interface LegalDocumentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'terms' | 'privacy';
}

export default function LegalDocumentsModal({
  isOpen,
  onClose,
  initialTab = 'terms',
}: LegalDocumentsModalProps) {
  const [activeDocType, setActiveDocType] = useState<'terms' | 'privacy'>(initialTab);
  const [termsDoc, setTermsDoc] = useState<LegalDocument | null>(null);
  const [privacyDoc, setPrivacyDoc] = useState<LegalDocument | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);

  // Sync initial tab when reopened
  useEffect(() => {
    if (isOpen) {
      setActiveDocType(initialTab);
      setSearchQuery('');
    }
  }, [isOpen, initialTab]);

  // Subscribe to real-time updates from Firestore/local storage
  useEffect(() => {
    const unsubTerms = subscribeToLegalDocument('terms_and_conditions', (doc) => {
      setTermsDoc(doc);
    });
    const unsubPrivacy = subscribeToLegalDocument('privacy_policy', (doc) => {
      setPrivacyDoc(doc);
    });

    return () => {
      unsubTerms();
      unsubPrivacy();
    };
  }, []);

  const currentDoc = activeDocType === 'terms' ? termsDoc : privacyDoc;

  // Filter sections by search query
  const filteredSections = useMemo(() => {
    if (!currentDoc || !searchQuery.trim()) {
      return currentDoc?.sections || [];
    }
    const q = searchQuery.toLowerCase();
    return currentDoc.sections.filter(
      (sec) =>
        sec.title.toLowerCase().includes(q) ||
        sec.content.toLowerCase().includes(q) ||
        (sec.subpoints && sec.subpoints.some((p) => p.toLowerCase().includes(q)))
    );
  }, [currentDoc, searchQuery]);

  const handleCopyLink = () => {
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('page', activeDocType === 'terms' ? 'terms' : 'privacy');
      navigator.clipboard.writeText(url.toString());
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch (e) {
      console.warn('Copy failed:', e);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (!isOpen) return null;

  return (
    <div
      id="legal-documents-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-brand-charcoal/80 backdrop-blur-md animate-fade-in"
    >
      <div
        id="legal-documents-modal-container"
        className="relative w-full max-w-4xl bg-brand-cream/95 text-brand-charcoal rounded-3xl border border-brand-green/20 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
      >
        {/* Modal Top Navigation & Brand Header */}
        <div className="bg-brand-charcoal text-white px-5 sm:px-8 py-5 border-b border-brand-green/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-brand-orange/20 border border-brand-orange/40 flex items-center justify-center text-brand-orange shadow-inner shrink-0">
              <Flame className="w-6 h-6 fill-brand-orange/30" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-sm uppercase tracking-wider text-amber-300">
                  TAASH BHATTI
                </span>
                <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full bg-brand-green/20 text-brand-green border border-brand-green/40">
                  Food Brand Legal Governance
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-black text-white tracking-tight">
                {currentDoc?.title || (activeDocType === 'terms' ? 'Terms & Conditions' : 'Privacy Policy')}
              </h2>
            </div>
          </div>

          {/* Action buttons: Print, Copy Link, Close */}
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              onClick={handlePrint}
              title="Print document"
              className="p-2.5 rounded-xl bg-zinc-800/80 hover:bg-zinc-700 text-gray-300 hover:text-white transition-all border border-zinc-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span className="hidden sm:inline">Print</span>
            </button>
            <button
              onClick={handleCopyLink}
              title="Copy shareable policy link"
              className="p-2.5 rounded-xl bg-zinc-800/80 hover:bg-zinc-700 text-gray-300 hover:text-white transition-all border border-zinc-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              <span className="hidden sm:inline">{copiedLink ? 'Copied' : 'Share'}</span>
            </button>
            <button
              onClick={onClose}
              className="p-2.5 rounded-xl bg-zinc-800 hover:bg-rose-900/40 hover:text-rose-300 text-gray-300 transition-all border border-zinc-700 cursor-pointer ml-1"
              aria-label="Close legal modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Selection Switcher: Terms vs Privacy */}
        <div className="bg-white/80 border-b border-brand-green/10 px-5 sm:px-8 py-3 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 p-1 bg-brand-cream/80 rounded-2xl border border-brand-green/15">
            <button
              onClick={() => {
                setActiveDocType('terms');
                setSearchQuery('');
              }}
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer ${
                activeDocType === 'terms'
                  ? 'bg-brand-charcoal text-white shadow-xs'
                  : 'text-brand-charcoal/70 hover:text-brand-charcoal hover:bg-white/60'
              }`}
            >
              <FileText className={`w-3.5 h-3.5 ${activeDocType === 'terms' ? 'text-amber-400' : ''}`} />
              <span>Terms & Conditions</span>
            </button>

            <button
              onClick={() => {
                setActiveDocType('privacy');
                setSearchQuery('');
              }}
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer ${
                activeDocType === 'privacy'
                  ? 'bg-brand-charcoal text-white shadow-xs'
                  : 'text-brand-charcoal/70 hover:text-brand-charcoal hover:bg-white/60'
              }`}
            >
              <ShieldCheck className={`w-3.5 h-3.5 ${activeDocType === 'privacy' ? 'text-brand-green' : ''}`} />
              <span>Privacy Policy</span>
            </button>
          </div>

          {/* Quick Version & Date Info */}
          {currentDoc && (
            <div className="flex items-center gap-3 text-[11px] font-bold text-brand-charcoal/60">
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-brand-orange" />
                <span>Last Updated: <strong className="text-brand-charcoal">{currentDoc.lastUpdated}</strong></span>
              </span>
              <span className="hidden sm:inline px-2 py-0.5 rounded-md bg-brand-charcoal/5 border border-brand-charcoal/10 font-mono text-[10px]">
                {currentDoc.version}
              </span>
            </div>
          )}
        </div>

        {/* Search & Navigation Bar */}
        <div className="px-5 sm:px-8 py-3 bg-white/40 border-b border-brand-green/10 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shrink-0">
          {/* Search input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-brand-charcoal/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`Search in ${activeDocType === 'terms' ? 'Terms & Conditions' : 'Privacy Policy'} clauses...`}
              className="w-full pl-9 pr-8 py-2 bg-white rounded-xl border border-brand-green/20 text-xs font-medium text-brand-charcoal focus:outline-none focus:ring-2 focus:ring-brand-green/30 transition-all placeholder:text-brand-charcoal/40"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-brand-charcoal/40 hover:text-brand-charcoal"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Quick Jump Dropdown / Clause Pills */}
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-none py-0.5">
            <span className="text-[10px] font-black uppercase text-brand-charcoal/50 whitespace-nowrap">
              Jump to:
            </span>
            {currentDoc?.sections.slice(0, 6).map((sec, idx) => (
              <button
                key={sec.id}
                onClick={() => {
                  const el = document.getElementById(`section-${sec.id}`);
                  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  setActiveSectionId(sec.id);
                }}
                className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border whitespace-nowrap transition-all cursor-pointer ${
                  activeSectionId === sec.id
                    ? 'bg-brand-green text-white border-brand-green'
                    : 'bg-white text-brand-charcoal/70 border-brand-green/15 hover:bg-brand-cream'
                }`}
              >
                § {idx + 1}
              </button>
            ))}
          </div>
        </div>

        {/* Scrollable Document Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-8 space-y-6 scrollbar-thin">
          {/* Executive Summary Card */}
          {currentDoc?.summary && !searchQuery && (
            <div className="p-5 rounded-2xl bg-amber-50/80 border border-amber-300/50 shadow-2xs space-y-2">
              <div className="flex items-center gap-2 text-amber-900 font-black text-xs uppercase tracking-wider">
                <Sparkles className="w-4 h-4 text-brand-orange" />
                <span>Executive Summary • Food Brand Transparency</span>
              </div>
              <p className="text-xs sm:text-sm text-brand-charcoal/80 leading-relaxed">
                {currentDoc.summary}
              </p>
            </div>
          )}

          {/* Search match notification */}
          {searchQuery && (
            <div className="text-xs font-bold text-brand-charcoal/70 flex items-center justify-between pb-1 border-b border-brand-green/10">
              <span>
                Found <strong className="text-brand-orange">{filteredSections.length}</strong> clauses matching &ldquo;{searchQuery}&rdquo;
              </span>
              <button
                onClick={() => setSearchQuery('')}
                className="text-xs text-brand-green hover:underline cursor-pointer"
              >
                Clear filter
              </button>
            </div>
          )}

          {/* Clauses List */}
          {filteredSections.length === 0 ? (
            <div className="text-center py-12 space-y-3">
              <ShieldAlert className="w-10 h-10 text-brand-charcoal/30 mx-auto" />
              <h4 className="font-extrabold text-sm text-brand-charcoal">No matching clauses found</h4>
              <p className="text-xs text-brand-charcoal/60">
                Try searching for terms like &ldquo;allergens&rdquo;, &ldquo;delivery&rdquo;, &ldquo;refund&rdquo;, or &ldquo;data&rdquo;.
              </p>
              <button
                onClick={() => setSearchQuery('')}
                className="px-4 py-2 rounded-xl bg-brand-green text-white text-xs font-bold"
              >
                Show All Clauses
              </button>
            </div>
          ) : (
            filteredSections.map((section, idx) => (
              <div
                key={section.id}
                id={`section-${section.id}`}
                className="p-5 sm:p-6 bg-white rounded-2xl border border-brand-green/15 shadow-2xs hover:shadow-xs transition-all space-y-3.5 scroll-mt-6"
              >
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-black text-sm sm:text-base text-brand-charcoal tracking-tight flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-brand-cream text-brand-green border border-brand-green/20 flex items-center justify-center font-mono text-xs font-black shrink-0">
                      {idx + 1}
                    </span>
                    <span>{section.title}</span>
                  </h3>
                </div>

                <p className="text-xs sm:text-sm text-brand-charcoal/85 leading-relaxed whitespace-pre-line">
                  {section.content}
                </p>

                {section.subpoints && section.subpoints.length > 0 && (
                  <div className="pt-2 border-t border-brand-green/10 space-y-2">
                    <span className="text-[10px] font-black uppercase text-brand-charcoal/50 tracking-wider block">
                      Specific Stipulations & Culinary Safeguards:
                    </span>
                    <ul className="space-y-1.5 pl-1">
                      {section.subpoints.map((pt, pIdx) => (
                        <li key={pIdx} className="flex items-start gap-2.5 text-xs text-brand-charcoal/80 leading-normal">
                          <span className="w-1.5 h-1.5 rounded-full bg-brand-orange shrink-0 mt-1.5" />
                          <span>{pt}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))
          )}

          {/* Grievance & Official Contact Footer Card */}
          {currentDoc && (
            <div className="mt-8 p-6 bg-gradient-to-br from-brand-charcoal via-zinc-900 to-brand-green/80 text-white rounded-3xl border border-amber-400/30 shadow-lg space-y-4">
              <div className="flex items-center gap-2 text-amber-300">
                <ShieldCheck className="w-5 h-5 text-amber-300" />
                <h4 className="font-black text-xs uppercase tracking-wider">
                  Official Grievance Officer & Food Safety Desk
                </h4>
              </div>
              <p className="text-xs text-gray-300 leading-relaxed">
                For regulatory inquiries, food safety clarifications, or to exercise your statutory data access and deletion rights, contact our dedicated Grievance & Privacy Office:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs">
                <div className="bg-white/10 rounded-xl p-3 border border-white/10 flex items-center gap-2.5">
                  <Mail className="w-4 h-4 text-amber-300 shrink-0" />
                  <div className="truncate">
                    <div className="text-[9px] uppercase font-bold text-gray-400">Email Desk</div>
                    <a href={`mailto:${currentDoc.contactEmail}`} className="font-bold text-white hover:underline truncate block">
                      {currentDoc.contactEmail || 'support@taashbhatti.com'}
                    </a>
                  </div>
                </div>
                <div className="bg-white/10 rounded-xl p-3 border border-white/10 flex items-center gap-2.5">
                  <Phone className="w-4 h-4 text-brand-green shrink-0" />
                  <div>
                    <div className="text-[9px] uppercase font-bold text-gray-400">Direct Helpline</div>
                    <a href={`tel:${currentDoc.contactPhone}`} className="font-bold text-white hover:underline">
                      {currentDoc.contactPhone || '+91 91234 56789'}
                    </a>
                  </div>
                </div>
                <div className="bg-white/10 rounded-xl p-3 border border-white/10 flex items-center gap-2.5 sm:col-span-1">
                  <MapPin className="w-4 h-4 text-brand-orange shrink-0" />
                  <div className="truncate">
                    <div className="text-[9px] uppercase font-bold text-gray-400">Kitchen Headquarters</div>
                    <span className="text-[11px] text-gray-200 truncate block">
                      Muzaffarpur, Bihar, India
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Bottom Action Bar */}
        <div className="bg-white px-5 sm:px-8 py-3.5 border-t border-brand-green/15 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 text-xs text-brand-charcoal/60">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Official Culinary Policy for <strong>TAASH BHATTI</strong></span>
          </div>
          <button
            onClick={onClose}
            className="px-6 py-2 rounded-xl bg-brand-charcoal text-white font-black text-xs uppercase tracking-wider hover:bg-brand-charcoal/90 transition-all cursor-pointer shadow-xs"
          >
            Acknowledge & Close
          </button>
        </div>
      </div>
    </div>
  );
}
