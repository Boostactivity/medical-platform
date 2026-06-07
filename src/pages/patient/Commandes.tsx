/**
 * COMMANDES PATIENT — marketplace consommables PPC (audience 50-70 ans).
 *
 * Règles dures :
 *   - Vouvoiement, polices ≥ 16px, ANTI-SHAME, aucun emoji.
 *   - Les consommables PPC sont PRIS EN CHARGE (forfait LPP) :
 *     transparence Sécu affichée, prix jamais mis en avant,
 *     AUCUNE urgence artificielle ni pression commerciale.
 *   - Calendrier de renouvellement en haut ("à renouveler dans X jours"),
 *     catalogue sobre, panier simple (state local), liste des commandes.
 *
 * Données réelles via src/utils/api.ts → routes /patient/marketplace/*.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Minus, Package, Plus, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { api, ApiError } from '../../utils/api';

interface CatalogueItem {
  id: string;
  type: string;
  name: string;
  size: string | null;
  manufacturer: string | null;
  replacement_frequency_days: number | null;
  unit_price_indicatif: number | null;
  covered_by_insurance: boolean;
  available: boolean;
}

interface RenewalItem {
  id: string;
  item_type: string;
  model_ref: string;
  size: string | null;
  renewal_due_at: string | null;
  days_until_renewal: number | null;
}

interface OrderItem {
  id: string;
  item_label: string;
  quantity: number;
  covered_by_insurance: boolean;
}

interface PatientOrder {
  id: string;
  status: string;
  note: string | null;
  created_at: string;
  items: OrderItem[];
}

const TYPE_LABELS: Record<string, string> = {
  mask_nasal: 'Masque nasal',
  mask_facial: 'Masque facial',
  mask_narinaire: 'Masque narinaire',
  filter: 'Filtre',
  tube: 'Tubulure',
  humidifier: 'Humidificateur',
  headgear: 'Harnais',
};

const RENEWAL_LABELS: Record<string, string> = {
  mask: 'Votre masque',
  tubing: 'Votre tubulure',
  filter: 'Votre filtre',
  humidifier: 'Votre humidificateur',
};

const ORDER_STATUS_LABELS: Record<string, { label: string; className: string }> = {
  draft: { label: 'Brouillon', className: 'bg-[#F2F0EB] text-[#5C5C5C]' },
  confirmed: { label: 'Envoyée', className: 'bg-[#007AFF]/10 text-[#007AFF]' },
  preparing: { label: 'En préparation', className: 'bg-[#007AFF]/10 text-[#007AFF]' },
  shipped: { label: 'Expédiée', className: 'bg-[#007AFF]/10 text-[#007AFF]' },
  delivered: { label: 'Livrée', className: 'bg-emerald-50 text-emerald-700' },
  cancelled: { label: 'Annulée', className: 'bg-[#F2F0EB] text-[#5C5C5C]' },
};

function formatDateFr(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}

/** Phrase de renouvellement, factuelle et sans alarme. */
function renewalSentence(item: RenewalItem): string {
  const days = item.days_until_renewal;
  if (days == null) return 'Date de renouvellement à confirmer avec votre prestataire.';
  if (days > 1) return `À renouveler dans ${days} jours.`;
  if (days === 1) return 'À renouveler demain.';
  return 'Le renouvellement est possible dès maintenant.';
}

