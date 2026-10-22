'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Pill,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Building2,
  Search,
  ShieldAlert,
  Info,
  Plus,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { useToast } from '@/components/ui/toast';

interface ProviderItem {
  id: string;
  name: string;
  slug: string;
  website: string;
  description: string | null;
  serviceRegion: string;
  connectionType: 'DIRECTORY_LINK' | 'API_INTEGRATED' | 'NOT_CONNECTED';
  isActive: boolean;
  apiNotes: string | null;
}

interface PharmacyClientProps {
  userRole: string;
  providers: ProviderItem[];
  currentPreference: {
    providerId: string | null;
    providerName: string | null;
    notes: string | null;
  } | null;
}

export default function PharmacyClient({
  userRole,
  providers,
  currentPreference,
}: PharmacyClientProps) {
  const router = useRouter();
  const { toast } = useToast();

  const [providerList, setProviderList] = useState<ProviderItem[]>(providers);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProviderId, setSelectedProviderId] = useState<string>(
    currentPreference?.providerId || ''
  );
  const [notes, setNotes] = useState(currentPreference?.notes || '');
  const [isSaving, setIsSaving] = useState(false);

  // Add Partner Modal state (Admin feature requested)
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isSubmittingAdd, setIsSubmittingAdd] = useState(false);
  const [newPharmacy, setNewPharmacy] = useState({
    name: '',
    website: '',
    description: '',
    serviceRegion: 'Pan-India',
    connectionType: 'API_INTEGRATED',
  });

  React.useEffect(() => {
    setProviderList(providers);
  }, [providers]);

  const filteredProviders = providerList.filter(
    (p) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.description && p.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleAddPharmacy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPharmacy.name.trim()) return;

    setIsSubmittingAdd(true);
    try {
      const res = await fetch('/api/pharmacy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPharmacy),
      });

      const data = await res.json();
      if (!res.ok) {
        toast({ title: 'Failed to Add Partner', description: data.error, type: 'error' });
        return;
      }

      toast({
        title: 'Partner Added to Catalog',
        description: data.message,
        type: 'success',
      });

      if (data.provider) {
        setProviderList((prev) => [data.provider, ...prev]);
      }

      setIsAddOpen(false);
      setNewPharmacy({
        name: '',
        website: '',
        description: '',
        serviceRegion: 'Pan-India',
        connectionType: 'API_INTEGRATED',
      });
      router.refresh();
    } catch {
      toast({ title: 'Error', description: 'Could not connect to server', type: 'error' });
    } finally {
      setIsSubmittingAdd(false);
    }
  };

  const handleSavePreference = async (providerId: string) => {
    setIsSaving(true);
    try {
      const res = await fetch('/api/pharmacy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          providerId,
          notes,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast({ title: 'Update Failed', description: data.error, type: 'error' });
        return;
      }

      setSelectedProviderId(providerId);
      toast({
        title: 'Preference Saved',
        description: data.message,
        type: 'success',
      });
      router.refresh();
    } catch {
      toast({ title: 'Error', description: 'Could not connect to server', type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  const connectionTypeLabels: Record<
    string,
    { label: string; variant: 'teal' | 'blue' | 'slate'; desc: string }
  > = {
    API_INTEGRATED: {
      label: 'API Integration Configured',
      variant: 'teal',
      desc: 'Enterprise health connector sandbox active.',
    },
    DIRECTORY_LINK: {
      label: 'Directory / External Link Only',
      variant: 'blue',
      desc: 'Catalog locator and patient referral link.',
    },
    NOT_CONNECTED: {
      label: 'Not Connected / Pending Verification',
      variant: 'slate',
      desc: 'Verification required before enabling prescription linkage.',
    },
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Pharmacy &amp; Medical Service Providers
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Select and configure your preferred pharmacy partner for patient home delivery referrals.
          </p>
        </div>

        {(userRole === 'ADMIN' || userRole === 'SUPER_ADMIN') && (
          <Button
            variant="primary"
            size="md"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={() => setIsAddOpen(true)}
            className="cursor-pointer bg-teal-600 hover:bg-teal-700 text-white font-bold"
          >
            + Add Pharmacy Partner
          </Button>
        )}
      </div>

      {/* Mandatory Regulatory Transparency Notice */}
      <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 space-y-1">
        <div className="flex items-center gap-2 font-bold">
          <Info className="w-4 h-4 text-amber-700 shrink-0" />
          <span>IMPORTANT CLINICAL DISCLOSURE</span>
        </div>
        <p className="text-[11px] text-amber-800 leading-relaxed">
          Selecting a pharmacy designates a preferred fulfillment partner for patient referral. It{' '}
          <strong>does not</strong> automatically transmit prescription documents or charge
          patients without explicit authorized clinic API credentials and patient consent.
        </p>
      </div>

      {/* Search Input */}
      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search pharmacy catalog (e.g. Tata 1mg, Apollo 24|7, PharmEasy...)"
              className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
            />
          </div>
        </CardContent>
      </Card>

      {/* Providers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredProviders.map((provider) => {
          const isSelected = selectedProviderId === provider.id;
          const connInfo = connectionTypeLabels[provider.connectionType];

          return (
            <Card
              key={provider.id}
              className={`transition-all ${
                isSelected
                  ? 'border-teal-500 ring-2 ring-teal-500/20 shadow-md'
                  : 'hover:border-slate-300'
              }`}
            >
              <CardContent className="p-5 flex flex-col justify-between h-full space-y-4">
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-700 font-bold">
                        <Pill className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-bold text-sm text-slate-900 leading-tight">
                          {provider.name}
                        </h3>
                        <span className="text-[11px] text-slate-400">
                          {provider.serviceRegion}
                        </span>
                      </div>
                    </div>

                    <Badge variant={connInfo.variant}>{connInfo.label}</Badge>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed">
                    {provider.description}
                  </p>

                  {provider.apiNotes && (
                    <div className="p-2 bg-slate-50 rounded text-[11px] font-mono text-slate-500">
                      Integration note: {provider.apiNotes}
                    </div>
                  )}

                  {provider.slug === 'pharm-pets' && (
                    <div className="p-2.5 bg-rose-50 rounded-lg border border-rose-200 text-[11px] text-rose-800 flex items-center gap-2">
                      <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                      <span>
                        Pending Client Confirmation: Disabled until corporate domain and licensing are confirmed.
                      </span>
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <a
                    href={provider.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-teal-600 hover:underline flex items-center gap-1 font-medium"
                  >
                    <span>Official Portal</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>

                  {userRole === 'DOCTOR' && (
                    <Button
                      variant={isSelected ? 'secondary' : 'outline'}
                      size="sm"
                      disabled={!provider.isActive || isSaving}
                      onClick={() => handleSavePreference(provider.id)}
                      leftIcon={isSelected ? <CheckCircle2 className="w-3.5 h-3.5 text-teal-400" /> : undefined}
                    >
                      {isSelected ? 'Preferred Partner' : 'Select as Preferred'}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Add Pharmacy Partner Modal (Admin) */}
      <Modal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title="Add Pharmacy Partner to Catalog"
        description="Add a verified online pharmacy or local medical supplier. It will be immediately available to all clinic doctors."
        maxWidth="md"
      >
        <form onSubmit={handleAddPharmacy} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Pharmacy Partner Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={newPharmacy.name}
              onChange={(e) => setNewPharmacy({ ...newPharmacy, name: e.target.value })}
              placeholder="e.g. Apollo Pharmacy 24|7"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Official Website / Order Portal URL
            </label>
            <input
              type="url"
              value={newPharmacy.website}
              onChange={(e) => setNewPharmacy({ ...newPharmacy, website: e.target.value })}
              placeholder="e.g. https://www.apollopharmacy.in"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Service Coverage Region
            </label>
            <input
              type="text"
              value={newPharmacy.serviceRegion}
              onChange={(e) => setNewPharmacy({ ...newPharmacy, serviceRegion: e.target.value })}
              placeholder="e.g. Pan-India / Delhi NCR"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Description &amp; Fulfillment SLA
            </label>
            <textarea
              rows={2}
              value={newPharmacy.description}
              onChange={(e) => setNewPharmacy({ ...newPharmacy, description: e.target.value })}
              placeholder="e.g. 2-hour emergency express delivery, cold-chain insulin storage, verified pharmacist check."
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2.5">
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={() => setIsAddOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              isLoading={isSubmittingAdd}
            >
              Save Partner
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
