import express from 'express';
import multer from 'multer';
import rateLimit from 'express-rate-limit'
import { analyzeProject } from '../controllers/analysisController.js';

const router = express.Router();

// Rate limiting middleware: max 10 requests per 15 minutes per IP
// const limiter = rateLimit({
//     windowMs: 15 * 60 * 1000, // 15 minutes
//     max: 10,
//     message: 'Too many requests from this IP, please try again later.'
// });


const storage = multer.diskStorage({
    destination: './uploads',
    filename: (req, file, cb) => {
        cb(null, 'cached.zip'); // overwrite each time
    }
});
const upload = multer({
    storage,
    limits: { fileSize: 50 * 1024 * 1024 }
});


router.post('/analyze-project', upload.single('folder'), analyzeProject);

export default router;