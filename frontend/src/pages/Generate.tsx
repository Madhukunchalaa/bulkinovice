import React, { useEffect, useState } from 'react';
import { apiFetch, apiDownload } from '../utils/api.ts';
import { Play, Sparkles, Loader2, AlertCircle, FileText, CheckCircle } from 'lucide-react';

interface InvoiceCategory {
  id: number;
  label: string;
  amount: number | string;
}

interface Client {
  id: number;
  name: string;
  gstin: string | null;
  address: string | null;
  email: string | null;
  phone: string | null;
  invoiceCategory: InvoiceCategory;
  active: boolean;
}

export const Generate: React.FC = () => {
  const [categories, setCategories] = useState<InvoiceCategory[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successCount, setSuccessCount] = useState<number | null>(null);

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [categoriesData, clientsData] = await Promise.all([
        apiFetch('/categories'),
        apiFetch('/clients'),
      ]);
      setCategories(categoriesData);
      setClients(clientsData);
    } catch (err: any) {
      setError(err.message || 'Failed to load page data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filter clients dynamically in frontend based on selected category to give real-time preview
  const activeClients = clients.filter(c => c.active);
  const filteredClients = selectedCategoryId
    ? activeClients.filter(c => c.invoiceCategory.id === parseInt(selectedCategoryId))
    : activeClients;

  const totalAmountToBill = filteredClients.reduce((sum, client) => {
    return sum + Number(client.invoiceCategory.amount);
  }, 0);

  const handleGenerate = async () => {
    if (filteredClients.length === 0) return;
    
    setIsGenerating(true);
    setError(null);
    setSuccessCount(null);

    try {
      // Trigger bulk generate API. It creates PDFs on backend and returns them packed in a ZIP.
      const payload = selectedCategoryId ? { categoryId: parseInt(selectedCategoryId) } : {};
      
      const fileDate = new Date().toISOString().split('T')[0];
      await apiDownload('/invoices/generate', `invoices_${fileDate}.zip`, 'POST', payload);
      
      setSuccessCount(filteredClients.length);
      // Refresh client/history data since they might have generated invoices
      fetchData();
    } catch (err: any) {
      setError(err.message || 'Invoice generation failed. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="border-b border-slate-200 pb-5">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Bulk Invoice Generator</h1>
        <p className="mt-1 text-sm text-slate-500">
          Atomically generate monthly tax invoices for multiple active clients and download a ZIP file containing all PDFs.
        </p>
      </div>

      {error && (
        <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle className="h-5 w-5 shrink-0 text-red-500" />
          <div>{error}</div>
        </div>
      )}

      {successCount !== null && (
        <div className="flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
          <CheckCircle className="h-5 w-5 shrink-0 text-emerald-500" />
          <div>
            <strong className="font-bold">Success!</strong> Successfully generated and logged {successCount} invoices. Your ZIP file download has started.
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-indigo-600"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Controls Panel */}
          <div className="lg:col-span-1 rounded-xl border border-slate-200 bg-white p-6 shadow-sm h-fit space-y-6">
            <h2 className="text-md font-bold text-slate-950 flex items-center gap-1.5">
              <Sparkles className="h-4.5 w-4.5 text-indigo-600" />
              Generation Options
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700">Filter Category</label>
                <select
                  disabled={isGenerating}
                  value={selectedCategoryId}
                  onChange={(e) => {
                    setSelectedCategoryId(e.target.value);
                    setSuccessCount(null);
                  }}
                  className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:bg-slate-50"
                >
                  <option value="">All Categories ({activeClients.length} clients)</option>
                  {categories.map((c) => {
                    const count = activeClients.filter(cl => cl.invoiceCategory.id === c.id).length;
                    return (
                      <option key={c.id} value={c.id}>
                        {c.label} - ₹{Number(c.amount).toLocaleString('en-IN')} ({count} active clients)
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Summary Stats */}
              <div className="rounded-lg bg-slate-50 p-4 space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Target Clients:</span>
                  <span className="font-bold text-slate-900">{filteredClients.length} active</span>
                </div>
                <div className="flex justify-between border-t border-slate-200 pt-2">
                  <span className="text-slate-500 font-medium">Estimated Billing:</span>
                  <span className="font-bold text-slate-900">
                    ₹{totalAmountToBill.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              <button
                onClick={handleGenerate}
                disabled={isGenerating || filteredClients.length === 0}
                className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-indigo-500 disabled:bg-indigo-300 focus:outline-none transition-colors"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4.5 w-4.5 animate-spin" />
                    Generating Invoices...
                  </>
                ) : (
                  <>
                    <Play className="h-4.5 w-4.5 fill-current" />
                    Generate & Download ZIP
                  </>
                )}
              </button>
              
              {filteredClients.length === 0 && (
                <p className="text-xs text-center text-amber-600 font-medium">
                  No active clients match the current filter criteria.
                </p>
              )}
            </div>
          </div>

          {/* Queue Preview Panel */}
          <div className="lg:col-span-2 rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
            <h2 className="text-md font-bold text-slate-950 flex items-center gap-1.5 border-b border-slate-100 pb-3">
              <FileText className="h-4.5 w-4.5 text-slate-500" />
              Generation Queue Preview ({filteredClients.length})
            </h2>

            {filteredClients.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-sm">
                No active clients in this queue.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 max-h-[400px] overflow-y-auto pr-2">
                {filteredClients.map((client) => (
                  <div key={client.id} className="py-3 flex justify-between items-center text-sm">
                    <div>
                      <span className="font-semibold text-slate-900">{client.name}</span>
                      {client.gstin && (
                        <span className="ml-2 font-mono text-xs bg-slate-100 px-1.5 py-0.5 rounded text-slate-500">
                          GST: {client.gstin}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-slate-500 text-xs font-semibold uppercase tracking-wider bg-indigo-50 px-2 py-0.5 rounded text-indigo-700">
                        {client.invoiceCategory.label}
                      </span>
                      <span className="font-semibold text-slate-800">
                        ₹{Number(client.invoiceCategory.amount).toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
