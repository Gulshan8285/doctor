'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Calendar,
  Phone,
  Mail,
  MapPin,
  Stethoscope,
  ShieldCheck,
  FileText,
  Upload,
  Download,
  Eye,
  Plus,
  Clock,
  History,
  FileCheck2,
  AlertCircle,
  FileEdit,
  Save,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { EmptyState } from '@/components/ui/empty-state';
import { useToast } from '@/components/ui/toast';
import { formatDate, formatDateTime, formatBytes } from '@/lib/utils';

interface DocumentVersionItem {
  id: string;
  versionNumber: number;
  originalFilename: string;
  fileSize: number;
  mimeType: string;
  fileHash: string;
  reasonForCorrection: string;
  createdAt: string;
  createdBy?: { fullName: string };
}

interface DocumentItem {
  id: string;
  title: string;
  category: string;
  documentDate: string;
  fileSize: number;
  mimeType: string;
  fileHash: string;
  originalFilename: string;
  currentVersion: number;
  createdAt: string;
  uploadedBy?: { fullName: string; role: string };
  versions: DocumentVersionItem[];
}

interface PatientProfileClientProps {
  userRole: string;
  patient: {
    id: string;
    patientCode: string;
    fullName: string;
    phone: string;
    email: string | null;
    dob: string | null;
    gender: string | null;
    address: string | null;
    emergencyContactName: string | null;
    emergencyContactPhone: string | null;
    consentAcknowledged: boolean;
    nonClinicalNotes: string | null;
    createdAt: string;
    updatedAt: string;
    doctor?: { fullName: string; email: string; phone: string | null };
    organization?: { name: string; city: string | null };
    documents: DocumentItem[];
  };
  activity: Array<{
    id: string;
    action: string;
    resourceType: string;
    userName: string;
    createdAt: string;
    metadata: any;
  }>;
  permissions: string[];
}

