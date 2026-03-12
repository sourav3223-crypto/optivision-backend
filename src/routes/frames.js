const router = require('express').Router();
const prisma = require('../utils/prisma');
const { authenticate, requireAdmin } = require('../middleware/auth');

router.use(authenticate);

router.get('/', async (req, res, next) => {
  try {
    const { search, brand, shape, color, gender, page = 1, limit = 20, minPrice, maxPrice } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    const where = {
      storeId: req.storeId, isActive: true,
      ...(search && { OR: [{ brand: { contains: search, mode: 'insensitive' } }, { model: { contains: search, mode: 'insensitive' } }, { frameCode: { contains: search, mode: 'insensitive' } }] }),
      ...(brand && { brand: { equals: brand, mode: 'insensitive' } }),
      ...(shape && { shape }),
      ...(color && { color: { contains: color, mode: 'insensitive' } }),
    };
    const [frames, total] = await Promise.all([
      prisma.frame.findMany({ where, skip, take: Number(limit), orderBy: { createdAt: 'desc' } }),
      prisma.frame.count({ where })
    ]);
    res.json({ success: true, data: frames, pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / Number(limit)) } });
  } catch (e) { next(e); }
});

router.get('/low-stock', async (req, res, next) => {
  try {
    const frames = await prisma.frame.findMany({
      where: { storeId: req.storeId, isActive: true },
      orderBy: { stockQty: 'asc' },
      take: 20
    });
    res.json({ success: true, data: frames.filter(f => f.stockQty <= f.lowStockAlert) });
  } catch (e) { next(e); }
});

router.get('/barcode/:barcode', async (req, res, next) => {
  try {
    const frame = await prisma.frame.findFirst({ where: { barcode: req.params.barcode, storeId: req.storeId, isActive: true } });
    if (!frame) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data: frame });
  } catch (e) { next(e); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const frame = await prisma.frame.findFirst({ where: { id: req.params.id, storeId: req.storeId } });
    if (!frame) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data: frame });
  } catch (e) { next(e); }
});

router.post('/', async (req, res, next) => {
  try {
    const { brand, model, shape, color, purchasePrice, sellingPrice, stockQty, lowStockAlert, barcode, supplierId } = req.body;
    if (!brand || !sellingPrice) return res.status(400).json({ success: false, message: 'brand and sellingPrice required' });
    const frame = await prisma.frame.create({
      data: { storeId: req.storeId, frameCode: `FRM-${Date.now()}`, brand, model, shape: shape || 'RECTANGLE', color, purchasePrice: Number(purchasePrice) || 0, sellingPrice: Number(sellingPrice), stockQty: Number(stockQty) || 0, lowStockAlert: Number(lowStockAlert) || 5, barcode, supplierId }
    });
    res.status(201).json({ success: true, data: frame });
  } catch (e) { next(e); }
});

router.put('/:id', async (req, res, next) => {
  try {
    const r = await prisma.frame.updateMany({ where: { id: req.params.id, storeId: req.storeId }, data: { ...req.body } });
    if (!r.count) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data: await prisma.frame.findUnique({ where: { id: req.params.id } }) });
  } catch (e) { next(e); }
});

router.delete('/:id', requireAdmin, async (req, res, next) => {
  try {
    await prisma.frame.updateMany({ where: { id: req.params.id, storeId: req.storeId }, data: { isActive: false } });
    res.json({ success: true });
  } catch (e) { next(e); }
});

module.exports = router;
