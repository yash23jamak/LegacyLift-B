import { analyzeZipFile, analyzeRepo } from '../services/analysisService.js';

/**
 * Controller function to handle project analysis requests.
 * It supports both ZIP file uploads and repository URL submissions.
 */
export async function analyzeProject(req, res) {
    try {
        let report;

        if (req.file) {
            report = await analyzeZipFile(req.file.buffer);
        } else if (req.body.repoUrl) {
            const repoUrl = req.body.repoUrl;

            try {
                new URL(repoUrl);
            } catch {
                return res.status(400).json({ error: "Invalid repository URL format." });
            }

            report = await analyzeRepo(repoUrl);
        } else {
            return res.status(400).json({ error: "Please provide either a ZIP file or a repository URL." });
        }

        res.status(200).json({ report });
    } catch (error) {
        // Determine if it's a client or server error
        const isClientError = error instanceof multer.MulterError || error.message.includes('ZIP') || error.message.includes('file');

        // Send a sanitized message to the client
        res.status(isClientError ? 400 : 500).json({
            error: isClientError
                ? error.message
                : 'An unexpected error occurred. Please try again later.'
        });
    }
}
