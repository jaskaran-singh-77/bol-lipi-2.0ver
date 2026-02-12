import React, { useState, useEffect, useRef, useCallback } from 'react';
import { extractFieldData, generateSpeech, extractFromDocument, GeminiError } from '../services/geminiService';
import { FormData, Language, SpeechRecognition, SpeechRecognitionEvent, SpeechRecognitionErrorEvent, ConversationTurn, SubmittedForm } from '../types';
import { auth, db } from '../services/firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, User } from 'firebase/auth';
import { addDoc, collection, getDocs, orderBy, query } from 'firebase/firestore';
import { decryptFormData, encryptFormData, EncryptedPayload } from '../services/crypto';

interface VoiceFormDemoProps {
  currentLang: Language;
}

interface FormFieldDef {
  id: keyof FormData;
  labelEn: string;
  labelHi: string;
  questionEn: string;
  questionHi: string;
  icon: string;
}

const FORM_FIELDS: FormFieldDef[] = [
  { id: 'fullName', labelEn: 'Full Name', labelHi: 'पूरा नाम', questionEn: 'What is your full name?', questionHi: 'आपका पूरा नाम क्या है?', icon: 'person' },
  { id: 'age', labelEn: 'Age', labelHi: 'उम्र', questionEn: 'How old are you?', questionHi: 'आपकी उम्र क्या है?', icon: 'cake' },
  { id: 'gender', labelEn: 'Gender', labelHi: 'लिंग', questionEn: 'What is your gender?', questionHi: 'आपका लिंग क्या है?', icon: 'wc' },
  { id: 'phone', labelEn: 'Phone Number', labelHi: 'फोन नंबर', questionEn: 'What is your phone number?', questionHi: 'आपका फोन नंबर क्या है?', icon: 'call' },
  { id: 'occupation', labelEn: 'Occupation', labelHi: 'व्यवसाय', questionEn: 'What is your occupation or job?', questionHi: 'आप क्या काम करते हैं?', icon: 'work' },
  { id: 'address', labelEn: 'Address', labelHi: 'पता', questionEn: 'Where do you live? Please tell your address.', questionHi: 'आपका पता क्या है?', icon: 'home' },
];

const INITIAL_FORM: FormData = {
  fullName: '',
  age: '',
  gender: '',
  phone: '',
  address: '',
  occupation: ''
};

const SKIP_KEYWORDS = [
  'skip', 'next', 'pass', 'i don\'t know', 'not telling', 'don\'t want to answer', 'ignore',
  'छोड़ो', 'अगला', 'नहीं बताना', 'पता नहीं', 'छोड़ो', 'बताना नहीं', 'आगे बढ़ो', 'छोड़िये', 'इग्नोर', 'रहने दो'
];

