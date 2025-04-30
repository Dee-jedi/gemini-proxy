require('dotenv').config();
const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const cors = require('cors');

const app = express();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Enhanced CORS configuration
app.use(
  cors({
    origin: '*',
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Accept'],
    credentials: true,
  })
);

// Pre-flight requests
app.options('*', cors());

// Middleware
app.use(
  express.json({
    verify: (req, res, buf) => {
      try {
        JSON.parse(buf.toString());
      } catch (e) {
        res.status(400).json({ error: 'Invalid JSON format' });
      }
    },
    limit: '10kb',
  })
);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'Gemini AI Proxy',
  });
});

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

    res.json({
      text: response.text(),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({
      error: 'AI request failed',
      details:
        process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

// Streaming endpoint with enhanced error handling
app.post('/chat-stream', async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) {
      res.write('event: error\ndata: {"error":"No message provided"}\n\n');
      return res.end();
    }

    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-pro-latest',
    });

    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const result = await model.generateContentStream(message);
    let fullText = '';

    try {
      for await (const chunk of result.stream) {
        const chunkText = chunk.text();
        fullText += chunkText;
        res.write(`data: ${JSON.stringify({ text: fullText })}\n\n`);
        // Flush the response if supported
        if (typeof res.flush === 'function') res.flush();
      }
    } catch (streamError) {
      console.error('Stream interrupted:', streamError);
      res.write('event: error\ndata: {"error":"Stream interrupted"}\n\n');
    }

    res.end();
  } catch (error) {
    console.error('Endpoint error:', error);
    res.write(
      `event: error\ndata: ${JSON.stringify({
        error: 'AI processing failed',
        details:
          process.env.NODE_ENV === 'development' ? error.message : undefined,
      })}\n\n`
    );
    res.end();
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});
