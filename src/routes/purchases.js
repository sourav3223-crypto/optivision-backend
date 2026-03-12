const router = require('express').Router();
const prisma = require('../utils/prisma');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

router.get('/', async (req, res, next) => {
  try {
    const purchases = await prisma.purchase.findMany({ where: { storeId: req.storeId }, orderBy: { purchasedAt: 'desc' }, include: { supplier: { select: { name: true } }, items: true } });
    res.json({ success: true, data: purchases });
  } catch (e) { next(e); }
});

router.post('/', async (req, res, next) => {
  try {
    const { supplierId, invoiceNumber, items, notes, purchasedAt } = req.body;
    const totalAmount = items.reduce((s, i) => s + i.quantity * i.unitCost, 0);
    const purchase = await prisma.$transaction(async tx => {
      const p = await tx.purchase.create({
        data: { storeId: req.storeId, supplierId, invoiceNumber, totalAmount, notes, purchasedAt: purchasedAt ? new Date(purchasedAt) : new Date(), items: { create: items.map(i => ({ itemType: i.itemType, itemId: i.itemId, itemName: i.itemName, quantity: i.quantity, unitCost: i.unitCost, totalCost: i.quantity * i.unitCost })) } },
        include: { items: true }
      });
      for (const item of items) {
        if (item.itemType === 'frame' && item.itemId) {
          const f = await tx.frame.findUnique({ where: { id: item.itemId } });
          if (f) {
            await tx.frame.update({ where: { id: item.itemId }, data: { stockQty: { increment: item.quantity } } });
          }
        } else if (item.itemType === 'lens' && item.itemId) {
          const l = await tx.lens.findUnique({ where: { id: item.itemId } });
          if (l) {
            await tx.lens.update({ where: { id: item.itemId }, data: { stockQty: { increment: item.quantity } } });
          }
        }
      }
      return p;
    });
    res.status(201).json({ success: true, data: purchase });
  } catch (e) { next(e); }
});

module.exports = router;
