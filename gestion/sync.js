/* =========================================================
   Synchronisation entre appareils (Firebase Firestore)

   Chaque élément (plat, commande, achat, facture…) est un document
   restaurants/{id}/elements/{collection}__{id}. Les appareils envoient
   uniquement ce qui a changé et reçoivent en temps réel les changements
   des autres. La carte publique (publics/{id}) est mise à jour au passage.
   ========================================================= */

import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js';
import {
  getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut, sendPasswordResetEmail, connectAuthEmulator,
} from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js';
import {
  initializeFirestore, connectFirestoreEmulator, collection, doc, getDocs, onSnapshot, writeBatch, setDoc, serverTimestamp,
} from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js';

const conf = window.JGUIRO_SYNC || {};
const etat = window.syncEtat;
const app = window.app;

const TABLEAUX = ['carte', 'tables', 'commandes', 'reservations', 'stock', 'fournisseurs', 'achats', 'operations', 'factures'];
const UNIQUES = ['restaurant', 'menuEnLigne'];
const ORDONNES = new Set(['carte', 'tables']);          // l'ordre d'affichage compte
const PUBLICS = new Set(['carte', 'tables', 'restaurant', 'menuEnLigne']); // utilisés par la carte en ligne
const CLE_DERNIER = 'jguiro-sync-dernier';               // empreintes du dernier état synchronisé
const CLE_APPAREIL = 'jguiro-appareil';

/* ---------- Outils ---------- */

