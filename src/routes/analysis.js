import express from 'express';
import multer from 'multer';
import rateLimit from 'express-rate-limit'
import { analyzeProject } from '../controllers/analysisController.js';
import { convertToReact } from '../controllers/migrationController.js';

const router = express.Router();

// Rate limiting middleware: max 10 requests per 15 minutes per IP
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10,
    message: 'Too many requests from this IP, please try again later.'
});


// Multer configuration
const storage = multer.memoryStorage();
const upload = multer({
    storage,
    limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/zip' || file.originalname.endsWith('.zip')) {
            cb(null, true);
        } else {
            cb(new Error('Only ZIP files are allowed.'));
        }
    }
});

router.post('/analyze-project', limiter, upload.single('folder'), analyzeProject);
router.post('/analyze-migration', upload.single('folder'), convertToReact);

export default router;