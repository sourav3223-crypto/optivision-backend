const router = require('express').Router();
const prisma = require('../utils/prisma');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

router.get('/', async (req, res, next) => {
  try {
    const [frames, lenses] = await Promise.all([
      prisma.frame.findMany({ where: { storeId: req.storeId, isActive: true }, orderBy: { brand: 'asc' } }),
      prisma.lens.findMany({ where: { storeId: req.storeId, isActive: true }, orderBy: { name: 'asc' } }),
    ]);
    res.json({ success: true, data: { frames, lenses } });
  } catch (e) { next(e); }
});

router.get('/movements', async (req, res, next) => {
  try {
    const movements = await prisma.stockMovement.findMany({
      where: { storeId: req.storeId }, orderBy: { createdAt: 'desc' }, take: 30,
      include: { frame: { select: { brand: true, model: true } }, lens: { select: { name: true } } }
    });
    res.json({ success: true, data: movements });
  } catch (e) { next(e); }
});

router.post('/adjust', async (req, res, next) => {
  try {
    const { frameId, lensId, type, quantity, reason } = req.body;
    let item, idKey;
    if (frameId) { item = await prisma.frame.findUnique({ where: { id: frameId } }); idKey = 'frameId'; }
    else if (lensId) { item = await prisma.lens.findUnique({ where: { id: lensId } }); idKey = 'lensId'; }
    if (!item) return res.status(404).json({ success: false, message: 'Item not found' });
    const bef = item.stockQty;
    const aft = type === 'IN' ? bef + Number(quantity) : type === 'OUT' ? Math.max(0, bef - Number(quantity)) : Number(quantity);
    const model = idKey === 'frameId' ? prisma.frame : prisma.lens;
    await model.update({ where: { id: item.id }, data: { stockQty: aft } });
    await prisma.stockMovement.create({ data: { storeId: req.storeId, [idKey]: item.id, type, quantity: Number(quantity), beforeQty: bef, afterQty: aft, reason } });
    res.json({ success: true, data: { beforeQty: bef, afterQty: aft } });
  } catch (e) { next(e); }
});

module.exports = router;
