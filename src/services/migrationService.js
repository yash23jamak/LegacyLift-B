import { GoogleGenAI } from "@google/genai";
import { MIGRATION_PROMPT, extractFilesFromZip } from "../utils/prompt.js";

const ai = new GoogleGenAI({
    apiKey: process.env.NODE_GEMINI_API_KEY,
});

/**
 * Uses Gemini AI to transform extracted ZIP files into React-compatible format.
 * Returns a list of files with name and content.
 * @param {Buffer} fileBuffer
 * @returns {Promise<Array<{name: string, content: string}>>}
 */
// ********* With Chunk Implementation *********
export async function analyzeMigrationZip(fileBuffer) {
    const extractedFiles = extractFilesFromZip(fileBuffer);
    if (extractedFiles.length === 0) {
        throw new Error("ZIP file contains no files for migration analysis.");
    }

    const CHUNK_SIZE = 5;
    const MAX_CONTENT_LENGTH = 10000;
    const allResults = [];

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
            const response = await ai.models.generateContent({
                model: process.env.NODE_GEMINI_MODEL,
                contents: prompt,
            });

            let rawText = response.text
                .replace(/^```json/, '')
                .replace(/```$/, '')
                .trim();

            try {
                const parsedJson = JSON.parse(rawText);
                if (Array.isArray(parsedJson)) {
                    allResults.push(...parsedJson);
                    continue;
                }
            } catch (e) {
                const safeText = rawText
                    .replace(/\\/g, '\\\\')
                    .replace(/"/g, '\\"')
                    .replace(/\n/g, '\\n');

                try {
                    const parsedJson = JSON.parse(safeText);
                    if (Array.isArray(parsedJson)) {
                        allResults.push(...parsedJson);
                        continue;
                    }
                } catch (finalError) {
                    allResults.push({
                        error: "AI response could not be parsed as valid file list.",
                        rawResponse: rawText,
                        suggestion: "Please check the AI prompt or manually inspect the returned response."
                    });
                }
            }
        } catch (error) {
            allResults.push({
                error: "AI response could not be parsed as valid file list.",
                rawResponse: error?.response?.data || error.message || "No response from AI",
                suggestion: "Please check the AI prompt or manually inspect the returned response."
            });
        }
    }

    return allResults;
}