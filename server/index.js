import 'dotenv/config';
import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import analyzeRouter from './routes/analyze.js';
import generateRouter from './routes/generate.js';
import hashtagsRouter from './routes/hashtags.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '20mb' }));
app.use(express.static(join(__dirname, '../public')));

app.use('/api/analyze', analyzeRouter);
app.use('/api/generate', generateRouter);
app.use('/api/hashtags', hashtagsRouter);

app.get('/generate', (req, res) => {
  res.sendFile(join(__dirname, '../public/generate.html'));
});

app.get('/result', (req, res) => {
  res.sendFile(join(__dirname, '../public/result.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
