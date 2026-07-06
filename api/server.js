import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import playersRouter from './routes/players.js';
import scoresRouter from './routes/scores.js';
import leaderboardRouter from './routes/leaderboard.js';
import profileRouter from './routes/profile.js';
import coinsRouter from './routes/coins.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// API routes
app.use(playersRouter);
app.use(scoresRouter);
app.use(leaderboardRouter);
app.use(profileRouter);
app.use(coinsRouter);

// Serve frontend static files
const publicDir = path.join(__dirname, 'public');
app.use(express.static(publicDir));

// SPA fallback: all non-API routes serve index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Star Hunter server running on http://localhost:${PORT}`);
});
