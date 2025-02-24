require('dotenv').config();
const express = require('express');
const multer = require('multer');
const pdfParse = require('pdf-parse');
const axios = require('axios');
const cors = require('cors');

const app = express();
const port = 5000;

app.use(cors());
app.use(express.json());
app.get("/", (req, res) => {
    res.send("Ollama API Server is Running 🚀");
});


// Configure Multer for PDF uploads
const upload = multer({ storage: multer.memoryStorage() });

let questions = []; // Store AI-generated questions
let answers = [];   // Store user answers

// Upload PDF and generate interview questions
app.post('/upload-pdf', upload.single('file'), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    try {
        const data = await pdfParse(req.file.buffer);
        const extractedText = data.text;

        const response = await axios.post(
            'https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent',
            {
                contents: [{ parts: [{ text: `generate 10 interview questions based on the skills in resume and start with questions directly, dont give any unnecessary text except questions:\n${extractedText}` }] }]
            },
            { headers: { 'Content-Type': 'application/json' }, params: { key: process.env.GEMINI_API_KEY } }
        );

        questions = response.data.candidates[0]?.content?.parts[0]?.text.split("\n") || [];
        res.json({ questions });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error processing file' });
    }
});

// Store user answers
app.post('/submit-answers', (req, res) => {
    answers = req.body.answers;
    res.json({ message: 'Answers received' });
});

// Send answers to Gemini AI for evaluation
app.get('/generate-report', async (req, res) => {
    try {
        const response = await axios.post(
            'https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent',
            {
                contents: [{ parts: [{ text: `Evaluate these answers based on standard interview criteria:\n${answers.join("\n")}` }] }]
            },
            { headers: { 'Content-Type': 'application/json' }, params: { key: process.env.GEMINI_API_KEY } }
        );

        const report = response.data.candidates[0]?.content?.parts[0]?.text || 'No report generated.';
        res.json({ report });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error generating report' });
    }
});

app.listen(port, () => console.log(`Server running on port ${port}`));