export function Commandes() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [catalogue, setCatalogue] = useState<CatalogueItem[]>([]);
  const [renewals, setRenewals] = useState<RenewalItem[]>([]);
  const [orders, setOrders] = useState<PatientOrder[]>([]);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [note, setNote] = useState('');
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    const results = await Promise.allSettled([
      api.get('/patient/marketplace/renouvellements'),
      api.get('/patient/marketplace/catalogue'),
      api.get('/patient/marketplace/commandes'),
    ]);

    const unauthorized = results.some(
      (r) => r.status === 'rejected' && r.reason instanceof ApiError && r.reason.status === 401,
    );
    if (unauthorized) {
      localStorage.removeItem('access_token');
      navigate('/patient/connexion');
      return;
    }

    const [renewalsRes, catalogueRes, ordersRes] = results;
    if (renewalsRes.status === 'fulfilled') setRenewals(renewalsRes.value?.items ?? []);
    if (catalogueRes.status === 'fulfilled') setCatalogue(catalogueRes.value?.items ?? []);
    if (ordersRes.status === 'fulfilled') setOrders(ordersRes.value?.orders ?? []);

    if (results.every((r) => r.status === 'rejected')) {
      toast.error('Vos données ne sont pas accessibles pour le moment. Réessayez dans quelques minutes.');
    }
    setLoading(false);
  }, [navigate]);

  useEffect(() => {
    load();
  }, [load]);

  const cartEntries = useMemo(
    () =>
      Object.entries(cart)
        .filter(([, qty]) => qty > 0)
        .map(([id, qty]) => ({ item: catalogue.find((c) => c.id === id), qty }))
        .filter((e) => e.item) as Array<{ item: CatalogueItem; qty: number }>,
    [cart, catalogue],
  );

  const updateQty = (id: string, delta: number) => {
    setCart((prev) => {
      const next = Math.max(0, Math.min(10, (prev[id] ?? 0) + delta));
      const copy = { ...prev };
      if (next === 0) delete copy[id];
      else copy[id] = next;
      return copy;
    });
  };

  const submitOrder = async () => {
    if (cartEntries.length === 0) return;
    setSending(true);
    try {
      await api.post('/patient/marketplace/commandes', {
        items: cartEntries.map(({ item, qty }) => ({ consumable_id: item.id, quantity: qty })),
        note: note.trim() || undefined,
      });
      toast.success('Votre commande est envoyée. Votre prestataire la prépare.');
      setCart({});
      setNote('');
      load();
    } catch {
      toast.error('L\'envoi n\'a pas fonctionné. Réessayez ou appelez votre prestataire.');
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center px-6">
        <div className="text-center">
          <div className="w-14 h-14 border-4 border-[#007AFF] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-lg text-[#1A1A1A]">Chargement de vos commandes…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAF7] text-base">
      <header className="bg-white border-b border-[#E8E5DE] sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-3">
          <Link
            to="/patient/dashboard"
            className="flex items-center gap-2 h-11 px-3 rounded-xl text-base text-[#5C5C5C] hover:text-[#1A1A1A] hover:bg-[#F2F0EB] transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="hidden sm:inline">Mon espace</span>
          </Link>
          <span className="text-lg text-[#1A1A1A]">Mes commandes</span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-6">
        {/* 1. Calendrier de renouvellement */}
        {renewals.length > 0 && (
          <section className="bg-white rounded-3xl border border-[#E8E5DE] p-6 sm:p-8 shadow-sm">
            <h1 className="text-xl text-[#1A1A1A] mb-1">Votre calendrier de renouvellement</h1>
            <p className="text-base text-[#5C5C5C] mb-5 leading-relaxed">
              Votre matériel s'use avec le temps : le remplacer régulièrement garde
              votre traitement confortable et efficace.
            </p>
            <ul className="space-y-3">
              {renewals.map((item) => (
                <li
                  key={item.id}
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 rounded-2xl bg-[#FAFAF7] border border-[#E8E5DE] px-4 py-3"
                >
                  <div>
                    <span className="text-base text-[#1A1A1A]" style={{ fontWeight: 500 }}>
                      {RENEWAL_LABELS[item.item_type] ?? 'Votre équipement'}
                    </span>
                    <span className="text-base text-[#5C5C5C]">
                      {' '}— {item.model_ref}
                      {item.size ? ` (taille ${item.size})` : ''}
                    </span>
                  </div>
                  <span
                    className={`text-base ${
                      item.days_until_renewal != null && item.days_until_renewal <= 30
                        ? 'text-[#007AFF]'
                        : 'text-[#5C5C5C]'
                    }`}
                  >
                    {renewalSentence(item)}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* 2. Transparence Sécurité sociale */}
        <section className="bg-white rounded-3xl border border-[#E8E5DE] p-6 sm:p-8 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#007AFF]/10 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5 text-[#007AFF]" />
            </div>
            <div>
              <h2 className="text-xl text-[#1A1A1A] mb-1">
                Ce que la Sécurité sociale prend en charge
              </h2>
              <p className="text-base text-[#5C5C5C] leading-relaxed">
                Les masques, tubulures et filtres de votre appareil PPC font partie
                de votre prise en charge par l'Assurance Maladie (forfait de votre
                prestataire). Vous n'avez rien à payer en commandant ici : les prix
                affichés sont indicatifs. Votre prestataire prépare et vous livre
                votre commande.
              </p>
            </div>
          </div>
        </section>

        {/* 3. Catalogue */}
        <section className="bg-white rounded-3xl border border-[#E8E5DE] p-6 sm:p-8 shadow-sm">
          <h2 className="text-xl text-[#1A1A1A] mb-1">Commander des consommables</h2>
          <p className="text-base text-[#5C5C5C] mb-5 leading-relaxed">
            Choisissez ce dont vous avez besoin, à votre rythme. En cas de doute
            sur un modèle ou une taille, votre prestataire peut vous conseiller.
          </p>

          {catalogue.length === 0 ? (
            <p className="text-base text-[#5C5C5C]">
              Le catalogue n'est pas disponible pour le moment. Contactez votre
              prestataire pour commander.
            </p>
          ) : (
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {catalogue.map((item) => {
                const qty = cart[item.id] ?? 0;
                return (
                  <li
                    key={item.id}
                    className="rounded-2xl border border-[#E8E5DE] p-4 flex flex-col gap-2"
                  >
                    <div>
                      <p className="text-base text-[#1A1A1A] leading-snug" style={{ fontWeight: 500 }}>
                        {item.name}
                        {item.size ? ` (${item.size})` : ''}
                      </p>
                      <p className="text-base text-[#5C5C5C]">
                        {TYPE_LABELS[item.type] ?? item.type}
                        {item.replacement_frequency_days
                          ? ` — à remplacer tous les ${item.replacement_frequency_days} jours`
                          : ''}
                      </p>
                    </div>
                    <span className="inline-flex items-center gap-1.5 self-start rounded-full bg-[#007AFF]/10 text-[#007AFF] text-base px-3 py-0.5">
                      <ShieldCheck className="w-4 h-4" />
                      Pris en charge
                    </span>
                    {!item.available ? (
                      <p className="text-base text-[#5C5C5C] mt-auto">
                        Temporairement indisponible — votre prestataire vous le
                        proposera dès son retour en stock.
                      </p>
                    ) : qty === 0 ? (
                      <button
                        onClick={() => updateQty(item.id, 1)}
                        className="mt-auto h-11 rounded-xl border border-[#E8E5DE] text-base text-[#1A1A1A] hover:border-[#007AFF]/40 transition-colors"
                      >
                        Ajouter à ma commande
                      </button>
                    ) : (
                      <div className="mt-auto flex items-center justify-between rounded-xl border border-[#007AFF]/30 bg-[#007AFF]/5 px-2 py-1">
                        <button
                          onClick={() => updateQty(item.id, -1)}
                          aria-label="Réduire la quantité"
                          className="w-11 h-11 rounded-lg flex items-center justify-center text-[#007AFF] hover:bg-[#007AFF]/10"
                        >
                          <Minus className="w-5 h-5" />
                        </button>
                        <span className="text-base text-[#1A1A1A] tabular-nums" style={{ fontWeight: 500 }}>
                          {qty}
                        </span>
                        <button
                          onClick={() => updateQty(item.id, 1)}
                          aria-label="Augmenter la quantité"
                          className="w-11 h-11 rounded-lg flex items-center justify-center text-[#007AFF] hover:bg-[#007AFF]/10"
                        >
                          <Plus className="w-5 h-5" />
                        </button>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* 4. Panier */}
        {cartEntries.length > 0 && (
          <section className="bg-white rounded-3xl border border-[#007AFF]/30 p-6 sm:p-8 shadow-sm">
            <h2 className="text-xl text-[#1A1A1A] mb-4">Votre commande</h2>
            <ul className="space-y-2 mb-4">
              {cartEntries.map(({ item, qty }) => (
                <li key={item.id} className="flex items-center justify-between text-base text-[#1A1A1A]">
                  <span>
                    {item.name}
                    {item.size ? ` (${item.size})` : ''}
                  </span>
                  <span className="tabular-nums text-[#5C5C5C]">× {qty}</span>
                </li>
              ))}
            </ul>
            <label htmlFor="order-note" className="block text-base text-[#5C5C5C] mb-1.5">
              Un message pour votre prestataire (facultatif)
            </label>
            <textarea
              id="order-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={1000}
              rows={2}
              placeholder="Par exemple : je préfère une livraison en fin de semaine."
              className="w-full rounded-xl border border-[#E8E5DE] bg-white px-4 py-3 text-base text-[#1A1A1A] placeholder:text-[#9A9890] focus:outline-none focus:border-[#007AFF] mb-4"
            />
            <button
              onClick={submitOrder}
              disabled={sending}
              className="w-full h-14 rounded-2xl bg-[#007AFF] text-white text-base hover:bg-[#0066D6] transition-colors disabled:opacity-60"
              style={{ fontWeight: 500 }}
            >
              {sending ? 'Envoi en cours…' : 'Envoyer ma commande'}
            </button>
            <p className="text-base text-[#5C5C5C] mt-3 leading-relaxed">
              Rien ne vous sera facturé : ces consommables sont compris dans votre
              prise en charge.
            </p>
          </section>
        )}

        {/* 5. Historique des commandes */}
        <section className="bg-white rounded-3xl border border-[#E8E5DE] p-6 sm:p-8 shadow-sm">
          <h2 className="text-xl text-[#1A1A1A] mb-4">Vos commandes passées</h2>
          {orders.length === 0 ? (
            <div className="text-center py-6">
              <Package className="w-8 h-8 text-[#9A9890] mx-auto mb-2" />
              <p className="text-base text-[#5C5C5C]">
                Vous n'avez pas encore passé de commande.
              </p>
            </div>
          ) : (
            <ul className="space-y-3">
              {orders.map((order) => {
                const status = ORDER_STATUS_LABELS[order.status] ?? {
                  label: order.status,
                  className: 'bg-[#F2F0EB] text-[#5C5C5C]',
                };
                return (
                  <li
                    key={order.id}
                    className="rounded-2xl border border-[#E8E5DE] px-4 py-3"
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-base text-[#5C5C5C]">
                        {formatDateFr(order.created_at)}
                      </span>
                      <span className={`rounded-full px-3 py-0.5 text-base ${status.className}`}>
                        {status.label}
                      </span>
                    </div>
                    <p className="text-base text-[#1A1A1A] leading-relaxed">
                      {order.items
                        .map((i) => `${i.item_label} × ${i.quantity}`)
                        .join(' · ') || 'Commande sans détail'}
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
