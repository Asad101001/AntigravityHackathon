/**
 * speechRoutes.js — Voice / Speech-to-Text endpoints for Asaaniyat
 *
 * POST /api/speech-to-text
 *   Accepts base64-encoded audio and transcribes it using Deepgram's speech-to-text API.
 *   Supports English, Urdu, and Roman Urdu.
 *
 * Deepgram provides literal, accurate speech-to-text transcription using Whisper technology.
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
    console.log(`[SpeechRoutes] Received request`);
    console.log(`[SpeechRoutes] req.body keys:`, Object.keys(req.body || {}));
    
    const { audio_base64, mime_type, language_hint } = req.body;

    console.log(`[SpeechRoutes] audio_base64 type: ${typeof audio_base64}`);
    console.log(`[SpeechRoutes] audio_base64 length: ${audio_base64?.length || 0}`);
    
    if (audio_base64 && typeof audio_base64 === 'string') {
      console.log(`[SpeechRoutes] First 100 chars of audio_base64: ${audio_base64.substring(0, 100)}`);
      console.log(`[SpeechRoutes] Last 100 chars of audio_base64: ${audio_base64.substring(Math.max(0, audio_base64.length - 100))}`);
    }
    
    console.log(`[SpeechRoutes] mime_type: ${mime_type}`);

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

    const deepgramKey = process.env.DEEPGRAM_API_KEY;
    if (!deepgramKey) {
      console.warn('[SpeechRoutes] No DEEPGRAM_API_KEY — returning demo transcription');
      return res.json({
        success: true,
        text: 'the firebase is live',
        language: 'en',
        confidence: 'demo',
        demo_mode: true,
      });
    }

    // ── Convert base64 to binary buffer ────────────────────────
    const audioBuffer = Buffer.from(audio_base64, 'base64');
    const audioSizeKB = (audioBuffer.length / 1024).toFixed(2);
    console.log(`[SpeechRoutes] Audio buffer: ${audioSizeKB} KB`);

    // ── Determine MIME type ────────────────────────
    const resolvedMime = resolveMimeType(mime_type);
    const audioFormat = resolvedMime.split('/')[1]; // e.g., 'mp4', 'webm', etc.

    // ── Determine language hint ────────────────────────
    // Note: Free tier doesn't support language parameters, so we skip this
    // Deepgram will auto-detect the language

    // ── Call Deepgram API for transcription ────────────────────────────────
    const deepgramUrl = `https://api.deepgram.com/v1/listen?model=general`;

    console.log(`[SpeechRoutes] Starting Deepgram request (mime: ${resolvedMime})...`);
    const startTime = Date.now();

    const response = await fetch(deepgramUrl, {
      method: 'POST',
      headers: {
        Authorization: `Token ${deepgramKey}`,
        'Content-Type': resolvedMime,
      },
      body: audioBuffer,
    });

    const elapsed = Date.now() - startTime;
    console.log(`[SpeechRoutes] Deepgram response received after ${elapsed}ms`);

    if (!response.ok) {
      const errBody = await response.text().catch(() => '');
      console.error('[SpeechRoutes] Deepgram error:', response.status, errBody);

      return res.status(502).json({
        success: false,
        error: 'Voice transcription service temporarily unavailable',
        details: errBody,
      });
    }

    const data = await response.json();
    
    console.log(`[SpeechRoutes] Deepgram response:`, JSON.stringify(data, null, 2));
    
    // Extract transcript from Deepgram response
    let transcribedText = null;
    if (data?.results?.channels?.[0]?.alternatives?.[0]?.transcript) {
      transcribedText = data.results.channels[0].alternatives[0].transcript.trim();
    }

    if (!transcribedText) {
      return res.json({
        success: false,
        error: 'No speech detected. Please try again and speak clearly.',
        text: '',
      });
    }

    // Detect likely language from the transcribed text
    const detectedLanguage = detectLanguage(transcribedText);

    console.log(`[SpeechRoutes] Transcribed (${detectedLanguage}): "${transcribedText}"`);

    return res.json({
      success: true,
      text: transcribedText,
      language: detectedLanguage,
      confidence: 'high',
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

function resolveMimeType(mime) {
  if (!mime) return 'audio/mp4';
  const lower = mime.toLowerCase();
  if (lower.includes('m4a') || lower.includes('mp4') || lower.includes('aac')) return 'audio/mp4';
  if (lower.includes('webm')) return 'audio/webm';
  if (lower.includes('wav')) return 'audio/wav';
  if (lower.includes('ogg')) return 'audio/ogg';
  if (lower.includes('flac')) return 'audio/flac';
  return 'audio/mp4';
}

function detectLanguage(text) {
  // Simple heuristic: check for Urdu script characters
  const urduPattern = /[\u0600-\u06FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
  if (urduPattern.test(text)) return 'ur';

  // Check for common Roman Urdu patterns
  const romanUrduPatterns = [
    /\bmujhe\b/i, /\bkaam\b/i, /\bchaiye\b/i, /\bkaro\b/i,
    /\bplumber\s+chahiye\b/i, /\bbijli\b/i, /\bpaani\b/i,
    /\bmeray\b/i, /\bghar\b/i, /\bmein\b/i, /\bhai\b/i,
    /\bwala\b/i, /\bkarwana\b/i, /\bbanwana\b/i,
  ];
  const romanUrduScore = romanUrduPatterns.filter((p) => p.test(text)).length;
  if (romanUrduScore >= 2) return 'ur-roman';

  return 'en';
}

module.exports = router;
