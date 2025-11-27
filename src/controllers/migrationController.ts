
import { analyzeMigrationZip } from "../services/migrationService";
import path from "path";
import fs from "fs";
import { StatusCodes } from "http-status-codes";
import { Request, Response } from "express";

const zipPath: string = path.join(process.cwd(), "uploads", "cached.zip");

/**
 * Handles the analysis of a previously uploaded ZIP file stored on the server.
 * Validates the existence of the ZIP file, reads its contents, and performs AI-based migration analysis.
 *
 * @param req - The HTTP request object.
 * @param res - The HTTP response object.
 * @returns JSON response containing either the analysis result or an error message.
 */
export async function handleCachedZipAnalysis(
    req: Request,
    res: Response
): Promise<Response> {
    try {
        if (!fs.existsSync(zipPath)) {
            return res.status(StatusCodes.BAD_REQUEST).json({
                status: StatusCodes.BAD_REQUEST,
                error: "No ZIP file has been uploaded yet.",
            });
        }

        const buffer: Buffer = fs.readFileSync(zipPath);
        const files = await analyzeMigrationZip(buffer);

        // Handle AI failure
        if (files && "error" in files) {
            return res.status(StatusCodes.BAD_GATEWAY).json({
                status: StatusCodes.BAD_GATEWAY,
                message: "AI service failed during migration analysis",
                error: (files as { error: string }).error,
            });
        }

        return res.status(StatusCodes.OK).json({
            status: StatusCodes.OK,
            message: "Migration analysis completed successfully",
            files,
        });
    } catch (error: any) {
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            status: StatusCodes.INTERNAL_SERVER_ERROR,
            error: error.message,
        });
    }
}
