import { analyzeMigrationZip } from "../services/migrationService.js";
import path from 'path';
import fs from 'fs';
import { StatusCodes } from 'http-status-codes';

const zipPath = path.join(process.cwd(), 'uploads', 'cached.zip');

/**
 * Handles the analysis of a previously uploaded ZIP file stored on the server.
 * Validates the existence of the ZIP file, reads its contents, and performs AI-based migration analysis.
 * @param {Object} req - The HTTP request object.
 * @param {Object} res - The HTTP response object.
 * @returns {Object} - JSON response containing either the analysis result or an error message.
 */
export async function handleCachedZipAnalysis(req, res) {
    try {
        if (!fs.existsSync(zipPath)) {
            return res.status(StatusCodes.BAD_REQUEST).json({
                StatusCodes: StatusCodes.BAD_REQUEST,
                error: "No ZIP file has been uploaded yet."
            });
        }

        const buffer = fs.readFileSync(zipPath);
        const files = await analyzeMigrationZip(buffer);
        return res.status(StatusCodes.OK).json({
            status: StatusCodes.OK,
            message: 'Migration analysis completed successfully',
            files
        });
    } catch (error) {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            StatusCodes: StatusCodes.INTERNAL_SERVER_ERROR,
            error: error.message
        });
    }
}