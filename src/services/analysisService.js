import AdmZip from 'adm-zip';
import axios from 'axios';
import { MIGRATION_PROMPT } from '../utils/prompt.js';
import { GoogleGenAI } from "@google/genai";

import {
    ANALYSIS_PROMPT,
    REPO_ANALYSIS_PROMPT,
    ALLOWED_EXTENSIONS,
    checkRepoForJsp
} from '../utils/prompt.js';
import dotenv from 'dotenv';
dotenv.config();

const apiUrl = process.env.NODE_API_URL;
const apiKey = process.env.NODE_API_KEY;
const apiModel = process.env.NODE_AI_MODAL;

if (!apiUrl || !apiKey || !apiModel) {
    throw new Error('Missing required environment variables');
}
/**
 * Analyzes the contents of a ZIP file to extract and evaluate JSP-based project files.
 * @param {Buffer} fileBuffer - The uploaded ZIP file buffer.
 * @returns {Object} - The AI-generated analysis report.
 */
export async function analyzeZipFile(fileBuffer) {
    const zip = new AdmZip(fileBuffer);
    const zipEntries = zip.getEntries();

    const files = zipEntries
        .filter(entry =>
            !entry.isDirectory &&
            ALLOWED_EXTENSIONS.some(ext => entry.entryName.toLowerCase().endsWith(ext))
        )
        .map(entry => ({
            name: entry.entryName,
            content: entry.getData().toString('utf-8')
        }));

    if (files.length === 0) {
        throw new Error("ZIP file contains no allowed file types.");
    }

    const hasJsp = files.some(file => file.name.toLowerCase().endsWith('.jsp'));
    if (!hasJsp) {
        throw new Error("The uploaded ZIP file does not contain any JSP files. Please upload a valid JSP-based project.");
    }

    let combinedContent = '';
    for (const file of files) {
        combinedContent += `File: ${file.name}\n${file.content}\n\n`;
    }

    const prompt = `${ANALYSIS_PROMPT}:\n\n${combinedContent}`;
    return await sendToAI(prompt);
}

/**
 * Analyzes a remote repository to check if it contains JSP files and generates an AI-based report.
 * @param {string} repoUrl - The URL of the repository to analyze.
 * @returns {Object} - The AI-generated analysis report.
 */
export async function analyzeRepo(repoUrl) {
    if (!repoUrl || typeof repoUrl !== 'string') {
        throw new Error("Repository URL is missing or invalid.");
    }

    // ✅ Sanitize the URL to avoid trailing slashes or .git suffix
    const sanitizedUrl = repoUrl.trim().replace(/\.git$/, '').replace(/\/$/, '');

    const containsJsp = await checkRepoForJsp(sanitizedUrl);
    if (!containsJsp) {
        throw new Error("The repository does not contain any JSP files. Please ensure you are uploading a valid JSP-based project.");
    }

    const prompt = REPO_ANALYSIS_PROMPT(sanitizedUrl);
    return await sendToAI(prompt);
}

/**
 * Sends a prompt to the AI model and returns the parsed JSON response.
 * @param {string} prompt - The prompt string to send to the AI model.
 * @returns {Object} - Parsed JSON response from the AI or raw content if parsing fails.
 */
export async function sendToAI(prompt) {
    const MAX_RAW_LENGTH = 200000;
    try {
        const response = await axios.post(apiUrl, {
            model: apiModel,
            messages: [{ role: "user", content: prompt }],
            temperature: 0.2
        }, {
            headers: {
                Authorization: `Bearer ${apiKey}`,
                "Content-Type": "application/json"
            }
        });

        const resultContent = response.data.choices?.[0]?.message?.content || "Analysis failed.";
        const match = resultContent.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
        const jsonBlock = match ? match[1].trim() : resultContent.trim();

        try {
            return JSON.parse(jsonBlock);
        } catch (parseError) {
            return {
                error: "Failed to parse analysis report",
                raw: resultContent.slice(0, MAX_RAW_LENGTH) + (resultContent.length > MAX_RAW_LENGTH ? '... [truncated]' : '')
            };
        }

    } catch (err) {
        return {
            error: "Failed to connect to AI service.",
            details: err.message
        };
    }
}

// *******Gemini AI*******
const ai = new GoogleGenAI({
    apiKey: process.env.NODE_GEMINI_API_KEY,
});

/**
 * Extracts all files from a ZIP buffer and returns their names and contents.
 * @param {Buffer} fileBuffer
 * @returns {Array<{name: string, content: string}>}
 */
export function extractFilesFromZip(fileBuffer) {
    const zip = new AdmZip(fileBuffer);
    const zipEntries = zip.getEntries();

    return zipEntries.map(entry => ({
        name: entry.entryName,
        content: entry.getData().toString("utf-8"),
    }));
}

/**
 * Uses Gemini AI to transform extracted ZIP files into React-compatible format.
 * Returns a list of files with name and content.
 * @param {Buffer} fileBuffer
 * @returns {Promise<Array<{name: string, content: string}>>}
 */
// *********With Chunk *********
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

            let rawText = response.text;

            // Remove Markdown code block markers
            rawText = rawText.replace(/^```json/, '').replace(/```$/, '').trim();

            // Try parsing directly first
            try {
                const parsedJson = JSON.parse(rawText);
                if (Array.isArray(parsedJson)) {
                    allResults.push(...parsedJson);
                    continue;
                }
            } catch (e) {
                // Fallback: escape content manually
                const safeText = rawText
                    .replace(/\\/g, '\\\\') // Escape backslashes
                    .replace(/"/g, '\\"')   // Escape quotes
                    .replace(/\n/g, '\\n'); // Escape newlines

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