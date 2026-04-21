import 'dotenv/config';
import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(join(__dirname, '../public')));

app.post('/api/analyze', (req, res) => {
  res.json({ message: 'analyze endpoint — coming soon' });
});

app.post('/api/generate', (req, res) => {
  res.json({ message: 'generate endpoint — coming soon' });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
