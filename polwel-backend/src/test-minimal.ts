import express from 'express';

const app = express();
const PORT = process.env.PORT || 3001;

// Basic health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

app.listen(PORT, () => {
  console.log(`🚀 Minimal server running on port ${PORT}`);
});
