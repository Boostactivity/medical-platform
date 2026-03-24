/**
 * PHASE 4 - TELECONSULTATION
 * Interface de prise de RDV, lancement teleconsultation, historique, notes post-consultation
 * Placeholder pour integration Jitsi/Daily.co
 */

import { useState, useEffect } from 'react';
import { Video, Calendar, Clock, MessageSquare, Play, Plus, X, Check } from 'lucide-react';
import { supabase } from '../../supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Textarea } from '../ui/textarea';
import { toast } from 'sonner';

interface Appointment {
  id: string;
  date: string;
  time: string;
  status: 'scheduled' | 'completed' | 'cancelled';
  notes?: string;
  duration?: number; // minutes
}

interface TeleconsultationProps {
  patientId: string;
  patientName: string;
  doctorName?: string;
}

// Mock past consultations
const mockConsultations: Appointment[] = [
  {
    id: 'tc-001',
    date: '2026-03-10',
    time: '14:30',
    status: 'completed',
    notes: 'Patient en bonne observance. Ajustement masque recommande. Prochain RDV dans 3 mois.',
    duration: 15,
  },
  {
    id: 'tc-002',
    date: '2026-01-15',
    time: '10:00',
    status: 'completed',
    notes: 'Premiere teleconsultation. Installation du traitement PPC il y a 2 semaines. Patient a quelques difficultes d\'adaptation.',
    duration: 25,
  },
  {
    id: 'tc-003',
    date: '2025-11-20',
    time: '16:00',
    status: 'cancelled',
    notes: 'Annule par le patient - reporte.',
  },
];

