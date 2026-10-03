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

// Ordre d'affichage des catégories (les autres catégories viennent ensuite, dans leur ordre d'origine)
const ORDRE_CATEGORIES = ['plat', 'supplement', 'boisson', 'dessert'];
function trierCategories(categories) {
  const cle = c => String(c).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim().replace(/s$/, '');
  const rang = c => { const i = ORDRE_CATEGORIES.indexOf(cle(c)); return i < 0 ? ORDRE_CATEGORIES.length : i; };
  return categories.map((c, i) => ({ c, i })).sort((a, b) => rang(a.c) - rang(b.c) || a.i - b.i).map(x => x.c);
}

/* ---------- Photos (plats, catégories, bannières, logo) ----------
   Gardées dans ce navigateur (IndexedDB, sans limite de place gênante) et publiées en ligne
   dans des documents séparés publics/{restaurant}__photo__{id}, lisibles par tous. */

const PhotosLocales = {
  _base: null,
  _ouvrir() {
    if (!this._base) {
      this._base = new Promise((ok, ko) => {
        const r = indexedDB.open('jguiro-photos', 1);
        r.onupgradeneeded = () => r.result.createObjectStore('photos');
        r.onsuccess = () => ok(r.result);
        r.onerror = () => ko(r.error);
      });
    }
    return this._base;
  },
  async _magasin(mode) {
    return (await this._ouvrir()).transaction('photos', mode).objectStore('photos');
  },
  async tout() {
    const m = new Map();
    try {
      const st = await this._magasin('readonly');
      await new Promise((ok, ko) => {
        const r = st.openCursor();
        r.onsuccess = () => { const c = r.result; if (!c) return ok(); m.set(c.key, c.value); c.continue(); };
        r.onerror = () => ko(r.error);
      });
    } catch (e) { /* navigation privée : pas de photos locales */ }
    return m;
  },
  async mettre(id, data) {
    const st = await this._magasin('readwrite');
    await new Promise((ok, ko) => { const r = st.put(data, id); r.onsuccess = ok; r.onerror = () => ko(r.error); });
  },
  async supprimer(id) {
    try {
      const st = await this._magasin('readwrite');
      await new Promise(ok => { const r = st.delete(id); r.onsuccess = ok; r.onerror = ok; });
    } catch (e) { /* ignoré */ }
  },
};

// Identifiants des photos utilisées par les données du restaurant
function photosReferencees(d) {
  const cfg = d.menuEnLigne || {};
  return new Set([
    ...(d.carte || []).map(p => p.photo),
    cfg.logo,
    ...(cfg.bannieres || []).map(b => b.photo),
    ...Object.values(cfg.photosCategories || {}),
  ].filter(Boolean));
}

const idDocPhoto = (rid, id) => `${rid || 'jguiro'}__photo__${id}`;

// Lit des photos publiées en ligne (une seule requête pour toutes) : id → image
async function photosEnLigne(ids) {
  const sync = window.JGUIRO_SYNC;
  const res = new Map();
  if (!sync?.firebase || !ids.length) return res;
  const base = sync.emulateur ? `http://${sync.emulateur.firestore}/v1` : 'https://firestore.googleapis.com/v1';
  const racine = `projects/${sync.firebase.projectId}/databases/(default)/documents`;
  const r = await fetch(`${base}/${racine}:batchGet?key=${sync.firebase.apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ documents: ids.map(id => `${racine}/publics/${idDocPhoto(sync.restaurantId, id)}`) }),
  });
  if (!r.ok) return res;
  (await r.json()).forEach(x => {
    const data = x.found?.fields?.data?.stringValue;
    if (data) res.set(x.found.name.split('__photo__').pop(), data);
  });
  return res;
}

// Plats les plus vendus ces 60 derniers jours (pour « Meilleures offres » quand aucun plat n'est mis à la une)
function platsLesPlusVendus(d, nb = 8) {
  const depuis = new Date(Date.now() - 60 * 864e5).toISOString();
  const qte = new Map();
  (d.commandes || []).filter(c => c.statut === 'payee' && (c.payeeLe || '') >= depuis)
    .forEach(c => (c.lignes || []).forEach(l => { if (l.platId) qte.set(l.platId, (qte.get(l.platId) || 0) + Number(l.qte || 1)); }));
  return [...qte].sort((a, b) => b[1] - a[1]).map(x => x[0]);
}

/* ---------- Livraison : frais selon la distance ---------- */

const TRANCHES_LIVRAISON = [{ max: 3, prix: 20 }, { max: 7, prix: 25 }, { max: 10, prix: 30 }, { max: 12, prix: 40 }];
const PRIX_LIVRAISON_AU_DELA = 50;

// Prix pour une distance (km) : la première tranche dont la limite n'est pas dépassée, sinon le prix « au-delà »
function tarifLivraison(km, liv) {
  const tranches = (liv?.tranches?.length ? liv.tranches : TRANCHES_LIVRAISON).slice().sort((a, b) => a.max - b.max);
  const t = tranches.find(x => km <= x.max);
  return t ? { prix: Number(t.prix), majoration: false }
    : { prix: Number(liv?.auDela ?? PRIX_LIVRAISON_AU_DELA), majoration: true, limite: tranches[tranches.length - 1]?.max };
}

// Lit « 33.57, -7.59 » ou un lien Google Maps (…@33.57,-7.59… ou …q=33.57,-7.59…)
function lirePosition(texte) {
  const m = /(-?\d{1,2}\.\d+)\s*,\s*(-?\d{1,3}\.\d+)/.exec(String(texte || ''));
  if (!m) return null;
  const lat = Number(m[1]), lng = Number(m[2]);
  return Math.abs(lat) <= 90 && Math.abs(lng) <= 180 ? { lat: +lat.toFixed(6), lng: +lng.toFixed(6) } : null;
}

function distanceVolOiseau(a, b) {
  const r = x => x * Math.PI / 180;
  const h = Math.sin(r(b.lat - a.lat) / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(r(b.lng - a.lng) / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(h));
}

// Distance par la route (OpenStreetMap / OSRM) ; à défaut, vol d'oiseau × 1,3
async function distanceLivraison(a, b) {
  try {
    const ctrl = new AbortController();
    const minuteur = setTimeout(() => ctrl.abort(), 8000);
    const r = await fetch(`https://router.project-osrm.org/route/v1/driving/${a.lng},${a.lat};${b.lng},${b.lat}?overview=false`, { signal: ctrl.signal });
    clearTimeout(minuteur);
    const km = (await r.json()).routes?.[0]?.distance / 1000;
    if (km >= 0) return { km, route: true };
  } catch (e) { /* service indisponible */ }
  return { km: distanceVolOiseau(a, b) * 1.3, route: false };
}

