/**
 * Onglet "Coffre documentaire" : documents de preuve conformité PSDM,
 * échéances d'expiration (docs à renouveler), ajout de métadonnées.
 * L'upload binaire Supabase Storage viendra plus tard — on référence
 * storage_path.
 */

import { useEffect, useState } from 'react';
import { toast } from 'sonner@2.0.3';
import { FileText, Plus } from 'lucide-react';
import { api } from '../../utils/api';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import {
  DOC_TYPE_LABELS,
  formatDateFr,
  type DocType,
  type PsdmCriterion,
  type PsdmDocument,
} from './types';

interface DocumentsTabProps {
  criteria: PsdmCriterion[];
}

function expiryBadge(expiresAt: string | null) {
  if (!expiresAt) return null;
  const today = new Date().toISOString().slice(0, 10);
  const in60Days = new Date(Date.now() + 60 * 86400000).toISOString().slice(0, 10);
  if (expiresAt < today) {
    return <Badge variant="outline" className="border-transparent bg-red-100 text-red-800">Expiré</Badge>;
  }
  if (expiresAt <= in60Days) {
    return <Badge variant="outline" className="border-transparent bg-amber-100 text-amber-800">Expire bientôt</Badge>;
  }
  return null;
}

const NO_CRITERION = '__none__';

export function DocumentsTab({ criteria }: DocumentsTabProps) {
  const [documents, setDocuments] = useState<PsdmDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  const [title, setTitle] = useState('');
  const [docType, setDocType] = useState<DocType>('procedure');
  const [criterionId, setCriterionId] = useState(NO_CRITERION);
  const [storagePath, setStoragePath] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [creating, setCreating] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      const data = await api.get('/psdm/documents');
      setDocuments(data.documents ?? []);
    } catch (e: any) {
      toast.error('Échec du chargement du coffre documentaire', { description: e.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const createDocument = async () => {
    if (!title.trim()) {
      toast.error('Le titre est requis');
      return;
    }
    try {
      setCreating(true);
      await api.post('/psdm/documents', {
        title: title.trim(),
        doc_type: docType,
        criterion_id: criterionId === NO_CRITERION ? null : criterionId,
        storage_path: storagePath.trim() || null,
        expires_at: expiresAt || null,
      });
      toast.success('Document référencé');
      setDialogOpen(false);
      setTitle('');
      setDocType('procedure');
      setCriterionId(NO_CRITERION);
      setStoragePath('');
      setExpiresAt('');
      load();
    } catch (e: any) {
      toast.error('Échec de l’ajout', { description: e.message });
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {documents.length} document{documents.length > 1 ? 's' : ''} de conformité
        </p>
        <Button size="sm" onClick={() => setDialogOpen(true)}>
          <Plus className="size-4" />
          Référencer un document
        </Button>
      </div>

      {loading ? (
        <p className="py-8 text-center text-sm text-muted-foreground">Chargement...</p>
      ) : documents.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-10 text-center">
            <FileText className="size-8 text-muted-foreground" />
            <p className="text-sm text-foreground">Le coffre documentaire est vide.</p>
            <p className="text-sm text-muted-foreground">
              Référencez vos procédures, attestations et enregistrements qualité :
              ils constitueront les preuves du dossier d’audit Cofrac.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {documents.map((doc) => (
            <Card key={doc.id}>
              <CardContent className="py-4">
                <div className="flex flex-wrap items-center gap-2">
                  <FileText className="size-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-foreground">{doc.title}</span>
                  <Badge variant="secondary">{DOC_TYPE_LABELS[doc.doc_type] ?? doc.doc_type}</Badge>
                  {expiryBadge(doc.expires_at)}
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {doc.psdm_criteria
                    ? `Critère ${doc.psdm_criteria.code} — ${doc.psdm_criteria.label}`
                    : 'Document transverse (non rattaché à un critère)'}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Ajouté le {formatDateFr(doc.created_at)}
                  {doc.expires_at ? ` — Expire le ${formatDateFr(doc.expires_at)}` : ''}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-background">
          <DialogHeader>
            <DialogTitle>Référencer un document de conformité</DialogTitle>
            <DialogDescription className="text-sm">
              Métadonnées du document. Le dépôt du fichier dans le coffre sécurisé
              sera disponible prochainement.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm">Titre</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex. : Procédure de désinfection des dispositifs PPC"
                className="text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-sm">Type</Label>
                <Select value={docType} onValueChange={(v) => setDocType(v as DocType)}>
                  <SelectTrigger className="w-full text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(DOC_TYPE_LABELS) as DocType[]).map((t) => (
                      <SelectItem key={t} value={t} className="text-sm">
                        {DOC_TYPE_LABELS[t]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-sm">Date d’expiration</Label>
                <Input type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} className="text-sm" />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Critère lié (optionnel)</Label>
              <Select value={criterionId} onValueChange={setCriterionId}>
                <SelectTrigger className="w-full text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_CRITERION} className="text-sm">
                    Document transverse
                  </SelectItem>
                  {criteria.map((cr) => (
                    <SelectItem key={cr.id} value={cr.id} className="text-sm">
                      {cr.code} — {cr.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Chemin de stockage (optionnel)</Label>
              <Input
                value={storagePath}
                onChange={(e) => setStoragePath(e.target.value)}
                placeholder="Référence interne ou chemin du fichier"
                className="text-sm"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Annuler</Button>
            <Button onClick={createDocument} disabled={creating}>
              {creating ? 'Ajout...' : 'Référencer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
