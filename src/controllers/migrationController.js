import { analyzeMigrationZip } from "../services/migrationService.js";
import path from 'path';
import fs from 'fs';

const zipPath = path.join(process.cwd(), 'uploads', 'cached.zip');

export async function handleCachedZipAnalysis(req, res) {
    try {
        if (!fs.existsSync(zipPath)) {
            return res.status(400).json({ error: "No ZIP file has been uploaded yet." });
        }

        const buffer = fs.readFileSync(zipPath);
        const files = await analyzeMigrationZip(buffer);
        return res.status(200).json(files);
    } catch (error) {
        return res.status(500).json({ error: "Internal server error", details: error.message });
    }
}