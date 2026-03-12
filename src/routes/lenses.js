const router = require('express').Router();
const prisma = require('../utils/prisma');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

router.get('/', async (req, res, next) => {
  try {
    const { lensType, search } = req.query;
    const lenses = await prisma.lens.findMany({
      where: { storeId: req.storeId, isActive: true, ...(lensType && { lensType }), ...(search && { name: { contains: search, mode: 'insensitive' } }) },
      orderBy: { name: 'asc' }
    });
    res.json({ success: true, data: lenses });
  } catch (e) { next(e); }
});

router.post('/', async (req, res, next) => {
  try {
    const { name, lensType, lensIndex, coating, brand, purchasePrice, sellingPrice, stockQty, lowStockAlert, supplierId } = req.body;
    const lens = await prisma.lens.create({
      data: { storeId: req.storeId, name, lensType: lensType||'SINGLE_VISION', lensIndex: lensIndex||'1.56', coating: coating||[], brand, purchasePrice: Number(purchasePrice)||0, sellingPrice: Number(sellingPrice), stockQty: Number(stockQty)||100, lowStockAlert: Number(lowStockAlert)||10, supplierId }
    });
    res.status(201).json({ success: true, data: lens });
  } catch (e) { next(e); }
});

router.put('/:id', async (req, res, next) => {
  try {
    const lens = await prisma.lens.update({ where: { id: req.params.id }, data: req.body });
    res.json({ success: true, data: lens });
  } catch (e) { next(e); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    await prisma.lens.update({ where: { id: req.params.id }, data: { isActive: false } });
    res.json({ success: true });
  } catch (e) { next(e); }
});

module.exports = router;
