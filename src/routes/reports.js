const router = require('express').Router();
const prisma = require('../utils/prisma');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

router.get('/sales', async (req, res, next) => {
  try {
    const { from, to } = req.query;
    const dateFrom = from ? new Date(from) : new Date(new Date().setDate(new Date().getDate()-30));
    const dateTo = to ? new Date(to+'T23:59:59') : new Date();
    const summary = await prisma.order.aggregate({
      where: { storeId: req.storeId, status: { not: 'CANCELLED' }, createdAt: { gte: dateFrom, lte: dateTo } },
      _sum: { totalAmount: true, discountAmount: true, taxAmount: true }, _count: true
    });
    res.json({ success: true, data: { sales: [], summary } });
  } catch (e) { next(e); }
});

router.get('/frames', async (req, res, next) => {
  try {
    const { from, to } = req.query;
    const dateFrom = from ? new Date(from) : new Date(new Date().setDate(new Date().getDate()-30));
    const dateTo = to ? new Date(to+'T23:59:59') : new Date();
    const items = await prisma.orderItem.findMany({
      where: { frameId: { not: null }, order: { storeId: req.storeId, status: { not: 'CANCELLED' }, createdAt: { gte: dateFrom, lte: dateTo } } },
      include: { frame: { select: { brand: true, model: true, purchasePrice: true } } }
    });
    const grouped = {};
    for (const item of items) {
      const key = item.frameId;
      if (!grouped[key]) grouped[key] = { brand: item.frame?.brand, model: item.frame?.model, unitsSold: 0, revenue: 0, profit: 0 };
      grouped[key].unitsSold += item.quantity;
      grouped[key].revenue += item.totalPrice;
      grouped[key].profit += item.totalPrice - (item.quantity * (item.frame?.purchasePrice || 0));
    }
    res.json({ success: true, data: Object.values(grouped).sort((a,b) => b.unitsSold - a.unitsSold) });
  } catch (e) { next(e); }
});

router.get('/customers', async (req, res, next) => {
  try {
    const customers = await prisma.customer.findMany({
      where: { storeId: req.storeId },
      include: { _count: { select: { orders: true } } },
      orderBy: { createdAt: 'desc' }, take: 20
    });
    res.json({ success: true, data: customers });
  } catch (e) { next(e); }
});

router.get('/profit', async (req, res, next) => {
  try {
    const { from, to } = req.query;
    const dateFrom = from ? new Date(from) : new Date(new Date().setDate(new Date().getDate()-30));
    const dateTo = to ? new Date(to+'T23:59:59') : new Date();
    const agg = await prisma.order.aggregate({
      where: { storeId: req.storeId, status: { not: 'CANCELLED' }, createdAt: { gte: dateFrom, lte: dateTo } },
      _sum: { totalAmount: true, taxAmount: true, discountAmount: true }
    });
    const items = await prisma.orderItem.findMany({
      where: { order: { storeId: req.storeId, status: { not: 'CANCELLED' }, createdAt: { gte: dateFrom, lte: dateTo } } },
      include: { frame: { select: { purchasePrice: true } }, lens: { select: { purchasePrice: true } } }
    });
    let grossProfit = 0;
    for (const item of items) {
      const cost = item.frame?.purchasePrice || item.lens?.purchasePrice || 0;
      grossProfit += item.totalPrice - (item.quantity * cost);
    }
    res.json({ success: true, data: { totalRevenue: agg._sum.totalAmount||0, totalTax: agg._sum.taxAmount||0, totalDiscounts: agg._sum.discountAmount||0, grossProfit } });
  } catch (e) { next(e); }
});

module.exports = router;