export default function PatientProfileClient({
  userRole,
  patient,
  activity,
  permissions,
}: PatientProfileClientProps) {
  const router = useRouter();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<'overview' | 'documents' | 'notes' | 'activity'>('overview');

  // Notes state
  const [notes, setNotes] = useState(patient.nonClinicalNotes || '');
  const [isSavingNotes, setIsSavingNotes] = useState(false);

  // Upload modal state
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadCategory, setUploadCategory] = useState('PRESCRIPTION');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [isSubmittingUpload, setIsSubmittingUpload] = useState(false);

  // Addendum / Version modal state
  const [isAddendumOpen, setIsAddendumOpen] = useState(false);
  const [selectedDocForAddendum, setSelectedDocForAddendum] = useState<DocumentItem | null>(null);
  const [addendumReason, setAddendumReason] = useState('');
  const [addendumFile, setAddendumFile] = useState<File | null>(null);
  const [isSubmittingAddendum, setIsSubmittingAddendum] = useState(false);

  // Document preview modal state
  const [previewDoc, setPreviewDoc] = useState<{ id: string; title: string; mimeType: string } | null>(null);

  const canUpload = userRole === 'DOCTOR' || permissions.includes('UPLOAD_DOCUMENTS');
  const canDownload = userRole === 'DOCTOR' || permissions.includes('DOWNLOAD_PRESCRIPTIONS');
  const canEditNotes = userRole === 'DOCTOR' || permissions.includes('ADD_NOTES');

  const categoryBadges: Record<string, { label: string; variant: 'teal' | 'blue' | 'purple' | 'amber' | 'emerald' }> = {
    PRESCRIPTION: { label: 'Prescription (Rx)', variant: 'teal' },
    LAB_REPORT: { label: 'Lab Report', variant: 'blue' },
    REFERRAL_LETTER: { label: 'Referral Letter', variant: 'purple' },
    DIAGNOSTIC_IMAGING: { label: 'Diagnostic Imaging', variant: 'amber' },
    DISCHARGE_SUMMARY: { label: 'Discharge Summary', variant: 'emerald' },
  };

  const handleSaveNotes = async () => {
    setIsSavingNotes(true);
    try {
      const res = await fetch(`/api/patients/${patient.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nonClinicalNotes: notes }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: 'Save Failed', description: data.error, type: 'error' });
        return;
      }
      toast({ title: 'Notes Saved', description: 'Patient non-clinical notes updated.', type: 'success' });
      router.refresh();
    } catch {
      toast({ title: 'Error', description: 'Could not connect to server', type: 'error' });
    } finally {
      setIsSavingNotes(false);
    }
  };

  const handleUploadDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) {
      toast({ title: 'File Missing', description: 'Please select a document', type: 'error' });
      return;
    }

    setIsSubmittingUpload(true);
    try {
      const formData = new FormData();
      formData.append('patientId', patient.id);
      formData.append('title', uploadTitle);
      formData.append('category', uploadCategory);
      formData.append('file', uploadFile);

      const res = await fetch('/api/prescriptions/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        toast({ title: 'Upload Failed', description: data.error, type: 'error' });
        return;
      }

      toast({
        title: 'Prescription Stored',
        description: 'Document finalized and recorded in patient vault.',
        type: 'success',
      });

      setIsUploadOpen(false);
      setUploadFile(null);
      setUploadTitle('');
      router.refresh();
    } catch {
      toast({ title: 'Error', description: 'Failed to upload document', type: 'error' });
    } finally {
      setIsSubmittingUpload(false);
    }
  };

  const handleCreateAddendum = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDocForAddendum || !addendumFile) {
      toast({ title: 'Missing Information', description: 'Please provide the revised file and justification', type: 'error' });
      return;
    }

    setIsSubmittingAddendum(true);
    try {
      const formData = new FormData();
      formData.append('reasonForCorrection', addendumReason);
      formData.append('file', addendumFile);

      const res = await fetch(`/api/prescriptions/${selectedDocForAddendum.id}/version`, {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        toast({ title: 'Addendum Failed', description: data.error, type: 'error' });
        return;
      }

      toast({
        title: 'Version Addendum Issued',
        description: data.message,
        type: 'success',
      });

      setIsAddendumOpen(false);
      setSelectedDocForAddendum(null);
      setAddendumReason('');
      setAddendumFile(null);
      router.refresh();
    } catch {
      toast({ title: 'Error', description: 'Failed to record addendum', type: 'error' });
    } finally {
      setIsSubmittingAddendum(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Back navigation & Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/doctor/patients">
            <button
              className="p-2 bg-white rounded-lg border border-slate-200 text-slate-600 hover:text-slate-900 shadow-2xs hover:bg-slate-50 transition-colors"
              aria-label="Back to Patients"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                {patient.fullName}
              </h1>
              <Badge variant="teal">{patient.patientCode}</Badge>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Attending Physician: {patient.doctor?.fullName || 'Assigned Doctor'} &bull;{' '}
              {patient.organization?.name || 'Clinic'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {canUpload && (
            <Button
              variant="primary"
              size="md"
              leftIcon={<Upload className="w-4 h-4" />}
              onClick={() => setIsUploadOpen(true)}
            >
              Upload Prescription
            </Button>
          )}
        </div>
      </div>

      {/* Tabs Navigation Header */}
      <div className="flex border-b border-slate-200 bg-white px-4 rounded-t-xl overflow-x-auto">
        <button
          onClick={() => setActiveTab('overview')}
          className={`py-3.5 px-4 font-semibold text-xs border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
            activeTab === 'overview'
              ? 'border-teal-600 text-teal-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Overview & Demographics
        </button>
        <button
          onClick={() => setActiveTab('documents')}
          className={`py-3.5 px-4 font-semibold text-xs border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
            activeTab === 'documents'
              ? 'border-teal-600 text-teal-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Prescriptions & Documents ({patient.documents.length})
        </button>
        <button
          onClick={() => setActiveTab('notes')}
          className={`py-3.5 px-4 font-semibold text-xs border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
            activeTab === 'notes'
              ? 'border-teal-600 text-teal-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Non-Clinical Notes
        </button>
        <button
          onClick={() => setActiveTab('activity')}
          className={`py-3.5 px-4 font-semibold text-xs border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
            activeTab === 'activity'
              ? 'border-teal-600 text-teal-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Record Audit Activity ({activity.length})
        </button>
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Demographic & Contact Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-slate-400 block uppercase tracking-wider text-[10px] font-semibold mb-1">
                    Phone Number
                  </span>
                  <div className="flex items-center gap-1.5 font-mono text-slate-800 text-sm font-semibold">
                    <Phone className="w-3.5 h-3.5 text-teal-600" />
                    <span>{patient.phone}</span>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-slate-400 block uppercase tracking-wider text-[10px] font-semibold mb-1">
                    Email Address
                  </span>
                  <div className="flex items-center gap-1.5 text-slate-800 text-sm">
                    <Mail className="w-3.5 h-3.5 text-teal-600" />
                    <span>{patient.email || 'None on record'}</span>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-slate-400 block uppercase tracking-wider text-[10px] font-semibold mb-1">
                    Gender & Date of Birth
                  </span>
                  <div className="flex items-center gap-1.5 text-slate-800 text-sm">
                    <Calendar className="w-3.5 h-3.5 text-teal-600" />
                    <span>
                      {patient.gender || 'N/A'}{' '}
                      {patient.dob ? `(${formatDate(patient.dob)})` : ''}
                    </span>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-slate-400 block uppercase tracking-wider text-[10px] font-semibold mb-1">
                    Emergency Contact
                  </span>
                  <div className="text-slate-800 text-sm">
                    <p className="font-semibold">
                      {patient.emergencyContactName || 'None designated'}
                    </p>
                    {patient.emergencyContactPhone && (
                      <p className="font-mono text-xs text-slate-500 mt-0.5">
                        {patient.emergencyContactPhone}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs">
                <span className="text-slate-400 block uppercase tracking-wider text-[10px] font-semibold mb-1">
                  Residential Address
                </span>
                <div className="flex items-center gap-1.5 text-slate-800">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>{patient.address || 'Address not recorded'}</span>
                </div>
              </div>

              <div className="p-3.5 bg-teal-50/60 rounded-xl border border-teal-100 flex items-start gap-2.5 text-xs text-teal-900">
                <ShieldCheck className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold block">DPDP Act Privacy Consent</span>
                  <span className="text-[11px] text-teal-800">
                    Patient consent for clinical consultation and private document storage was
                    acknowledged during registration on {formatDate(patient.createdAt)}.
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Side Summary Card */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Care Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-xs">
                <div className="flex justify-between items-center py-2 border-b border-slate-100">
                  <span className="text-slate-500">Total Documents</span>
                  <span className="font-bold text-slate-800">{patient.documents.length}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-slate-100">
                  <span className="text-slate-500">First Consulted</span>
                  <span className="font-semibold text-slate-800">
                    {formatDate(patient.createdAt)}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-slate-500">Record Status</span>
                  <span className="inline-flex items-center gap-1 text-emerald-600 font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Active
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* TAB 2: PRESCRIPTIONS & DOCUMENTS */}
      {activeTab === 'documents' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-800">
              Prescription Vault & Versions ({patient.documents.length})
            </h3>
            {canUpload && (
              <Button
                variant="primary"
                size="sm"
                leftIcon={<Plus className="w-3.5 h-3.5" />}
                onClick={() => setIsUploadOpen(true)}
              >
                Upload Document
              </Button>
            )}
          </div>

          {patient.documents.length === 0 ? (
            <Card>
              <CardContent className="p-8">
                <EmptyState
                  icon={FileText}
                  title="No Documents Uploaded"
                  description="Upload the first prescription or clinical diagnostic report for this patient."
                  action={
                    canUpload ? (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => setIsUploadOpen(true)}
                        leftIcon={<Upload className="w-4 h-4" />}
                      >
                        Upload Document
                      </Button>
                    ) : undefined
                  }
                />
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {patient.documents.map((doc) => {
                const badgeInfo = categoryBadges[doc.category] || {
                  label: doc.category,
                  variant: 'slate',
                };

                return (
                  <Card key={doc.id} className="overflow-hidden">
                    <div className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="text-sm font-bold text-slate-900">{doc.title}</h4>
                          <Badge variant={badgeInfo.variant}>{badgeInfo.label}</Badge>
                          <Badge variant="purple">v{doc.currentVersion} Finalized</Badge>
                        </div>
                        <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
                          <span>Date: {formatDate(doc.documentDate)}</span>
                          <span>&bull;</span>
                          <span>Size: {formatBytes(doc.fileSize)}</span>
                          <span>&bull;</span>
                          <span>Uploaded by: {doc.uploadedBy?.fullName || 'Physician'}</span>
                        </div>
                        <p className="text-[11px] font-mono text-slate-400 truncate max-w-xl">
                          SHA-256: {doc.fileHash}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          variant="outline"
                          size="sm"
                          leftIcon={<Eye className="w-3.5 h-3.5" />}
                          onClick={() =>
                            setPreviewDoc({
                              id: doc.id,
                              title: doc.title,
                              mimeType: doc.mimeType,
                            })
                          }
                        >
                          Preview
                        </Button>

                        {canDownload && (
                          <a
                            href={`/api/prescriptions/${doc.id}/download`}
                            download
                            className="inline-block"
                          >
                            <Button
                              variant="outline"
                              size="sm"
                              leftIcon={<Download className="w-3.5 h-3.5" />}
                            >
                              Download
                            </Button>
                          </a>
                        )}

                        {userRole === 'DOCTOR' && (
                          <Button
                            variant="secondary"
                            size="sm"
                            leftIcon={<FileEdit className="w-3.5 h-3.5" />}
                            onClick={() => {
                              setSelectedDocForAddendum(doc);
                              setIsAddendumOpen(true);
                            }}
                          >
                            Add Addendum
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Version History Accordion / List */}
                    {doc.versions.length > 1 && (
                      <div className="bg-slate-50/80 px-5 py-3 border-t border-slate-100 text-xs">
                        <span className="font-semibold text-slate-700 block mb-2">
                          Version History & Corrections ({doc.versions.length} versions recorded):
                        </span>
                        <div className="space-y-2">
                          {doc.versions.map((ver) => (
                            <div
                              key={ver.id}
                              className="p-2.5 bg-white rounded-lg border border-slate-200 flex items-start justify-between gap-3 text-xs"
                            >
                              <div>
                                <span className="font-bold text-slate-800">
                                  v{ver.versionNumber}:
                                </span>{' '}
                                <span className="text-slate-600">
                                  {ver.reasonForCorrection}
                                </span>
                                <div className="text-[11px] text-slate-400 mt-0.5">
                                  Issued on {formatDateTime(ver.createdAt)} by{' '}
                                  {ver.createdBy?.fullName || 'Physician'} &bull; Hash:{' '}
                                  <span className="font-mono">{ver.fileHash.substring(0, 16)}...</span>
                                </div>
                              </div>
                              {canDownload && (
                                <a
                                  href={`/api/prescriptions/${doc.id}/download?version=${ver.versionNumber}`}
                                  download
                                  className="shrink-0 text-teal-600 hover:underline font-semibold"
                                >
                                  Download v{ver.versionNumber}
                                </a>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: NOTES */}
      {activeTab === 'notes' && (
        <Card>
          <CardHeader>
            <CardTitle>Non-Clinical Notes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-xs text-slate-500">
              Record administrative notes, follow-up scheduling preferences, patient communication
              guidance, or non-clinical observations.
            </p>
            <textarea
              rows={6}
              disabled={!canEditNotes}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Patient prefers morning consultation slots; follow-up review scheduled in 4 weeks."
              className="w-full rounded-xl border border-slate-200 p-3.5 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 bg-slate-50/50"
            />
            {canEditNotes && (
              <div className="flex justify-end">
                <Button
                  variant="primary"
                  size="md"
                  isLoading={isSavingNotes}
                  onClick={handleSaveNotes}
                  leftIcon={<Save className="w-4 h-4" />}
                >
                  Save Notes
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* TAB 4: ACTIVITY AUDIT TRAIL */}
      {activeTab === 'activity' && (
        <Card>
          <CardHeader>
            <CardTitle>Patient Record Activity Log</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {activity.length === 0 ? (
              <p className="p-6 text-xs text-slate-400 text-center">
                No activity recorded yet for this patient.
              </p>
            ) : (
              <div className="divide-y divide-slate-100">
                {activity.map((ev) => (
                  <div key={ev.id} className="p-4 flex items-start gap-3 text-xs">
                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 shrink-0 mt-0.5">
                      <Clock className="w-4 h-4" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-800">
                          {ev.action.replace(/_/g, ' ')}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          {formatDateTime(ev.createdAt)}
                        </span>
                      </div>
                      <p className="text-slate-500 mt-0.5">
                        Performed by <strong className="text-slate-700">{ev.userName}</strong>
                      </p>
                      {ev.metadata && (
                        <p className="text-[11px] font-mono text-slate-400 mt-1 bg-slate-50 p-1.5 rounded">
                          {JSON.stringify(ev.metadata)}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* MODAL: UPLOAD NEW DOCUMENT */}
      <Modal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        title="Upload Clinical Document"
        description={`Uploading document for ${patient.fullName} (${patient.patientCode})`}
        maxWidth="lg"
      >
        <form onSubmit={handleUploadDocument} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Document Title <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={uploadTitle}
                onChange={(e) => setUploadTitle(e.target.value)}
                placeholder="e.g. Cardiology OPD Prescription"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Category
              </label>
              <select
                value={uploadCategory}
                onChange={(e) => setUploadCategory(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 bg-white"
              >
                <option value="PRESCRIPTION">Prescription (Rx)</option>
                <option value="LAB_REPORT">Diagnostic Lab Report</option>
                <option value="REFERRAL_LETTER">Referral Letter</option>
                <option value="DIAGNOSTIC_IMAGING">ECG / Ultrasound / Imaging</option>
                <option value="DISCHARGE_SUMMARY">Discharge Summary</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Select Prescription File (PDF, PNG, JPG, TXT)
            </label>
            <input
              type="file"
              required
              accept=".pdf,.png,.jpg,.jpeg,.txt"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  setUploadFile(e.target.files[0]);
                }
              }}
              className="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-teal-50 file:text-teal-700 hover:file:bg-teal-100"
            />
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-500 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-teal-600 shrink-0" />
            <span>Document will be encrypted with SHA-256 integrity hashing and stored privately.</span>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={() => setIsUploadOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              isLoading={isSubmittingUpload}
            >
              Upload & Finalize
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL: ADD ADDENDUM / NEW VERSION */}
      <Modal
        isOpen={isAddendumOpen}
        onClose={() => setIsAddendumOpen(false)}
        title="Issue Prescription Addendum"
        description={`Add a revised version for "${selectedDocForAddendum?.title}". The original finalized document will be permanently preserved.`}
        maxWidth="lg"
      >
        <form onSubmit={handleCreateAddendum} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Reason for Correction / Clinical Justification <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={3}
              required
              value={addendumReason}
              onChange={(e) => setAddendumReason(e.target.value)}
              placeholder="e.g. Adjusted dosage of Telmisartan from 40mg to 20mg due to mild orthostatic dizziness."
              className="w-full rounded-lg border border-slate-300 p-3 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Updated Prescription Document File
            </label>
            <input
              type="file"
              required
              accept=".pdf,.png,.jpg,.jpeg,.txt"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  setAddendumFile(e.target.files[0]);
                }
              }}
              className="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-teal-50 file:text-teal-700 hover:file:bg-teal-100"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={() => setIsAddendumOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              isLoading={isSubmittingAddendum}
            >
              Issue Version v{(selectedDocForAddendum?.currentVersion || 1) + 1}
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL: DOCUMENT PREVIEW */}
      {previewDoc && (
        <Modal
          isOpen={Boolean(previewDoc)}
          onClose={() => setPreviewDoc(null)}
          title={`Document Preview: ${previewDoc.title}`}
          maxWidth="4xl"
        >
          <div className="space-y-4">
            <div className="h-[550px] w-full rounded-xl border border-slate-200 bg-white overflow-hidden flex items-center justify-center shadow-inner">
              {previewDoc.mimeType?.startsWith('image/') ? (
                <img
                  src={`/api/prescriptions/${previewDoc.id}/preview`}
                  alt={previewDoc.title}
                  className="max-w-full max-h-full object-contain p-2"
                />
              ) : (
                <iframe
                  src={`/api/prescriptions/${previewDoc.id}/preview`}
                  className="w-full h-full border-0 bg-white"
                  title={previewDoc.title}
                />
              )}
            </div>
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-teal-600" />
                Verified Authenticated Delivery
              </span>
              <div className="flex items-center gap-2">
                <a
                  href={`/api/prescriptions/${previewDoc.id}/download`}
                  download
                  className="inline-block"
                >
                  <Button variant="primary" size="sm" leftIcon={<Download className="w-3.5 h-3.5" />}>
                    Download Copy
                  </Button>
                </a>
                <Button variant="outline" size="sm" onClick={() => setPreviewDoc(null)}>
                  Close
                </Button>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
