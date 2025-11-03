const AdmZip = require('adm-zip');
const axios = require('axios');
const dotenv = require('dotenv');
dotenv.config();
const { ANALYSIS_PROMPT, REPO_ANALYSIS_PROMPT, ALLOWED_EXTENSIONS } = require('../utils/prompt');

const apiUrl = process.env.API_URL;
const apiKey = process.env.API_KEY;
const apiModel = process.env.AI_MODAL;

exports.analyzeProject = async (req, res) => {
    console.log("Received analyze request");

    try {
        let prompt;

        // ✅ Case 1: ZIP file upload
        if (req.file) {
            console.log("Analyzing uploaded ZIP file:", req.file.originalname);

            const zip = new AdmZip(req.file.buffer);
            const zipEntries = zip.getEntries();

            const files = zipEntries
                .filter(entry => !entry.isDirectory && ALLOWED_EXTENSIONS.some(ext => entry.entryName.endsWith(ext)))
                .map(entry => ({
                    name: entry.entryName,
                    content: entry.getData().toString('utf-8')
                }));

            if (files.length === 0) {
                return res.status(400).json({ error: "ZIP file contains no allowed file types." });
            }

            // Limit combined content size
            let combinedContent = '';
            for (const file of files) {
                if ((combinedContent.length + file.content.length) > 100000) break;
                combinedContent += `File: ${file.name}\n${file.content}\n\n`;
            }

            prompt = `${ANALYSIS_PROMPT} : \n\n${combinedContent}`;
        }

        // ✅ Case 2: Repo URL analysis
        else if (req.body.repoUrl) {
            const repoUrl = req.body.repoUrl;
            console.log("Analyzing repository URL:", repoUrl);
            prompt = REPO_ANALYSIS_PROMPT(repoUrl);
        }

        else {
            return res.status(400).json({ error: "Please provide either a ZIP file or a repository URL." });
        }

        // ✅ Send prompt to AI model
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

        // ✅ Extract JSON block
        const match = resultContent.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
        const jsonBlock = match ? match[1].trim() : resultContent.trim();

        let parsedReport;
        try {
            parsedReport = JSON.parse(jsonBlock);
            res.status(200).json({ report: parsedReport });
        } catch (parseError) {
            res.status(200).json({ report: { error: "Failed to parse analysis report", raw: resultContent } });
        }

    } catch (error) {
        const errorMessage = error.response?.data?.error?.message || error.message;
        res.status(error.response?.status || 500).json({ error: "Failed to analyze.", details: errorMessage });
    }
};
