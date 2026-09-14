/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  FileText,
  ShieldCheck,
  Save,
  RotateCcw,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  Eye,
  Edit3,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  ExternalLink,
  Flame,
} from 'lucide-react';
import { LegalDocument, LegalSection } from '../types';
import {
  fetchLegalDocument,
  saveLegalDocument,
  getLocalTermsAndConditions,
  getLocalPrivacyPolicy,
} from '../lib/legalService';
import { DEFAULT_TERMS_AND_CONDITIONS, DEFAULT_PRIVACY_POLICY } from '../data/defaultLegalDocs';

interface AdminLegalManagerProps {
  adminEmail?: string;
  onViewLiveInApp?: (tab: 'terms' | 'privacy') => void;
}

export default function AdminLegalManager({
  adminEmail = 'admin@taashbhatti.com',
  onViewLiveInApp,
}: AdminLegalManagerProps) {
  const [activeDocType, setActiveDocType] = useState<'terms_and_conditions' | 'privacy_policy'>('terms_and_conditions');
  
  // Working draft state
  const [workingDoc, setWorkingDoc] = useState<LegalDocument>(DEFAULT_TERMS_AND_CONDITIONS);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [saveErrorMsg, setSaveErrorMsg] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [viewMode, setViewMode] = useState<'edit' | 'preview'>('edit');

  // Load document whenever activeDocType changes
  useEffect(() => {
    loadDocument(activeDocType);
  }, [activeDocType]);

  const loadDocument = async (docType: 'terms_and_conditions' | 'privacy_policy') => {
    setIsLoading(true);
    setSaveSuccessMsg(null);
    setSaveErrorMsg(null);
    try {
      const doc = await fetchLegalDocument(docType);
      setWorkingDoc(JSON.parse(JSON.stringify(doc))); // Deep clone
      setHasUnsavedChanges(false);
    } catch (e) {
      console.error('Failed to load legal document:', e);
      const fallback = docType === 'terms_and_conditions' ? getLocalTermsAndConditions() : getLocalPrivacyPolicy();
      setWorkingDoc(JSON.parse(JSON.stringify(fallback)));
    } finally {
      setIsLoading(false);
    }
  };

  const handleFieldChange = (field: keyof LegalDocument, value: any) => {
    setWorkingDoc((prev) => ({
      ...prev,
      [field]: value,
    }));
    setHasUnsavedChanges(true);
  };

  // Section manipulation
  const handleSectionChange = (index: number, field: keyof LegalSection, value: any) => {
    const updatedSections = [...workingDoc.sections];
    updatedSections[index] = {
      ...updatedSections[index],
      [field]: value,
    };
    handleFieldChange('sections', updatedSections);
  };

  const handleAddSection = () => {
    const newSection: LegalSection = {
      id: `section_${Date.now()}`,
      title: `${workingDoc.sections.length + 1}. New Policy Clause`,
      content: 'Describe the policy details, culinary safeguards, and terms here...',
      subpoints: ['Specific clause stipulation or guideline'],
    };
    handleFieldChange('sections', [...workingDoc.sections, newSection]);
  };

  const handleDeleteSection = (index: number) => {
    if (confirm(`Are you sure you want to remove clause #${index + 1}?`)) {
      const updated = workingDoc.sections.filter((_, i) => i !== index);
      handleFieldChange('sections', updated);
    }
  };

  const handleMoveSection = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= workingDoc.sections.length) return;
    const updated = [...workingDoc.sections];
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;
    handleFieldChange('sections', updated);
  };

  // Subpoint manipulation
  const handleAddSubpoint = (secIndex: number) => {
    const updatedSections = [...workingDoc.sections];
    const currentSubpoints = updatedSections[secIndex].subpoints || [];
    updatedSections[secIndex].subpoints = [...currentSubpoints, 'New guideline or requirement'];
    handleFieldChange('sections', updatedSections);
  };

  const handleUpdateSubpoint = (secIndex: number, ptIndex: number, text: string) => {
    const updatedSections = [...workingDoc.sections];
    const currentSubpoints = [...(updatedSections[secIndex].subpoints || [])];
    currentSubpoints[ptIndex] = text;
    updatedSections[secIndex].subpoints = currentSubpoints;
    handleFieldChange('sections', updatedSections);
  };

  const handleDeleteSubpoint = (secIndex: number, ptIndex: number) => {
    const updatedSections = [...workingDoc.sections];
    const currentSubpoints = [...(updatedSections[secIndex].subpoints || [])];
    currentSubpoints.splice(ptIndex, 1);
    updatedSections[secIndex].subpoints = currentSubpoints;
    handleFieldChange('sections', updatedSections);
  };

  // Save to Firestore and local storage
  const handleSaveToFirestore = async () => {
    setIsSaving(true);
    setSaveSuccessMsg(null);
    setSaveErrorMsg(null);

    try {
      await saveLegalDocument(activeDocType, workingDoc, adminEmail);
      setHasUnsavedChanges(false);
      setSaveSuccessMsg(`✅ Successfully published "${workingDoc.title}" to live patrons!`);
      setTimeout(() => setSaveSuccessMsg(null), 4000);
    } catch (err: any) {
      console.error('Save failed:', err);
      setSaveErrorMsg(`❌ Failed to publish to Firestore: ${err?.message || String(err)}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Reset to default curated food brand template
  const handleResetToDefault = () => {
    if (
      confirm(
        `Are you sure you want to reset "${workingDoc.title}" to the official default TAASH BHATTI food brand template? All manual custom edits will be reverted.`
      )
    ) {
      const template =
        activeDocType === 'terms_and_conditions'
          ? DEFAULT_TERMS_AND_CONDITIONS
          : DEFAULT_PRIVACY_POLICY;
      setWorkingDoc(JSON.parse(JSON.stringify(template)));
      setHasUnsavedChanges(true);
      setSaveSuccessMsg('Template restored in editor. Click "Publish Changes" to push to live app.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Title */}
      <div className="bg-brand-charcoal text-white p-6 rounded-3xl border border-brand-green/20 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-brand-orange/20 border border-brand-orange/40 flex items-center justify-center text-brand-orange shadow-inner shrink-0">
            <Flame className="w-6 h-6 fill-brand-orange/30" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase tracking-wider text-amber-300">
                TAASH BHATTI LEGAL DESK
              </span>
              <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800">
                Real-Time Firestore Content Sync
              </span>
            </div>
            <h2 className="text-xl font-black tracking-tight text-white mt-0.5">
              Legal & Food Policy Manager
            </h2>
            <p className="text-xs text-gray-300 mt-1 max-w-xl">
              Manage and manually edit customer-facing Terms & Conditions and the Privacy Policy. Changes are stored in Firestore and update instantly across all customer sessions.
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5 self-end md:self-auto">
          {onViewLiveInApp && (
            <button
              onClick={() => onViewLiveInApp(activeDocType === 'terms_and_conditions' ? 'terms' : 'privacy')}
              className="px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-gray-200 hover:text-white font-bold text-xs flex items-center gap-1.5 transition-all border border-zinc-700 cursor-pointer"
            >
              <ExternalLink className="w-4 h-4" />
              <span>Preview Customer View</span>
            </button>
          )}

          <button
            onClick={handleSaveToFirestore}
            disabled={isSaving}
            className={`px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer shadow-md ${
              hasUnsavedChanges
                ? 'bg-brand-orange hover:bg-amber-500 text-brand-charcoal animate-pulse'
                : 'bg-brand-green hover:bg-emerald-400 text-brand-charcoal'
            } disabled:opacity-50`}
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'Publishing...' : 'Publish Changes to Live App'}</span>
          </button>
        </div>
      </div>

      {/* Notifications / Banners */}
      {saveSuccessMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-bold flex items-center gap-2 shadow-xs animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{saveSuccessMsg}</span>
        </div>
      )}

      {saveErrorMsg && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-300 text-rose-900 text-xs font-bold flex items-center gap-2 shadow-xs animate-fade-in">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{saveErrorMsg}</span>
        </div>
      )}

      {hasUnsavedChanges && !saveSuccessMsg && (
        <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-300 text-amber-900 text-xs font-bold flex items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>You have unsaved changes in the editor. Click &ldquo;Publish Changes&rdquo; to deploy them to Firestore.</span>
          </div>
          <button
            onClick={() => loadDocument(activeDocType)}
            className="text-[11px] uppercase tracking-wider text-amber-900 hover:underline shrink-0 font-black cursor-pointer"
          >
            Discard
          </button>
        </div>
      )}

      {/* Document Selector & View Mode Switcher */}
      <div className="bg-white p-4 rounded-3xl border border-brand-green/15 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Document Tabs */}
        <div className="flex items-center gap-2 p-1 bg-brand-cream/70 rounded-2xl border border-brand-green/10">
          <button
            onClick={() => setActiveDocType('terms_and_conditions')}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer ${
              activeDocType === 'terms_and_conditions'
                ? 'bg-brand-charcoal text-white shadow-xs'
                : 'text-brand-charcoal/70 hover:text-brand-charcoal hover:bg-white/70'
            }`}
          >
            <FileText className={`w-4 h-4 ${activeDocType === 'terms_and_conditions' ? 'text-amber-400' : ''}`} />
            <span>Terms & Conditions</span>
          </button>

          <button
            onClick={() => setActiveDocType('privacy_policy')}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer ${
              activeDocType === 'privacy_policy'
                ? 'bg-brand-charcoal text-white shadow-xs'
                : 'text-brand-charcoal/70 hover:text-brand-charcoal hover:bg-white/70'
            }`}
          >
            <ShieldCheck className={`w-4 h-4 ${activeDocType === 'privacy_policy' ? 'text-brand-green' : ''}`} />
            <span>Privacy Policy</span>
          </button>
        </div>

        {/* View Mode & Restore Template */}
        <div className="flex items-center gap-2">
          <div className="flex items-center p-1 bg-brand-cream/60 rounded-xl border border-brand-green/10">
            <button
              onClick={() => setViewMode('edit')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === 'edit' ? 'bg-white text-brand-charcoal shadow-2xs' : 'text-brand-charcoal/60'
              }`}
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Editor</span>
            </button>
            <button
              onClick={() => setViewMode('preview')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === 'preview' ? 'bg-white text-brand-charcoal shadow-2xs' : 'text-brand-charcoal/60'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Live Preview</span>
            </button>
          </div>

          <button
            onClick={handleResetToDefault}
            className="px-3 py-1.5 rounded-xl bg-gray-100 hover:bg-rose-50 text-gray-700 hover:text-rose-700 border border-gray-200 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
            title="Reset to default TAASH BHATTI food brand text"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Reset Template</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {viewMode === 'preview' ? (
        /* LIVE PREVIEW BOX */
        <div className="bg-white rounded-3xl border border-brand-green/20 p-6 sm:p-10 shadow-sm space-y-6">
          <div className="border-b border-brand-green/10 pb-5 space-y-2">
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-brand-orange">
              <Sparkles className="w-4 h-4" />
              <span>Patron Live Preview</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-brand-charcoal">{workingDoc.title}</h1>
            <p className="text-sm text-brand-charcoal/70 font-medium">{workingDoc.tagline}</p>
            <div className="flex items-center gap-3 text-xs text-brand-charcoal/50 pt-2 font-mono">
              <span>Last Updated: <strong>{workingDoc.lastUpdated}</strong></span>
              <span>•</span>
              <span>Version: <strong>{workingDoc.version}</strong></span>
            </div>
          </div>

          {workingDoc.summary && (
            <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200 text-xs text-brand-charcoal/85 leading-relaxed">
              <strong>Executive Summary:</strong> {workingDoc.summary}
            </div>
          )}

          <div className="space-y-6 pt-2">
            {workingDoc.sections.map((sec, idx) => (
              <div key={sec.id} className="space-y-2.5 pb-5 border-b border-brand-green/10 last:border-0">
                <h3 className="text-base font-black text-brand-charcoal">{sec.title}</h3>
                <p className="text-xs sm:text-sm text-brand-charcoal/80 leading-relaxed whitespace-pre-line">
                  {sec.content}
                </p>
                {sec.subpoints && sec.subpoints.length > 0 && (
                  <ul className="space-y-1.5 pl-3 pt-1">
                    {sec.subpoints.map((pt, pIdx) => (
                      <li key={pIdx} className="text-xs text-brand-charcoal/75 flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-brand-orange mt-1.5 shrink-0" />
                        <span>{pt}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* FULL FORM EDITOR */
        <div className="space-y-6">
          {/* Metadata Card: Title, Version, Date, Summary */}
          <div className="bg-white p-6 rounded-3xl border border-brand-green/15 shadow-xs space-y-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-brand-charcoal flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-brand-orange" />
              <span>Document Metadata & Header Information</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-black uppercase text-brand-charcoal/60 mb-1">
                  Document Title
                </label>
                <input
                  type="text"
                  value={workingDoc.title}
                  onChange={(e) => handleFieldChange('title', e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-brand-cream/40 rounded-xl border border-brand-green/20 text-xs font-bold text-brand-charcoal focus:outline-none focus:ring-2 focus:ring-brand-green/30"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[11px] font-black uppercase text-brand-charcoal/60 mb-1">
                  Tagline / Subheading
                </label>
                <input
                  type="text"
                  value={workingDoc.tagline}
                  onChange={(e) => handleFieldChange('tagline', e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-brand-cream/40 rounded-xl border border-brand-green/20 text-xs font-medium text-brand-charcoal focus:outline-none focus:ring-2 focus:ring-brand-green/30"
                />
              </div>

              <div>
                <label className="block text-[11px] font-black uppercase text-brand-charcoal/60 mb-1">
                  Last Updated Date
                </label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={workingDoc.lastUpdated}
                    onChange={(e) => handleFieldChange('lastUpdated', e.target.value)}
                    className="w-full px-3.5 py-2 bg-brand-cream/40 rounded-xl border border-brand-green/20 text-xs font-bold text-brand-charcoal focus:outline-none focus:ring-2 focus:ring-brand-green/30"
                  />
                  <button
                    onClick={() => {
                      const today = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
                      handleFieldChange('lastUpdated', today);
                    }}
                    className="px-2.5 py-2 bg-brand-cream hover:bg-brand-cream/80 text-[10px] font-black text-brand-charcoal rounded-xl border border-brand-green/20 shrink-0 cursor-pointer"
                    title="Set to current month & year"
                  >
                    Now
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-black uppercase text-brand-charcoal/60 mb-1">
                  Version String
                </label>
                <input
                  type="text"
                  value={workingDoc.version}
                  onChange={(e) => handleFieldChange('version', e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-brand-cream/40 rounded-xl border border-brand-green/20 text-xs font-bold font-mono text-brand-charcoal focus:outline-none focus:ring-2 focus:ring-brand-green/30"
                />
              </div>

              <div>
                <label className="block text-[11px] font-black uppercase text-brand-charcoal/60 mb-1">
                  Contact Support Email
                </label>
                <input
                  type="email"
                  value={workingDoc.contactEmail || ''}
                  onChange={(e) => handleFieldChange('contactEmail', e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-brand-cream/40 rounded-xl border border-brand-green/20 text-xs text-brand-charcoal focus:outline-none focus:ring-2 focus:ring-brand-green/30"
                />
              </div>

              <div>
                <label className="block text-[11px] font-black uppercase text-brand-charcoal/60 mb-1">
                  Contact Phone
                </label>
                <input
                  type="text"
                  value={workingDoc.contactPhone || ''}
                  onChange={(e) => handleFieldChange('contactPhone', e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-brand-cream/40 rounded-xl border border-brand-green/20 text-xs text-brand-charcoal focus:outline-none focus:ring-2 focus:ring-brand-green/30"
                />
              </div>
            </div>

            {/* Executive Summary */}
            <div>
              <label className="block text-[11px] font-black uppercase text-brand-charcoal/60 mb-1">
                Executive Summary / Preamble
              </label>
              <textarea
                rows={3}
                value={workingDoc.summary}
                onChange={(e) => handleFieldChange('summary', e.target.value)}
                className="w-full p-3.5 bg-brand-cream/40 rounded-xl border border-brand-green/20 text-xs text-brand-charcoal focus:outline-none focus:ring-2 focus:ring-brand-green/30 leading-relaxed"
              />
            </div>
          </div>

          {/* Section Clauses Manager */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-wider text-brand-charcoal">
                  Policy Clauses & Sections
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-brand-charcoal/10 font-bold">
                  {workingDoc.sections.length} clauses
                </span>
              </div>

              <button
                onClick={handleAddSection}
                className="px-3.5 py-2 rounded-xl bg-brand-charcoal text-white font-black text-xs uppercase tracking-wider hover:bg-brand-charcoal/90 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Clause Section</span>
              </button>
            </div>

            {/* Sections Accordion / Cards */}
            <div className="space-y-4">
              {workingDoc.sections.map((section, secIdx) => (
                <div
                  key={section.id || secIdx}
                  className="bg-white p-5 rounded-3xl border border-brand-green/15 shadow-xs space-y-4 relative group hover:border-brand-green/30 transition-all"
                >
                  {/* Top toolbar */}
                  <div className="flex items-center justify-between gap-3 border-b border-brand-green/10 pb-3">
                    <div className="flex items-center gap-2 flex-1">
                      <span className="w-6 h-6 rounded-lg bg-brand-cream text-brand-charcoal border border-brand-green/20 font-black text-xs flex items-center justify-center font-mono shrink-0">
                        {secIdx + 1}
                      </span>
                      <input
                        type="text"
                        value={section.title}
                        onChange={(e) => handleSectionChange(secIdx, 'title', e.target.value)}
                        placeholder="Clause Title (e.g. 1. Food Preparation & Hygiene)"
                        className="w-full font-black text-sm text-brand-charcoal bg-transparent border-0 border-b border-transparent focus:border-brand-green/30 focus:outline-none px-1 py-0.5"
                      />
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => handleMoveSection(secIdx, 'up')}
                        disabled={secIdx === 0}
                        title="Move Up"
                        className="p-1.5 rounded-lg text-gray-400 hover:text-brand-charcoal hover:bg-brand-cream disabled:opacity-30 cursor-pointer"
                      >
                        <ChevronUp className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleMoveSection(secIdx, 'down')}
                        disabled={secIdx === workingDoc.sections.length - 1}
                        title="Move Down"
                        className="p-1.5 rounded-lg text-gray-400 hover:text-brand-charcoal hover:bg-brand-cream disabled:opacity-30 cursor-pointer"
                      >
                        <ChevronDown className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteSection(secIdx)}
                        title="Delete Section"
                        className="p-1.5 rounded-lg text-rose-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer ml-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Section Main Text */}
                  <div>
                    <label className="block text-[10px] font-black uppercase text-brand-charcoal/50 mb-1">
                      Detailed Clause Text
                    </label>
                    <textarea
                      rows={3}
                      value={section.content}
                      onChange={(e) => handleSectionChange(secIdx, 'content', e.target.value)}
                      placeholder="Enter legal terms and conditions text..."
                      className="w-full p-3 bg-brand-cream/30 rounded-xl border border-brand-green/15 text-xs text-brand-charcoal focus:outline-none focus:ring-2 focus:ring-brand-green/30 leading-relaxed font-sans"
                    />
                  </div>

                  {/* Specific subpoints */}
                  <div className="space-y-2 pt-1 border-t border-brand-green/10">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-black uppercase text-brand-charcoal/50">
                        Subpoints & Bullet Stipulations
                      </label>
                      <button
                        onClick={() => handleAddSubpoint(secIdx)}
                        className="text-[10px] font-bold text-brand-green hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Add Bullet Point</span>
                      </button>
                    </div>

                    <div className="space-y-1.5">
                      {(section.subpoints || []).map((point, ptIdx) => (
                        <div key={ptIdx} className="flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-brand-orange shrink-0" />
                          <input
                            type="text"
                            value={point}
                            onChange={(e) => handleUpdateSubpoint(secIdx, ptIdx, e.target.value)}
                            className="flex-1 px-3 py-1.5 bg-brand-cream/20 rounded-lg border border-brand-green/10 text-xs text-brand-charcoal focus:outline-none focus:ring-1 focus:ring-brand-green/30"
                          />
                          <button
                            onClick={() => handleDeleteSubpoint(secIdx, ptIdx)}
                            className="text-gray-400 hover:text-rose-500 p-1 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Add clause button at bottom */}
            <button
              onClick={handleAddSection}
              className="w-full py-4 rounded-3xl border-2 border-dashed border-brand-green/20 hover:border-brand-green/40 bg-brand-cream/30 hover:bg-brand-cream/60 text-brand-charcoal/70 hover:text-brand-charcoal font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Another Clause Section</span>
            </button>
          </div>

          {/* Bottom Save Bar */}
          <div className="sticky bottom-4 bg-brand-charcoal text-white p-4 rounded-3xl border border-brand-green/30 shadow-2xl flex items-center justify-between gap-4 z-20">
            <div className="flex items-center gap-2 text-xs">
              <span className={`w-2.5 h-2.5 rounded-full ${hasUnsavedChanges ? 'bg-amber-400 animate-ping' : 'bg-emerald-400'}`} />
              <span className="font-bold">
                {hasUnsavedChanges ? 'Unsaved edits present' : 'All edits synchronized with Firestore'}
              </span>
            </div>

            <button
              onClick={handleSaveToFirestore}
              disabled={isSaving}
              className="px-6 py-2.5 rounded-xl bg-brand-green hover:bg-emerald-400 text-brand-charcoal font-black text-xs uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer shadow-md disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'Publishing...' : 'Publish to Live App'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
