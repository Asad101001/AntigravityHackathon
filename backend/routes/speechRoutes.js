/**
 * speechRoutes.js — Voice / Speech-to-Text endpoints for Asaaniyat
 *
 * POST /api/speech-to-text
 *   Accepts base64-encoded audio and transcribes it using Groq Whisper API.
 *   Supports English, Urdu, and Roman Urdu.
 *
 * Groq Whisper provides fast, accurate speech-to-text transcription.
 */

const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/requireAuth');

router.use(requireAuth);

// ═══════════════════════════════════════════════════════════════
// POST /api/speech-to-text
// Body: { audio_base64: string, mime_type?: string, language_hint?: string }
// ═══════════════════════════════════════════════════════════════
router.post('/speech-to-text', async (req, res) => {
  try {
    const { audio_base64, mime_type, language_hint } = req.body;

    if (!audio_base64 || typeof audio_base64 !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'audio_base64 is required and must be a base64-encoded string',
      });
    }

    // Validate size — reject anything over ~5 MB base64 (≈3.75 MB raw audio)
    if (audio_base64.length > 5 * 1024 * 1024) {
      return res.status(413).json({
        success: false,
        error: 'Audio file too large. Please keep recordings under 30 seconds.',
      });
    }

    const groqKey = process.env.GROQ_API_KEY;
    if (!groqKey) {
      console.warn('[SpeechRoutes] No GROQ_API_KEY — returning demo transcription');
      return res.json({
        success: true,
        text: 'the firebase is live',
        language: 'en',
        confidence: 'demo',
        demo_mode: true,
      });
    }

    // ── Convert base64 to buffer ────────────────────────
    const audioBuffer = Buffer.from(audio_base64, 'base64');
    const audioSizeKB = (audioBuffer.length / 1024).toFixed(2);
    console.log(`[SpeechRoutes] Audio buffer: ${audioSizeKB} KB`);

    // ── Determine file extension from MIME type ────────────────────────
    const fileExtension = getFileExtensionFromMime(mime_type);

    // ── Call Groq Whisper API for transcription ────────────────────────────────
    const groqUrl = `https://api.groq.com/openai/v1/audio/transcriptions`;

    console.log(`[SpeechRoutes] Starting Groq Whisper request...`);
    const startTime = Date.now();

    let response;
    let lastError;
    const maxRetries = 2;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        // Manual multipart body construction
        const boundary = '----FormBoundary' + Math.random().toString(36).substr(2, 9);
        
        let body = '';
        body += `--${boundary}\r\n`;
        body += `Content-Disposition: form-data; name="file"; filename="audio.${fileExtension}"\r\n`;
        body += `Content-Type: ${mime_type || 'application/octet-stream'}\r\n\r\n`;
        
        const headerBytes = Buffer.from(body);
        const modelPart = `\r\n--${boundary}\r\nContent-Disposition: form-data; name="model"\r\n\r\nwhisper-large-v3-turbo`;
        
        // Only force Urdu when the hint is explicit. Otherwise let Whisper auto-detect.
        const langHint = String(language_hint || '').toLowerCase().trim();
        const whisperLang = /(^|[,_\s-])(ur|urdu|roman_urdu|romanurdu|hinglish|hi|hindi)([,_\s-]|$)/i.test(langHint)
          ? 'ur'
          : null;
        const languagePart = whisperLang
          ? `\r\n--${boundary}\r\nContent-Disposition: form-data; name="language"\r\n\r\n${whisperLang}`
          : '';
        
        const footer = Buffer.from(`\r\n--${boundary}--\r\n`);
        
        const fullBody = Buffer.concat([
          headerBytes,
          audioBuffer,
          Buffer.from(modelPart),
          Buffer.from(languagePart),
          footer,
        ]);

        response = await fetch(groqUrl, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${groqKey}`,
            'Content-Type': `multipart/form-data; boundary=${boundary}`,
            'Content-Length': fullBody.length.toString(),
          },
          body: fullBody,
        });
        
        if (response.ok || (response.status !== 503 && response.status !== 429)) {
          break; // Success or non-retriable error
        }
        
        // 503 or 429 error - retry with backoff
        if (attempt < maxRetries) {
          const delayMs = Math.pow(2, attempt) * 1000;
          console.log(`[SpeechRoutes] Groq error ${response.status} - retrying in ${delayMs}ms...`);
          await new Promise(resolve => setTimeout(resolve, delayMs));
        }
      } catch (err) {
        lastError = err;
        if (attempt < maxRetries) {
          const delayMs = Math.pow(2, attempt) * 1000;
          console.log(`[SpeechRoutes] Request failed - retrying in ${delayMs}ms...`);
          await new Promise(resolve => setTimeout(resolve, delayMs));
        }
      }
    }

    const elapsed = Date.now() - startTime;
    console.log(`[SpeechRoutes] Groq response received after ${elapsed}ms`);

    if (!response.ok) {
      const errBody = await response.json().catch(() => ({}));
      console.error('[SpeechRoutes] Groq error:', response.status, errBody);

      return res.status(502).json({
        success: false,
        error: 'Voice transcription service temporarily unavailable',
        details: errBody?.error?.message,
      });
    }

    const data = await response.json();
    let transcribedText = data?.text?.trim();

    if (!transcribedText) {
      return res.json({
        success: false,
        error: 'No speech detected. Please try again and speak clearly.',
        text: '',
      });
    }

    // Check if output is in Devanagari script (Hindi)
    const devanagariPattern = /[\u0900-\u097F]/;
    if (devanagariPattern.test(transcribedText)) {
      console.log(`[SpeechRoutes] Detected Devanagari script, converting to Roman Urdu...`);
      transcribedText = await convertDevanagariToHinglish(transcribedText);
      if (devanagariPattern.test(transcribedText)) {
        return res.json({
          success: false,
          error: 'Hindi script is not supported. Please retry in Roman Urdu or Urdu.',
          text: '',
          language: 'blocked_devanagari',
          script: 'blocked_devanagari',
        });
      }
    }

    // Detect likely language from the transcribed text
    const detectedLanguage = detectLanguage(transcribedText);

    console.log(`[SpeechRoutes] Transcribed (${detectedLanguage}): "${transcribedText}"`);

    return res.json({
      success: true,
      text: transcribedText,
      language: detectedLanguage,
      confidence: 'high',
      script: /[\u0600-\u06FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(transcribedText) ? 'urdu' : 'latin',
    });
  } catch (error) {
    console.error('[SpeechRoutes] Speech-to-text error:', error);
    return res.status(500).json({
      success: false,
      error: 'Voice transcription failed',
      message: error.message,
    });
  }
});

// ── Helpers ─────────────────────────────────────────────────────────────────

function getFileExtensionFromMime(mimeType) {
  if (!mimeType) return 'webm';
  const lower = mimeType.toLowerCase();
  if (lower.includes('webm')) return 'webm';
  if (lower.includes('mp4') || lower.includes('aac') || lower.includes('m4a')) return 'mp4';
  if (lower.includes('wav')) return 'wav';
  if (lower.includes('ogg')) return 'ogg';
  if (lower.includes('flac')) return 'flac';
  return 'webm';
}

function detectLanguage(text) {
  // Check for Urdu/Hindi script characters
  const urduScriptPattern = /[\u0600-\u06FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
  const devanagariPattern = /[\u0900-\u097F]/;
  
  if (urduScriptPattern.test(text) || devanagariPattern.test(text)) {
    return 'ur'; // Urdu or Hindi script detected
  }

  // Check for common Hinglish/Roman Urdu patterns
  const hinglishPatterns = [
    /\bmujhe\b/i, /\bkaam\b/i, /\bchaiye\b/i, /\bkaro\b/i,
    /\bplumber\s+chahiye\b/i, /\bbijli\b/i, /\bpaani\b/i,
    /\bmeray\b/i, /\bghar\b/i, /\bmein\b/i, /\bhai\b/i,
    /\bwala\b/i, /\bkarwana\b/i, /\bbanwana\b/i, /\bacha\b/i,
    /\bthik\b/i, /\btheek\b/i, /\bbaat\b/i, /\bnahin\b/i, /\bnahi\b/i,
  ];
  const englishMarkers = [/\b(the|and|is|are|please|need|book|booking|today|tomorrow|now|here|want)\b/i];
  const hinglishScore = hinglishPatterns.filter((p) => p.test(text)).length;
  const englishScore = englishMarkers.filter((p) => p.test(text)).length;

  if (hinglishScore >= 3) return 'ur'; // Strong Roman Urdu signal
  if (hinglishScore >= 1 && englishScore >= 1) return 'mixed';
  
  return 'en'; // Default to English
}

// Use Gemini to transliterate Devanagari (Hindi script) to Hinglish (Roman Urdu)
async function convertDevanagariToHinglish(devanagariText) {
  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey) {
    console.warn('[convertDevanagariToHinglish] No GEMINI_API_KEY, using basic transliteration');
    return basicDevanagariToRoman(devanagariText);
  }

  try {
    const prompt = `Convert this Devanagari/Hindi text to Roman Urdu (Hinglish - Urdu written in Latin letters). 
Output ONLY the converted text, nothing else.

Text to convert: "${devanagariText}"`;

    const requestBody = {
      contents: [
        {
          role: 'user',
          parts: [{ text: prompt }],
        },
      ],
      generationConfig: {
        temperature: 0,
        maxOutputTokens: 256,
      },
    };

    const geminiModel = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${geminiKey}`;

    let response;
    let lastError;
    const maxRetries = 2;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        });

        if (response.ok || response.status !== 503) {
          break; // Success or non-retriable error
        }

        // 503 error - retry with backoff
        if (attempt < maxRetries) {
          const delayMs = Math.pow(2, attempt) * 1000;
          console.log(`[convertDevanagariToHinglish] Gemini 503 - retrying in ${delayMs}ms...`);
          await new Promise(resolve => setTimeout(resolve, delayMs));
        }
      } catch (err) {
        lastError = err;
        if (attempt < maxRetries) {
          const delayMs = Math.pow(2, attempt) * 1000;
          console.log(`[convertDevanagariToHinglish] Request failed - retrying in ${delayMs}ms...`);
          await new Promise(resolve => setTimeout(resolve, delayMs));
        }
      }
    }

    if (!response.ok) {
      console.error('[convertDevanagariToHinglish] Gemini error:', response.status);
      return basicDevanagariToRoman(devanagariText); // Fallback to deterministic transliteration
    }

    const data = await response.json();
    const convertedText = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

    if (convertedText) {
      console.log(`[convertDevanagariToHinglish] Converted: "${devanagariText}" → "${convertedText}"`);
      return convertedText;
    }

    return basicDevanagariToRoman(devanagariText);
  } catch (error) {
    console.error('[convertDevanagariToHinglish] Error:', error.message);
    return basicDevanagariToRoman(devanagariText);
  }
}

function basicDevanagariToRoman(text = '') {
  const { transliterateDevanagariBasic } = require('../utils/languageStyle');
  return transliterateDevanagariBasic(text);
}

module.exports = router;
