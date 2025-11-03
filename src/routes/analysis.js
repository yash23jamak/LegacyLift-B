const express = require('express');
const router = express.Router();
const multer = require('multer');
const analysisController = require('../controllers/analysisController');

const storage = multer.memoryStorage();
const upload = multer({ storage });

router.post('/analyze-project', upload.single('folder'), analysisController.analyzeProject);

module.exports = router;