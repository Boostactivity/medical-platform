import React, { useState, useMemo } from 'react';

// Types
interface Product {
  id: string;
  name: string;
  description: string;
  category: ProductCategory;
  price: number;
  image: string; // emoji placeholder
  compatibility: string[];
  replacementMonths: number; // frequence de remplacement recommandee
  inStock: boolean;
}

interface Order {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  status: 'pending' | 'confirmed' | 'shipped' | 'delivered';
  date: string;
  price: number;
}

type ProductCategory = 'masques' | 'filtres' | 'tuyaux' | 'humidificateurs' | 'oreillers' | 'accessoires';

const CATEGORIES: { id: ProductCategory; label: string; icon: string }[] = [
  { id: 'masques', label: 'Masques', icon: '\uD83D\uDE37' },
  { id: 'filtres', label: 'Filtres', icon: '\uD83C\uDF2C\uFE0F' },
  { id: 'tuyaux', label: 'Tuyaux', icon: '\uD83D\uDD27' },
  { id: 'humidificateurs', label: 'Humidificateurs', icon: '\uD83D\uDCA7' },
  { id: 'oreillers', label: 'Oreillers PPC', icon: '\uD83D\uDECF\uFE0F' },
  { id: 'accessoires', label: 'Accessoires', icon: '\uD83C\uDFD2' },
];

const PRODUCTS: Product[] = [
  // Masques
  { id: 'mask-1', name: 'Masque nasal AirFit N20', description: 'Masque nasal leger avec coussin InfinitySeal. Ideal pour les dormeurs qui respirent par le nez. Compatible avec la plupart des machines PPC.', category: 'masques', price: 89.90, image: '\uD83D\uDE37', compatibility: ['ResMed AirSense 10', 'ResMed AirSense 11'], replacementMonths: 6, inStock: true },
  { id: 'mask-2', name: 'Masque facial AirFit F20', description: 'Masque facial couvrant nez et bouche. Recommande pour les patients qui respirent par la bouche pendant le sommeil.', category: 'masques', price: 119.90, image: '\uD83D\uDE37', compatibility: ['ResMed AirSense 10', 'ResMed AirSense 11', 'Philips DreamStation'], replacementMonths: 6, inStock: true },
  { id: 'mask-3', name: 'Masque narinaire AirFit P10', description: 'Le masque narinaire le plus leger du marche (50g). Minimaliste et silencieux. Parfait pour les claustrophobes.', category: 'masques', price: 79.90, image: '\uD83D\uDE37', compatibility: ['Universel'], replacementMonths: 3, inStock: true },
  { id: 'mask-4', name: 'Masque nasal DreamWisp', description: 'Masque nasal avec connexion sur le dessus de la tete. Liberte de mouvement maximale pendant le sommeil.', category: 'masques', price: 99.90, image: '\uD83D\uDE37', compatibility: ['Philips DreamStation', 'Philips DreamStation 2'], replacementMonths: 6, inStock: false },
  // Filtres
  { id: 'filter-1', name: 'Filtres standard (x6)', description: 'Lot de 6 filtres anti-poussiere standard. Changement recommande toutes les 2 semaines.', category: 'filtres', price: 12.90, image: '\uD83C\uDF2C\uFE0F', compatibility: ['ResMed AirSense 10', 'ResMed AirSense 11'], replacementMonths: 1, inStock: true },
  { id: 'filter-2', name: 'Filtres hypoallergeniques (x4)', description: 'Filtres haute performance pour les patients allergiques. Filtration fine des particules.', category: 'filtres', price: 18.90, image: '\uD83C\uDF2C\uFE0F', compatibility: ['Universel'], replacementMonths: 1, inStock: true },
  // Tuyaux
  { id: 'tube-1', name: 'Tuyau standard 1.8m', description: 'Tuyau flexible standard de 1.8m. Compatible avec la plupart des machines PPC.', category: 'tuyaux', price: 24.90, image: '\uD83D\uDD27', compatibility: ['Universel'], replacementMonths: 12, inStock: true },
  { id: 'tube-2', name: 'Tuyau chauffant ClimateLineAir', description: 'Tuyau chauffant pour eviter la condensation. Temperature regulee automatiquement.', category: 'tuyaux', price: 54.90, image: '\uD83D\uDD27', compatibility: ['ResMed AirSense 10', 'ResMed AirSense 11'], replacementMonths: 12, inStock: true },
  // Humidificateurs
  { id: 'humid-1', name: 'Bac humidificateur AirSense', description: 'Bac de remplacement pour humidificateur integre AirSense. Capacite 380ml.', category: 'humidificateurs', price: 34.90, image: '\uD83D\uDCA7', compatibility: ['ResMed AirSense 10', 'ResMed AirSense 11'], replacementMonths: 6, inStock: true },
  // Oreillers
  { id: 'pillow-1', name: 'Oreiller PPC ergonomique', description: 'Oreiller specialement concu pour le port du masque PPC. Encoches laterales pour le tuyau et le masque. Mousse a memoire de forme.', category: 'oreillers', price: 69.90, image: '\uD83D\uDECF\uFE0F', compatibility: ['Universel'], replacementMonths: 24, inStock: true },
  // Accessoires
  { id: 'acc-1', name: 'Lingettes nettoyantes masque (x30)', description: 'Lingettes biodegradables pour nettoyer le masque quotidiennement. Sans alcool, hypoallergeniques.', category: 'accessoires', price: 9.90, image: '\uD83E\uDDF4', compatibility: ['Universel'], replacementMonths: 1, inStock: true },
  { id: 'acc-2', name: 'Sacoche de transport PPC', description: 'Sacoche rigide et compacte pour transporter votre machine PPC en voyage. Protection anti-choc.', category: 'accessoires', price: 39.90, image: '\uD83D\uDC5C', compatibility: ['Universel'], replacementMonths: 0, inStock: true },
];