export function Teleconsultation({ patientId, patientName, doctorName = 'Dr. Martin' }: TeleconsultationProps) {
  const [consultations, setConsultations] = useState<Appointment[]>(mockConsultations);
  const [showScheduler, setShowScheduler] = useState(false);

  // Fetch teleconsultation interventions from Supabase
  useEffect(() => {
    const fetchConsultations = async () => {
      try {
        const { data, error } = await supabase
          .from('interventions')
          .select('*')
          .eq('patient_id', patientId)
          .eq('type', 'teleconsultation')
          .order('date', { ascending: false });
        if (!error && data?.length) {
          const mapped: Appointment[] = data.map((d: any) => ({
            id: d.id,
            date: d.date,
            time: d.time || '00:00',
            status: d.status || 'scheduled',
            notes: d.notes,
            duration: d.duration,
          }));
          setConsultations(mapped);
        }
      } catch (e) {
        console.warn('Teleconsultation: Using mock data', e);
      }
    };
    fetchConsultations();
  }, [patientId]);
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('');
  const [postNotes, setPostNotes] = useState<Record<string, string>>({});
  const [editingNotesId, setEditingNotesId] = useState<string | null>(null);

  const handleSchedule = async () => {
    if (!newDate || !newTime) {
      toast.error('Veuillez selectionner une date et une heure');
      return;
    }

    const newAppt: Appointment = {
      id: `tc-${Date.now()}`,
      date: newDate,
      time: newTime,
      status: 'scheduled',
    };

    setConsultations([newAppt, ...consultations]);
    setShowScheduler(false);
    setNewDate('');
    setNewTime('');

    // Save to Supabase
    try {
      await supabase.from('interventions').insert({
        patient_id: patientId,
        type: 'teleconsultation',
        date: newDate,
        time: newTime,
        status: 'scheduled',
      });
    } catch (e) {
      console.warn('Teleconsultation: Failed to save to Supabase', e);
    }

    toast.success('Teleconsultation programmee', {
      description: `RDV le ${new Date(newDate).toLocaleDateString('fr-FR')} a ${newTime}`,
    });
  };

  const handleLaunchTeleconsultation = (apptId: string) => {
    // Placeholder: In production, this would open Jitsi/Daily.co room
    toast.info('Lancement de la teleconsultation...', {
      description: 'Integration Jitsi Meet / Daily.co a configurer. Un lien de visioconference sera genere automatiquement.',
    });

    // Simulate opening a video call URL
    const roomId = `medconnect-${patientId}-${Date.now()}`;
    console.log(`[Teleconsultation] Room URL: https://meet.jit.si/${roomId}`);
  };

  const handleCompleteConsultation = (apptId: string) => {
    setConsultations(
      consultations.map((c) =>
        c.id === apptId ? { ...c, status: 'completed' as const, duration: 15 } : c
      )
    );
    setEditingNotesId(apptId);
    toast.success('Consultation marquee comme terminee');
  };

  const handleSavePostNotes = (apptId: string) => {
    const notes = postNotes[apptId];
    if (!notes?.trim()) return;

    setConsultations(
      consultations.map((c) =>
        c.id === apptId ? { ...c, notes } : c
      )
    );
    setEditingNotesId(null);
    toast.success('Notes post-consultation sauvegardees');
  };

  const handleCancelAppointment = (apptId: string) => {
    setConsultations(
      consultations.map((c) =>
        c.id === apptId ? { ...c, status: 'cancelled' as const } : c
      )
    );
    toast.info('Rendez-vous annule');
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const getStatusBadge = (status: Appointment['status']) => {
    switch (status) {
      case 'scheduled':
        return <Badge className="bg-blue-500">Programme</Badge>;
      case 'completed':
        return <Badge className="bg-green-500">Terminee</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Annulee</Badge>;
    }
  };

  const scheduled = consultations.filter((c) => c.status === 'scheduled');
  const past = consultations.filter((c) => c.status !== 'scheduled');

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Video className="w-5 h-5 text-blue-500" />
              Teleconsultation - {patientName}
            </CardTitle>
            <CardDescription>
              Planifiez et gerez vos teleconsultations avec ce patient
            </CardDescription>
          </div>
          <Button onClick={() => setShowScheduler(!showScheduler)}>
            {showScheduler ? (
              <>
                <X className="w-4 h-4 mr-1" />
                Annuler
              </>
            ) : (
              <>
                <Plus className="w-4 h-4 mr-1" />
                Nouveau RDV
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Scheduler */}
        {showScheduler && (
          <div className="p-4 border-2 border-dashed border-blue-200 rounded-lg bg-blue-50/50 space-y-3">
            <h4 className="font-medium text-sm">Programmer une teleconsultation</h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Date</label>
                <input
                  type="date"
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full h-9 px-3 rounded-md border bg-background text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Heure</label>
                <input
                  type="time"
                  value={newTime}
                  onChange={(e) => setNewTime(e.target.value)}
                  className="w-full h-9 px-3 rounded-md border bg-background text-sm"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowScheduler(false)}>
                Annuler
              </Button>
              <Button size="sm" onClick={handleSchedule}>
                <Calendar className="w-4 h-4 mr-1" />
                Confirmer le RDV
              </Button>
            </div>
          </div>
        )}

        {/* Upcoming consultations */}
        {scheduled.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-muted-foreground mb-3">
              Prochaines consultations ({scheduled.length})
            </h4>
            <div className="space-y-2">
              {scheduled.map((appt) => (
                <div
                  key={appt.id}
                  className="p-4 border rounded-lg bg-blue-50/30 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Calendar className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{formatDate(appt.date)}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {appt.time}
                      </p>
                    </div>
                    {getStatusBadge(appt.status)}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      className="bg-green-600 hover:bg-green-700"
                      onClick={() => handleLaunchTeleconsultation(appt.id)}
                    >
                      <Play className="w-4 h-4 mr-1" />
                      Lancer
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleCompleteConsultation(appt.id)}
                    >
                      <Check className="w-4 h-4 mr-1" />
                      Terminer
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleCancelAppointment(appt.id)}
                    >
                      <X className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Past consultations */}
        <div>
          <h4 className="text-sm font-medium text-muted-foreground mb-3">
            Historique des consultations ({past.length})
          </h4>
          {past.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <Video className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Aucune consultation passee</p>
            </div>
          ) : (
            <div className="space-y-2">
              {past.map((appt) => (
                <div key={appt.id} className="p-4 border rounded-lg space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          appt.status === 'completed'
                            ? 'bg-green-100'
                            : 'bg-red-100'
                        }`}
                      >
                        <Video
                          className={`w-5 h-5 ${
                            appt.status === 'completed'
                              ? 'text-green-600'
                              : 'text-red-400'
                          }`}
                        />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{formatDate(appt.date)}</p>
                        <p className="text-xs text-muted-foreground">
                          {appt.time}
                          {appt.duration && ` - Duree : ${appt.duration} min`}
                        </p>
                      </div>
                      {getStatusBadge(appt.status)}
                    </div>
                    {appt.status === 'completed' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingNotesId(editingNotesId === appt.id ? null : appt.id)}
                      >
                        <MessageSquare className="w-4 h-4 mr-1" />
                        Notes
                      </Button>
                    )}
                  </div>

                  {/* Notes display or editor */}
                  {appt.notes && editingNotesId !== appt.id && (
                    <div className="ml-13 pl-3 border-l-2 border-green-200">
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                        {appt.notes}
                      </p>
                    </div>
                  )}

                  {editingNotesId === appt.id && (
                    <div className="ml-13 space-y-2">
                      <Textarea
                        value={postNotes[appt.id] ?? appt.notes ?? ''}
                        onChange={(e) =>
                          setPostNotes({ ...postNotes, [appt.id]: e.target.value })
                        }
                        placeholder="Notes post-consultation..."
                        className="min-h-[80px]"
                      />
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setEditingNotesId(null)}
                        >
                          Annuler
                        </Button>
                        <Button size="sm" onClick={() => handleSavePostNotes(appt.id)}>
                          Sauvegarder
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
