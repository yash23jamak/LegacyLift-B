import AdmZip from 'adm-zip';
import { MIGRATION_PROMPT } from '../utils/prompt.js';
import { GoogleGenAI } from "@google/genai";

import dotenv from 'dotenv';
dotenv.config();

const ai = new GoogleGenAI({
    apiKey: process.env.NODE_GEMINI_API_KEY,
});
/**
 * Analyzes a ZIP file for migration readiness.
 * @param {Buffer} fileBuffer - The uploaded ZIP file buffer.
 * @returns {Promise<Object>} - Migration analysis report.
 */
export async function analyzeMigrationZip(fileBuffer) {
    const zip = new AdmZip(fileBuffer);
    const zipEntries = zip.getEntries();

    const jspFiles = zipEntries
        .map(entry => ({
            name: entry.entryName,
            content: entry.getData().toString("utf-8"),
        }));

    if (jspFiles.length === 0) {
        throw new Error("ZIP file contains no .jsp files for migration analysis.");
    }

    let combinedContent = '';
    for (const file of jspFiles) {
        combinedContent += `File: ${file.name}\n${file.content}\n\n`;
    }

    const prompt = `${MIGRATION_PROMPT}\n\n${combinedContent}`;

    const response = await ai.models.generateContent({
        model: process.env.NODE_GEMINI_MODEL,
        contents: prompt,
    });

    let parsedJson;
    try {
        const cleanedText = response.text
            .replace(/^```json/, '')
            .replace(/```$/, '')
            .replace(/&quot;/g, '"')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&amp;/g, '&')
            .trim();

        parsedJson = JSON.parse(cleanedText);
    } catch (error) {
        parsedJson = {
            error: "AI response could not be parsed as valid JSON.",
            rawResponse: response.text,
            suggestion: "Please check the AI prompt or manually inspect the response format."
        };
    }

    return parsedJson;
}

