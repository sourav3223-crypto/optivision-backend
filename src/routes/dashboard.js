const router = require('express').Router();
const prisma = require('../utils/prisma');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

router.get('/', async (req, res, next) => {
  try {
    const sid = req.storeId;
    const today = new Date(); today.setHours(0,0,0,0);
    const tomorrow = new Date(today); tomorrow.setDate(today.getDate()+1);
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

    const [todayCount, todayRev, pending, totalCust, monthRev, recentOrders, lowStockFrames] = await Promise.all([
      prisma.order.count({ where: { storeId: sid, createdAt: { gte: today, lt: tomorrow }, status: { not: 'CANCELLED' } } }),
      prisma.order.aggregate({ where: { storeId: sid, createdAt: { gte: today, lt: tomorrow }, status: { not: 'CANCELLED' } }, _sum: { totalAmount: true } }),
      prisma.order.count({ where: { storeId: sid, status: { in: ['CREATED','LENS_ORDERED','GRINDING','FITTING','READY'] } } }),
      prisma.customer.count({ where: { storeId: sid } }),
      prisma.order.aggregate({ where: { storeId: sid, createdAt: { gte: monthStart }, status: { not: 'CANCELLED' } }, _sum: { totalAmount: true } }),
      prisma.order.findMany({ where: { storeId: sid }, orderBy: { createdAt: 'desc' }, take: 6, include: { customer: { select: { name: true, phone: true } } } }),
      prisma.frame.findMany({ where: { storeId: sid, isActive: true }, orderBy: { stockQty: 'asc' }, take: 20 }),
    ]);

    const lowStock = lowStockFrames.filter(f => f.stockQty <= f.lowStockAlert);

    const topFrames = await prisma.orderItem.groupBy({
      by: ['frameId'],
      where: { order: { storeId: sid, status: { not: 'CANCELLED' } }, frameId: { not: null } },
      _sum: { quantity: true, totalPrice: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: 5
    });

    const topFramesData = await Promise.all(topFrames.map(async tf => {
      const frame = await prisma.frame.findUnique({ where: { id: tf.frameId } });
      return { brand: frame?.brand, model: frame?.model, unitsSold: tf._sum.quantity, revenue: tf._sum.totalPrice };
    }));

    res.json({ success: true, data: {
      stats: { todayOrders: todayCount, todayRevenue: todayRev._sum.totalAmount||0, pendingOrders: pending, totalCustomers: totalCust, monthRevenue: monthRev._sum.totalAmount||0 },
      lowStock, recentOrders, topFrames: topFramesData, weekSales: []
    }});
  } catch (e) { next(e); }
});

module.exports = router;
