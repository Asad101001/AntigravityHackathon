import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';

import apiClient from './apiClient';

export async function transcribeAudioUri(
  uri,
  {
    mimeType = inferMimeTypeFromUri(uri),
    languageHint = 'auto',
  } = {}
) {
  if (!uri) {
    throw new Error('No audio recording found.');
  }

  console.log(`[speechToText] Transcribing audio from: ${uri}`);
  console.log(`[speechToText] MIME type: ${mimeType}`);

  const audioBase64 = await uriToBase64(uri);

  const base64SizeMB = (audioBase64.length / (1024 * 1024)).toFixed(2);
  console.log(`[speechToText] Audio base64 size: ${base64SizeMB} MB`);
  console.log(`[speechToText] Base64 string length: ${audioBase64.length} characters`);
  console.log(`[speechToText] First 100 chars of base64: ${audioBase64.substring(0, 100)}`);
  console.log(`[speechToText] Last 100 chars of base64: ${audioBase64.substring(Math.max(0, audioBase64.length - 100))}`);

  if (audioBase64.length < 100) {
    throw new Error(`Audio too small (${audioBase64.length} bytes). Recording may have failed or no audio detected.`);
  }

  console.log(`[speechToText] Creating request data object...`);
  
  // Log the full request data to understand what's being sent
  const requestData = {
    audio_base64: audioBase64,
    mime_type: mimeType,
  };

  if (languageHint && languageHint !== 'auto') {
    requestData.language_hint = languageHint;
  }
  
  console.log(`[speechToText] Request data object created`);
  console.log(`[speechToText] requestData.audio_base64 type: ${typeof requestData.audio_base64}`);
  console.log(`[speechToText] requestData.audio_base64.length: ${requestData.audio_base64.length}`);
  console.log(`[speechToText] requestData.audio_base64 is same reference as audioBase64: ${requestData.audio_base64 === audioBase64}`);
  
  const jsonString = JSON.stringify(requestData);
  console.log(`[speechToText] JSON stringified length: ${jsonString.length} bytes`);
  console.log(`[speechToText] First 200 chars of JSON string: ${jsonString.substring(0, 200)}`);
  console.log(`[speechToText] Last 100 chars of JSON string: ${jsonString.substring(Math.max(0, jsonString.length - 100))}`);
  
  console.log(`[speechToText] Sending to backend...`);

  const response = await apiClient.post('/speech-to-text', requestData);

  console.log(`[speechToText] Response status:`, response?.status);
  console.log(`[speechToText] Response data:`, response?.data);

  if (!response?.data?.success) {
    const error = new Error(response?.data?.error || 'Voice transcription failed.');
    error.language = response?.data?.language;
    error.script = response?.data?.script;
    throw error;
  }

  const text = response?.data?.text?.trim();
  if (!text) {
    throw new Error('No speech detected. Please try again and speak clearly.');
  }

  return {
    text,
    language: response?.data?.language || 'en',
    demoMode: Boolean(response?.data?.demo_mode),
    script: response?.data?.script || 'latin',
  };
}

async function uriToBase64(uri) {
  if (Platform.OS === 'web') {
    console.log(`[speechToText] Web platform - using fetch + FileReader`);
    const response = await fetch(uri);
    const blob = await response.blob();
    console.log(`[speechToText] Blob size: ${(blob.size / 1024).toFixed(2)} KB`);
    return blobToBase64(blob);
  }

  console.log(`[speechToText] Native platform (${Platform.OS}) - using FileSystem`);
  
  // Check file size before encoding
  try {
    const fileInfo = await FileSystem.getInfoAsync(uri);
    console.log(`[speechToText] File info:`, fileInfo);
    if (fileInfo?.exists) {
      console.log(`[speechToText] File size: ${(fileInfo.size / 1024).toFixed(2)} KB`);
    } else {
      console.error(`[speechToText] File does not exist at URI: ${uri}`);
    }
  } catch (err) {
    console.error(`[speechToText] Could not read file info:`, err.message);
  }
  
  const base64 = await FileSystem.readAsStringAsync(uri, {
    encoding: 'base64',
  });
  console.log(`[speechToText] URI to base64 conversion complete, base64 length: ${base64.length}`);
  console.log(`[speechToText] Decoded file size estimate: ${(base64.length * 0.75 / 1024).toFixed(2)} KB`);
  return base64;
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = String(reader.result || '');
      console.log(`[blobToBase64] FileReader.result type: ${typeof reader.result}`);
      console.log(`[blobToBase64] FileReader.result length: ${reader.result?.length || 0}`);
      console.log(`[blobToBase64] Result string length: ${result.length}`);
      console.log(`[blobToBase64] First 50 chars: ${result.substring(0, 50)}`);
      console.log(`[blobToBase64] Includes comma: ${result.includes(',')}`);
      
      const base64Part = result.includes(',') ? result.split(',')[1] : result;
      console.log(`[blobToBase64] Extracted base64 length: ${base64Part.length}`);
      console.log(`[blobToBase64] First 50 chars of base64: ${base64Part.substring(0, 50)}`);
      
      resolve(base64Part);
    };
    reader.onerror = reject;
    console.log(`[blobToBase64] Starting FileReader.readAsDataURL for blob of ${blob.size} bytes`);
    reader.readAsDataURL(blob);
  });
}

function inferMimeTypeFromUri(uri) {
  if (!uri) {
    return Platform.OS === 'web' ? 'audio/webm' : 'audio/mp4';
  }

  const cleanUri = uri.split('?')[0].toLowerCase();

  if (cleanUri.endsWith('.webm')) return 'audio/webm';
  if (cleanUri.endsWith('.ogg')) return 'audio/ogg';
  if (cleanUri.endsWith('.wav')) return 'audio/wav';
  if (cleanUri.endsWith('.flac')) return 'audio/flac';
  if (cleanUri.endsWith('.aac')) return 'audio/aac';
  if (cleanUri.endsWith('.m4a') || cleanUri.endsWith('.mp4') || cleanUri.endsWith('.3gp')) return 'audio/mp4';

  return Platform.OS === 'web' ? 'audio/webm' : 'audio/mp4';
}