import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import analysisRoute from './src/routes/analysis.js';

dotenv.config();

const app = express();
app.use(express.json());

const allowedOrigins = process.env.ALLOWED_ORIGINS.split(',');
app.use(cors({
    origin: function (origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    }
}));

app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        message: 'Server is healthy',
        timestamp: new Date().toISOString()
    });
});

app.use('/api/v1', analysisRoute);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});