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
        // console.error("Analysis error:", error);
        res.status(400).json({ error: error.message });
    }
}
