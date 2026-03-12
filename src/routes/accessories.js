const router = require('express').Router();
const prisma = require('../utils/prisma');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

router.get('/', async (req, res, next) => {
  try {
    const a = await prisma.accessory.findMany({ where: { storeId: req.storeId, isActive: true }, orderBy: { name: 'asc' } });
    res.json({ success: true, data: a });
  } catch (e) { next(e); }
});

router.post('/', async (req, res, next) => {
  try {
    const { name, category, purchasePrice, sellingPrice, stockQty, lowStockAlert, barcode } = req.body;
    const a = await prisma.accessory.create({ data: { storeId: req.storeId, name, category, purchasePrice: Number(purchasePrice)||0, sellingPrice: Number(sellingPrice), stockQty: Number(stockQty)||0, lowStockAlert: Number(lowStockAlert)||5, barcode } });
    res.status(201).json({ success: true, data: a });
  } catch (e) { next(e); }
});

router.put('/:id', async (req, res, next) => {
  try {
    const a = await prisma.accessory.update({ where: { id: req.params.id }, data: req.body });
    res.json({ success: true, data: a });
  } catch (e) { next(e); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    await prisma.accessory.update({ where: { id: req.params.id }, data: { isActive: false } });
    res.json({ success: true });
  } catch (e) { next(e); }
});

module.exports = router;
