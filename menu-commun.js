'use strict';

/* =========================================================
   Code partagé entre l'application (back office) et la carte
   en ligne pour les clients (menu.html).
   ========================================================= */

const MENU_CLE_STOCKAGE = 'jguiro-restaurant-v1';
const MENU_MODES = {
  sur_place: 'Sur place',
  emporter: 'À emporter',
  livraison: 'Livraison',
};
const MENU_PAIEMENTS = {
  especes: 'Espèces',
  tpe: 'Carte bancaire (terminal)',
  en_ligne: 'Carte bancaire en ligne',
};
// Moyens de paiement proposés aux clients (espèces et carte sur terminal par défaut)
const paiementsActifs = cfg => Object.keys(MENU_PAIEMENTS)
  .filter(p => (p === 'en_ligne' ? cfg?.paiements?.en_ligne === true && !!cfg?.lienPaiement : cfg?.paiements?.[p] !== false));

// Construit la carte publique (sans prix d'achat, stock, ventes…) à partir des données du restaurant.
function construireMenuPublic(d) {
  const cfg = d.menuEnLigne || {};
  const plats = (d.carte || []).filter(p => p.disponible !== false);
  return {
    format: 1,
    genereLe: new Date().toISOString(),
    restaurant: { nom: d.restaurant?.nom || '', adresse: d.restaurant?.adresse || '', telephone: d.restaurant?.telephone || '' },
    whatsapp: (cfg.whatsapp || '').replace(/\D/g, ''),
    accueil: cfg.accueil || '',
    modes: Object.keys(MENU_MODES).filter(m => cfg.modes?.[m] !== false),
    fraisLivraison: Number(cfg.fraisLivraison) || 0,
    paiements: paiementsActifs(cfg),
    lienPaiement: cfg.lienPaiement || '',
    tables: (d.tables || []).map(t => t.nom),
    categories: [...new Set(plats.map(p => p.categorie))],
    plats: plats.map(p => ({
      id: p.id, nom: p.nom, categorie: p.categorie, prix: Number(p.prix),
      tailles: (p.tailles || []).map(t => ({
        nom: t.nom || '', prix: Number(t.prix),
        ...(t.groupe ? { groupe: t.groupe } : {}),
        ...(t.disponible === false ? { disponible: false } : {}),
      })),
      // Les variantes épuisées restent dans la liste (pour garder les mêmes numéros) mais sont signalées
      variantes: (p.variantes || []).map(v => ({ nom: v.nom, supplement: Number(v.supplement) || 0, ...(v.disponible === false ? { disponible: false } : {}) })),
    })),
  };
}

// Code compact ajouté au message WhatsApp, pour importer la commande dans l'application sans la ressaisir.
function encoderCommande(obj) {
  const octets = new TextEncoder().encode(JSON.stringify(obj));
  let bin = '';
  octets.forEach(o => { bin += String.fromCharCode(o); });
  return 'JG1:' + btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function decoderCommande(texte) {
  const m = /JG1:([A-Za-z0-9_-]+)/.exec(texte || '');
  if (!m) return null;
  try {
    const b64 = m[1].replace(/-/g, '+').replace(/_/g, '/');
    const bin = atob(b64 + '='.repeat((4 - b64.length % 4) % 4));
    return JSON.parse(new TextDecoder().decode(Uint8Array.from(bin, c => c.charCodeAt(0))));
  } catch (e) {
    return null;
  }
}
