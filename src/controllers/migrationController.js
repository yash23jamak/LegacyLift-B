import { analyzeMigrationZip } from '../services/migrationService.js';


/**
 * Handles the conversion of a migration ZIP file to React-compatible format.
 * 
 * This endpoint expects a ZIP file to be uploaded via `req.file`.
 * It analyzes the contents of the ZIP file and returns the result in JSON format.
 * 
 * @async
 * @function convertToReact
 * @param {Object} req - Express request object, expected to contain a file buffer.
 * @param {Object} res - Express response object used to send back the result or error.
 * 
 * @returns {Object} JSON response containing the analysis result or an error message.
 */
export async function convertToReact(req, res) {
    try {
        let result;

        if (req.file) {
            result = await analyzeMigrationZip(req.file.buffer);
        } else {
            return res.status(400).json({ error: "Please provide a ZIP file for migration." });
        }

        res.status(200).json(result);

    } catch (error) {
        res.status(500).json({
            error: 'An unexpected error occurred. Please try again later.'
        });
    }
}