// Empreinte courte d'un texte (évite de stocker deux fois toutes les données)
function empreinte(texte) {
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
  for (let i = 0; i < texte.length; i++) {
    const c = texte.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 2654435761);
    h2 = Math.imul(h2 ^ c, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
}

function lireStockage(cle) {
  try { return JSON.parse(localStorage.getItem(cle) || 'null'); } catch (e) { return null; }
}

let appareil = localStorage.getItem(CLE_APPAREIL);
if (!appareil) {
  appareil = Math.random().toString(36).slice(2, 10);
  try { localStorage.setItem(CLE_APPAREIL, appareil); } catch (e) { /* ignoré */ }
}

// État synchronisé connu : identifiant → empreinte (null = jamais synchronisé sur cet appareil)
let dernier = (() => {
  const brut = lireStockage(CLE_DERNIER);
  return brut ? new Map(Object.entries(brut)) : null;
})();

function sauverDernier() {
  try { localStorage.setItem(CLE_DERNIER, JSON.stringify(Object.fromEntries(dernier || []))); } catch (e) { /* plein */ }
}

// Données locales découpées en documents : identifiant → texte JSON
function decouper(d) {
  const m = new Map();
  for (const col of TABLEAUX) {
    (d[col] || []).forEach((el, i) => {
      if (el && el.id != null) m.set(`${col}__${el.id}`, JSON.stringify(ORDONNES.has(col) ? { ...el, _o: i } : el));
    });
  }
  for (const k of UNIQUES) if (d[k]) m.set(`_${k}`, JSON.stringify(d[k]));
  return m;
}

// Applique un document reçu (ou sa suppression si json === null) aux données locales
function appliquer(d, id, json) {
  if (id.startsWith('_')) {
    const k = id.slice(1);
    if (UNIQUES.includes(k) && json != null) d[k] = JSON.parse(json);
    return;
  }
  const sep = id.indexOf('__');
  const col = id.slice(0, sep);
  const elId = id.slice(sep + 2);
  if (!TABLEAUX.includes(col)) return;
  const liste = d[col] || (d[col] = []);
  const i = liste.findIndex(x => String(x.id) === elId);
  if (json == null) {
    if (i >= 0) liste.splice(i, 1);
    return;
  }
  const el = JSON.parse(json);
  if (i >= 0) liste[i] = el; else liste.push(el);
}

function trier(d) {
  for (const col of ORDONNES) {
    (d[col] || []).sort((a, b) => (a._o ?? 1e9) - (b._o ?? 1e9));
  }
}

const colDe = id => (id.startsWith('_') ? id.slice(1) : id.slice(0, id.indexOf('__')));

/* ---------- Firebase ---------- */

const fb = initializeApp(conf.firebase);
const auth = getAuth(fb);
const fs = initializeFirestore(fb, {});
if (conf.emulateur) {
  connectAuthEmulator(auth, `http://${conf.emulateur.auth}`, { disableWarnings: true });
  const [hote, port] = conf.emulateur.firestore.split(':');
  connectFirestoreEmulator(fs, hote, Number(port));
}
const rid = conf.restaurantId || 'jguiro';
const elements = collection(fs, 'restaurants', rid, 'elements');

let actif = false;
let arreterEcoute = null;
let minuteur = null;
let envoiEnCours = Promise.resolve();

function majEtat(changements) {
  Object.assign(etat, changements);
  app.majIndicateurSync();
}

/* ---------- Envoi des changements locaux ---------- */

function programmer() {
  if (!actif) return;
  clearTimeout(minuteur);
  minuteur = setTimeout(() => { envoiEnCours = envoiEnCours.then(pousser); }, 400);
}

async function pousser() {
  if (!actif) return;
  const d = app.donnees();
  const actuel = decouper(d);
  const ops = [];
  actuel.forEach((json, id) => {
    const e = empreinte(json);
    if (dernier.get(id) !== e) ops.push({ id, json, e, avant: dernier.get(id) });
  });
  dernier.forEach((e, id) => { if (!actuel.has(id)) ops.push({ id, json: null, avant: e }); });
  if (!ops.length) return;

  ops.forEach(o => (o.json == null ? dernier.delete(o.id) : dernier.set(o.id, o.e)));
  sauverDernier();
  majEtat({ statut: navigator.onLine ? 'envoi' : 'hors_ligne' });
  try {
    for (let i = 0; i < ops.length; i += 400) {
      const lot = writeBatch(fs);
      ops.slice(i, i + 400).forEach(o => {
        const ref = doc(elements, o.id);
        if (o.json == null) lot.delete(ref);
        else lot.set(ref, { d: o.json, maj: serverTimestamp(), par: appareil });
      });
      await lot.commit();
    }
    if (ops.some(o => PUBLICS.has(colDe(o.id)))) await publierCarte();
    majEtat({ statut: 'ok', derniere: new Date().toISOString(), erreur: '' });
  } catch (e) {
    // Échec : on remet l'état connu pour réessayer au prochain changement
    ops.forEach(o => (o.avant == null ? dernier.delete(o.id) : dernier.set(o.id, o.avant)));
    sauverDernier();
    majEtat({ statut: 'erreur', erreur: messageErreur(e) });
  }
}

async function publierCarte() {
  const carte = construireMenuPublic(app.donnees());
  await setDoc(doc(fs, 'publics', rid), { json: JSON.stringify(carte), maj: serverTimestamp() });
}

/* ---------- Réception des changements des autres appareils ---------- */

// Fusion au démarrage : ce qui a changé ici depuis la dernière synchronisation est gardé (et envoyé),
// le reste prend la version en ligne.
function reconcilier(distant) {
  const d = app.donnees();
  const local = decouper(d);
  const ids = new Set([...dernier.keys(), ...local.keys(), ...distant.keys()]);
  let modifie = false;
  ids.forEach(id => {
    const eLocal = local.has(id) ? empreinte(local.get(id)) : undefined;
    if (eLocal !== dernier.get(id)) return; // modifié ici : sera envoyé
    if (!distant.has(id)) {
      if (local.has(id)) { appliquer(d, id, null); modifie = true; }
    } else if (empreinte(distant.get(id)) !== eLocal) {
      appliquer(d, id, distant.get(id));
      modifie = true;
    }
  });
  dernier = new Map([...distant].map(([id, json]) => [id, empreinte(json)]));
  sauverDernier();
  if (modifie) {
    trier(d);
    app.ecrireLocal();
    app.rafraichir();
  }
}

function ecouter() {
  arreterEcoute = onSnapshot(elements, { includeMetadataChanges: true }, snap => {
    const d = app.donnees();
    let modifie = false;
    snap.docChanges().forEach(ch => {
      if (ch.doc.metadata.hasPendingWrites) return;
      const id = ch.doc.id;
      if (ch.type === 'removed') {
        if (dernier.has(id)) { dernier.delete(id); appliquer(d, id, null); modifie = true; }
        return;
      }
      const json = ch.doc.data().d;
      const e = empreinte(json);
      if (dernier.get(id) === e) return;
      dernier.set(id, e);
      appliquer(d, id, json);
      modifie = true;
    });
    if (modifie) {
      trier(d);
      sauverDernier();
      app.ecrireLocal();
      app.rafraichir();
    }
    if (etat.statut !== 'envoi' && etat.statut !== 'erreur') {
      majEtat({ statut: snap.metadata.fromCache ? 'hors_ligne' : 'ok', derniere: snap.metadata.fromCache ? etat.derniere : new Date().toISOString() });
    }
  }, e => majEtat({ statut: 'erreur', erreur: messageErreur(e) }));
}

async function demarrer() {
  majEtat({ statut: 'connexion' });
  app.copieSecurite('avant synchronisation');
  let distant;
  try {
    const snap = await getDocs(elements);
    distant = new Map(snap.docs.map(x => [x.id, x.data().d]));
  } catch (e) {
    majEtat({ statut: 'erreur', erreur: messageErreur(e) });
    return;
  }

  if (!dernier) {
    // Premier branchement de cet appareil
    if (distant.size === 0) {
      dernier = new Map(); // rien en ligne : on envoie tout
    } else {
      const choix = await app.demanderChoixSync(distant.size);
      if (!choix) { await deconnecter(); return; }
      const local = decouper(app.donnees());
      dernier = choix === 'en_ligne'
        ? new Map([...local].map(([id, json]) => [id, empreinte(json)])) // local considéré « inchangé » → la version en ligne gagne
        : new Map([...distant].map(([id, json]) => [id, empreinte(json)])); // local considéré « modifié » → il remplace la version en ligne
    }
  }

  actif = true;
  reconcilier(distant);
  await pousser();
  ecouter();
}

function messageErreur(e) {
  const code = e?.code || '';
  if (code.includes('permission-denied')) return "Accès refusé : ce compte n'est pas autorisé (vérifiez les règles de sécurité).";
  if (code.includes('invalid-credential') || code.includes('wrong-password') || code.includes('user-not-found')) return 'E-mail ou mot de passe incorrect.';
  if (code.includes('too-many-requests')) return 'Trop de tentatives. Réessayez dans quelques minutes.';
  if (code.includes('network') || code.includes('unavailable')) return 'Pas de connexion internet.';
  return e?.message || String(e);
}

async function deconnecter() {
  actif = false;
  if (arreterEcoute) arreterEcoute();
  arreterEcoute = null;
  await signOut(auth);
}

/* ---------- Interface pour l'application ---------- */

window.syncApi = {
  programmer,
  async connecter(email, motDePasse) {
    majEtat({ erreur: '', statut: 'connexion' });
    try {
      await signInWithEmailAndPassword(auth, email.trim(), motDePasse);
    } catch (e) {
      majEtat({ statut: 'deconnecte', erreur: messageErreur(e) });
    }
  },
  deconnecter,
  async motDePasseOublie(email) {
    await sendPasswordResetEmail(auth, email.trim());
  },
  // Après un import ou une réinitialisation : envoyer tout de suite
  envoyerMaintenant() { if (actif) envoiEnCours = envoiEnCours.then(pousser); },
};

onAuthStateChanged(auth, utilisateur => {
  if (utilisateur) {
    majEtat({ connecte: true, email: utilisateur.email || '' });
    demarrer();
  } else {
    actif = false;
    majEtat({ connecte: false, email: '', statut: 'deconnecte' });
  }
});

window.addEventListener('online', () => programmer());
window.addEventListener('offline', () => { if (actif) majEtat({ statut: 'hors_ligne' }); });
