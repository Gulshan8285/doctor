'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  FileText,
  Upload,
  Search,
  Filter,
  Eye,
  Download,
  FileEdit,
  ShieldCheck,
  Plus,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { EmptyState } from '@/components/ui/empty-state';
import { useToast } from '@/components/ui/toast';
import { formatDate, formatBytes } from '@/lib/utils';

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
  patient?: { id: string; fullName: string; patientCode: string; phone: string };
  uploadedBy?: { fullName: string; role: string };
  versions: Array<{
    id: string;
    versionNumber: number;
    reasonForCorrection: string;
    createdAt: string;
  }>;
}

interface PrescriptionsVaultClientProps {
  userRole: string;
  initialDocuments: DocumentItem[];
  patients: Array<{ id: string; fullName: string; patientCode: string }>;
  permissions: string[];
}

export default function PrescriptionsVaultClient({
  userRole,
  initialDocuments,
  patients,
  permissions,
}: PrescriptionsVaultClientProps) {
  const router = useRouter();
  const { toast } = useToast();

  const [documents, setDocuments] = useState<DocumentItem[]>(initialDocuments);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');

  // Preview & upload modal states
  const [previewDoc, setPreviewDoc] = useState<{ id: string; title: string } | null>(null);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [uploadPatientId, setUploadPatientId] = useState(patients[0]?.id || '');
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadCategory, setUploadCategory] = useState('PRESCRIPTION');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canUpload = userRole === 'DOCTOR' || permissions.includes('UPLOAD_DOCUMENTS');
  const canDownload = userRole === 'DOCTOR' || permissions.includes('DOWNLOAD_PRESCRIPTIONS');

  const filteredDocs = documents.filter((d) => {
    const matchesCategory = categoryFilter === 'ALL' || d.category === categoryFilter;
    const q = searchTerm.toLowerCase();
    const matchesSearch =
      d.title.toLowerCase().includes(q) ||
      (d.patient && d.patient.fullName.toLowerCase().includes(q)) ||
      (d.patient && d.patient.patientCode.toLowerCase().includes(q));
    return matchesCategory && matchesSearch;
  });

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) {
      toast({ title: 'File Required', description: 'Please choose a prescription document', type: 'error' });
      return;
    }

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('patientId', uploadPatientId);
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
        title: 'Prescription Uploaded',
        description: 'Document finalized and recorded in private storage.',
        type: 'success',
      });

      setIsUploadOpen(false);
      setUploadFile(null);
      setUploadTitle('');
      router.refresh();
    } catch {
      toast({ title: 'Error', description: 'Failed to upload document', type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const categories = [
    { key: 'ALL', label: 'All Documents' },
    { key: 'PRESCRIPTION', label: 'Prescriptions (Rx)' },
    { key: 'LAB_REPORT', label: 'Lab Reports' },
    { key: 'DIAGNOSTIC_IMAGING', label: 'Diagnostic Imaging' },
    { key: 'DISCHARGE_SUMMARY', label: 'Discharge Summaries' },
    { key: 'REFERRAL_LETTER', label: 'Referrals' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Prescription & Document Vault
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Private, cryptographic archive of all clinical prescriptions issued to your patients.
          </p>
        </div>
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

      {/* Filter and Search Bar */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            {categories.map((c) => (
              <button
                key={c.key}
                onClick={() => setCategoryFilter(c.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  categoryFilter === c.key
                    ? 'bg-teal-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>

          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Filter by document title, patient name, or Patient ID..."
              className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
            />
          </div>
        </CardContent>
      </Card>

      {/* Documents Table */}
      <Card>
        <CardContent className="p-0">
          {filteredDocs.length === 0 ? (
            <div className="p-8">
              <EmptyState
                icon={FileText}
                title="No Matching Prescriptions Found"
                description={
                  searchTerm || categoryFilter !== 'ALL'
                    ? 'No documents match the specified search query or category filter.'
                    : 'No prescriptions have been uploaded to your vault yet.'
                }
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200/80 text-slate-600 font-semibold uppercase tracking-wider">
                    <th className="py-3 px-4">Document Title</th>
                    <th className="py-3 px-4">Patient Name & ID</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Version</th>
                    <th className="py-3 px-4">Document Date</th>
                    <th className="py-3 px-4">Size</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredDocs.map((doc) => (
                    <tr key={doc.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-slate-900 block">{doc.title}</span>
                        <span className="text-[10px] font-mono text-slate-400 truncate max-w-xs block">
                          SHA: {doc.fileHash.substring(0, 16)}...
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        {doc.patient ? (
                          <Link
                            href={`/doctor/patients/${doc.patient.id}`}
                            className="hover:underline font-semibold text-slate-800"
                          >
                            {doc.patient.fullName}
                            <span className="text-[11px] font-mono text-slate-400 block">
                              {doc.patient.patientCode}
                            </span>
                          </Link>
                        ) : (
                          'N/A'
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <Badge variant="teal">{doc.category.replace(/_/g, ' ')}</Badge>
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-700">
                        v{doc.currentVersion}
                      </td>
                      <td className="py-3.5 px-4 text-slate-500">
                        {formatDate(doc.documentDate)}
                      </td>
                      <td className="py-3.5 px-4 text-slate-500">
                        {formatBytes(doc.fileSize)}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            leftIcon={<Eye className="w-3.5 h-3.5" />}
                            onClick={() => setPreviewDoc({ id: doc.id, title: doc.title })}
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
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upload Modal */}
      <Modal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        title="Upload Clinical Prescription"
        description="Select patient and prescription file to encrypt and finalize into private storage."
        maxWidth="lg"
      >
        <form onSubmit={handleUpload} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Select Patient <span className="text-rose-500">*</span>
            </label>
            <select
              required
              value={uploadPatientId}
              onChange={(e) => setUploadPatientId(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 bg-white"
            >
              <option value="">-- Choose Patient --</option>
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.fullName} ({p.patientCode})
                </option>
              ))}
            </select>
          </div>

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
                placeholder="e.g. Cardiology OPD Follow-up Rx"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Document Category
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
              Select Document File (PDF, PNG, JPG, TXT)
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

          <div className="pt-2 flex items-center justify-end gap-2.5">
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
              isLoading={isSubmitting}
            >
              Upload & Record Hash
            </Button>
          </div>
        </form>
      </Modal>

      {/* Preview Modal */}
      {previewDoc && (
        <Modal
          isOpen={Boolean(previewDoc)}
          onClose={() => setPreviewDoc(null)}
          title={`Document Preview: ${previewDoc.title}`}
          maxWidth="2xl"
        >
          <div className="space-y-4">
            <div className="h-[460px] w-full rounded-xl border border-slate-200 bg-slate-100 overflow-hidden flex items-center justify-center">
              <iframe
                src={`/api/prescriptions/${previewDoc.id}/preview`}
                className="w-full h-full border-0 bg-white"
                title={previewDoc.title}
              />
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
