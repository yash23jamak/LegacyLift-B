
import {
    analyzeZipFile,
    analyzeRepo,
    generateMigrationReport
} from '../services/analysisService.js';
import fs from 'fs';
import path from 'path';
import { StatusCodes } from 'http-status-codes';

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

        // ✅ Step 1: ZIP uploaded
        if (req.file) {
            const zipPath = req.file.path;
            const buffer = fs.readFileSync(zipPath);

            const zipOriginalName = req.file.originalname;

            const report = await analyzeZipFile(buffer, req.body.filterZip, req.user._id, zipOriginalName);


            // Handle AI failure
            if (report && report.error) {
                return res.status(StatusCodes.BAD_GATEWAY).json({
                    status: StatusCodes.BAD_GATEWAY,
                    message: 'AI service failed during ZIP analysis',
                    error: report.error,
                });
            }

            return res.status(StatusCodes.OK).json({
                status: StatusCodes.OK,
                message: 'ZIP file analyzed successfully',
                report
            });
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

            // Handle AI failure
            if (report && report.error) {
                return res.status(StatusCodes.BAD_GATEWAY).json({
                    status: StatusCodes.BAD_GATEWAY,
                    message: 'AI service failed during repository analysis',
                    error: report.error,
                });
            }

            return res.status(StatusCodes.OK).json({
                status: StatusCodes.OK,
                message: 'Repository analyzed successfully',
                report
            });
        }

        // Step 3: Generate Migration Report
        if (req.body.generateMigrationReport === true) {
            if (!fs.existsSync(zipPath)) {
                return res.status(400).json({ error: "No ZIP file has been uploaded yet." });
            }
            const buffer = fs.readFileSync(zipPath);
            const result = await generateMigrationReport(buffer);


            // Hanlde AI failure
            const failedChunk = result.report.find(r => r.success === false || r.error);

            if (failedChunk) {
                return res.status(StatusCodes.BAD_GATEWAY).json({
                    status: StatusCodes.BAD_GATEWAY,
                    message: 'AI service failed during migration report generation',
                    error: failedChunk.error,
                    details: failedChunk.details || null
                });
            }


            return res.status(StatusCodes.OK).json({
                status: StatusCodes.OK,
                message: 'Migration report generated successfully',
                report: result
            });
        }

        return res.status(StatusCodes.BAD_REQUEST).json({
            StatusCodes: StatusCodes.BAD_REQUEST,
            error: "Please provide a ZIP file, repository URL, or generateMigrationReport flag."
        });
    } catch (error) {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            StatusCodes: StatusCodes.INTERNAL_SERVER_ERROR,
            error: error.message
        });
    }
}