const router = require('express').Router();
const prisma = require('../utils/prisma');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

router.get('/', async (req, res, next) => {
  try {
    const s = await prisma.supplier.findMany({ where: { storeId: req.storeId, isActive: true }, orderBy: { name: 'asc' } });
    res.json({ success: true, data: s });
  } catch (e) { next(e); }
});

router.post('/', async (req, res, next) => {
  try {
    const { name, phone, email, address, gstNumber } = req.body;
    const s = await prisma.supplier.create({ data: { storeId: req.storeId, name, phone, email, address, gstNumber } });
    res.status(201).json({ success: true, data: s });
  } catch (e) { next(e); }
});

router.put('/:id', async (req, res, next) => {
  try {
    const s = await prisma.supplier.update({ where: { id: req.params.id }, data: req.body });
    res.json({ success: true, data: s });
  } catch (e) { next(e); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    await prisma.supplier.update({ where: { id: req.params.id }, data: { isActive: false } });
    res.json({ success: true });
  } catch (e) { next(e); }
});

module.exports = router;
