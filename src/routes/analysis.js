import express from 'express';
import multer from 'multer';
import { analyzeProject } from '../controllers/analysisController.js';

const router = express.Router();

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