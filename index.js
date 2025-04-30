require('dotenv').config();
const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const cors = require('cors');

const app = express();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Middleware
app.use(cors());
app.use(
  express.json({
    verify: (req, res, buf) => {
      try {
        JSON.parse(buf.toString());
      } catch (e) {
        throw new Error('Invalid JSON');
      }
    },
    limit: '10kb',
  })
);

// API Endpoint
app.post('/chat', async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) return res.status(400).json({ error: 'No message provided' });

    // CORRECTED MODEL INITIALIZATION
    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-pro-latest', // Updated model name
    });

    // SIMPLIFIED API CALL
    const result = await model.generateContent(message);
    const response = await result.response;

    res.json({ text: response.text() });
  } catch (error) {
    console.error('API Error:', {
      message: error.message,
      stack: error.stack,
      request: req.body,
    });

    res.status(500).json({
      error: 'AI request failed',
      details:
        process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
