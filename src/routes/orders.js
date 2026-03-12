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
    });​​​​​​​​​​​​​​​​