function decodeBase64ToUint8(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

const VoiceFormDemo: React.FC<VoiceFormDemoProps> = ({ currentLang }) => {
  const [formState, setFormState] = useState<FormData>(INITIAL_FORM);
  const [currentFieldIndex, setCurrentFieldIndex] = useState<number | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [ttsError, setTtsError] = useState<string | null>(null);
  const [isQuotaExhausted, setIsQuotaExhausted] = useState(false);
  const [sessionHistory, setSessionHistory] = useState<ConversationTurn[]>([]);
  const [submissionHistory, setSubmissionHistory] = useState<SubmittedForm[]>([]);
  const [showSubmissionHistory, setShowSubmissionHistory] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [authBusy, setAuthBusy] = useState(false);
  const [isLoadingSubmissions, setIsLoadingSubmissions] = useState(false);
  const [encryptionEnabled, setEncryptionEnabled] = useState(false);
  const [encryptionKey, setEncryptionKey] = useState('');
  const [encryptionError, setEncryptionError] = useState<string | null>(null);
  
  // Document upload states
  const [inputMode, setInputMode] = useState<'voice' | 'document'>('voice');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const isRecognitionActive = useRef(false);
  const transcriptRef = useRef('');
  const audioContextRef = useRef<AudioContext | null>(null);
  const currentSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Auth state
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setAuthReady(true);
    });
    return () => unsub();
  }, []);

  // Load history from localStorage (only when logged out)
  useEffect(() => {
    if (!authReady || user) return;
    const saved = localStorage.getItem('bol_lipi_submissions');
    if (saved) {
      try {
        setSubmissionHistory(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse submission history", e);
      }
    }
  }, [authReady, user]);

  const loadFirestoreSubmissions = useCallback(async () => {
    if (!user) return;
    setIsLoadingSubmissions(true);
    try {
      const submissionsRef = collection(db, "users", user.uid, "submissions");
      const snapshot = await getDocs(query(submissionsRef, orderBy("timestamp", "desc")));
      const items: SubmittedForm[] = [];

      for (const docSnap of snapshot.docs) {
        const data = docSnap.data() as {
          timestamp?: number;
          data?: FormData;
          encrypted?: boolean;
          payload?: EncryptedPayload;
        };

        let resolvedData: FormData = INITIAL_FORM;
        let locked = false;

        if (data.encrypted && data.payload) {
          if (encryptionEnabled && encryptionKey.trim()) {
            try {
              resolvedData = await decryptFormData(encryptionKey, data.payload);
            } catch (e) {
              locked = true;
              resolvedData = INITIAL_FORM;
            }
          } else {
            locked = true;
          }
        } else if (data.data) {
          resolvedData = data.data;
        }

        items.push({
          id: docSnap.id,
          timestamp: data.timestamp ?? Date.now(),
          data: resolvedData,
          encrypted: !!data.encrypted,
          locked
        });
      }

      setSubmissionHistory(items);
    } catch (e) {
      console.error("Failed to load submissions from Firestore", e);
    } finally {
      setIsLoadingSubmissions(false);
    }
  }, [user, encryptionEnabled, encryptionKey]);

  useEffect(() => {
    if (user) {
      loadFirestoreSubmissions();
    }
  }, [user, loadFirestoreSubmissions]);

  // Scroll to bottom of chat container specifically, without moving the whole page
  useEffect(() => {
    if (chatContainerRef.current) {
      const { scrollHeight, clientHeight } = chatContainerRef.current;
      chatContainerRef.current.scrollTo({
        top: scrollHeight - clientHeight,
        behavior: 'smooth'
      });
    }
  }, [sessionHistory]);

  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognitionConstructor = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognitionConstructor();
      recognition.continuous = false; 
      recognition.interimResults = true;
      recognitionRef.current = recognition;
    } else {
      setFeedbackMessage("Speech API not supported.");
    }
    
    return () => {
      if (audioContextRef.current) audioContextRef.current.close();
      if (window.speechSynthesis) window.speechSynthesis.cancel();
    };
  }, []);

  useEffect(() => {
    if (recognitionRef.current) recognitionRef.current.lang = currentLang;
  }, [currentLang]);

  const addToHistory = useCallback((role: 'user' | 'assistant', text: string) => {
    const turn: ConversationTurn = {
      id: Math.random().toString(36).substr(2, 9),
      role,
      text,
      timestamp: Date.now()
    };
    setSessionHistory(prev => [...prev, turn]);
  }, []);

  const stopAllAudio = useCallback(() => {
    if (currentSourceRef.current) {
      try { currentSourceRef.current.stop(); } catch (e) {}
    }
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
  }, []);

  const startListening = useCallback(() => {
    const recognition = recognitionRef.current;
    if (!recognition || isRecognitionActive.current) return;

    setTranscript('');
    transcriptRef.current = '';
    try {
      recognition.start();
      isRecognitionActive.current = true;
      setIsListening(true);
    } catch (e) {
      console.warn("Speech recognition already started or failed to start", e);
      isRecognitionActive.current = true;
      setIsListening(true);
    }
  }, []);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        // Silently catch if already stopped
      }
      isRecognitionActive.current = false;
      setIsListening(false);
    }
  }, []);

  const speak = useCallback(async (text: string) => {
    stopAllAudio();
    stopListening();
    setIsSpeaking(true);
    setTtsError(null);
    
    addToHistory('assistant', text);

    try {
      const base64Audio = await generateSpeech(text, currentLang === Language.HINDI ? 'hi-IN' : 'en-US');
      
      if (!base64Audio) {
        throw new Error("Empty audio response");
      }

      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      }
      
      const ctx = audioContextRef.current;
      const audioBytes = decodeBase64ToUint8(base64Audio);
      const audioBuffer = await decodeAudioData(audioBytes, ctx, 24000, 1);
      
      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);
      
      source.onended = () => setIsSpeaking(false);
      currentSourceRef.current = source;
      source.start();

      return new Promise<void>((resolve) => {
        source.addEventListener('ended', () => resolve());
      });
    } catch (err: any) {
      const isQuota = err instanceof GeminiError && err.isQuotaExceeded();
      if (isQuota) {
        setIsQuotaExhausted(true);
        setTtsError(currentLang === Language.HINDI ? "एआई व्यस्त है, स्थानीय आवाज़ का उपयोग कर रहे हैं।" : "AI Busy, using local voice fallback.");
      }

      console.warn("Gemini TTS Failed. Using browser fallback TTS.", err);
      
      if (window.speechSynthesis) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = currentLang;
        
        const voices = window.speechSynthesis.getVoices();
        const preferredVoice = voices.find(v => v.lang.startsWith(currentLang === Language.HINDI ? 'hi' : 'en'));
        if (preferredVoice) utterance.voice = preferredVoice;

        utterance.onend = () => setIsSpeaking(false);
        utterance.onerror = () => setIsSpeaking(false);
        window.speechSynthesis.speak(utterance);
        
        return new Promise<void>((resolve) => {
          utterance.addEventListener('end', () => resolve());
        });
      } else {
        setIsSpeaking(false);
        if (!isQuota) setTtsError("Speech synthesis unavailable.");
      }
    }
  }, [currentLang, stopAllAudio, stopListening, addToHistory]);

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  const askCurrentQuestion = useCallback(async () => {
    if (currentFieldIndex === null) return;
    const field = FORM_FIELDS[currentFieldIndex];
    const question = currentLang === Language.HINDI ? field.questionHi : field.questionEn;
    setFeedbackMessage(question);
    
    await speak(question);
    startListening();
  }, [currentFieldIndex, currentLang, speak, startListening]);

  const handleManualReset = () => {
    stopListening();
    stopAllAudio();
    setFormState(INITIAL_FORM);
    setCurrentFieldIndex(0);
    setSessionHistory([]);
    setIsQuotaExhausted(false);
    setTtsError(null);
    setUploadedFile(null);
    setIsExtracting(false);
  };

  // Document upload handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = (file: File) => {
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'];
    if (!validTypes.includes(file.type)) {
      alert(currentLang === Language.HINDI 
        ? 'कृपया एक वैध फ़ाइल अपलोड करें (JPG, PNG, PDF)' 
        : 'Please upload a valid file (JPG, PNG, PDF)');
      return;
    }
    setUploadedFile(file);
  };

  const handleExtractFromDocument = async () => {
    if (!uploadedFile) return;
    
    setIsExtracting(true);
    addToHistory('user', `Uploaded document: ${uploadedFile.name}`);
    
    try {
      const extractedData = await extractFromDocument(uploadedFile);
      setFormState(extractedData);
      
      const successMsg = currentLang === Language.HINDI 
        ? 'डेटा सफलतापूर्वक निकाला गया!' 
        : 'Data extracted successfully!';
      addToHistory('assistant', successMsg);
      setFeedbackMessage(successMsg);
      
      if (!isQuotaExhausted) {
        await speak(successMsg);
      }
    } catch (err: any) {
      console.error("Document extraction error:", err);
      if (err instanceof GeminiError && err.isQuotaExceeded()) {
        setIsQuotaExhausted(true);
        const quotaMsg = currentLang === Language.HINDI 
          ? 'सिस्टम व्यस्त है। कृपया मैनुअल रूप से भरें।' 
          : 'System Busy (Quota Hit). Please fill manually.';
        addToHistory('assistant', quotaMsg);
        setFeedbackMessage(quotaMsg);
      } else {
        const errorMsg = currentLang === Language.HINDI 
          ? 'डेटा निकालने में त्रुटि। कृपया पुनः प्रयास करें।' 
          : 'Error extracting data. Please try again.';
        addToHistory('assistant', errorMsg);
        setFeedbackMessage(errorMsg);
      }
    } finally {
      setIsExtracting(false);
    }
  };

  useEffect(() => {
    if (currentFieldIndex !== null) {
      askCurrentQuestion();
    }
  }, [currentFieldIndex, askCurrentQuestion]);

  const findNextEmptyIndex = useCallback((startIndex: number): number | null => {
    for (let i = startIndex + 1; i < FORM_FIELDS.length; i++) {
      if (!formState[FORM_FIELDS[i].id]) return i;
    }
    for (let i = 0; i < startIndex; i++) {
      if (!formState[FORM_FIELDS[i].id]) return i;
    }
    return null;
  }, [formState]);

  const advanceToNext = useCallback(async () => {
    if (currentFieldIndex === null) return;
    
    const nextIdx = findNextEmptyIndex(currentFieldIndex);
    if (nextIdx !== null) {
      setCurrentFieldIndex(nextIdx);
    } else {
      const finishMsg = currentLang === Language.HINDI ? "धन्यवाद! आपका फॉर्म पूरा हो गया है।" : "Thank you! Your form is now complete.";
      setFeedbackMessage(finishMsg);
      await speak(finishMsg);
      setCurrentFieldIndex(null);
    }
  }, [currentFieldIndex, currentLang, findNextEmptyIndex, speak]);

  const handleSkip = useCallback(async () => {
    stopListening();
    const skipMsg = currentLang === Language.HINDI ? "ठीक है, इसे छोड़ देते हैं।" : "Okay, skipping this field.";
    setFeedbackMessage(skipMsg);
    await speak(skipMsg);
    advanceToNext();
  }, [currentLang, speak, advanceToNext, stopListening]);

  const processStep = useCallback(async (text: string) => {
    if (currentFieldIndex === null) return;
    
    addToHistory('user', text);
    const lowerText = text.toLowerCase().trim();
    const field = FORM_FIELDS[currentFieldIndex];

    const isExplicitSkip = SKIP_KEYWORDS.some(keyword => lowerText.includes(keyword));

    if (isExplicitSkip) {
      handleSkip();
      return;
    }

    setIsProcessing(true);
    try {
      const result = await extractFieldData(text, field.id, currentLang === Language.HINDI ? field.labelHi : field.labelEn);
      
      if (result.isSkipped) {
        handleSkip();
      } else if (result.value) {
        setFormState(prev => ({ ...prev, [field.id]: result.value }));
        const confirmMsg = currentLang === Language.HINDI ? "ठीक है।" : "Noted.";
        setFeedbackMessage(confirmMsg);
        await speak(confirmMsg);
        advanceToNext();
      } else {
        const retryMsg = currentLang === Language.HINDI ? "क्षमा करें, क्या आप दोहरा सकते हैं?" : "Sorry, could you repeat that?";
        setFeedbackMessage(retryMsg);
        await speak(retryMsg);
        startListening();
      }
    } catch (err: any) {
      console.error("Processing error", err);
      if (err instanceof GeminiError && err.isQuotaExceeded()) {
        setIsQuotaExhausted(true);
        const quotaMsg = currentLang === Language.HINDI ? "सिस्टम व्यस्त है। कृपया मैनुअल रूप से भरें।" : "System Busy (Quota Hit). Please fill manually for now.";
        setFeedbackMessage(quotaMsg);
        await speak(quotaMsg);
      } else {
        setFeedbackMessage("Processing error");
        startListening();
      }
    } finally {
      setIsProcessing(false);
    }
  }, [currentFieldIndex, currentLang, speak, advanceToNext, handleSkip, startListening, addToHistory]);

  useEffect(() => {
    const recognition = recognitionRef.current;
    if (!recognition) return;

    const handleResult = (event: SpeechRecognitionEvent) => {
      const current = event.resultIndex;
      const result = event.results[current];
      const transcriptValue = result[0].transcript;
      setTranscript(transcriptValue);
      transcriptRef.current = transcriptValue;
    };

    const handleEnd = () => {
      isRecognitionActive.current = false;
      setIsListening(false);
      const finalTranscript = transcriptRef.current;
      if (finalTranscript.trim().length > 0) {
        processStep(finalTranscript);
      }
    };

    const handleError = (event: SpeechRecognitionErrorEvent) => {
      isRecognitionActive.current = false;
      setIsListening(false);
      console.warn("Speech recognition error:", event.error);
    };

    recognition.onresult = handleResult;
    recognition.onend = handleEnd;
    recognition.onerror = handleError;

    return () => {
      recognition.onresult = null;
      recognition.onend = null;
      recognition.onerror = null;
    };
  }, [processStep, currentLang]);

  const handleManualChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormState(prev => ({ ...prev, [name]: value }));
  };

  const handleFieldClick = (idx: number) => {
    stopListening();
    stopAllAudio();
    setCurrentFieldIndex(idx);
  };

  const handleSubmit = () => {
    if (encryptionEnabled && encryptionKey.trim().length < 6) {
      setEncryptionError(currentLang === Language.HINDI ? "Please enter an encryption key (min 6 characters)." : "Please enter an encryption key (min 6 characters).");
      return;
    }
    setEncryptionError(null);
    const submission: SubmittedForm = {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: Date.now(),
      data: formState
    };

    if (user) {
      const saveRemote = async () => {
        const submissionsRef = collection(db, "users", user.uid, "submissions");
        if (encryptionEnabled && encryptionKey.trim()) {
          const payload = await encryptFormData(encryptionKey, formState);
          const docRef = await addDoc(submissionsRef, {
            timestamp: submission.timestamp,
            encrypted: true,
            payload
          });
          setSubmissionHistory(prev => [{ ...submission, id: docRef.id, encrypted: true }, ...prev]);
        } else {
          const docRef = await addDoc(submissionsRef, {
            timestamp: submission.timestamp,
            encrypted: false,
            data: formState
          });
          setSubmissionHistory(prev => [{ ...submission, id: docRef.id, encrypted: false }, ...prev]);
        }
      };

      saveRemote()
        .then(() => {
          alert(currentLang === Language.HINDI ? "सफलतापूर्वक जमा किया गया!" : "Submitted Successfully!");
          handleManualReset();
        })
        .catch((e) => {
          console.error("Failed to submit to Firestore", e);
          alert(currentLang === Language.HINDI ? "Submission failed" : "Submission failed");
        });
    } else {
      const updated = [submission, ...submissionHistory];
      setSubmissionHistory(updated);
      localStorage.setItem('bol_lipi_submissions', JSON.stringify(updated));
      alert(currentLang === Language.HINDI ? "सफलतापूर्वक जमा किया गया!" : "Submitted Successfully!");
      handleManualReset();
    }
  };

  const clearSubmissionHistory = () => {
    if (confirm(currentLang === Language.HINDI ? "क्या आप वाकई सारा इतिहास मिटाना चाहते हैं?" : "Are you sure you want to clear all history?")) {
      setSubmissionHistory([]);
      if (!user) {
        localStorage.removeItem('bol_lipi_submissions');
      }
    }
  };

  const handleSignUp = async () => {
    if (!authEmail.trim() || !authPassword.trim()) return;
    setAuthBusy(true);
    setAuthError(null);
    try {
      await createUserWithEmailAndPassword(auth, authEmail.trim(), authPassword);
    } catch (e: any) {
      setAuthError(e?.message ?? "Sign up failed");
    } finally {
      setAuthBusy(false);
    }
  };

  const handleSignIn = async () => {
    if (!authEmail.trim() || !authPassword.trim()) return;
    setAuthBusy(true);
    setAuthError(null);
    try {
      await signInWithEmailAndPassword(auth, authEmail.trim(), authPassword);
    } catch (e: any) {
      setAuthError(e?.message ?? "Sign in failed");
    } finally {
      setAuthBusy(false);
    }
  };

  const handleSignOut = async () => {
    await signOut(auth);
    setSubmissionHistory([]);
  };
  return (
    <div className="w-full max-w-5xl mx-auto p-4 md:p-8">
      {/* Submissions History Modal */}
      {showSubmissionHistory && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-800 w-full max-w-2xl max-h-[80vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col border border-slate-200 dark:border-slate-700">
            <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
              <h3 className="text-xl font-black text-slate-800 dark:text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">history</span>
                {currentLang === Language.HINDI ? "पिछले फॉर्म" : "Past Submissions"}
              </h3>
              <div className="flex gap-2">
                <button 
                  onClick={clearSubmissionHistory}
                  className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors"
                  title="Clear All"
                >
                  <span className="material-symbols-outlined">delete_sweep</span>
                </button>
                <button 
                  onClick={() => setShowSubmissionHistory(false)}
                  className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {isLoadingSubmissions && (
                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Loading...</div>
              )}
              {submissionHistory.length === 0 ? (
                <div className="text-center py-20 text-slate-400">
                   <span className="material-symbols-outlined text-6xl mb-4 block opacity-20">inventory_2</span>
                   <p className="font-bold">{currentLang === Language.HINDI ? "कोई रिकॉर्ड नहीं मिला" : "No records found"}</p>
                </div>
              ) : (
                submissionHistory.map(sub => (
                  <div key={sub.id} className="p-4 bg-slate-50 dark:bg-slate-700/30 rounded-2xl border border-slate-100 dark:border-slate-700 hover:border-primary/30 transition-colors group">
                    <div className="flex justify-between items-start mb-3">
                      <span className="text-[10px] font-black uppercase tracking-widest text-primary bg-primary/10 px-2 py-1 rounded">
                        {new Date(sub.timestamp).toLocaleString()}
                      </span>
                      <div className="flex items-center gap-2">
                        {sub.encrypted && (
                          <span className="text-[9px] font-bold uppercase tracking-widest bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-1 rounded">Encrypted</span>
                        )}
                        {sub.locked && (
                          <span className="text-[9px] font-bold uppercase tracking-widest bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 px-2 py-1 rounded">Locked</span>
                        )}
                        <span className="text-[10px] font-bold text-slate-400 group-hover:text-primary transition-colors">ID: {sub.id}</span>
                      </div>
                    </div>
                    {sub.locked ? (
                      <div className="text-xs text-slate-500">Encrypted. Enter the same key to view.</div>
                    ) : (
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                        {Object.entries(sub.data).map(([key, value]) => (
                          value && (
                            <div key={key} className="text-xs">
                              <span className="text-slate-400 font-bold uppercase mr-1">{key}:</span>
                              <span className="text-slate-700 dark:text-slate-200 font-medium">{value}</span>
                            </div>
                          )
                        ))}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Container - md:h-[750px] locks the height on desktop to enable internal scrolling without page shift */}
      <div className="bg-white dark:bg-[#1e293b] rounded-3xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-700 flex flex-col min-h-[700px] md:h-[750px]">
        
        {/* Mode Toggle */}
        <div className="w-full flex justify-center py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/20">
          <div className="bg-slate-100 dark:bg-slate-800 rounded-2xl p-1 flex gap-1 shadow-lg border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setInputMode('voice')}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${
                inputMode === 'voice'
                  ? 'bg-primary text-white shadow-md'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              <span className="material-symbols-outlined text-lg">mic</span>
              {currentLang === Language.HINDI ? 'आवाज़' : 'Voice'}
            </button>
            <button
              onClick={() => setInputMode('document')}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${
                inputMode === 'document'
                  ? 'bg-primary text-white shadow-md'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              <span className="material-symbols-outlined text-lg">upload_file</span>
              {currentLang === Language.HINDI ? 'दस्तावेज़' : 'Document'}
            </button>
          </div>
        </div>
        
        {/* Content Area */}
        <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
        
        {/* Left: Interactive Assistant + Chat History */}
        <div className="md:w-1/2 flex flex-col border-b md:border-b-0 md:border-r border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/20">
          
          <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-white dark:bg-slate-900">
            <div className="flex flex-col">
              <div className="bg-primary/10 text-primary text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider w-fit">
                 {currentLang === Language.HINDI ? "एआई सहायक" : "AI Assistant"}
              </div>
              <h3 className="text-xl font-black mt-1 text-slate-800 dark:text-white">
                {currentLang === Language.HINDI ? "बातचीत" : "Conversation"}
              </h3>
            </div>
            {ttsError && (
              <div className="bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 text-[9px] font-bold px-2 py-1 rounded-md shadow-sm border border-amber-100 dark:border-amber-800 flex items-center gap-1">
                <span className="material-symbols-outlined text-[12px]">warning</span>
                {ttsError}
              </div>
            )}
          </div>

          {/* Quota Exhaustion Banner */}
          {isQuotaExhausted && (
            <div className="mx-4 mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-xl flex items-start gap-3 animate-pulse">
               <span className="material-symbols-outlined text-red-500">report_problem</span>
               <div>
                 <p className="text-xs font-black text-red-600 dark:text-red-400 uppercase tracking-wide">
                   {currentLang === Language.HINDI ? "सिस्टम क्षमता समाप्त" : "Quota Limit Exceeded"}
                 </p>
                 <p className="text-[10px] text-red-500 dark:text-red-300 font-medium">
                   {currentLang === Language.HINDI ? "एआई वर्तमान में व्यस्त है। कृपया तब तक फॉर्म को सीधे भरें।" : "The AI assistant is temporarily unavailable. Please type directly into the form fields."}
                 </p>
               </div>
            </div>
          )}

          {/* Chat History View - Managed with chatContainerRef for internal scrolling */}
          <div 
            ref={chatContainerRef}
            className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar"
          >
            {sessionHistory.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center opacity-40">
                <span className="material-symbols-outlined text-6xl mb-4 text-primary">chat_bubble</span>
                <p className="font-bold text-slate-400 max-w-xs">
                  {currentLang === Language.HINDI ? "सहायक के साथ बातचीत यहाँ दिखाई देगी" : "Your conversation with the assistant will appear here"}
                </p>
              </div>
            ) : (
              sessionHistory.map((turn) => (
                <div 
                  key={turn.id} 
                  className={`flex ${turn.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}
                >
                  <div className={`max-w-[85%] rounded-2xl p-4 shadow-sm ${
                    turn.role === 'user' 
                      ? 'bg-primary text-white rounded-tr-none' 
                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-100 dark:border-slate-700 rounded-tl-none'
                  }`}>
                    <p className="text-sm font-medium leading-relaxed">{turn.text}</p>
                    <span className={`text-[9px] block mt-1 font-bold uppercase opacity-60 ${turn.role === 'user' ? 'text-blue-100' : 'text-slate-400'}`}>
                      {new Date(turn.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Interactive Controls Overlay at Bottom */}
          <div className="p-6 bg-white dark:bg-[#1e293b] border-t border-slate-100 dark:border-slate-800 flex flex-col items-center gap-6">
            
            {inputMode === 'voice' ? (
              // Voice Mode Controls
              <>
                <div className="flex items-center justify-center gap-8">
                  <button 
                    onClick={handleSkip}
                    disabled={currentFieldIndex === null || isQuotaExhausted}
                    className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center transition-all disabled:opacity-20 active:scale-90"
                    title="Skip Field"
                  >
                    <span className="material-symbols-outlined">fast_forward</span>
                  </button>

                  <div className="relative">
                    {isListening && <div className="absolute inset-[-4px] bg-primary/20 rounded-full animate-ping"></div>}
                    {isSpeaking && <div className="absolute inset-[-8px] border-2 border-dashed border-accent-green/30 rounded-full animate-[spin_6s_linear_infinite]"></div>}
                    
                    <button
                      onClick={currentFieldIndex === null ? handleManualReset : toggleListening}
                      disabled={isQuotaExhausted && currentFieldIndex !== null && !isListening && !isSpeaking}
                      className={`relative z-10 w-20 h-20 rounded-full flex flex-col items-center justify-center shadow-2xl transition-all duration-500 ${
                        isListening 
                          ? 'bg-red-500 scale-110 shadow-red-500/30' 
                          : isSpeaking ? 'bg-accent-green shadow-green-500/30' : 'bg-primary hover:bg-primary-dark hover:scale-105 shadow-primary/40'
                      } ${isQuotaExhausted && currentFieldIndex !== null && !isListening && !isSpeaking ? 'opacity-50 grayscale cursor-not-allowed' : ''}`}
                    >
                      <span className="material-symbols-outlined text-3xl text-white">
                        {currentFieldIndex === null ? 'play_arrow' : isListening ? 'mic' : isSpeaking ? 'graphic_eq' : 'mic'}
                      </span>
                    </button>
                  </div>

                  <button 
                    onClick={() => { stopAllAudio(); stopListening(); }}
                    className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center justify-center transition-all active:scale-90"
                    title="Stop"
                  >
                    <span className="material-symbols-outlined">stop_circle</span>
                  </button>
                </div>

                <div className="h-4 flex items-center gap-1">
                  {isProcessing && (
                    <div className="flex gap-1.5 items-center">
                      <div className="w-1.5 h-1.5 bg-accent-orange rounded-full animate-bounce"></div>
                      <div className="w-1.5 h-1.5 bg-accent-orange rounded-full animate-bounce delay-75"></div>
                      <div className="w-1.5 h-1.5 bg-accent-orange rounded-full animate-bounce delay-150"></div>
                      <span className="text-[9px] font-black text-accent-orange uppercase tracking-widest ml-1">AI Thinking</span>
                    </div>
                  )}
                  {!isProcessing && isListening && <span className="text-[9px] font-black text-red-500 uppercase tracking-widest animate-pulse">Listening...</span>}
                  {!isProcessing && isSpeaking && <span className="text-[9px] font-black text-accent-green uppercase tracking-widest animate-pulse">Speaking...</span>}
                  {isQuotaExhausted && !isListening && !isSpeaking && !isProcessing && <span className="text-[9px] font-black text-red-400 uppercase tracking-widest">AI Disabled</span>}
                </div>
              </>
            ) : (
              // Document Upload Mode
              <div className="w-full max-w-md">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,.pdf"
                  onChange={handleFileInput}
                  className="hidden"
                />
                
                {!uploadedFile ? (
                  <div
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-3xl p-12 text-center cursor-pointer transition-all ${
                      dragActive
                        ? 'border-primary bg-primary/5 scale-105'
                        : 'border-slate-300 dark:border-slate-600 hover:border-primary hover:bg-slate-50 dark:hover:bg-slate-800/50'
                    }`}
                  >
                    <span className="material-symbols-outlined text-6xl text-primary mb-4 block">upload_file</span>
                    <p className="text-slate-700 dark:text-slate-300 font-bold mb-2">
                      {currentLang === Language.HINDI ? 'दस्तावेज़ अपलोड करें' : 'Upload Document'}
                    </p>
                    <p className="text-xs text-slate-500">
                      {currentLang === Language.HINDI 
                        ? 'क्लिक करें या फ़ाइल खींचें (JPG, PNG, PDF)' 
                        : 'Click or drag file (JPG, PNG, PDF)'}
                    </p>
                  </div>
                ) : (
                  <div className="bg-slate-50 dark:bg-slate-800 rounded-3xl p-6 border border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                        <span className="material-symbols-outlined text-primary text-2xl">description</span>
                      </div>
                      <div className="flex-1">
                        <p className="font-bold text-slate-800 dark:text-white text-sm truncate">{uploadedFile.name}</p>
                        <p className="text-xs text-slate-500">{(uploadedFile.size / 1024).toFixed(2)} KB</p>
                      </div>
                      <button
                        onClick={() => setUploadedFile(null)}
                        className="w-8 h-8 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-600 hover:bg-red-200 transition-colors flex items-center justify-center"
                      >
                        <span className="material-symbols-outlined text-lg">close</span>
                      </button>
                    </div>
                    
                    <button
                      onClick={handleExtractFromDocument}
                      disabled={isExtracting}
                      className={`w-full py-3 rounded-xl font-bold text-white transition-all flex items-center justify-center gap-2 ${
                        isExtracting
                          ? 'bg-slate-400 cursor-not-allowed'
                          : 'bg-primary hover:bg-blue-700 shadow-lg shadow-primary/30 hover:scale-105'
                      }`}
                    >
                      {isExtracting ? (
                        <>
                          <div className="flex gap-1">
                            <div className="w-2 h-2 bg-white rounded-full animate-bounce"></div>
                            <div className="w-2 h-2 bg-white rounded-full animate-bounce delay-75"></div>
                            <div className="w-2 h-2 bg-white rounded-full animate-bounce delay-150"></div>
                          </div>
                          <span>{currentLang === Language.HINDI ? 'निकाला जा रहा है...' : 'Extracting...'}</span>
                        </>
                      ) : (
                        <>
                          <span className="material-symbols-outlined">auto_awesome</span>
                          <span>{currentLang === Language.HINDI ? 'डेटा निकालें' : 'Extract Data'}</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right: Smart Form Canvas */}
        <div className="md:w-1/2 p-8 bg-white dark:bg-[#0f1520] overflow-y-auto custom-scrollbar">
          <div className="mb-6 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30">
            <div className="flex items-center justify-between">
              <div className="text-sm font-black text-slate-800 dark:text-white">Account</div>
              <span className={`text-[10px] font-bold px-2 py-1 rounded ${user ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' : 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}>
                {user ? 'Signed in' : 'Guest'}
              </span>
            </div>

            {user ? (
              <div className="mt-3 flex items-center justify-between gap-3">
                <div className="text-xs text-slate-600 dark:text-slate-300 truncate">{user.email ?? 'Unknown email'}</div>
                <button
                  onClick={handleSignOut}
                  className="px-3 py-1.5 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-bold hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors"
                >
                  Sign out
                </button>
              </div>
            ) : (
              <div className="mt-3 grid grid-cols-1 gap-2">
                <input
                  type="email"
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  placeholder="Email"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-200"
                />
                <input
                  type="password"
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  placeholder="Password"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-200"
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleSignIn}
                    disabled={authBusy}
                    className="flex-1 px-3 py-2 bg-primary text-white rounded-lg text-xs font-bold hover:brightness-110 disabled:opacity-50"
                  >
                    Sign in
                  </button>
                  <button
                    onClick={handleSignUp}
                    disabled={authBusy}
                    className="flex-1 px-3 py-2 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-bold hover:bg-slate-300 dark:hover:bg-slate-700 disabled:opacity-50"
                  >
                    Sign up
                  </button>
                </div>
                {authError && (
                  <div className="text-[10px] text-red-500 font-bold">{authError}</div>
                )}
              </div>
            )}

            <div className="mt-4 border-t border-slate-200 dark:border-slate-700 pt-4">
              <div className="flex items-center justify-between">
                <div className="text-sm font-black text-slate-800 dark:text-white">Encryption</div>
                <label className="flex items-center gap-2 text-[10px] font-bold text-slate-600 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={encryptionEnabled}
                    onChange={(e) => setEncryptionEnabled(e.target.checked)}
                    className="accent-primary"
                  />
                  Encrypt submissions
                </label>
              </div>
              <input
                type="password"
                value={encryptionKey}
                onChange={(e) => setEncryptionKey(e.target.value)}
                placeholder="Encryption key (min 6 chars)"
                disabled={!encryptionEnabled}
                className="mt-2 w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-200 disabled:opacity-50"
              />
              <p className="mt-1 text-[10px] text-slate-500">Key is kept only in your browser. If you forget it, encrypted data cannot be recovered.</p>
              {encryptionError && (
                <div className="mt-1 text-[10px] text-red-500 font-bold">{encryptionError}</div>
              )}
            </div>
          </div>
          <div className="flex justify-between items-center mb-8">
            <div>
              <h4 className="text-xl font-black text-slate-800 dark:text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-accent-green">verified_user</span>
                {currentLang === Language.HINDI ? "स्मार्ट फॉर्म" : "Smart Form"}
              </h4>
              <p className="text-xs text-slate-500 mt-1">Populates as you speak</p>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={() => setShowSubmissionHistory(true)}
                className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-xl text-xs font-bold hover:bg-slate-200 transition-colors flex items-center gap-1"
                title="History"
              >
                <span className="material-symbols-outlined text-sm">history</span>
                {currentLang === Language.HINDI ? "इतिहास" : "History"}
              </button>
              <button 
                onClick={handleManualReset}
                className="px-3 py-1.5 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-xl text-xs font-bold hover:bg-red-200 transition-colors flex items-center gap-1 shadow-sm"
              >
                <span className="material-symbols-outlined text-sm">refresh</span>
                {currentLang === Language.HINDI ? "रिसेट" : "Reset"}
              </button>
            </div>
          </div>

          <div className="space-y-4">
            {FORM_FIELDS.map((field, idx) => {
              const isActive = currentFieldIndex === idx;
              const isFilled = !!formState[field.id];
              
              return (
                <div 
                  key={field.id}
                  onClick={() => handleFieldClick(idx)}
                  className={`p-4 rounded-2xl transition-all duration-300 border-2 cursor-pointer ${
                    isActive 
                      ? 'border-primary bg-primary/5 shadow-lg shadow-primary/10 ring-4 ring-primary/5' 
                      : isFilled 
                        ? 'border-accent-green/30 bg-white dark:bg-slate-800 shadow-sm opacity-100' 
                        : 'border-slate-200 dark:border-slate-700 bg-white/40 dark:bg-slate-800/40 opacity-70 hover:opacity-100'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <label className={`text-[10px] font-black uppercase tracking-widest ${isActive ? 'text-primary' : isFilled ? 'text-accent-green' : 'text-slate-400'}`}>
                      {currentLang === Language.HINDI ? field.labelHi : field.labelEn}
                    </label>
                    {isFilled && !isActive && (
                      <span className="text-accent-green material-symbols-outlined text-[18px]">check_circle</span>
                    )}
                    {isActive && (
                      <span className="flex h-2 w-2 rounded-full bg-primary animate-pulse"></span>
                    )}
                  </div>
                  
                  <div className="relative">
                    <span className={`absolute left-0 top-1/2 -translate-y-1/2 material-symbols-outlined text-[20px] ${isActive ? 'text-primary' : 'text-slate-400'}`}>
                      {field.icon}
                    </span>
                    {field.id === 'address' ? (
                      <textarea
                        name={field.id}
                        value={formState[field.id]}
                        onChange={handleManualChange}
                        className="w-full pl-8 bg-transparent text-slate-800 dark:text-white font-bold outline-none resize-none min-h-[40px] placeholder:text-slate-300 dark:placeholder:text-slate-700"
                        placeholder="..."
                      />
                    ) : (
                      <input
                        type="text"
                        name={field.id}
                        value={formState[field.id]}
                        onChange={handleManualChange}
                        className="w-full pl-8 bg-transparent text-slate-800 dark:text-white font-bold outline-none placeholder:text-slate-300 dark:placeholder:text-slate-700"
                        placeholder="..."
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-10">
            <button 
              onClick={handleSubmit}
              disabled={Object.values(formState).every(v => v === '') || (encryptionEnabled && encryptionKey.trim().length < 6)}
              className="w-full py-4 bg-accent-green hover:bg-emerald-600 disabled:opacity-30 disabled:hover:bg-accent-green text-white font-black text-lg rounded-2xl shadow-xl shadow-green-500/20 transition-all flex items-center justify-center gap-3 active:scale-95"
            >
              <span className="material-symbols-outlined text-2xl">rocket_launch</span>
              {currentLang === Language.HINDI ? "जानकारी जमा करें" : "Finalize & Submit"}
            </button>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
};

export default VoiceFormDemo;
