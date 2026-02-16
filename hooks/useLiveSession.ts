import { useState, useRef, useCallback } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { getGeminiApiKey } from '../utils/apiConfig';
import { CandidateProfile, ServiceMode, TranscriptionItem } from '../types';
import { base64ToUint8Array, uint8ArrayToBase64, decodeAudioData } from '../utils/audioUtils';

interface LiveSessionReturn {
  connect: () => Promise<void>;
  disconnect: () => void;
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  transcription: TranscriptionItem[];
  inputVolume: number;
  outputVolume: number;
  streamRef: React.MutableRefObject<MediaStream | null>;
}

export const useLiveSession = (
  profile: CandidateProfile,
  mode: ServiceMode
): LiveSessionReturn => {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transcription, setTranscription] = useState<TranscriptionItem[]>([]);
  const [inputVolume, setInputVolume] = useState(0);
  const [outputVolume, setOutputVolume] = useState(0);

  const sessionRef = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const outputAnalyserRef = useRef<AnalyserNode | null>(null);
  const volumeIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isDisconnectingRef = useRef(false);

  const getSystemPrompt = (): string => {
    const basePrompt = mode === 'recruiter'
      ? `You are a professional technical recruiter conducting a screening interview. Be thorough but professional.`
      : `You are a friendly interview coach helping someone practice. Be encouraging but honest.`;

    return `${basePrompt}

Candidate: ${profile.name}
Role: ${profile.role}
${profile.resumeText ? `Resume Summary: ${profile.resumeText.substring(0, 2000)}` : ''}
${profile.jobDescriptionText ? `Job Description: ${profile.jobDescriptionText.substring(0, 1500)}` : ''}
${profile.customQuestions ? `Custom Questions to Ask: ${profile.customQuestions}` : ''}

Start by greeting the candidate and asking your first question. Ask one question at a time and wait for responses. Keep questions concise.`;
  };

  const connect = useCallback(async () => {
    const apiKey = getGeminiApiKey();
    if (!apiKey) {
      setError('Gemini API key is not configured. Please check your .env.local file.');
      return;
    }

    setIsConnecting(true);
    setError(null);
    isDisconnectingRef.current = false;

    try {
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 16000,
        }
      });
      streamRef.current = stream;

      // Set up audio context
      const audioContext = new AudioContext({ sampleRate: 16000 });
      audioContextRef.current = audioContext;

      const source = audioContext.createMediaStreamSource(stream);

      // Input analyser for volume visualization
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      // Output analyser
      const outputAnalyser = audioContext.createAnalyser();
      outputAnalyser.fftSize = 256;
      outputAnalyserRef.current = outputAnalyser;

      // Volume monitoring interval
      volumeIntervalRef.current = setInterval(() => {
        if (analyserRef.current) {
          const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
          analyserRef.current.getByteFrequencyData(dataArray);
          const avg = dataArray.reduce((sum, val) => sum + val, 0) / dataArray.length;
          setInputVolume(avg / 255);
        }
        if (outputAnalyserRef.current) {
          const dataArray = new Uint8Array(outputAnalyserRef.current.frequencyBinCount);
          outputAnalyserRef.current.getByteFrequencyData(dataArray);
          const avg = dataArray.reduce((sum, val) => sum + val, 0) / dataArray.length;
          setOutputVolume(avg / 255);
        }
      }, 100);

      // Create script processor for capturing audio data
      const processor = audioContext.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;
      source.connect(processor);
      processor.connect(audioContext.destination);

      // Connect to Gemini Live API
      const ai = new GoogleGenAI({ apiKey });
      const session = await ai.live.connect({
        model: 'gemini-2.0-flash-live-001',
        config: {
          responseModalities: [Modality.AUDIO, Modality.TEXT],
          systemInstruction: { parts: [{ text: getSystemPrompt() }] },
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: 'Aoede' }
            }
          }
        },
        callbacks: {
          onopen: () => {
            console.log('Live session connected');
            setIsConnected(true);
            setIsConnecting(false);
          },
          onmessage: (message: LiveServerMessage) => {
            handleServerMessage(message);
          },
          onerror: (err: ErrorEvent) => {
            console.error('Live session error:', err);
            if (!isDisconnectingRef.current) {
              setError('Connection lost. Please try reconnecting.');
            }
          },
          onclose: () => {
            console.log('Live session closed');
            if (!isDisconnectingRef.current) {
              setIsConnected(false);
            }
          },
        }
      });

      sessionRef.current = session;

      // Send audio data to Gemini
      processor.onaudioprocess = (e) => {
        if (!sessionRef.current || isDisconnectingRef.current) return;

        const inputData = e.inputBuffer.getChannelData(0);
        // Convert float32 to int16 PCM
        const pcm16 = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          const s = Math.max(-1, Math.min(1, inputData[i]));
          pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
        }

        const base64 = uint8ArrayToBase64(new Uint8Array(pcm16.buffer));

        try {
          session.sendRealtimeInput({
            media: {
              data: base64,
              mimeType: 'audio/pcm;rate=16000',
            }
          });
        } catch (err) {
          // Silently ignore send errors during disconnect
          if (!isDisconnectingRef.current) {
            console.error('Error sending audio:', err);
          }
        }
      };

    } catch (err: any) {
      console.error('Connection failed:', err);
      setError(
        err.name === 'NotAllowedError'
          ? 'Microphone access was denied. Please allow microphone access and try again.'
          : err.message || 'Failed to connect. Please try again.'
      );
      setIsConnecting(false);
      cleanup();
    }
  }, [profile, mode]);

  const handleServerMessage = useCallback((message: LiveServerMessage) => {
    // Handle text responses
    if (message.serverContent?.modelTurn?.parts) {
      for (const part of message.serverContent.modelTurn.parts) {
        if (part.text) {
          setTranscription(prev => [
            ...prev,
            { speaker: 'ai', text: part.text!, timestamp: Date.now() }
          ]);
        }

        // Handle audio responses
        if (part.inlineData?.data) {
          playAudio(part.inlineData.data);
        }
      }
    }

    // Handle turn completion
    if (message.serverContent?.turnComplete) {
      // Turn is complete, ready for next input
    }
  }, []);

  const playAudio = useCallback(async (base64Audio: string) => {
    if (!audioContextRef.current) return;

    try {
      const audioData = base64ToUint8Array(base64Audio);
      const audioBuffer = await decodeAudioData(audioContextRef.current, audioData);

      const source = audioContextRef.current.createBufferSource();
      source.buffer = audioBuffer;

      if (outputAnalyserRef.current) {
        source.connect(outputAnalyserRef.current);
        outputAnalyserRef.current.connect(audioContextRef.current.destination);
      } else {
        source.connect(audioContextRef.current.destination);
      }

      source.start();
    } catch (err) {
      console.error('Error playing audio:', err);
    }
  }, []);

  const cleanup = useCallback(() => {
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => { });
      audioContextRef.current = null;
    }
    if (volumeIntervalRef.current) {
      clearInterval(volumeIntervalRef.current);
      volumeIntervalRef.current = null;
    }
    analyserRef.current = null;
    outputAnalyserRef.current = null;
  }, []);

  const disconnect = useCallback(() => {
    isDisconnectingRef.current = true;

    if (sessionRef.current) {
      try {
        sessionRef.current.close();
      } catch (err) {
        console.error('Error closing session:', err);
      }
      sessionRef.current = null;
    }

    cleanup();
    setIsConnected(false);
    setIsConnecting(false);
    setInputVolume(0);
    setOutputVolume(0);
  }, [cleanup]);

  return {
    connect,
    disconnect,
    isConnected,
    isConnecting,
    error,
    transcription,
    inputVolume,
    outputVolume,
    streamRef,
  };
};