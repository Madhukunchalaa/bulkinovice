import { Request, Response } from 'express';
import { prisma } from '../config/db.js';

export const getClients = async (req: Request, res: Response): Promise<void> => {
  try {
    const clients = await prisma.client.findMany({
      include: {
        invoiceCategory: true,
      },
      orderBy: { name: 'asc' },
    });
    res.json(clients);
  } catch (error: any) {
    console.error('Error fetching clients:', error);
    res.status(500).json({ error: 'Failed to fetch clients' });
  }
};

export const createClient = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, gstin, address, email, phone, invoiceCategoryId, itemDescription, active } = req.body;

    if (!name || !invoiceCategoryId) {
      res.status(400).json({ error: 'Name and invoice category are required' });
      return;
    }

    const catId = parseInt(invoiceCategoryId);
    if (isNaN(catId)) {
      res.status(400).json({ error: 'Invalid invoice category ID' });
      return;
    }

    // Verify category exists
    const category = await prisma.invoiceCategory.findUnique({
      where: { id: catId },
    });

    if (!category) {
      res.status(400).json({ error: 'Invoice category does not exist' });
      return;
    }

    const client = await prisma.client.create({
      data: {
        name,
        gstin: gstin || null,
        address: address || null,
        email: email || null,
        phone: phone || null,
        invoiceCategoryId: catId,
        itemDescription: itemDescription || category.defaultItemDescription,
        active: active !== undefined ? Boolean(active) : true,
      },
      include: {
        invoiceCategory: true,
      },
    });

    res.status(201).json(client);
  } catch (error: any) {
    console.error('Error creating client:', error);
    res.status(500).json({ error: 'Failed to create client' });
  }
};

export const updateClient = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, gstin, address, email, phone, invoiceCategoryId, itemDescription, active } = req.body;

    const clientId = parseInt(id);
    if (isNaN(clientId)) {
      res.status(400).json({ error: 'Invalid client ID' });
      return;
    }

    if (!name || !invoiceCategoryId) {
      res.status(400).json({ error: 'Name and invoice category are required' });
      return;
    }

    const catId = parseInt(invoiceCategoryId);
    if (isNaN(catId)) {
      res.status(400).json({ error: 'Invalid invoice category ID' });
      return;
    }

    // Verify category exists
    const category = await prisma.invoiceCategory.findUnique({
      where: { id: catId },
    });

    if (!category) {
      res.status(400).json({ error: 'Invoice category does not exist' });
      return;
    }

    const client = await prisma.client.update({
      where: { id: clientId },
      data: {
        name,
        gstin: gstin || null,
        address: address || null,
        email: email || null,
        phone: phone || null,
        invoiceCategoryId: catId,
        itemDescription: itemDescription || category.defaultItemDescription,
        active: active !== undefined ? Boolean(active) : true,
      },
      include: {
        invoiceCategory: true,
      },
    });

    res.json(client);
  } catch (error: any) {
    console.error('Error updating client:', error);
    res.status(500).json({ error: 'Failed to update client' });
  }
};

export const deleteClient = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const clientId = parseInt(id);

    if (isNaN(clientId)) {
      res.status(400).json({ error: 'Invalid client ID' });
      return;
    }

    // Check if client has invoices. If yes, deactivating is preferred. Let's block hard delete if they have invoices to protect audit logs.
    const invoicesCount = await prisma.generatedInvoice.count({
      where: { clientId },
    });

    if (invoicesCount > 0) {
      res.status(400).json({
        error: `Cannot delete client. This client has ${invoicesCount} generated invoice(s). Please deactivate the client instead.`,
      });
      return;
    }

    await prisma.client.delete({
      where: { id: clientId },
    });

    res.json({ message: 'Client deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting client:', error);
    res.status(500).json({ error: 'Failed to delete client' });
  }
};
