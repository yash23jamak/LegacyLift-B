
import {
    analyzeZipFile,
    analyzeRepo,
    generateMigrationReport
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
        // Step 1: ZIP uploaded 
        if (req.file) {
            const buffer = fs.readFileSync(zipPath);
            report = await analyzeZipFile(buffer,req.body.filterZip);
            return res.status(200).json({ report });
        }

        // Step 2: Analyze repo URL
        if (req.body.repoUrl) {
            const repoUrl = req.body.repoUrl;
            try {
                new URL(repoUrl);
            } catch {
                return res.status(400).json({ error: "Invalid repository URL format." });
            }

            report = await analyzeRepo(repoUrl);
            return res.status(200).json({ report });
        }


        // Step 3: Generate Migration Report
        if (req.body.generateMigrationReport === true) {
            if (!fs.existsSync(zipPath)) {
                return res.status(400).json({ error: "No ZIP file has been uploaded yet." });
            }
            const buffer = fs.readFileSync(zipPath);
            const result = await generateMigrationReport(buffer);
            return res.status(result.error ? 400 : 200).json(result);
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