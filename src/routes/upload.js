const router = require('express').Router();
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

router.post('/', (req, res) => {
  res.json({ success: true, url: null, message: 'Upload not configured' });
});

module.exports = router;
