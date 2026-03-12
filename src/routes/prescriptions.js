const router = require('express').Router();
const prisma = require('../utils/prisma');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

router.get('/customer/:customerId', async (req, res, next) => {
  try {
    const rxs = await prisma.prescription.findMany({ where: { customerId: req.params.customerId }, orderBy: { date: 'desc' } });
    res.json({ success: true, data: rxs });
  } catch (e) { next(e); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const rx = await prisma.prescription.findUnique({ where: { id: req.params.id }, include: { customer: { select: { name: true, phone: true } } } });
    if (!rx) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data: rx });
  } catch (e) { next(e); }
});

router.post('/', async (req, res, next) => {
  try {
    const { customerId, doctorName, date, rightSph, rightCyl, rightAxis, rightAdd, rightPd, leftSph, leftCyl, leftAxis, leftAdd, leftPd, pd, notes } = req.body;
    const n = v => v !== undefined && v !== '' ? Number(v) : null;
    const rx = await prisma.prescription.create({
      data: { customerId, doctorName, date: date ? new Date(date) : new Date(), rightSph: n(rightSph), rightCyl: n(rightCyl), rightAxis: n(rightAxis), rightAdd: n(rightAdd), rightPd: n(rightPd), leftSph: n(leftSph), leftCyl: n(leftCyl), leftAxis: n(leftAxis), leftAdd: n(leftAdd), leftPd: n(leftPd), pd: n(pd), notes }
    });
    res.status(201).json({ success: true, data: rx });
  } catch (e) { next(e); }
});

router.put('/:id', async (req, res, next) => {
  try {
    const rx = await prisma.prescription.update({ where: { id: req.params.id }, data: req.body });
    res.json({ success: true, data: rx });
  } catch (e) { next(e); }
});

module.exports = router;
