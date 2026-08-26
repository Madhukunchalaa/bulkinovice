import { Request, Response } from 'express';
import { prisma } from '../config/db.js';

export const getCategories = async (req: Request, res: Response): Promise<void> => {
  try {
    const categories = await prisma.invoiceCategory.findMany({
      orderBy: { label: 'asc' },
    });
    res.json(categories);
  } catch (error: any) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
};

export const createCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { label, amount, defaultItemDescription } = req.body;

    if (!label || amount === undefined || amount === null) {
      res.status(400).json({ error: 'Label and amount are required' });
      return;
    }

    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount < 0) {
      res.status(400).json({ error: 'Amount must be a valid positive number' });
      return;
    }

    // Check if label already exists (case-insensitive or exact)
    const existing = await prisma.invoiceCategory.findFirst({
      where: { label: { equals: label, mode: 'insensitive' } },
    });

    if (existing) {
      res.status(400).json({ error: 'Category label already exists' });
      return;
    }

    const category = await prisma.invoiceCategory.create({
      data: {
        label,
        amount: numericAmount,
        defaultItemDescription: defaultItemDescription || '',
      },
    });

    res.status(201).json(category);
  } catch (error: any) {
    console.error('Error creating category:', error);
    res.status(500).json({ error: 'Failed to create category' });
  }
};

export const updateCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { label, amount, defaultItemDescription } = req.body;

    if (!label || amount === undefined || amount === null) {
      res.status(400).json({ error: 'Label and amount are required' });
      return;
    }

    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount < 0) {
      res.status(400).json({ error: 'Amount must be a valid positive number' });
      return;
    }

    const catId = parseInt(id);
    if (isNaN(catId)) {
      res.status(400).json({ error: 'Invalid category ID' });
      return;
    }

    // Check label uniqueness (excluding current category)
    const duplicate = await prisma.invoiceCategory.findFirst({
      where: {
        label: { equals: label, mode: 'insensitive' },
        NOT: { id: catId },
      },
    });

    if (duplicate) {
      res.status(400).json({ error: 'Category label already exists' });
      return;
    }

    const category = await prisma.invoiceCategory.update({
      where: { id: catId },
      data: {
        label,
        amount: numericAmount,
        defaultItemDescription: defaultItemDescription || '',
      },
    });

    res.json(category);
  } catch (error: any) {
    console.error('Error updating category:', error);
    res.status(500).json({ error: 'Failed to update category' });
  }
};

export const deleteCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const catId = parseInt(id);

    if (isNaN(catId)) {
      res.status(400).json({ error: 'Invalid category ID' });
      return;
    }

    // Check if category is used by any clients
    const clientsCount = await prisma.client.count({
      where: { invoiceCategoryId: catId },
    });

    if (clientsCount > 0) {
      res.status(400).json({
        error: `Cannot delete category. It is assigned to ${clientsCount} client(s).`,
      });
      return;
    }

    await prisma.invoiceCategory.delete({
      where: { id: catId },
    });

    res.json({ message: 'Category deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting category:', error);
    res.status(500).json({ error: 'Failed to delete category' });
  }
};
