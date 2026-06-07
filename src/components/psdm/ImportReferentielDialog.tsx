/**
 * Import du référentiel officiel HAS PSDM (60 critères / 4 chapitres).
 * Anti-hallucination : la base démarre vide, les critères proviennent
 * exclusivement du document officiel HAS collé ici en JSON par un
 * administrateur — jamais générés par l'application.
 */

import { useState } from 'react';
import { toast } from 'sonner@2.0.3';
import { Upload } from 'lucide-react';
import { api } from '../../utils/api';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';

interface ImportReferentielDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImported: () => void;
}

const EXAMPLE = `[
  {
    "code": "1.1",
    "chapter_number": 1,
    "label": "Libellé exact du critère HAS",
    "description": "Description officielle",
    "expected_evidence": "Preuve attendue à l'audit",
    "criticality": "standard",
    "source": "Référentiel HAS PSDM 18/06/2024, chapitre 1"
  }
]`;

export function ImportReferentielDialog({ open, onOpenChange, onImported }: ImportReferentielDialogProps) {
  const [raw, setRaw] = useState('');
  const [importing, setImporting] = useState(false);

  const runImport = async () => {
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      toast.error('JSON invalide', { description: 'Vérifiez le format du contenu collé.' });
      return;
    }
    try {
      setImporting(true);
      const result = await api.post('/psdm/import-referentiel', parsed);
      toast.success('Référentiel importé', {
        description: `${result.imported_count} critère(s) chargé(s) sur ${result.expected_total} attendus.`,
      });
      setRaw('');
      onOpenChange(false);
      onImported();
    } catch (e: any) {
      toast.error('Échec de l’import', { description: e.message });
    } finally {
      setImporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-background sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Importer le référentiel officiel HAS</DialogTitle>
          <DialogDescription className="text-sm">
            Collez les 60 critères du référentiel de certification PSDM
            (HAS, 18 juin 2024) au format JSON. Cette opération est réservée
            aux administrateurs. Les critères ne sont jamais générés
            automatiquement : seule la transcription du document officiel
            fait foi.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Textarea
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            placeholder={EXAMPLE}
            className="min-h-56 font-mono text-sm"
          />
          <p className="text-sm text-muted-foreground">
            Champs requis par critère : code, chapter_number (1 à 4), label.
            Champs optionnels : description, expected_evidence, criticality
            (standard ou critique), domain, source, display_order.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button onClick={runImport} disabled={importing || !raw.trim()}>
            <Upload className="size-4" />
            {importing ? 'Import en cours...' : 'Importer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
