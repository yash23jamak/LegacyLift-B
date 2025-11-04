import express from 'express';
import multer from 'multer';
import { analyzeProject } from '../controllers/analysisController.js';

const router = express.Router();
const storage = multer.memoryStorage();
const upload = multer({ storage });

router.post('/analyze-project', upload.single('folder'), analyzeProject);

export default router;