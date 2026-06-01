import { useCallback, useEffect, useRef, useState } from 'react';
import { Audio } from 'expo-av';

import { transcribeAudioUri } from './speechToText';

const AUTO_STOP_MS = 30000;

export default function useVoiceInput({ onTranscript } = {}) {
  const [status, setStatus] = useState('idle');
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState('');

  const recordingRef = useRef(null);
  const stopTimerRef = useRef(null);
  const statusRef = useRef(status);

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  const clearTimer = useCallback(() => {
    if (stopTimerRef.current) {
      clearTimeout(stopTimerRef.current);
      stopTimerRef.current = null;
    }
  }, []);

  const resetVoiceState = useCallback(() => {
    clearTimer();
    recordingRef.current = null;
    setTranscript('');
    setError('');
    setStatus('idle');
  }, [clearTimer]);

  useEffect(() => () => {
    clearTimer();
    const recording = recordingRef.current;
    recordingRef.current = null;
    if (recording) {
      recording.stopAndUnloadAsync().catch(() => {});
    }
  }, [clearTimer]);

  const cancelVoiceInput = useCallback(async () => {
    clearTimer();
    const recording = recordingRef.current;
    recordingRef.current = null;

    if (recording) {
      try {
        await recording.stopAndUnloadAsync();
      } catch (_) {}
    }

    resetVoiceState();
  }, [clearTimer, resetVoiceState]);

  const stopVoiceInput = useCallback(async () => {
    const currentStatus = statusRef.current;
    const recording = recordingRef.current;

    if (currentStatus !== 'recording' && currentStatus !== 'preparing') {
      return null;
    }

    clearTimer();

    if (!recording) {
      resetVoiceState();
      return null;
    }

    setStatus('transcribing');
    let hadError = false;

    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      const recordingStatus = await recording.getStatusAsync();
      console.log(`[useVoiceInput] Recording stopped`);
      console.log(`[useVoiceInput] Recording URI: ${uri}`);
      console.log(`[useVoiceInput] Recording status:`, recordingStatus);
      if (recordingStatus?.durationMillis) {
        console.log(`[useVoiceInput] Duration: ${recordingStatus.durationMillis}ms`);
      }
      recordingRef.current = null;

      const result = await transcribeAudioUri(uri, { languageHint: 'auto' });
      setTranscript(result.text);
      setError('');
      onTranscript?.(result.text, result);
      return result.text;
    } catch (err) {
      const message = err?.message || 'Voice transcription failed.';
      setError(message);
      hadError = true;
      setStatus('error');
      return null;
    } finally {
      try {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          playsInSilentModeIOS: true,
          shouldDuckAndroid: true,
        });
      } catch (_) {}

      if (!hadError) {
        setStatus('idle');
      }
    }
  }, [clearTimer, onTranscript, resetVoiceState]);

  const startVoiceInput = useCallback(async () => {
    if (['preparing', 'recording', 'transcribing'].includes(statusRef.current)) {
      return;
    }

    setError('');
    setTranscript('');
    setStatus('preparing');

    try {
      console.log(`[useVoiceInput] Requesting microphone permission...`);
      const permission = await Audio.requestPermissionsAsync();
      if (permission.status !== 'granted') {
        throw new Error('Microphone permission is required to use voice typing.');
      }

      console.log(`[useVoiceInput] Permission granted, setting up audio mode...`);
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
      });

      const recording = new Audio.Recording();
      console.log(`[useVoiceInput] Preparing recording with HIGH_QUALITY preset...`);
      await recording.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      recordingRef.current = recording;
      
      console.log(`[useVoiceInput] Starting recording...`);
      await recording.startAsync();
      setStatus('recording');
      console.log(`[useVoiceInput] Recording started successfully`);

      clearTimer();
      stopTimerRef.current = setTimeout(() => {
        console.log(`[useVoiceInput] 30-second auto-stop timer triggered`);
        void stopVoiceInput();
      }, AUTO_STOP_MS);
    } catch (err) {
      const message = err?.message || 'Could not start voice typing.';
      console.error(`[useVoiceInput] Error starting recording:`, message);
      setError(message);
      setStatus('error');
      clearTimer();
      recordingRef.current = null;
      try {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          playsInSilentModeIOS: true,
          shouldDuckAndroid: true,
        });
      } catch (_) {}
    }
  }, [clearTimer, stopVoiceInput]);

  return {
    voiceVisible: status !== 'idle',
    voiceStatus: status,
    voiceTranscript: transcript,
    voiceError: error,
    startVoiceInput,
    stopVoiceInput,
    cancelVoiceInput,
    resetVoiceState,
  };
}