
import {
    analyzeZipFile,
    analyzeRepo,
    analyzeMigrationZip
} from '../services/analysisService.js';
import fs from 'fs';
import path from 'path';

const zipPath = path.join(process.cwd(), 'uploads', 'cached.zip');


/**
 * Analyzes a project based on different input types:
 * 1. ZIP file uploaded by the user
 * 2. Repository URL provided in the request body
 * 3. Cached ZIP file previously uploaded
 */
export async function analyzeProject(req, res) {
    try {
        let report;

        if (req.file) {
            // Step 1: ZIP uploaded and saved to disk
            const buffer = fs.readFileSync(zipPath);
            report = await analyzeZipFile(buffer);
            return res.status(200).json({ report });
        }

        if (req.body.repoUrl) {
            // Step 2: Analyze repo URL
            const repoUrl = req.body.repoUrl;
            try {
                new URL(repoUrl);
            } catch {
                return res.status(400).json({ error: "Invalid repository URL format." });
            }

            report = await analyzeRepo(repoUrl);
            return res.status(200).json({ report });
        }

        if (req.body.useCachedZip === true) {
            if (!fs.existsSync(zipPath)) {
                return res.status(400).json({ error: "No ZIP file has been uploaded yet." });
            }
            const buffer = fs.readFileSync(zipPath);
            const files = await analyzeMigrationZip(buffer);
            return res.status(200).json(files);
        }
        return res.status(400).json({ error: "Please provide a ZIP file, repository URL, or useCachedZip flag." });
    } catch (error) {
        const isClientError = error.message.includes('ZIP') || error.message.includes('file');
        res.status(isClientError ? 400 : 500).json({
            error: isClientError
                ? error.message
                : 'An unexpected error occurred. Please try again later.'
        });
    }
}