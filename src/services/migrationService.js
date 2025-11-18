import { MIGRATION_PROMPT, extractFilesFromZip } from "../utils/prompt.js";
import axios from "axios";
import dotenv from 'dotenv';
dotenv.config();

const apiUrl = process.env.NODE_MIGRATION_API_URL;
const apiKey = process.env.NODE_MIGRATION_API_KEY;
const apiModel = process.env.NODE_MIGRATION_MODEL;

if (!apiUrl || !apiKey || !apiModel) {
    throw new Error('Missing required environment variables');
}


/**
 * Analyzes a migration ZIP file by:
 * 1. Extracting files from the ZIP.
 * 2. Splitting files into chunks for processing.
 * 3. Sending combined file content to an AI model for migration analysis.
 * 4. Parsing and validating AI response (expects JSON format).
 *
 * @param {Buffer} fileBuffer - The ZIP file buffer to analyze.
 * @returns {Promise<Array>} - Returns an array of migration analysis results.
 * @throws {Error} - If ZIP contains no files or API call fails.
 */

export async function analyzeMigrationZip(fileBuffer) {
    const extractedFiles = extractFilesFromZip(fileBuffer);
    if (extractedFiles.length === 0) {
        throw new Error("ZIP file contains no files for migration analysis.");
    }

    const CHUNK_SIZE = 5;
    const MAX_CONTENT_LENGTH = 5000;
    const allResults = [];

    // Split files into chunks
    const chunks = [];
    for (let i = 0; i < extractedFiles.length; i += CHUNK_SIZE) {
        chunks.push(extractedFiles.slice(i, i + CHUNK_SIZE));
    }

    for (const chunk of chunks) {
        let combinedContent = '';
        for (const file of chunk) {
            let content = file.content;
            if (content.length > MAX_CONTENT_LENGTH) {
                content = content.slice(0, MAX_CONTENT_LENGTH) + '\n// Content truncated\n';
            }
            combinedContent += `File: ${file.name}\n${content}\n\n`;
        }

        const prompt = `${MIGRATION_PROMPT}\n\n${combinedContent}`;

        try {
            const response = await axios.post(apiUrl, {
                model: apiModel,
                messages: [{ role: "user", content: prompt }],
                temperature: 0.2
            }, {
                headers: {
                    Authorization: `Bearer ${apiKey}`,
                    "Content-Type": "application/json"
                },
                timeout: 60000
            });

            const rawText = response.data.choices?.[0]?.message?.content || "";

            // ✅ Extract JSON block
            let jsonBlock = "";
            const match = rawText.match(/```json\s*([\s\S]*?)\s*```/i);
            if (match) {
                jsonBlock = match[1].trim();
            } else {
                const fallbackMatch = rawText.match(/\[[\s\S]*\]/);
                jsonBlock = fallbackMatch ? fallbackMatch[0].trim() : rawText.trim();
            }

            // ✅ Validate JSON start
            if (!jsonBlock.startsWith("[")) {
                allResults.push({
                    error: "AI returned non-JSON format",
                    raw: jsonBlock,
                    suggestion: "Adjust prompt or enforce JSON output."
                });
                continue;
            }

            // ✅ Parse JSON safely
            try {
                const parsed = JSON.parse(jsonBlock);
                if (Array.isArray(parsed)) {
                    allResults.push(...parsed);
                } else {
                    allResults.push(parsed);
                }
            } catch (err) {
                allResults.push({ error: "Failed to parse JSON", raw: jsonBlock });
            }

        } catch (error) {
            allResults.push({
                error: "Failed to connect or parse AI response.",
                details: error.message
            });
        }
    }

    return allResults;
}

