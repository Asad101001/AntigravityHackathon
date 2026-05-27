/**
 * voiceRecorder.js — Microphone recording utility for Asaaniyat
 *
 * Uses expo-av to record audio from the device microphone.
 * Returns the audio as a base64 string that can be sent to the
 * backend speech-to-text endpoint.
 *
 * Usage:
 *   import { startRecording, stopRecording, requestMicPermission } from '../lib/voiceRecorder';
 *
 *   const hasPermission = await requestMicPermission();
 *   if (!hasPermission) return;
 *
 *   await startRecording();
 *   // ... user speaks ...
 *   const { base64, uri, durationMs } = await stopRecording();
 */

import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';

let _recording = null;
let _isRecording = false;

/**
 * Request microphone permission from the user.
 * @returns {Promise<boolean>} true if permission was granted.
 */
export async function requestMicPermission() {
  try {
    const { status } = await Audio.requestPermissionsAsync();
    return status === 'granted';
  } catch (err) {
    console.warn('[VoiceRecorder] Permission request failed:', err.message);
    return false;
  }
}

/**
 * Start a new audio recording.
 * If a previous recording is in progress it will be stopped first.
 */
export async function startRecording() {
  // Cleanup any existing recording
  if (_recording) {
    try {
      await _recording.stopAndUnloadAsync();
    } catch (_) {}
    _recording = null;
  }

  // Configure audio mode for recording
  await Audio.setAudioModeAsync({
    allowsRecordingIOS: true,
    playsInSilentModeIOS: true,
    staysActiveInBackground: false,
  });

  // Create recording with high-quality preset optimised for speech
  const { recording } = await Audio.Recording.createAsync(
    {
      isMeteringEnabled: true,
      android: {
        extension: '.m4a',
        outputFormat: Audio.AndroidOutputFormat.MPEG_4,
        audioEncoder: Audio.AndroidAudioEncoder.AAC,
        sampleRate: 16000,
        numberOfChannels: 1,
        bitRate: 64000,
      },
      ios: {
        extension: '.m4a',
        outputFormat: Audio.IOSOutputFormat.MPEG4AAC,
        audioQuality: Audio.IOSAudioQuality.HIGH,
        sampleRate: 16000,
        numberOfChannels: 1,
        bitRate: 64000,
      },
      web: {
        mimeType: 'audio/webm',
        bitsPerSecond: 64000,
      },
    },
    // Status update callback for metering (UI can poll _recording.getStatusAsync())
    null,
    100 // update interval ms
  );

  _recording = recording;
  _isRecording = true;
}

/**
 * Stop the current recording and return the audio data.
 * @returns {Promise<{ base64: string, uri: string, durationMs: number }>}
 */
export async function stopRecording() {
  if (!_recording) {
    throw new Error('[VoiceRecorder] No recording in progress');
  }

  _isRecording = false;
  const status = await _recording.getStatusAsync();
  const durationMs = status.durationMillis || 0;

  await _recording.stopAndUnloadAsync();

  // Reset audio mode
  await Audio.setAudioModeAsync({
    allowsRecordingIOS: false,
    playsInSilentModeIOS: false,
  });

  const uri = _recording.getURI();
  _recording = null;

  if (!uri) {
    throw new Error('[VoiceRecorder] Recording URI is null');
  }

  // Read file as base64
  const base64 = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });

  return { base64, uri, durationMs };
}

/**
 * Cancel the current recording without saving.
 */
export async function cancelRecording() {
  if (_recording) {
    try {
      await _recording.stopAndUnloadAsync();
    } catch (_) {}
    _recording = null;
    _isRecording = false;
  }
  await Audio.setAudioModeAsync({
    allowsRecordingIOS: false,
    playsInSilentModeIOS: false,
  });
}

/**
 * @returns {boolean} whether a recording is currently active
 */
export function isCurrentlyRecording() {
  return _isRecording;
}

/**
 * Get the current recording's metering level (for waveform visualization).
 * @returns {Promise<number|null>} dB metering value or null
 */
export async function getMeteringLevel() {
  if (!_recording || !_isRecording) return null;
  try {
    const status = await _recording.getStatusAsync();
    return status.metering ?? null;
  } catch {
    return null;
  }
}
