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

// Regular chat endpoint
app.post('/chat', async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) return res.status(400).json({ error: 'No message provided' });

    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-pro-latest',
    });

    const result = await model.generateContent(message);
    const response = await result.response;

    res.json({ text: response.text() });
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({
      error: 'AI request failed',
      details:
        process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

// Streaming endpoint
app.post('/chat-stream', async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) return res.status(400).json({ error: 'No message provided' });

    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-pro-latest',
    });

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const result = await model.generateContentStream(message);
    let fullText = '';

    for await (const chunk of result.stream) {
      const chunkText = chunk.text();
      fullText += chunkText;
      res.write(`data: ${JSON.stringify({ text: fullText })}\n\n`);
    }

    res.end();
  } catch (error) {
    console.error('Stream Error:', error);
    res.status(500).end();
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
