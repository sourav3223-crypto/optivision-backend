const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const prisma = require('../utils/prisma');
const { authenticate, requireAdmin } = require('../middleware/auth');

const sign = id => jwt.sign({ userId: id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });

router.post('/login',
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
  async (req, res, next) => {
    try {
      const errs = validationResult(req);
      if (!errs.isEmpty()) return res.status(400).json({ success: false, errors: errs.array() });
      const { email, password } = req.body;
      const user = await prisma.user.findUnique({ where: { email }, include: { store: true } });
      if (!user || !user.isActive) return res.status(401).json({ success: false, message: 'Invalid credentials' });
      if (!await bcrypt.compare(password, user.passwordHash)) return res.status(401).json({ success: false, message: 'Invalid credentials' });
      await prisma.user.update({ where: { id: user.id }, data: { lastLogin: new Date() } });
      const { passwordHash, ...safe } = user;
      res.json({ success: true, token: sign(user.id), user: safe });
    } catch (e) { next(e); }
  }
);

router.get('/me', authenticate, (req, res) => {
  const { passwordHash, ...safe } = req.user;
  res.json({ success: true, user: safe });
});

router.post('/change-password', authenticate,
  body('currentPassword').notEmpty(),
  body('newPassword').isLength({ min: 6 }),
  async (req, res, next) => {
    try {
      const errs = validationResult(req);
      if (!errs.isEmpty()) return res.status(400).json({ success: false, errors: errs.array() });
      const user = await prisma.user.findUnique({ where: { id: req.user.id } });
      if (!await bcrypt.compare(req.body.currentPassword, user.passwordHash))
        return res.status(400).json({ success: false, message: 'Current password incorrect' });
      const passwordHash = await bcrypt.hash(req.body.newPassword, 12);
      await prisma.user.update({ where: { id: req.user.id }, data: { passwordHash } });
      res.json({ success: true, message: 'Password changed' });
    } catch (e) { next(e); }
  }
);

router.get('/users', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      where: { storeId: req.storeId },
      select: { id:true, name:true, email:true, phone:true, role:true, isActive:true, lastLogin:true, createdAt:true },
      orderBy: { createdAt: 'desc' }
    });
    res.json({ success: true, data: users });
  } catch (e) { next(e); }
});

router.​​​​​​​​​​​​​​​​
