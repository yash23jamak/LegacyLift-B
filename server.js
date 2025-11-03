const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const analysisRoute = require('./src/routes/analysis');

dotenv.config();

const app = express();
app.use(express.json());

// CORS setup
const allowedOrigins = ['http://localhost:8080', 'http://192.168.29.6:8080'];
app.use(cors({
    origin: function (origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    }
}));

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        message: 'Server is healthy',
        timestamp: new Date().toISOString()
    });
});

// Analysis route
app.use('/api', analysisRoute);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});