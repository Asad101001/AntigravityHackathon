/**
 * speechToText.js — Speech-to-text service for Asaaniyat
 *
 * Sends recorded audio (base64) to the backend POST /api/speech-to-text
 * which uses Google Gemini's multimodal API to transcribe and understand
 * multilingual voice input (English, Urdu, Roman Urdu).
 */

import apiClient from './apiClient';

/**
 * Transcribe audio to text via backend Gemini multimodal API.
 *
 * @param {{ base64: string, mimeType?: string, languageHint?: string }} params
 * @returns {Promise<{ text: string, language: string, confidence: string }>}
 */
export async function transcribeAudio({ base64, mimeType = 'audio/m4a', languageHint = 'auto' }) {
  if (!base64) {
    throw new Error('[speechToText] base64 audio data is required');
  }

  try {
    const response = await apiClient.post('/speech-to-text', {
      audio_base64: base64,
      mime_type: mimeType,
      language_hint: languageHint,
    }, {
      timeout: 30000, // STT can take a moment
    });

    if (response.data?.success && response.data?.text) {
      return {
        text: response.data.text,
        language: response.data.language || 'unknown',
        confidence: response.data.confidence || 'high',
      };
    }

    throw new Error(response.data?.error || 'Transcription failed');
  } catch (err) {
    // If backend is unreachable, throw a user-friendly error
    if (err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
      throw new Error('Voice transcription timed out. Please try again.');
    }
    if (err.response?.status === 413) {
      throw new Error('Recording too long. Please keep it under 30 seconds.');
    }
    throw new Error(err.response?.data?.error || err.message || 'Voice transcription failed');
  }
}
