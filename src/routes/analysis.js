import express from 'express';
import multer from 'multer';
import { analyzeProject } from '../controllers/analysisController.js';
import { handleCachedZipAnalysis } from '../controllers/migrationController.js';
import { register, login, logout } from '../controllers/authController.js';
import { verifyToken } from '../middleware/authMiddleware.js';

const router = express.Router();

const storage = multer.diskStorage({
    destination: './uploads',
    filename: (req, file, cb) => {
        cb(null, 'cached.zip');
    }
});
const upload = multer({
    storage,
    limits: { fileSize: 50 * 1024 * 1024 }
});

// Analyse Routes
router.post('/analyze-project', verifyToken, upload.single('folder'), analyzeProject);

// Migration Routes
router.post('/migration-project', verifyToken, handleCachedZipAnalysis);

// User Authentication Flow
router.post('/auth/register', register);
router.post('/auth/login', login);
router.post('/auth/logout', logout);

export default router;