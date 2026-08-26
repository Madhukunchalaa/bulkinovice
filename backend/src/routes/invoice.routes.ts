import { Router } from 'express';
import {
  getInvoices,
  generateInvoices,
  downloadInvoice,
} from '../controllers/invoice.controller.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

router.use(authenticateToken);

router.get('/', getInvoices);
router.post('/generate', generateInvoices);
router.get('/:id/download', downloadInvoice);

export default router;
