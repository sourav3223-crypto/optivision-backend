const router = require('express').Router();
const prisma = require('../utils/prisma');
const { authenticate, requireAdmin } = require('../middleware/auth');

router.use(authenticate);

router.get('/', async (req, res, next) => {
  try {
    const { status, customerId, search, page = 1, limit = 20 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    const where = {
      storeId: req.storeId,
      ...(status && { status }),
      ...(customerId && { customerId }),
      ...(search && { OR: [{ orderNumber: { contains: search, mode: 'insensitive' } }, { customer: { name: { contains: search, mode: 'insensitive' } } }, { customer: { phone: { contains: search } } }] }),
    };
    const [orders, total] = await Promise.all([
      prisma.order.findMany({ where, skip, take: Number(limit), orderBy: { createdAt: 'desc' }, include: { customer: { select: { id: true, name: true, phone: true } }, staff: { select: { id: true, name: true } }, items: true, payments: true } }),
      prisma.order.count({ where })
    ]);
    res.json({ success: true, data: orders, pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / Number(limit)) } });
  } catch (e) { next(e); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const order = await prisma.order.findFirst({
      where: { id: req.params.id, storeId: req.storeId },
      include: {
        customer: true,
        staff: { select: { id: true, name: true, role: true } },
        items: { include: { frame: { select: { id: true, brand: true, model: true } }, lens: { select: { id: true, name: true } } } },
        payments: { orderBy: { paidAt: 'asc' } },
        statusLogs: { orderBy: { changedAt: 'asc' } }
      }
    });
    if (!order) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data: order });
  } catch (e) { next(e); }
});

router.post('/', async (req, res, next) => {
  try {
    const { customerId, items, subtotal, discountAmount = 0, taxAmount = 0, taxPct = 18, totalAmount, advanceAmount = 0, paymentMethod = 'CASH', deliveryDate, notes } = req.body;
    if (!customerId || !items?.length || !totalAmount) return res.status(400).json({ success: false, message: 'customerId, items, totalAmount required' });

    const store = await prisma.store.findUnique({ where: { id: req.storeId } });
    const orderNumber = `${store.invoicePrefix}-${String(store.invoiceCounter + 1).padStart(4, '0')}`;

    const order = await prisma.$transaction(async tx => {
      for (const item of items) {
        if (item.itemType === 'frame' && item.frameId) {
          const frame = await tx.frame.findUnique({ where: { id: item.frameId } });
          if (!frame || frame.stockQty < item.quantity) throw Object.assign(new Error(`Insufficient stock`), { status: 400 });
          await tx.frame.update({ where: { id: item.frameId }, data: { stockQty: { decrement: item.quantity } } });
        }
        if (item.itemType === 'lens' && item.lensId) {
          const lens = await tx.lens.findUnique({ where: { id: item.lensId } });
          if (lens && lens.stockQty >= item.quantity) {
            await tx.lens.update({ where: { id: item.lensId }, data: { stockQty: { decrement: item.quantity } } });
          }
        }
      }

      const newOrder = await tx.order.create({
        data: {
          storeId: req.storeId, orderNumber, customerId, staffId: req.user.id,
          subtotal: Number(subtotal) || Number(totalAmount), discountAmount: Number(discountAmount), taxAmount: Number(taxAmount), taxPct: Number(taxPct), totalAmount: Number(totalAmount),
          advanceAmount: Number(advanceAmount), balanceAmount: Number(totalAmount) - Number(advanceAmount),
          paymentMethod, paymentStatus: Number(advanceAmount) >= Number(totalAmount) ? 'PAID' : Number(advanceAmount) > 0 ? 'PARTIAL' : 'PENDING',
          deliveryDate: deliveryDate ? new Date(deliveryDate) : null, notes,
          items: { create: items.map(i => ({ itemType: i.itemType, frameId: i.frameId || null, lensId: i.lensId || null, name: i.name, quantity: i.quantity, unitPrice: i.unitPrice, totalPrice: i.totalPrice })) },
          statusLogs: { create: { status: 'CREATED', note: 'Order created' } },
          ...(Number(advanceAmount) > 0 ? { payments: { create: [{ amount: Number(advanceAmount), method: paymentMethod, note: 'Advance' }] } } : {})
        },
        include: { customer: true, items: true }
      });

      await tx.store.update({ where: { id: req.storeId }, data: { invoiceCounter: { increment: 1 } } });
      return newOrder;
    });

    res.status(201).json({ success: true, data: order });
  } catch (e) { next(e); }
});

router.patch('/:id/status', async (req, res, next) => {
  try {
    const { status, note } = req.body;
    const valid = ['CREATED','LENS_ORDERED','GRINDING','FITTING','READY','DELIVERED','CANCELLED'];
    if (!valid.includes(status)) return res.status(400).json({ success: false, message: 'Invalid status' });
    const order = await prisma.$transaction(async tx => {
      const u = await tx.order.update({ where: { id: req.params.id }, data: { status, ...(status === 'DELIVERED' && { deliveredAt: new Date() }) } });
      await tx.orderStatusLog.create({ data: { orderId: req.params.id, status, note } });
      return u;
    });
    res.json({ success: true, data: order });
  } catch (e) { next(e); }
});

router.post('/:id/payment', async (req, res, next) => {
  try {
    const { amount, method, note } = req.body;
    const order = await prisma.order.findFirst({ where: { id: req.params.id, storeId: req.storeId } });
    if (!order) return res.status(404).json({ success: false, message: 'Not found' });
    await prisma.$transaction(async tx => {
      await tx.payment.create({ data: { orderId: req.params.id, amount: Number(amount), method, note } });
      const agg = await tx.payment.aggregate({ where: { orderId: req.params.id }, _sum: { amount: true } });
      const paid = agg._sum.amount || 0;
      await tx.order.update({ where: { id: req.params.id }, data: { advanceAmount: paid, balanceAmount: Math.max(0, order.totalAmount - paid), paymentStatus: paid >= order.totalAmount ? 'PAID' : 'PARTIAL' } });
    });
    res.status(201).json({ success: true });
  } catch (e) { next(e); }
});

router.delete('/:id', requireAdmin, async (req, res, next) => {
  try {
    await prisma.order.update({ where: { id: req.params.id }, data: { status: 'CANCELLED', cancelledAt: new Date() } });
    res.json({ success: true });
  } catch (e) { next(e); }
});

module.exports = router;
