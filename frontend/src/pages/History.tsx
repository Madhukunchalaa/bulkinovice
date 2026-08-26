import React, { useEffect, useState } from 'react';
import { apiFetch, apiDownload } from '../utils/api.ts';
import { Search, Calendar, Download, RefreshCw, AlertCircle } from 'lucide-react';

interface InvoiceCategory {
  id: number;
  label: string;
  amount: number | string;
}

interface GeneratedInvoice {
  id: number;
  clientName: string;
  clientGstin: string | null;
  clientAddress: string | null;
  invoiceNumber: string;
  amount: number | string;
  generatedAt: string;
  pdfPath: string;
}

export const History: React.FC = () => {
  const [invoices, setInvoices] = useState<GeneratedInvoice[]>([]);
  const [categories, setCategories] = useState<InvoiceCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters State
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [categoryId, setCategoryId] = useState('');

  // Individual downloading states
  const [downloadingId, setDownloadingId] = useState<number | null>(null);

  const fetchFiltersAndData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const cats = await apiFetch('/categories');
      setCategories(cats);
      await fetchInvoices();
    } catch (err: any) {
      setError(err.message || 'Failed to load metadata');
      setIsLoading(false);
    }
  };

  const fetchInvoices = async () => {
    setError(null);
    try {
      const queryParams = new URLSearchParams();
      if (search) queryParams.set('search', search);
      if (startDate) queryParams.set('startDate', startDate);
      if (endDate) queryParams.set('endDate', endDate);
      if (categoryId) queryParams.set('categoryId', categoryId);

      const data = await apiFetch(`/invoices?${queryParams.toString()}`);
      setInvoices(data);
    } catch (err: any) {
      setError(err.message || 'Failed to search invoices');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFiltersAndData();
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    fetchInvoices();
  };

  const handleResetFilters = () => {
    setSearch('');
    setStartDate('');
    setEndDate('');
    setCategoryId('');
    setIsLoading(true);
    // Use timeout to let state flush
    setTimeout(() => {
      fetchInvoices();
    }, 0);
  };

  const handleDownloadSingle = async (invoice: GeneratedInvoice) => {
    setDownloadingId(invoice.id);
    try {
      // Trigger API endpoint for direct file download
      await apiDownload(`/invoices/${invoice.id}/download`, invoice.pdfPath);
    } catch (err: any) {
      alert(err.message || 'Failed to download PDF file.');
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="border-b border-slate-200 pb-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Invoice History & Audit</h1>
          <p className="mt-1 text-sm text-slate-500">
            View logs of all historically generated invoices and download individual PDF copies.
          </p>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle className="h-5 w-5 shrink-0 text-red-500" />
          <div>{error}</div>
        </div>
      )}

      {/* Filter Form Panel */}
      <form onSubmit={handleSearchSubmit} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search bar */}
          <div className="relative">
            <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
              <Search className="h-4.5 w-4.5" />
            </span>
            <input
              type="text"
              placeholder="Search Client or Invoice No..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="block w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm placeholder-slate-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          {/* Start Date */}
          <div className="relative">
            <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
              <Calendar className="h-4.5 w-4.5" />
            </span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              placeholder="Start Date"
              className="block w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          {/* End Date */}
          <div className="relative">
            <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
              <Calendar className="h-4.5 w-4.5" />
            </span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              placeholder="End Date"
              className="block w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          {/* Category Selector */}
          <div>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="block w-full rounded-lg border border-slate-300 py-2 px-3 text-sm bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            >
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label} (₹{Number(c.amount).toLocaleString('en-IN')})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={handleResetFilters}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
          >
            <RefreshCw className="h-4 w-4" />
            Clear Filters
          </button>
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus:outline-none transition"
          >
            Search Logs
          </button>
        </div>
      </form>

      {/* Results Table */}
      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-indigo-600"></div>
        </div>
      ) : invoices.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 p-12 text-center">
          <p className="text-sm text-slate-500">No invoices matched the current search criteria.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left">
              <thead className="bg-slate-50">
                <tr>
                  <th scope="col" className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Invoice No
                  </th>
                  <th scope="col" className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Client Details
                  </th>
                  <th scope="col" className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Date Generated
                  </th>
                  <th scope="col" className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Billed Amount
                  </th>
                  <th scope="col" className="relative px-6 py-4 text-right">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {invoices.map((invoice) => (
                  <tr key={invoice.id} className="hover:bg-slate-50 transition-colors">
                    <td className="whitespace-nowrap px-6 py-4 text-sm font-bold text-indigo-600 font-mono">
                      {invoice.invoiceNumber}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-semibold text-slate-900">{invoice.clientName}</div>
                      {invoice.clientGstin && (
                        <div className="text-xs font-mono text-slate-400">GSTIN: {invoice.clientGstin}</div>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-600 font-medium">
                      {new Date(invoice.generatedAt).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm font-semibold text-slate-900">
                      ₹{Number(invoice.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                      <button
                        onClick={() => handleDownloadSingle(invoice)}
                        disabled={downloadingId === invoice.id}
                        className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 transition"
                      >
                        {downloadingId === invoice.id ? (
                          <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Download className="h-3.5 w-3.5" />
                        )}
                        PDF
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
