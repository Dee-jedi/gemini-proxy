require('dotenv').config();
const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const cors = require('cors');

const app = express();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Enhanced middleware setup
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

// Request validation middleware
app.use((req, res, next) => {
  if (req.method === 'POST' && !req.is('application/json')) {
    return res
      .status(415)
      .json({ error: 'Content-Type must be application/json' });
  }
  next();
});

// Robust chat endpoint
app.post('/chat', async (req, res) => {
  try {
    console.log('Incoming request body:', req.body);

    if (!req.body || typeof req.body !== 'object') {
      return res.status(400).json({ error: 'Invalid request format' });
    }

    const { message } = req.body;
    if (!message || typeof message !== 'string') {
      return res
        .status(400)
        .json({ error: 'Message must be a non-empty string' });
    }

    console.log('Initializing Gemini model...');
    const model = genAI.getGenerativeModel({
      model: 'gemini-pro', // Use the correct model name
    });

    console.log('Sending to Gemini:', message.substring(0, 50) + '...');
    const result = await model.generateContent(message); // Simplified call

    const response = await result.response;
    const text = response.text();
    console.log('Received response from Gemini');

    return res.json({ text });
  } catch (error) {
    console.error('Full Error:', {
      message: error.message,
      stack: error.stack,
      request: {
        headers: req.headers,
        body: req.body,
      },
    });

    return res.status(500).json({
      error: 'AI processing failed',
      details:
        process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});
