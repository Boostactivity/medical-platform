/**
 * PHASE 4 - BLOC-NOTES PRIVE MEDECIN
 * Notes privees par patient, auto-save avec debounce, historique date
 * Visible UNIQUEMENT par le medecin - NON partage avec patient/prestataire
 * Stockage Supabase : table doctor_notes (doctor_id, patient_id, content, created_at)
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { StickyNote, Save, Clock, Trash2, Plus, Lock } from 'lucide-react';
import { supabase } from '../../supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { Badge } from '../ui/badge';
import { toast } from 'sonner';

interface NoteEntry {
  id: string;
  content: string;
  created_at: string;
  updated_at: string;
}

interface PrivateNotesProps {
  patientId: string;
  patientName: string;
  doctorId?: string;
}

// Simulated persistence (replace with Supabase in production)
const notesStorage: Record<string, NoteEntry[]> = {};

function getStoredNotes(patientId: string): NoteEntry[] {
  const key = `doctor_notes_${patientId}`;
  try {
    const stored = localStorage.getItem(key);
    if (stored) return JSON.parse(stored);
  } catch {
    // ignore
  }
  return notesStorage[patientId] || [];
}

function saveStoredNotes(patientId: string, notes: NoteEntry[]) {
  const key = `doctor_notes_${patientId}`;
  try {
    localStorage.setItem(key, JSON.stringify(notes));
  } catch {
    // ignore
  }
  notesStorage[patientId] = notes;
}

async function syncNoteToSupabase(doctorId: string, patientId: string, note: NoteEntry, isDelete = false) {
  try {
    if (isDelete) {
      await supabase.from('doctor_notes').delete().eq('id', note.id);
    } else {
      await supabase.from('doctor_notes').upsert({
        id: note.id,
        doctor_id: doctorId,
        patient_id: patientId,
        content: note.content,
        created_at: note.created_at,
        updated_at: note.updated_at,
      });
    }
  } catch (e) {
    console.warn('PrivateNotes: Supabase sync failed', e);
  }
}

export function PrivateNotes({ patientId, patientName, doctorId = 'dr-001' }: PrivateNotesProps) {
  const [notes, setNotes] = useState<NoteEntry[]>([]);
  const [currentNote, setCurrentNote] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load notes on mount - try Supabase first, fallback to localStorage
  useEffect(() => {
    const loadNotes = async () => {
      try {
        const { data, error } = await supabase
          .from('doctor_notes')
          .select('*')
          .eq('doctor_id', doctorId)
          .eq('patient_id', patientId)
          .order('created_at', { ascending: false });
        if (!error && data?.length) {
          const mapped: NoteEntry[] = data.map((n: any) => ({
            id: n.id,
            content: n.content,
            created_at: n.created_at,
            updated_at: n.updated_at || n.created_at,
          }));
          setNotes(mapped);
          return;
        }
      } catch (e) {
        console.warn('PrivateNotes: Supabase fetch failed, using localStorage', e);
      }
      const loaded = getStoredNotes(patientId);
      setNotes(loaded);
    };
    loadNotes();
  }, [patientId, doctorId]);

  // Auto-save with 2s debounce
  const autoSave = useCallback(
    (content: string, noteId: string | null) => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
      setSaveStatus('unsaved');

      debounceTimer.current = setTimeout(() => {
        setSaveStatus('saving');

        const now = new Date().toISOString();
        let updatedNotes: NoteEntry[];

        if (noteId) {
          // Update existing note
          updatedNotes = notes.map((n) =>
            n.id === noteId ? { ...n, content, updated_at: now } : n
          );
        } else {
          // Only auto-save new note if content is non-empty
          if (!content.trim()) {
            setSaveStatus('saved');
            return;
          }
          const newNote: NoteEntry = {
            id: `note-${Date.now()}`,
            content,
            created_at: now,
            updated_at: now,
          };
          updatedNotes = [newNote, ...notes];
          setEditingId(newNote.id);
        }

        setNotes(updatedNotes);
        saveStoredNotes(patientId, updatedNotes);
        // Sync to Supabase
        const targetNote = noteId
          ? updatedNotes.find(n => n.id === noteId)
          : updatedNotes[0];
        if (targetNote) syncNoteToSupabase(doctorId, patientId, targetNote);

        setTimeout(() => {
          setSaveStatus('saved');
        }, 300);
      }, 2000);
    },
    [notes, patientId, doctorId]
  );

  const handleContentChange = (value: string) => {
    setCurrentNote(value);
    autoSave(value, editingId);
  };

  const handleNewNote = () => {
    setEditingId(null);
    setCurrentNote('');
    setSaveStatus('saved');
  };

  const handleEditNote = (note: NoteEntry) => {
    setEditingId(note.id);
    setCurrentNote(note.content);
    setSaveStatus('saved');
  };

  const handleDeleteNote = (noteId: string) => {
    const deletedNote = notes.find(n => n.id === noteId);
    const updatedNotes = notes.filter((n) => n.id !== noteId);
    setNotes(updatedNotes);
    saveStoredNotes(patientId, updatedNotes);
    if (deletedNote) syncNoteToSupabase(doctorId, patientId, deletedNote, true);
    if (editingId === noteId) {
      setEditingId(null);
      setCurrentNote('');
    }
    toast.success('Note supprimee');
  };

  const handleManualSave = () => {
    if (!currentNote.trim()) return;

    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    setSaveStatus('saving');
    const now = new Date().toISOString();
    let updatedNotes: NoteEntry[];

    if (editingId) {
      updatedNotes = notes.map((n) =>
        n.id === editingId ? { ...n, content: currentNote, updated_at: now } : n
      );
    } else {
      const newNote: NoteEntry = {
        id: `note-${Date.now()}`,
        content: currentNote,
        created_at: now,
        updated_at: now,
      };
      updatedNotes = [newNote, ...notes];
      setEditingId(newNote.id);
    }

    setNotes(updatedNotes);
    saveStoredNotes(patientId, updatedNotes);
    // Sync to Supabase
    const targetNote = editingId
      ? updatedNotes.find(n => n.id === editingId)
      : updatedNotes[0];
    if (targetNote) syncNoteToSupabase(doctorId, patientId, targetNote);

    setTimeout(() => {
      setSaveStatus('saved');
      toast.success('Note sauvegardee');
    }, 300);
  };

  const formatDate = (iso: string) => {
    return new Date(iso).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <StickyNote className="w-5 h-5 text-amber-500" />
              Notes privees - {patientName}
            </CardTitle>
            <CardDescription className="flex items-center gap-1 mt-1">
              <Lock className="w-3 h-3" />
              Visible uniquement par vous. Non partage avec le patient ou le prestataire.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge
              variant={
                saveStatus === 'saved'
                  ? 'default'
                  : saveStatus === 'saving'
                  ? 'secondary'
                  : 'outline'
              }
              className="text-xs"
            >
              {saveStatus === 'saved' && 'Sauvegarde'}
              {saveStatus === 'saving' && 'Sauvegarde...'}
              {saveStatus === 'unsaved' && 'Non sauvegarde'}
            </Badge>
            <Button variant="outline" size="sm" onClick={handleNewNote}>
              <Plus className="w-4 h-4 mr-1" />
              Nouvelle note
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Editor */}
        <div className="space-y-2">
          <Textarea
            value={currentNote}
            onChange={(e) => handleContentChange(e.target.value)}
            placeholder="Saisissez vos observations privees sur ce patient... (auto-save apres 2s)"
            className="min-h-[120px] resize-y"
          />
          <div className="flex justify-end">
            <Button size="sm" onClick={handleManualSave} disabled={!currentNote.trim()}>
              <Save className="w-4 h-4 mr-1" />
              Sauvegarder
            </Button>
          </div>
        </div>

        {/* Notes history */}
        {notes.length > 0 && (
          <div className="border-t pt-4">
            <h4 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-1">
              <Clock className="w-4 h-4" />
              Historique des notes ({notes.length})
            </h4>
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {notes.map((note) => (
                <div
                  key={note.id}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                    editingId === note.id
                      ? 'border-primary bg-primary/5'
                      : 'hover:bg-accent/50'
                  }`}
                  onClick={() => handleEditNote(note)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-muted-foreground mb-1">
                        {formatDate(note.created_at)}
                        {note.updated_at !== note.created_at && (
                          <span className="ml-2 italic">(modifiee le {formatDate(note.updated_at)})</span>
                        )}
                      </p>
                      <p className="text-sm whitespace-pre-wrap line-clamp-3">{note.content}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 flex-shrink-0 ml-2"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteNote(note.id);
                      }}
                    >
                      <Trash2 className="w-3.5 h-3.5 text-red-500" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {notes.length === 0 && (
          <div className="text-center py-6 text-muted-foreground">
            <StickyNote className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Aucune note pour ce patient</p>
            <p className="text-xs">Commencez a ecrire dans le champ ci-dessus</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
