import { useState, useRef, useCallback, useEffect } from "react";

interface UseVoiceSearchOptions {
  onResult: (transcript: string) => void;
  onListening?: (listening: boolean) => void;
  lang?: string;
}

export function useVoiceSearch({ onResult, onListening, lang = "en-IN" }: UseVoiceSearchOptions) {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    setIsSupported(!!SpeechRecognition);
  }, []);

  const startListening = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.lang = lang;
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
      onListening?.(true);
    };

    recognition.onresult = (event: any) => {
      let finalTranscript = "";
      let interimTranscript = "";
      
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      // Send interim results for live feedback
      if (interimTranscript) {
        onResult(interimTranscript);
      }
      
      // Send final result
      if (finalTranscript) {
        onResult(finalTranscript);
      }
    };

    recognition.onerror = () => {
      setIsListening(false);
      onListening?.(false);
    };

    recognition.onend = () => {
      setIsListening(false);
      onListening?.(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [lang, onResult, onListening]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setIsListening(false);
    onListening?.(false);
  }, [onListening]);

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  return { isListening, isSupported, startListening, stopListening, toggleListening };
}