const MOCK_ORDERS: Order[] = [
  { id: 'ord-1', productId: 'filter-1', productName: 'Filtres standard (x6)', quantity: 2, status: 'delivered', date: '2026-02-15', price: 25.80 },
  { id: 'ord-2', productId: 'mask-1', productName: 'Masque nasal AirFit N20', quantity: 1, status: 'shipped', date: '2026-03-10', price: 89.90 },
  { id: 'ord-3', productId: 'acc-1', productName: 'Lingettes nettoyantes masque (x30)', quantity: 1, status: 'confirmed', date: '2026-03-20', price: 9.90 },
];

// Materiel fictif du patient pour les recommandations
const PATIENT_EQUIPMENT = {
  machine: 'ResMed AirSense 11',
  masque: 'AirFit N20',
  masqueDate: '2025-10-01',
  filtreDate: '2026-03-10',
};

function getStatusLabel(status: Order['status']) {
  const map = {
    pending: { label: 'En attente', color: 'bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300' },
    confirmed: { label: 'Confirmee', color: 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300' },
    shipped: { label: 'Expediee', color: 'bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300' },
    delivered: { label: 'Livree', color: 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300' },
  };
  return map[status];
}

export function ConsumablesShop() {
  const [selectedCategory, setSelectedCategory] = useState<ProductCategory | 'all' | 'orders' | 'recommended'>('recommended');
  const [cart, setCart] = useState<{ productId: string; quantity: number }[]>([]);
  const [orders] = useState(MOCK_ORDERS);
  const [showOrderConfirm, setShowOrderConfirm] = useState(false);

  // Recommandations basees sur le materiel du patient
  const recommendations = useMemo(() => {
    const recs: { product: Product; reason: string }[] = [];
    const now = new Date();

    // Masque a remplacer ?
    const masqueAge = Math.floor((now.getTime() - new Date(PATIENT_EQUIPMENT.masqueDate).getTime()) / (30 * 86400000));
    if (masqueAge >= 5) {
      const compatMasks = PRODUCTS.filter(p => p.category === 'masques' && p.compatibility.some(c =>
        c.includes('ResMed') || c === 'Universel'
      ));
      compatMasks.forEach(p => {
        recs.push({ product: p, reason: `Votre masque a ${masqueAge} mois (remplacement recommande tous les ${p.replacementMonths} mois)` });
      });
    }

    // Filtres a changer ?
    const filtreAge = Math.floor((now.getTime() - new Date(PATIENT_EQUIPMENT.filtreDate).getTime()) / (86400000));
    if (filtreAge >= 12) {
      const filters = PRODUCTS.filter(p => p.category === 'filtres');
      filters.forEach(p => {
        recs.push({ product: p, reason: `Derniers filtres changes il y a ${filtreAge} jours` });
      });
    }

    // Tuyau chauffant si compatible
    const tube = PRODUCTS.find(p => p.id === 'tube-2');
    if (tube) {
      recs.push({ product: tube, reason: 'Compatible avec votre ' + PATIENT_EQUIPMENT.machine });
    }

    return recs;
  }, []);

  const filteredProducts = useMemo(() => {
    if (selectedCategory === 'all') return PRODUCTS;
    if (selectedCategory === 'orders' || selectedCategory === 'recommended') return [];
    return PRODUCTS.filter(p => p.category === selectedCategory);
  }, [selectedCategory]);

  const cartTotal = useMemo(() =>
    cart.reduce((total, item) => {
      const product = PRODUCTS.find(p => p.id === item.productId);
      return total + (product ? product.price * item.quantity : 0);
    }, 0),
    [cart]
  );

  const addToCart = (productId: string) => {
    setCart(prev => {
      const existing = prev.find(i => i.productId === productId);
      if (existing) {
        return prev.map(i => i.productId === productId ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { productId, quantity: 1 }];
    });
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(i => i.productId !== productId));
  };

  const handleOrder = () => {
    setShowOrderConfirm(true);
    setTimeout(() => {
      setCart([]);
      setShowOrderConfirm(false);
    }, 3000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-card rounded-2xl border border-border p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-[var(--success)]/10 rounded-xl flex items-center justify-center">
            <svg className="w-5 h-5 text-[var(--success)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">Consommables & Accessoires</h3>
            <p className="text-sm text-muted-foreground">Commandez vos consommables aupres de votre prestataire</p>
          </div>
        </div>
        <div className="mt-3 bg-muted/50 rounded-lg p-3 text-xs text-muted-foreground">
          Materiel actuel : {PATIENT_EQUIPMENT.machine} + {PATIENT_EQUIPMENT.masque}
        </div>
      </div>

      {/* Panier */}
      {cart.length > 0 && (
        <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 shadow-sm">
          <h4 className="font-medium text-foreground mb-3 flex items-center gap-2">
            <svg className="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" />
            </svg>
            Panier ({cart.length} article{cart.length > 1 ? 's' : ''})
          </h4>
          <div className="space-y-2">
            {cart.map(item => {
              const product = PRODUCTS.find(p => p.id === item.productId)!;
              return (
                <div key={item.productId} className="flex items-center justify-between text-sm">
                  <span className="text-foreground">{product.name} x{item.quantity}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{(product.price * item.quantity).toFixed(2)} EUR</span>
                    <button onClick={() => removeFromCart(item.productId)}
                      className="text-red-500 hover:text-red-700 text-xs">Retirer</button>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-primary/20">
            <span className="font-semibold text-foreground">Total indicatif : {cartTotal.toFixed(2)} EUR</span>
            {showOrderConfirm ? (
              <span className="text-sm text-green-600 dark:text-green-400 font-medium">Demande envoyee !</span>
            ) : (
              <button onClick={handleOrder}
                className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity">
                Commander
              </button>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-2">La commande sera transmise a votre prestataire pour validation et livraison.</p>
        </div>
      )}

      {/* Onglets */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setSelectedCategory('recommended')}
          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
            selectedCategory === 'recommended' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-accent'
          }`}
        >
          Pour vous
        </button>
        <button
          onClick={() => setSelectedCategory('all')}
          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
            selectedCategory === 'all' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-accent'
          }`}
        >
          Tout
        </button>
        {CATEGORIES.map(cat => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              selectedCategory === cat.id ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-accent'
            }`}
          >
            {cat.icon} {cat.label}
          </button>
        ))}
        <button
          onClick={() => setSelectedCategory('orders')}
          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
            selectedCategory === 'orders' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-accent'
          }`}
        >
          Mes commandes
        </button>
      </div>

      {/* Recommandations */}
      {selectedCategory === 'recommended' && (
        <div className="space-y-3">
          <h4 className="font-medium text-foreground">Recommandations personnalisees</h4>
          {recommendations.map(({ product, reason }) => (
            <div key={product.id} className="bg-card rounded-xl border border-border p-4 shadow-sm">
              <div className="flex items-start gap-3">
                <span className="text-3xl">{product.image}</span>
                <div className="flex-1">
                  <h5 className="font-medium text-foreground">{product.name}</h5>
                  <p className="text-xs text-primary mt-0.5">{reason}</p>
                  <p className="text-sm text-muted-foreground mt-1">{product.description}</p>
                  <div className="flex items-center justify-between mt-3">
                    <span className="text-lg font-semibold text-foreground">{product.price.toFixed(2)} EUR</span>
                    <button
                      onClick={() => addToCart(product.id)}
                      disabled={!product.inStock}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-opacity ${
                        product.inStock
                          ? 'bg-primary text-primary-foreground hover:opacity-90'
                          : 'bg-muted text-muted-foreground cursor-not-allowed'
                      }`}
                    >
                      {product.inStock ? 'Ajouter au panier' : 'Indisponible'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Produits */}
      {selectedCategory !== 'orders' && selectedCategory !== 'recommended' && (
        <div className="grid gap-3 md:grid-cols-2">
          {filteredProducts.map(product => (
            <div key={product.id} className="bg-card rounded-xl border border-border p-4 shadow-sm">
              <div className="flex items-start gap-3">
                <span className="text-3xl">{product.image}</span>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h5 className="font-medium text-foreground">{product.name}</h5>
                    {!product.inStock && (
                      <span className="text-xs bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 px-2 py-0.5 rounded-full">Indisponible</span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{product.description}</p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {product.compatibility.map(c => (
                      <span key={c} className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded">{c}</span>
                    ))}
                  </div>
                  {product.replacementMonths > 0 && (
                    <p className="text-[10px] text-muted-foreground mt-1">Remplacement tous les {product.replacementMonths} mois</p>
                  )}
                  <div className="flex items-center justify-between mt-3">
                    <span className="text-lg font-semibold text-foreground">{product.price.toFixed(2)} EUR</span>
                    <button
                      onClick={() => addToCart(product.id)}
                      disabled={!product.inStock}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-opacity ${
                        product.inStock
                          ? 'bg-primary text-primary-foreground hover:opacity-90'
                          : 'bg-muted text-muted-foreground cursor-not-allowed'
                      }`}
                    >
                      {product.inStock ? 'Ajouter' : 'Indisponible'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Commandes */}
      {selectedCategory === 'orders' && (
        <div className="space-y-3">
          <h4 className="font-medium text-foreground">Historique des commandes</h4>
          {orders.map(order => {
            const status = getStatusLabel(order.status);
            return (
              <div key={order.id} className="bg-card rounded-xl border border-border p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <h5 className="font-medium text-foreground">{order.productName}</h5>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Quantite : {order.quantity} - {new Date(order.date).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${status.color}`}>{status.label}</span>
                    <p className="text-sm font-semibold text-foreground mt-1">{order.price.toFixed(2)} EUR</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <p className="text-xs text-muted-foreground text-center">
        Prix indicatifs. Votre prestataire confirmera le prix final et les conditions de livraison.
      </p>
    </div>
  );
}

export default ConsumablesShop;