// Adresse → position (OpenStreetMap / Nominatim), en privilégiant les environs du restaurant
async function geocoderAdresse(adresse, pres) {
  const p = new URLSearchParams({ format: 'jsonv2', limit: '1', countrycodes: 'ma', 'accept-language': 'fr', q: adresse });
  if (pres) p.set('viewbox', [pres.lng - 0.3, pres.lat + 0.3, pres.lng + 0.3, pres.lat - 0.3].join(','));
  const r = await fetch('https://nominatim.openstreetmap.org/search?' + p);
  const x = (await r.json())[0];
  return x ? { lat: +Number(x.lat).toFixed(6), lng: +Number(x.lon).toFixed(6) } : null;
}

// Construit la carte publique (sans prix d'achat, stock, ventes…) à partir des données du restaurant.
function construireMenuPublic(d) {
  const cfg = d.menuEnLigne || {};
  const plats = (d.carte || []).filter(p => p.disponible !== false);
  const ids = new Set(plats.map(p => p.id));
  const categories = trierCategories([...new Set(plats.map(p => p.categorie))]);
  const aLaUne = plats.filter(p => p.vedette).map(p => p.id);
  return {
    format: 1,
    genereLe: new Date().toISOString(),
    restaurant: { nom: d.restaurant?.nom || '', adresse: d.restaurant?.adresse || '', telephone: d.restaurant?.telephone || '' },
    whatsapp: (cfg.whatsapp || '').replace(/\D/g, ''),
    accueil: cfg.accueil || '',
    modes: Object.keys(MENU_MODES).filter(m => cfg.modes?.[m] !== false),
    fraisLivraison: Number(cfg.fraisLivraison) || 0,
    livraison: cfg.position ? { position: cfg.position, tranches: cfg.tranches?.length ? cfg.tranches : TRANCHES_LIVRAISON, auDela: Number(cfg.auDela ?? PRIX_LIVRAISON_AU_DELA) } : null,
    paiements: paiementsActifs(cfg),
    lienPaiement: cfg.lienPaiement || '',
    tables: (d.tables || []).map(t => t.nom),
    categories,
    couleur: cfg.couleur || '',
    logo: cfg.logo || '',
    bannieres: (cfg.bannieres || []).filter(b => b.photo || b.titre)
      .map(b => ({ photo: b.photo || '', titre: b.titre || '', texte: b.texte || '', categorie: categories.includes(b.categorie) ? b.categorie : '' })),
    photosCategories: Object.fromEntries(Object.entries(cfg.photosCategories || {}).filter(([c, id]) => id && categories.includes(c))),
    vedettes: aLaUne.length ? aLaUne : platsLesPlusVendus(d).filter(id => ids.has(id)).slice(0, 8),
    vedettesAuto: !aLaUne.length,
    plats: plats.map(p => ({
      id: p.id, nom: p.nom, categorie: p.categorie, prix: Number(p.prix),
      ...(p.photo ? { photo: p.photo } : {}),
      ...(p.description ? { description: p.description } : {}),
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
