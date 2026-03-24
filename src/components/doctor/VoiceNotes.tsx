/**
 * RECONNAISSANCE VOCALE NOTES MEDECIN
 *
 * Bouton micro pour dictee vocale dans les notes privees.
 * Web Speech API (SpeechRecognition), transcription temps reel,
 * edition post-transcription, support FR/EN/ES.
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Mic, MicOff, Square, Play, Pause, Save, Trash2,
  Languages, Clock, Edit3, Volume2, AlertCircle, CheckCircle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { toast } from 'sonner';

// ---- Types ----

interface VoiceNote {
  id: string;
  content: string;
  language: string;
  duration: number;
  createdAt: Date;
  editedAt: Date | null;
  patientId: string;
  patientName: string;
}

interface VoiceNotesProps {
  patientId: string;
  patientName: string;
  onSaveNote?: (content: string) => void;
}

type SupportedLanguage = 'fr-FR' | 'en-US' | 'es-ES';

const LANGUAGES: { code: SupportedLanguage; label: string; flag: string }[] = [
  { code: 'fr-FR', label: 'Francais', flag: 'FR' },
  { code: 'en-US', label: 'English', flag: 'EN' },
  { code: 'es-ES', label: 'Espanol', flag: 'ES' },
];

// ---- Helpers ----

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function getSpeechRecognition(): typeof SpeechRecognition | null {
  if (typeof window === 'undefined') return null;
  return (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition || null;
}

// ---- Composant Principal ----

export function VoiceNotes({ patientId, patientName, onSaveNote }: VoiceNotesProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [language, setLanguage] = useState<SupportedLanguage>('fr-FR');
  const [duration, setDuration] = useState(0);
  const [savedNotes, setSavedNotes] = useState<VoiceNote[]>([]);
  const [isSupported, setIsSupported] = useState(true);
  const [showLanguageSelector, setShowLanguageSelector] = useState(false);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Verifier le support
  useEffect(() => {
    const SpeechRecognitionClass = getSpeechRecognition();
    setIsSupported(!!SpeechRecognitionClass);
  }, []);

  // Load saved notes
  useEffect(() => {
    try {
      const stored = localStorage.getItem(`voice_notes_${patientId}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        setSavedNotes(parsed.map((n: any) => ({ ...n, createdAt: new Date(n.createdAt), editedAt: n.editedAt ? new Date(n.editedAt) : null })));
      }
    } catch {
      // ignore
    }
  }, [patientId]);

  const saveToStorage = useCallback((notes: VoiceNote[]) => {
    try {
      localStorage.setItem(`voice_notes_${patientId}`, JSON.stringify(notes));
    } catch {
      // ignore
    }
  }, [patientId]);

  const startRecording = useCallback(() => {
    const SpeechRecognitionClass = getSpeechRecognition();
    if (!SpeechRecognitionClass) {
      toast.error('Non supporte', { description: 'La reconnaissance vocale n\'est pas disponible dans ce navigateur.' });
      return;
    }

    const recognition = new SpeechRecognitionClass();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = language;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalTranscript = '';
      let interim = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript + ' ';
        } else {
          interim += result[0].transcript;
        }
      }

      if (finalTranscript) {
        setTranscript((prev) => prev + finalTranscript);
      }
      setInterimTranscript(interim);
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('[VoiceNotes] Recognition error:', event.error);
      if (event.error === 'not-allowed') {
        toast.error('Micro refuse', { description: 'Veuillez autoriser l\'acces au microphone.' });
      }
      stopRecording();
    };

    recognition.onend = () => {
      // Restart if still recording (browser stops after silence)
      if (isRecording && !isPaused) {
        try {
          recognition.start();
        } catch {
          // Ignore if already started
        }
      }
    };

    try {
      recognition.start();
      recognitionRef.current = recognition;
      setIsRecording(true);
      setIsPaused(false);
      setDuration(0);

      // Timer
      timerRef.current = setInterval(() => {
        setDuration((prev) => prev + 1);
      }, 1000);

      toast.success('Enregistrement demarre', { description: `Langue : ${LANGUAGES.find((l) => l.code === language)?.label}` });
    } catch (error) {
      console.error('[VoiceNotes] Failed to start:', error);
      toast.error('Erreur', { description: 'Impossible de demarrer l\'enregistrement.' });
    }
  }, [language, isRecording, isPaused]);

  const stopRecording = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsRecording(false);
    setIsPaused(false);
    setInterimTranscript('');
  }, []);

  const pauseRecording = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsPaused(true);
  }, []);

  const resumeRecording = useCallback(() => {
    const SpeechRecognitionClass = getSpeechRecognition();
    if (!SpeechRecognitionClass || !recognitionRef.current) {
      startRecording();
      return;
    }

    const recognition = new SpeechRecognitionClass();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = language;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalTranscript = '';
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript + ' ';
        } else {
          interim += event.results[i][0].transcript;
        }
      }
      if (finalTranscript) {
        setTranscript((prev) => prev + finalTranscript);
      }
      setInterimTranscript(interim);
    };

    recognition.onerror = () => stopRecording();

    try {
      recognition.start();
      recognitionRef.current = recognition;
      setIsPaused(false);
      timerRef.current = setInterval(() => {
        setDuration((prev) => prev + 1);
      }, 1000);
    } catch {
      // ignore
    }
  }, [language, startRecording, stopRecording]);

  const handleSave = useCallback(() => {
    const content = isEditing ? editContent : transcript;
    if (!content.trim()) {
      toast.error('Note vide', { description: 'Rien a sauvegarder.' });
      return;
    }

    const note: VoiceNote = {
      id: `vn-${Date.now()}`,
      content: content.trim(),
      language,
      duration,
      createdAt: new Date(),
      editedAt: isEditing ? new Date() : null,
      patientId,
      patientName,
    };

    const updatedNotes = [note, ...savedNotes];
    setSavedNotes(updatedNotes);
    saveToStorage(updatedNotes);

    onSaveNote?.(content.trim());

    // Reset
    setTranscript('');
    setEditContent('');
    setIsEditing(false);
    setDuration(0);

    toast.success('Note sauvegardee', { description: `Note vocale pour ${patientName}` });
  }, [isEditing, editContent, transcript, language, duration, patientId, patientName, savedNotes, saveToStorage, onSaveNote]);

  const handleDelete = (noteId: string) => {
    const updatedNotes = savedNotes.filter((n) => n.id !== noteId);
    setSavedNotes(updatedNotes);
    saveToStorage(updatedNotes);
    toast.success('Note supprimee');
  };

  const handleEdit = () => {
    setEditContent(transcript);
    setIsEditing(true);
    setTimeout(() => textareaRef.current?.focus(), 100);
  };

  // Cleanup
  useEffect(() => {
    return () => {
      if (recognitionRef.current) recognitionRef.current.stop();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  if (!isSupported) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-amber-800">Reconnaissance vocale non disponible</p>
              <p className="text-xs text-amber-600 mt-0.5">
                Votre navigateur ne supporte pas l'API Web Speech. Utilisez Chrome, Edge ou Safari.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Enregistrement */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Mic className="w-5 h-5 text-[#007AFF]" />
                Notes vocales
              </CardTitle>
              <CardDescription>Patient : {patientName}</CardDescription>
            </div>
            {/* Language selector */}
            <div className="relative">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowLanguageSelector(!showLanguageSelector)}
                disabled={isRecording}
              >
                <Languages className="w-4 h-4 mr-1" />
                {LANGUAGES.find((l) => l.code === language)?.flag}
              </Button>
              <AnimatePresence>
                {showLanguageSelector && (
                  <motion.div
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    className="absolute right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-10 overflow-hidden"
                  >
                    {LANGUAGES.map((lang) => (
                      <button
                        key={lang.code}
                        onClick={() => {
                          setLanguage(lang.code);
                          setShowLanguageSelector(false);
                        }}
                        className={`w-full text-left px-4 py-2 text-sm hover:bg-slate-50 flex items-center gap-2 ${
                          language === lang.code ? 'bg-[#007AFF]/5 text-[#007AFF]' : ''
                        }`}
                      >
                        <span className="font-mono text-xs">{lang.flag}</span>
                        {lang.label}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Controles */}
          <div className="flex items-center justify-center gap-4">
            {!isRecording ? (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={startRecording}
                className="w-16 h-16 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center shadow-lg transition-colors"
              >
                <Mic className="w-7 h-7" />
              </motion.button>
            ) : (
              <>
                {isPaused ? (
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={resumeRecording}
                    className="w-12 h-12 bg-green-500 hover:bg-green-600 text-white rounded-full flex items-center justify-center shadow-md"
                  >
                    <Play className="w-5 h-5 ml-0.5" />
                  </motion.button>
                ) : (
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={pauseRecording}
                    className="w-12 h-12 bg-amber-500 hover:bg-amber-600 text-white rounded-full flex items-center justify-center shadow-md"
                  >
                    <Pause className="w-5 h-5" />
                  </motion.button>
                )}
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={stopRecording}
                  className="w-16 h-16 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center shadow-lg"
                >
                  <Square className="w-6 h-6" />
                </motion.button>
              </>
            )}
          </div>

          {/* Timer + Status */}
          {isRecording && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center"
            >
              <div className="flex items-center justify-center gap-2">
                <div className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" />
                <span className="text-lg font-mono font-bold">{formatDuration(duration)}</span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                {isPaused ? 'En pause' : 'Enregistrement en cours...'}
              </p>
            </motion.div>
          )}

          {/* Transcription en temps reel */}
          {(transcript || interimTranscript) && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-slate-700">Transcription</h4>
                <div className="flex gap-1">
                  {!isRecording && transcript && (
                    <>
                      <Button variant="ghost" size="sm" onClick={handleEdit}>
                        <Edit3 className="w-3.5 h-3.5 mr-1" />
                        Editer
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => { setTranscript(''); setEditContent(''); setIsEditing(false); }}>
                        <Trash2 className="w-3.5 h-3.5 mr-1" />
                        Effacer
                      </Button>
                    </>
                  )}
                </div>
              </div>

              {isEditing ? (
                <textarea
                  ref={textareaRef}
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm focus:border-[#007AFF] focus:ring-1 focus:ring-[#007AFF] outline-none resize-y min-h-[120px]"
                />
              ) : (
                <div className="p-3 bg-slate-50 rounded-xl text-sm text-slate-700 min-h-[80px]">
                  {transcript}
                  {interimTranscript && (
                    <span className="text-slate-400 italic">{interimTranscript}</span>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          {(transcript || editContent) && !isRecording && (
            <div className="flex gap-2">
              <Button
                onClick={handleSave}
                className="flex-1 bg-[#007AFF] hover:bg-[#0051D5] text-white"
              >
                <Save className="w-4 h-4 mr-2" />
                Sauvegarder la note
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Historique des notes */}
      {savedNotes.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Notes enregistrees ({savedNotes.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {savedNotes.map((note) => (
              <div key={note.id} className="p-3 bg-slate-50 rounded-lg group">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-sm text-slate-700 line-clamp-3">{note.content}</p>
                    <div className="flex items-center gap-2 mt-2 text-xs text-slate-400">
                      <Badge variant="outline" className="text-[10px]">
                        {LANGUAGES.find((l) => l.code === note.language)?.flag}
                      </Badge>
                      <span>{formatDuration(note.duration)}</span>
                      <span>{new Date(note.createdAt).toLocaleDateString('fr-FR')}</span>
                      {note.editedAt && <span>(modifie)</span>}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => handleDelete(note.id)}
                  >
                    <Trash2 className="w-3.5 h-3.5 text-red-400" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
