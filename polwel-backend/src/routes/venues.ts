import express from 'express';

const router = express.Router();

router.get('/', (req, res) => {
  res.json({ message: 'Venues endpoint - coming soon' });
});

export default router;
