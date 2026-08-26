import React, { useEffect, useState } from 'react';
import { apiFetch } from '../utils/api.ts';
import { Plus, Edit2, Trash2, X, AlertCircle, CheckCircle, XCircle } from 'lucide-react';

interface InvoiceCategory {
  id: number;
  label: string;
  amount: number | string;
  defaultItemDescription: string;
}

interface Client {
  id: number;
  name: string;
  gstin: string | null;
  address: string | null;
  email: string | null;
  phone: string | null;
  itemDescription: string;
  invoiceCategoryId: number;
  invoiceCategory: InvoiceCategory;
  active: boolean;
}

export const Clients: React.FC = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [categories, setCategories] = useState<InvoiceCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    gstin: '',
    address: '',
    email: '',
    phone: '',
    invoiceCategoryId: '',
    itemDescription: '',
    active: true,
  });

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [clientsData, categoriesData] = await Promise.all([
        apiFetch('/clients'),
        apiFetch('/categories'),
      ]);
      setClients(clientsData);
      setCategories(categoriesData);
    } catch (err: any) {
      setError(err.message || 'Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openAddModal = () => {
    if (categories.length === 0) {
      alert('Please create at least one invoice category first.');
      return;
    }
    const defaultCat = categories[0];
    setEditingClient(null);
    setFormData({
      name: '',
      gstin: '',
      address: '',
      email: '',
      phone: '',
      invoiceCategoryId: String(defaultCat.id),
      itemDescription: defaultCat.defaultItemDescription || '',
      active: true,
    });
    setModalError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (client: Client) => {
    setEditingClient(client);
    setFormData({
      name: client.name,
      gstin: client.gstin || '',
      address: client.address || '',
      email: client.email || '',
      phone: client.phone || '',
      invoiceCategoryId: String(client.invoiceCategoryId),
      itemDescription: client.itemDescription || '',
      active: client.active,
    });
    setModalError(null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  const handleCategoryChange = (catIdStr: string) => {
    const catId = parseInt(catIdStr);
    const selectedCat = categories.find(c => c.id === catId);
    
    setFormData(prev => ({
      ...prev,
      invoiceCategoryId: catIdStr,
      // Auto-fill the item description if the user hasn't customized it yet or if they change categories
      itemDescription: selectedCat ? selectedCat.defaultItemDescription : prev.itemDescription
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);

    if (!formData.name || !formData.invoiceCategoryId) {
      setModalError('Client Name and Invoice Category are required.');
      return;
    }

    const payload = {
      name: formData.name,
      gstin: formData.gstin || null,
      address: formData.address || null,
      email: formData.email || null,
      phone: formData.phone || null,
      invoiceCategoryId: parseInt(formData.invoiceCategoryId),
      itemDescription: formData.itemDescription,
      active: formData.active,
    };

    try {
      if (editingClient) {
        await apiFetch(`/clients/${editingClient.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      } else {
        await apiFetch('/clients', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }
      setIsModalOpen(false);
      fetchData();
    } catch (err: any) {
      setModalError(err.message || 'Operation failed');
    }
  };

  const handleToggleStatus = async (client: Client) => {
    const updatedStatus = !client.active;
    try {
      await apiFetch(`/clients/${client.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          name: client.name,
          invoiceCategoryId: client.invoiceCategoryId,
          itemDescription: client.itemDescription,
          gstin: client.gstin,
          address: client.address,
          email: client.email,
          phone: client.phone,
          active: updatedStatus,
        }),
      });
      // Update local state directly for speedy feedback
      setClients(clients.map(c => c.id === client.id ? { ...c, active: updatedStatus } : c));
    } catch (err: any) {
      setError(err.message || 'Failed to toggle status');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this client? Historical invoices will remain intact.')) return;
    setError(null);

    try {
      await apiFetch(`/clients/${id}`, {
        method: 'DELETE',
      });
      fetchData();
    } catch (err: any) {
      setError(err.message || 'Failed to delete client');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Clients Management</h1>
          <p className="mt-1 text-sm text-slate-500">
            Create, edit, and activate/deactivate clients for monthly billing.
          </p>
        </div>
        <button
          onClick={openAddModal}
          className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 transition"
        >
          <Plus className="h-4.5 w-4.5" />
          Add Client
        </button>
      </div>

      {error && (
        <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle className="h-5 w-5 shrink-0 text-red-500" />
          <div>{error}</div>
        </div>
      )}

      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-indigo-600"></div>
        </div>
      ) : clients.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 p-12 text-center">
          <p className="text-sm text-slate-500">No clients found. Click Add Client to create one.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left">
              <thead className="bg-slate-50">
                <tr>
                  <th scope="col" className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Client Name
                  </th>
                  <th scope="col" className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    GSTIN
                  </th>
                  <th scope="col" className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Invoice Line Description
                  </th>
                  <th scope="col" className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Billing Category
                  </th>
                  <th scope="col" className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Status
                  </th>
                  <th scope="col" className="relative px-6 py-4 text-right">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {clients.map((client) => (
                  <tr key={client.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-900">{client.name}</div>
                      <div className="text-xs text-slate-400 max-w-xs truncate" title={client.address || ''}>
                        {client.address || 'No address added'}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm font-mono text-slate-700">
                      {client.gstin || <span className="text-slate-400 italic">None</span>}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600 max-w-xs truncate font-medium" title={client.itemDescription}>
                      {client.itemDescription || <span className="text-slate-400 italic">Default from Category</span>}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <span className="inline-flex items-center gap-1 font-semibold text-slate-900 text-sm">
                        {client.invoiceCategory.label}
                        <span className="text-xs font-medium text-slate-400">
                          (₹{Number(client.invoiceCategory.amount).toLocaleString('en-IN')})
                        </span>
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <button
                        onClick={() => handleToggleStatus(client)}
                        className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold focus:outline-none transition"
                      >
                        {client.active ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/20 hover:bg-emerald-100 transition">
                            <CheckCircle className="h-3.5 w-3.5 text-emerald-600" />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2 py-1 text-xs font-medium text-slate-600 ring-1 ring-inset ring-slate-500/10 hover:bg-slate-200 transition">
                            <XCircle className="h-3.5 w-3.5 text-slate-400" />
                            Inactive
                          </span>
                        )}
                      </button>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                      <div className="flex justify-end gap-3">
                        <button
                          onClick={() => openEditModal(client)}
                          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-slate-600 hover:text-indigo-600 hover:bg-slate-100 transition"
                        >
                          <Edit2 className="h-4 w-4" />
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(client.id)}
                          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-slate-600 hover:text-red-600 hover:bg-red-50 transition"
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h2 className="text-lg font-bold text-slate-950">
                {editingClient ? 'Edit Client Details' : 'Add New Client'}
              </h2>
              <button onClick={closeModal} className="text-slate-400 hover:text-slate-600 transition">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              {modalError && (
                <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700 border border-red-100">
                  {modalError}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700">Client Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Acme Corp"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700">GSTIN</label>
                  <input
                    type="text"
                    maxLength={15}
                    placeholder="15-character GSTIN"
                    value={formData.gstin}
                    onChange={(e) => setFormData({ ...formData, gstin: e.target.value })}
                    className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700">Email Address</label>
                  <input
                    type="email"
                    placeholder="billing@example.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700">Phone Number</label>
                  <input
                    type="tel"
                    placeholder="10-digit mobile"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-slate-700">Billing Category *</label>
                  <select
                    value={formData.invoiceCategoryId}
                    onChange={(e) => handleCategoryChange(e.target.value)}
                    className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label} (₹{Number(c.amount).toLocaleString('en-IN')})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-slate-700">
                    Invoice Item Description (Overridable) *
                  </label>
                  <textarea
                    rows={2}
                    required
                    placeholder="Invoice line item description"
                    value={formData.itemDescription}
                    onChange={(e) => setFormData({ ...formData, itemDescription: e.target.value })}
                    className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                  <p className="text-xs text-slate-400 mt-1">
                    Auto-loaded from category defaults. You can modify this freely for this client.
                  </p>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-slate-700">Billing Address</label>
                  <textarea
                    rows={2}
                    placeholder="Enter full billing address"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div className="md:col-span-2 flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="active-checkbox"
                    checked={formData.active}
                    onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                    className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <label htmlFor="active-checkbox" className="text-sm font-semibold text-slate-700">
                    Active (Include in next auto-billing cycle)
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-3 border-t border-slate-100 pt-4 mt-6">
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 transition"
                >
                  Save Client
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
