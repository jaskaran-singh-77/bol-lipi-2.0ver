export interface FormData {
  fullName: string;
  age: string;
  gender: string;
  phone: string;
  address: string;
  occupation: string;
}

export interface VoiceState {
  isListening: boolean;
  transcript: string;
  isProcessing: boolean;
  isSpeaking: boolean;
  error: string | null;
}

export enum Language {
  HINDI = 'hi-IN',
  ENGLISH = 'en-US'
}

export interface ConversationTurn {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: number;
}

export interface SubmittedForm {
  id: string;
  timestamp: number;
  data: FormData;
  encrypted?: boolean;
  locked?: boolean;
}

export interface ArchitectureLayer {
  id: string;
  title: string;
  description: string;
  color: string;
  icon: string;
  items: string[];
}

// --- Speech Recognition Types ---

export interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null;
  onend: ((this: SpeechRecognition, ev: Event) => any) | null;
  onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => any) | null;
}

export interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

export interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

export interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

export interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

export interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

declare global {
  interface Window {
    SpeechRecognition: {
      new (): SpeechRecognition;
    };
    webkitSpeechRecognition: {
      new (): SpeechRecognition;
    };
  }
}
