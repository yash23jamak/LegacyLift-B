
import {
    analyzeZipFile,
    analyzeRepo,
    generateMigrationReport
} from '../services/analysisService.js';
import fs from 'fs';
import path from 'path';
import { StatusCodes } from 'http-status-codes';
import { Request, Response } from 'express';

const zipPath = path.join(process.cwd(), 'uploads', 'cached.zip');

/**
 * Analyzes a project based on different input types:
 * 1. ZIP file uploaded by the user
 * 2. Repository URL provided in the request body
 * 3. Cached ZIP file previously uploaded
 *
 * @param req - Express request object
 * @param res - Express response object
 * @returns JSON response with analysis report or error details
 */
export async function analyzeProject(req: Request, res: Response): Promise<Response> {
    try {
        let report: any;

        // ✅ Step 1: ZIP uploaded
        if (req.file) {
            const zipPath = req.file.path;
            const buffer = fs.readFileSync(zipPath);
            const zipOriginalName = req.file.originalname;

            const userId = (req as any).user?._id as string;

            const report = await analyzeZipFile(
                buffer,
                req.body.filterZip as string,
                userId,
                zipOriginalName
            );

            // ✅ Check if AI returned an error
            if (report && report && report.some((r: any) => r.error)) {
                return res.status(StatusCodes.BAD_GATEWAY).json({
                    status: StatusCodes.BAD_GATEWAY,
                    message: 'AI service failed during ZIP analysis',
                    error: report.find((r: any) => r.error)?.error || 'Unknown AI error',
                    raw: report.find((r: any) => r.error)?.raw || null
                });
            }

            return res.status(StatusCodes.OK).json({
                status: StatusCodes.OK,
                message: 'ZIP file analyzed successfully',
                report
            });
        }

        // ✅ Step 2: Analyze repo URL
        if (req.body.repoUrl) {
            const repoUrl = req.body.repoUrl as string;
            try {
                new URL(repoUrl);
            } catch {
                return res.status(StatusCodes.BAD_REQUEST).json({ error: "Invalid repository URL format." });
            }

            report = await analyzeRepo(repoUrl);

            // Handle AI failure
            if (report && report && report.some((r: any) => r.error)) {
                return res.status(StatusCodes.BAD_GATEWAY).json({
                    status: StatusCodes.BAD_GATEWAY,
                    message: 'AI service failed during ZIP analysis',
                    error: report.find((r: any) => r.error)?.error || 'Unknown AI error',
                    raw: report.find((r: any) => r.error)?.raw || null
                });
            }

            return res.status(StatusCodes.OK).json({
                status: StatusCodes.OK,
                message: 'Repository analyzed successfully',
                report
            });
        }

        // ✅ Step 3: Generate Migration Report
        if (req.body.generateMigrationReport === true) {
            if (!zipPath || !fs.existsSync(zipPath)) {
                return res.status(StatusCodes.BAD_REQUEST).json({
                    status: StatusCodes.BAD_REQUEST,
                    error: "No ZIP file has been uploaded yet."
                });
            }

            const buffer = fs.readFileSync(zipPath);
            const result = await generateMigrationReport(buffer);

            // ✅ Check if result exists and has a valid structure
            if (!result || !result.report || !Array.isArray(result.report)) {
                return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
                    status: StatusCodes.INTERNAL_SERVER_ERROR,
                    message: "Invalid response from AI service",
                    error: "Missing or malformed report data"
                });
            }

            // Check for embedded errors in the response
            const hasTopLevelError = result.error || result.message?.includes("Failed");
            const failedChunks = result.report.filter((r: any) => r.error || r.success === false);

            if (hasTopLevelError || failedChunks.length > 0) {
                return res.status(StatusCodes.BAD_GATEWAY).json({
                    status: StatusCodes.BAD_GATEWAY,
                    message: 'AI service failed during migration report generation',
                    errors: [
                        ...(hasTopLevelError ? [{ error: result.error || 'Unknown AI error', raw: result }] : []),
                        ...failedChunks.map(chunk => ({
                            error: chunk.error || 'Unknown AI error',
                            details: chunk.details || null,
                            raw: chunk.raw || null
                        }))
                    ]
                });
            }

            // If everything is fine, return success
            return res.status(StatusCodes.OK).json({
                status: StatusCodes.OK,
                message: 'Migration report generated successfully',
                report: result
            });
        }

        return res.status(StatusCodes.BAD_REQUEST).json({
            status: StatusCodes.BAD_REQUEST,
            error: "Please provide a ZIP file, repository URL, or generateMigrationReport flag."
        });
    } catch (error: any) {
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            status: StatusCodes.INTERNAL_SERVER_ERROR,
            error: error.message
        });
    }
}
