import AdmZip from 'adm-zip';
import axios from 'axios';
import {
    ANALYSIS_PROMPT,
    REPO_ANALYSIS_PROMPT,
    ALLOWED_EXTENSIONS,
    checkRepoForJsp
} from '../utils/prompt.js';
import dotenv from 'dotenv';
dotenv.config();

const apiUrl = process.env.API_URL;
const apiKey = process.env.API_KEY;
const apiModel = process.env.AI_MODAL;

/**
 * Analyzes the contents of a ZIP file to extract and evaluate JSP-based project files.
 * @param {Buffer} fileBuffer - The uploaded ZIP file buffer.
 * @returns {Object} - The AI-generated analysis report.
 */
export async function analyzeZipFile(fileBuffer) {
    const zip = new AdmZip(fileBuffer);
    const zipEntries = zip.getEntries();

    const files = zipEntries
        .filter(entry => !entry.isDirectory && ALLOWED_EXTENSIONS.some(ext => entry.entryName.endsWith(ext)))
        .map(entry => ({
            name: entry.entryName,
            content: entry.getData().toString('utf-8')
        }));

    if (files.length === 0) {
        throw new Error("ZIP file contains no allowed file types.");
    }

    const hasJsp = files.some(file => file.name.endsWith('.jsp'));
    if (!hasJsp) {
        throw new Error("The uploaded ZIP file does not contain any JSP files. Please upload a valid JSP-based project.");
    }

    let combinedContent = '';
    for (const file of files) {
        if ((combinedContent.length + file.content.length) > 100000) break;
        combinedContent += `File: ${file.name}\n${file.content}\n\n`;
    }

    const prompt = `${ANALYSIS_PROMPT} : \n\n${combinedContent}`;
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
async function sendToAI(prompt) {
    const response = await axios.post(apiUrl, {
        model: apiModel,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.2
    }, {
        headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
            "HTTP-Referer": "http://localhost:8080",
            "X-Title": "Analyzer"
        }
    });

    const resultContent = response.data.choices?.[0]?.message?.content || "Analysis failed.";
    const match = resultContent.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    const jsonBlock = match ? match[1].trim() : resultContent.trim();

    try {
        return JSON.parse(jsonBlock);
    } catch {
        return { error: "Failed to parse analysis report", raw: resultContent };
    }
}