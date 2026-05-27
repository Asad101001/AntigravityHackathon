/**
 * speechRoutes.js — Voice / Speech-to-Text endpoints for Asaaniyat
 *
 * POST /api/speech-to-text
 *   Accepts base64-encoded audio and transcribes it using Google Gemini
 *   multimodal API. Supports English, Urdu, and Roman Urdu.
 *
 * The Gemini model receives the audio and a system prompt instructing it
 * to transcribe the voice into a natural service request — exactly the
 * kind of text the IntentParser agent expects.
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

    const geminiKey = process.env.GEMINI_API_KEY;
    if (!geminiKey) {
      // Fallback: return a demo transcription so the app always works
      console.warn('[SpeechRoutes] No GEMINI_API_KEY — returning demo transcription');
      return res.json({
        success: true,
        text: 'I need a plumber in Gulshan to fix a leaking pipe',
        language: 'en',
        confidence: 'demo',
        demo_mode: true,
      });
    }

    // ── Call Gemini multimodal API for transcription ────────────────────────
    const resolvedMime = resolveMimeType(mime_type);
    
    const systemPrompt = [
      'You are a speech-to-text transcription system for a home services app called Asaaniyat, operating in Pakistan.',
      'The user speaks in English, Urdu, or Roman Urdu (Urdu written in Latin script).',
      '',
      'INSTRUCTIONS:',
      '1. Transcribe the audio accurately, preserving the original language used.',
      '2. If the user speaks in Urdu, transliterate it to Roman Urdu (Latin script) so it can be processed by our text pipeline.',
      '3. If the audio is unclear or contains no speech, respond with exactly: [NO_SPEECH]',
      '4. Output ONLY the transcription text, nothing else. No quotes, no labels, no explanations.',
      '5. Common service types: electrician, plumber, AC repair, carpenter, painter, handyman, cleaning, mechanic, pest control, appliance repair, sanitization, gardening.',
      '6. Common locations: Gulshan, DHA, Clifton, North Nazimabad, F-8, G-9, Bahria Town, Model Town, Johar Town, Blue Area, Saddar.',
    ].join('\n');

    const requestBody = {
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents: [
        {
          role: 'user',
          parts: [
            {
              inlineData: {
                mimeType: resolvedMime,
                data: audio_base64,
              },
            },
            {
              text: 'Transcribe this audio. Output only the text the person said.',
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 256,
        candidateCount: 1,
      },
    };

    const geminiModel = 'gemini-1.5-flash';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${geminiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errBody = await response.json().catch(() => ({}));
      console.error('[SpeechRoutes] Gemini error:', response.status, errBody);

      // If rate limited, return a helpful message
      if (response.status === 429) {
        return res.status(429).json({
          success: false,
          error: 'Voice transcription is temporarily rate limited. Please try again in a moment.',
        });
      }

      return res.status(502).json({
        success: false,
        error: 'Voice transcription service temporarily unavailable',
        details: errBody?.error?.message,
      });
    }

    const data = await response.json();
    const transcribedText = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

    if (!transcribedText || transcribedText === '[NO_SPEECH]') {
      return res.json({
        success: false,
        error: 'No speech detected. Please try again and speak clearly.',
        text: '',
      });
    }

    // Detect likely language
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
  // Map common mobile recording types to what Gemini expects
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
