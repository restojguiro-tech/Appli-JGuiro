'use strict';

/* =========================================================
   Données & stockage (localStorage)
   ========================================================= */

const STORAGE_KEY = 'jguiro-restaurant-v1';

const DONNEES_DEMO = {
  restaurant: { nom: 'Restaurant JGuiro', tva: 10 },
  carte: [
    { id: 'p1', nom: 'Salade César', categorie: 'Entrées', prix: 55, disponible: true,
      variantes: [{ nom: 'Nature', supplement: 0 }, { nom: 'Poulet', supplement: 15 }, { nom: 'Crevettes', supplement: 25 }] },
    { id: 'p2', nom: 'Soupe du jour', categorie: 'Entrées', prix: 35, disponible: true },
    { id: 'p3', nom: 'Entrecôte frites', categorie: 'Plats', prix: 150, disponible: true,
      variantes: [{ nom: 'Bleue', supplement: 0 }, { nom: 'Saignante', supplement: 0 }, { nom: 'À point', supplement: 0 }, { nom: 'Bien cuite', supplement: 0 }] },
    { id: 'p4', nom: 'Pavé de saumon', categorie: 'Plats', prix: 70, disponible: true,
      tailles: [{ nom: 'Petit', prix: 70 }, { nom: 'Moyen', prix: 80 }, { nom: 'Grand', prix: 90 }] },
    { id: 'p11', nom: 'Sole', categorie: 'Plats', prix: 100, disponible: true,
      tailles: [{ nom: '', prix: 100 }, { nom: '', prix: 120 }, { nom: '', prix: 130 }, { nom: '', prix: 140 }] },
    { id: 'p5', nom: 'Risotto aux champignons', categorie: 'Plats', prix: 95, disponible: true },
    { id: 'p6', nom: 'Crème brûlée', categorie: 'Desserts', prix: 40, disponible: true },
    { id: 'p7', nom: 'Fondant au chocolat', categorie: 'Desserts', prix: 45, disponible: true },
    { id: 'p8', nom: 'Café', categorie: 'Boissons', prix: 15, disponible: true },
    { id: 'p9', nom: 'Verre de vin rouge', categorie: 'Boissons', prix: 60, disponible: true },
    { id: 'p10', nom: 'Eau minérale 50cl', categorie: 'Boissons', prix: 10, disponible: true },
  ],
  tables: [
    { id: 't1', nom: 'Table 1', places: 2 },
    { id: 't2', nom: 'Table 2', places: 2 },
    { id: 't3', nom: 'Table 3', places: 4 },
    { id: 't4', nom: 'Table 4', places: 4 },
    { id: 't5', nom: 'Table 5', places: 6 },
    { id: 't6', nom: 'Terrasse 1', places: 4 },
  ],
  commandes: [],
  reservations: [],
  fournisseurs: [
    { id: 'f1', nom: 'Marché aux poissons', tel: '', note: 'Poissons, fruits de mer' },
    { id: 'f2', nom: 'Boucherie', tel: '', note: 'Viandes' },
  ],
  achats: [],
  operations: [],
  factures: [],
  menuEnLigne: { whatsapp: '', cuisine: '212707198724', delai: 30, accueil: '', lienCourt: '', fraisLivraison: 0, lienPaiement: '', paiements: { especes: true, tpe: true, en_ligne: false }, modes: { sur_place: true, emporter: true, livraison: true } },
  stock: [
    { id: 's1', nom: 'Farine', quantite: 10, unite: 'kg', seuil: 3 },
    { id: 's2', nom: 'Beurre', quantite: 2, unite: 'kg', seuil: 2 },
    { id: 's3', nom: 'Entrecôte', quantite: 12, unite: 'pièces', seuil: 5 },
    { id: 's4', nom: 'Saumon', quantite: 4, unite: 'kg', seuil: 2 },
    { id: 's5', nom: 'Vin rouge', quantite: 18, unite: 'bouteilles', seuil: 6 },
  ],
};

let db = charger();

function migrer(data) {
  const d = { ...structuredClone(DONNEES_DEMO), ...data };
  d.restaurant = { ...structuredClone(DONNEES_DEMO.restaurant), ...d.restaurant };
  d.menuEnLigne = { ...structuredClone(DONNEES_DEMO.menuEnLigne), ...d.menuEnLigne };
  d.menuEnLigne.paiements = { ...DONNEES_DEMO.menuEnLigne.paiements, ...d.menuEnLigne.paiements };
  // Ce raccourcisseur affiche une publicité avant la redirection : on revient au lien direct
  if (/sl1nk\.com|encurtador/i.test(d.menuEnLigne.lienCourt || '')) d.menuEnLigne.lienCourt = '';
  if (d.menuEnLigne.cuisine === undefined) d.menuEnLigne.cuisine = DONNEES_DEMO.menuEnLigne.cuisine;
  return d;
}

function charger() {
  try {
    const brut = localStorage.getItem(STORAGE_KEY);
    if (brut) return migrer(JSON.parse(brut));
  } catch (e) {
    console.warn('Lecture des données impossible', e);
  }
  return structuredClone(DONNEES_DEMO);
}

function ecrireLocal() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  } catch (e) {
    alert("Impossible d'enregistrer les données : " + e.message);
  }
}

// Copies de sécurité locales, faites avant toute opération qui remplace des données (2 dernières gardées)
const CLE_COPIES = 'jguiro-copies-securite';
function copiesSecurite() {
  try { return JSON.parse(localStorage.getItem(CLE_COPIES) || '[]'); } catch (e) { return []; }
}
function copieSecurite(raison) {
  try {
    const json = JSON.stringify(db);
    const copies = copiesSecurite();
    if (copies[0] && JSON.stringify(copies[0].donnees) === json) return;
    copies.unshift({ date: new Date().toISOString(), raison, donnees: JSON.parse(json) });
    localStorage.setItem(CLE_COPIES, JSON.stringify(copies.slice(0, 2)));
  } catch (e) { /* stockage plein : on ne bloque pas l'opération */ }
}

/* ---------- Photos (gardées à part, dans IndexedDB) ---------- */

const photos = new Map(); // id → image (data URL)
const srcPhoto = id => (id && photos.get(id)) || '';

async function chargerPhotosLocales() {
  (await PhotosLocales.tout()).forEach((v, k) => photos.set(k, v));
  // Photos d'un ancien essai jamais enregistré : on fait le ménage
  const utiles = photosReferencees(db);
  photos.forEach((_, id) => { if (!utiles.has(id)) { photos.delete(id); PhotosLocales.supprimer(id); } });
  await completerPhotos();
  rafraichir();
}

// Photos ajoutées sur un autre appareil : on les récupère en ligne
let completionEnCours = false;
async function completerPhotos() {
  const manquantes = [...photosReferencees(db)].filter(id => !photos.has(id));
  if (!manquantes.length || completionEnCours || !window.JGUIRO_SYNC?.firebase) return;
  completionEnCours = true;
  try {
    for (let i = 0; i < manquantes.length; i += 100) {
      const recues = await photosEnLigne(manquantes.slice(i, i + 100));
      for (const [id, data] of recues) { photos.set(id, data); await PhotosLocales.mettre(id, data); }
    }
  } catch (e) { /* hors ligne : on réessaiera */ } finally { completionEnCours = false; }
}

// Réduit une photo (taille et poids) avant de la garder
async function compresserImage(fichier, largeurMax, hauteurMax, transparence = false) {
  const url = URL.createObjectURL(fichier);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const r = Math.min(1, largeurMax / img.naturalWidth, hauteurMax / img.naturalHeight);
    const c = document.createElement('canvas');
    c.width = Math.round(img.naturalWidth * r);
    c.height = Math.round(img.naturalHeight * r);
    const ctx = c.getContext('2d');
    if (!transparence) { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height); }
    ctx.drawImage(img, 0, 0, c.width, c.height);
    let data = c.toDataURL('image/webp', 0.8);
    if (!data.startsWith('data:image/webp')) data = transparence ? c.toDataURL('image/png') : c.toDataURL('image/jpeg', 0.8);
    return data;
  } finally {
    URL.revokeObjectURL(url);
  }
}

const FORMATS_PHOTO = {
  plat: [800, 800, false], categorie: [600, 600, false], banniere: [1600, 700, false], logo: [500, 200, true],
};

async function nouvellePhoto(fichier, format) {
  let data;
  try {
    data = await compresserImage(fichier, ...FORMATS_PHOTO[format]);
  } catch (e) {
    alert("Cette image n'a pas pu être lue. Essayez une photo au format JPG ou PNG.");
    return null;
  }
  const id = uid();
  photos.set(id, data);
  try { await PhotosLocales.mettre(id, data); } catch (e) { alert("La photo n'a pas pu être enregistrée sur cet appareil."); return null; }
  return id;
}

// Champ photo des formulaires : aperçu + boutons ; la valeur (identifiant) est dans un champ caché
function champPhoto(nom, id, format, libelle = 'Photo') {
  return `
    <div class="champ-photo" data-format="${format}">
      <span class="muted">${libelle}</span>
      <div class="cp-ligne">
        <div class="cp-apercu ${format}">${id && srcPhoto(id) ? `<img src="${srcPhoto(id)}" alt="">` : '<span>Aucune photo</span>'}</div>
        <div class="cp-boutons">
          <label class="btn small">📷 ${id ? 'Changer' : 'Ajouter une photo'}<input type="file" accept="image/*" class="cp-fichier" hidden></label>
          <button type="button" class="btn small danger cp-retirer" ${id ? '' : 'hidden'}>Retirer</button>
        </div>
      </div>
      <input type="hidden" name="${nom}" value="${esc(id || '')}">
    </div>`;
}

document.addEventListener('change', async e => {
  const champ = e.target.closest('.champ-photo');
  if (!champ || !e.target.classList.contains('cp-fichier') || !e.target.files[0]) return;
  const id = await nouvellePhoto(e.target.files[0], champ.dataset.format);
  e.target.value = '';
  if (!id) return;
  $('input[type=hidden]', champ).value = id;
  $('.cp-apercu', champ).innerHTML = `<img src="${srcPhoto(id)}" alt="">`;
  $('.cp-retirer', champ).hidden = false;
});
document.addEventListener('click', e => {
  const b = e.target.closest('.cp-retirer');
  if (!b) return;
  const champ = b.closest('.champ-photo');
  $('input[type=hidden]', champ).value = '';
  $('.cp-apercu', champ).innerHTML = '<span>Aucune photo</span>';
  b.hidden = true;
});

// Enregistre sur cet appareil puis envoie les changements aux autres appareils (si la synchronisation est active)
function sauver() {
  ecrireLocal();
  window.syncApi?.programmer();
}

/* =========================================================
   Utilitaires
   ========================================================= */

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function esc(v) {
  return String(v ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

const fmtDh = new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const dh = n => fmtDh.format(n || 0) + ' DH';

function aujourdHui() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function jourDe(iso) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function fmtDate(ymd) {
  const [y, m, d] = ymd.split('-');
  return `${d}/${m}/${y}`;
}

function fmtHeure(iso) {
  return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

const totalCommande = c => c.lignes.reduce((s, l) => s + l.prix * l.qte, 0);
const commandeOuverte = tableId => db.commandes.find(c => c.tableId === tableId && c.statut === 'ouverte');
const categories = () => trierCategories([...new Set(db.carte.map(p => p.categorie))]);
const variantesDe = p => p.variantes || [];
// Un plat peut avoir plusieurs prix (ex. : Sole 100, 120, 130 DH), chacun avec une précision facultative (ex. : 500 g).
const taillesDe = p => p.tailles || [];
const prixMin = plat => taillesDe(plat).length ? Math.min(...taillesDe(plat).map(t => Number(t.prix))) : Number(plat.prix);
const nomTailleDe = t => [t.groupe, t.nom].filter(Boolean).join(' ');
const libellePrix = t => dh(t.prix) + (nomTailleDe(t) ? ` (${nomTailleDe(t)})` : '');
// Sous-menus d'un plat (ex. Poulet → Frit, Sauté…) : noms des groupes de prix, dans l'ordre
const groupesDe = plat => [...new Set(taillesDe(plat).map(t => t.groupe || ''))].filter(Boolean);
const fmtSupplement = v => (v.supplement ? ` (+${dh(v.supplement)})` : '');

/* =========================================================
   Fenêtre modale générique
   ========================================================= */

const modal = $('#modal');
let modalSubmit = null;

function ouvrirModal(titre, corpsHtml, onSubmit, libelleOk = 'Enregistrer') {
  $('#modal-title').textContent = titre;
  $('#modal-body').innerHTML = corpsHtml;
  $('#modal-ok').textContent = libelleOk || '';
  $('#modal-ok').hidden = !libelleOk;
  modalSubmit = onSubmit;
  if (!modal.open) modal.showModal();
  const premier = $('input, select, textarea', modal);
  if (premier) premier.focus();
}

$('#modal-form').addEventListener('submit', e => {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(e.target));
  $$('input[type=checkbox]', e.target).forEach(cb => { data[cb.name] = cb.checked; });
  if (modalSubmit && modalSubmit(data) === false) return;
  modal.close();
  sauver();
  rendre();
});
$('#modal-cancel').addEventListener('click', () => modal.close());

function confirmer(message) {
  return window.confirm(message);
}

/* =========================================================
   Vues
   ========================================================= */

const vues = {};

/* ---------- Tableau de bord ---------- */
vues.tableau = () => {
  const jour = aujourdHui();
  const payeesJour = db.commandes.filter(c => c.statut === 'payee' && jourDe(c.payeeLe) === jour);
  const ca = payeesJour.reduce((s, c) => s + totalCommande(c), 0);
  const ouvertes = db.commandes.filter(c => c.statut === 'ouverte');
  const resaJour = db.reservations.filter(r => r.date === jour).sort((a, b) => a.heure.localeCompare(b.heure));
  const couverts = resaJour.reduce((s, r) => s + Number(r.couverts || 0), 0);
  const alertes = db.stock.filter(s => Number(s.quantite) <= Number(s.seuil));

  return `
    <h1>Tableau de bord — ${esc(db.restaurant.nom)}</h1>
    <div class="grid cols-4">
      <div class="card stat"><div class="label">Chiffre d'affaires du jour</div><div class="value">${dh(ca)}</div></div>
      <div class="card stat"><div class="label">Tickets encaissés</div><div class="value">${payeesJour.length}</div></div>
      <div class="card stat"><div class="label">Tables occupées</div><div class="value">${ouvertes.filter(c => modeDe(c) === 'sur_place').length} / ${db.tables.length}</div>
        ${ouvertes.some(c => modeDe(c) !== 'sur_place') ? `<div class="muted small-note">+ ${ouvertes.filter(c => modeDe(c) === 'emporter').length} à emporter · ${ouvertes.filter(c => modeDe(c) === 'livraison').length} en livraison</div>` : ''}</div>
      <div class="card stat"><div class="label">Couverts réservés aujourd'hui</div><div class="value">${couverts}</div></div>
    </div>
    <div class="grid cols-2" style="margin-top:16px">
      <div class="card">
        <h2>Réservations du jour</h2>
        ${resaJour.length ? `
          <table class="list">
            <tr><th>Heure</th><th>Nom</th><th class="num">Couverts</th><th>Table</th></tr>
            ${resaJour.map(r => `
              <tr><td>${esc(r.heure)}</td><td>${esc(r.nom)}</td><td class="num">${esc(r.couverts)}</td>
              <td>${esc(db.tables.find(t => t.id === r.tableId)?.nom || '—')}</td></tr>`).join('')}
          </table>` : '<div class="empty">Aucune réservation aujourd\'hui.</div>'}
      </div>
      <div class="card">
        <h2>Alertes de stock</h2>
        ${alertes.length ? `
          <table class="list">
            <tr><th>Produit</th><th class="num">Reste</th><th class="num">Seuil</th></tr>
            ${alertes.map(s => `
              <tr class="alert"><td>${esc(s.nom)}</td><td class="num">${esc(s.quantite)} ${esc(s.unite)}</td>
              <td class="num">${esc(s.seuil)}</td></tr>`).join('')}
          </table>` : '<div class="empty">✅ Aucun produit sous le seuil.</div>'}
      </div>
    </div>`;
};

/* ---------- Commandes (plan de salle) ---------- */
let tableSelectionnee = null;

const MODES = {
  sur_place: { libelle: 'Sur place', icone: '🍽️' },
  emporter: { libelle: 'À emporter', icone: '🥡' },
  livraison: { libelle: 'Livraison', icone: '🛵' },
};
const modeDe = c => (MODES[c.type] ? c.type : 'sur_place');
let modeSalle = 'sur_place';

vues.commandes = () => {
  if (tableSelectionnee && (db.tables.some(t => t.id === tableSelectionnee) || commandeOuverte(tableSelectionnee))) {
    return vuePriseCommande(tableSelectionnee);
  }
  tableSelectionnee = null;
  const enCours = type => db.commandes.filter(c => c.statut === 'ouverte' && modeDe(c) === type);
  const onglets = `
    <div class="onglets modes">
      <button class="btn" data-action="importer-whatsapp" style="margin-left:auto;order:2">📥 Commande WhatsApp</button>
      ${Object.entries(MODES).map(([k, m]) => {
        const n = enCours(k).length;
        return `<button class="btn ${modeSalle === k ? 'primary' : ''}" data-action="mode-salle" data-mode="${k}">
          ${m.icone} ${m.libelle}${n ? ` <span class="compteur">${n}</span>` : ''}</button>`;
      }).join('')}
    </div>`;

  if (modeSalle !== 'sur_place') {
    const m = MODES[modeSalle];
    const liste = enCours(modeSalle).sort((a, b) => a.ouverteLe.localeCompare(b.ouverteLe));
    return `
      <div class="toolbar">
        <h1>${m.icone} ${m.libelle}</h1>
        <button class="btn primary" data-action="nouvelle-commande-externe">+ Nouvelle commande ${modeSalle === 'livraison' ? 'à livrer' : 'à emporter'}</button>
      </div>
      ${onglets}
      <p class="muted">Commandes en cours. Cliquez sur une commande pour la compléter ou l'encaisser.</p>
      <div class="grid tables">
        ${liste.map(c => `
          <div class="card table-tile ${c.lignes.length ? 'busy' : ''}" data-action="ouvrir-table" data-id="${esc(c.tableId)}">
            <div class="name">${esc(c.client?.nom || c.tableNom)}</div>
            <div class="info">${dh(totalCommande(c))} · ${fmtHeure(c.ouverteLe)}</div>
            ${c.client?.tel ? `<div class="info">📞 ${esc(c.client.tel)}</div>` : ''}
            ${c.client?.adresse ? `<div class="info">📍 ${esc(c.client.adresse)}</div>` : ''}
          </div>`).join('') || `<div class="empty">Aucune commande ${modeSalle === 'livraison' ? 'à livrer' : 'à emporter'} en cours.</div>`}
      </div>`;
  }

  return `
    <div class="toolbar">
      <h1>Plan de salle</h1>
      <button class="btn" data-action="ajouter-table">+ Ajouter une table</button>
    </div>
    ${onglets}
    <p class="muted">Cliquez sur une table pour ouvrir ou compléter sa commande.</p>
    <div class="grid tables">
      ${db.tables.map(t => {
        const c = commandeOuverte(t.id);
        return `
          <div class="card table-tile ${c ? 'busy' : ''}" data-action="ouvrir-table" data-id="${t.id}">
            <div class="name">${esc(t.nom)}</div>
            <div class="info">${c ? `${dh(totalCommande(c))} · depuis ${fmtHeure(c.ouverteLe)}` : `Libre · ${esc(t.places)} places`}</div>
          </div>`;
      }).join('') || '<div class="empty">Aucune table. Ajoutez-en une.</div>'}
    </div>`;
};

function vuePriseCommande(tableId) {
  const table = db.tables.find(t => t.id === tableId);
  const c = commandeOuverte(tableId);
  const lignes = c ? c.lignes : [];
  const dispo = db.carte.filter(p => p.disponible);
  const mode = MODES[c ? modeDe(c) : 'sur_place'];

  return `
    <div class="toolbar">
      <h1>${table ? esc(table.nom) : `${mode.icone} ${esc(c.tableNom)}`}</h1>
      <div>
        <button class="btn" data-action="retour-salle">← ${table ? 'Plan de salle' : mode.libelle}</button>
        ${table ? `<button class="btn danger" data-action="supprimer-table" data-id="${table.id}">Supprimer la table</button>`
          : `<button class="btn" data-action="modifier-client">Modifier le client</button>`}
      </div>
    </div>
    ${!table && c.client && (c.client.tel || c.client.adresse) ? `<p class="muted">
      ${c.client.tel ? `📞 ${esc(c.client.tel)}` : ''} ${c.client.adresse ? ` · 📍 ${esc(c.client.adresse)}` : ''}
      ${c.client.position ? ` · <a href="https://maps.google.com/?q=${esc(c.client.position)}" target="_blank" rel="noopener">🗺️ Voir la position du client</a>` : ''}</p>` : ''}
    <div class="order-layout">
      <div class="card">
        <h2>Carte</h2>
        ${categories().map(cat => {
          const plats = dispo.filter(p => p.categorie === cat);
          if (!plats.length) return '';
          return `
            <div class="menu-cat">
              <h3>${esc(cat)}</h3>
              <div class="menu-items">
                ${plats.map(p => `
                  <button class="menu-item" data-action="ajouter-ligne" data-id="${p.id}">
                    <div>${esc(p.nom)}</div>
                    <div class="price">${taillesDe(p).length ? 'dès ' : ''}${dh(prixMin(p))}</div>
                    ${taillesDe(p).length ? `<div class="muted small-note">${taillesDe(p).length} prix</div>` : ''}
                    ${variantesDe(p).length ? `<div class="muted small-note">${variantesDe(p).length} variantes</div>` : ''}
                  </button>`).join('')}
              </div>
            </div>`;
        }).join('') || '<div class="empty">La carte est vide.</div>'}
      </div>
      <div class="card" id="ticket">
        <h2>Ticket</h2>
        ${c ? `<p class="muted">Ouvert à ${fmtHeure(c.ouverteLe)}</p>` : ''}
        ${c?.note ? `<p class="note-commande">📝 ${esc(c.note)}</p>` : ''}
        ${c?.paiementPrevu ? `<p class="note-commande">${c.paiementPrevu === 'en_ligne' ? '🌐' : c.paiementPrevu === 'tpe' ? '💳' : '💵'}
          Paiement prévu : <strong>${esc(MENU_PAIEMENTS[c.paiementPrevu])}</strong>${c.paiementPrevu === 'en_ligne' ? ' — vérifiez la réception du paiement' : ''}</p>` : ''}
        ${lignes.length ? lignes.map((l, i) => `
          <div class="ticket-line">
            <button class="btn qty-btn" data-action="moins" data-i="${i}">−</button>
            <strong>${l.qte}</strong>
            <button class="btn qty-btn" data-action="plus" data-i="${i}">+</button>
            <span class="n">${esc(l.nom)}</span>
            <span>${dh(l.prix * l.qte)}</span>
          </div>`).join('') : '<div class="empty">Ajoutez des articles depuis la carte.</div>'}
        <div class="ticket-total"><span>Total</span><span>${dh(c ? totalCommande(c) : 0)}</span></div>
        ${c && lignes.length ? `
          ${boutonsWhatsApp(c)}
          <div class="row">
            <button class="btn" data-action="imprimer">🖨️ Addition</button>
            <button class="btn ok" data-action="encaisser">Encaisser</button>
          </div>
          <div style="margin-top:8px"><button class="btn danger small" data-action="annuler-commande">Annuler la commande</button></div>` : ''}
      </div>
    </div>`;
}

/* ---------- Carte ---------- */
vues.carte = () => `
  <div class="toolbar">
    <h1>Carte</h1>
    <div class="row" style="flex:0 0 auto;flex-wrap:wrap">
      <button class="btn" data-action="recuperer-carte" title="Copier sur cet appareil la carte publiée sur le site">🔄 Récupérer la carte en ligne</button>
      <button class="btn primary" data-action="ajouter-plat">+ Nouveau plat</button>
    </div>
  </div>
  ${categories().map(cat => `
    <div class="card" style="margin-bottom:16px">
      <h2>${esc(cat)}</h2>
      <div class="table-wrap"><table class="list">
        <tr><th>Nom</th><th class="num">Prix</th><th>Statut</th><th></th></tr>
        ${db.carte.filter(p => p.categorie === cat).map(p => `
          <tr>
            <td><div class="plat-titre">${srcPhoto(p.photo) ? `<img class="vignette" src="${srcPhoto(p.photo)}" alt="">` : ''}<span>${p.vedette ? '<span title="À la une">⭐</span> ' : ''}${esc(p.nom)}</span></div>
              ${groupesDe(p).length ? groupesDe(p).map(g => {
                const ts = taillesDe(p).filter(t => t.groupe === g);
                const epuise = ts.every(t => t.disponible === false);
                return `<div class="small-note sous-menu"><button class="puce ${epuise ? 'epuisee' : ''}" data-action="basculer-groupe" data-id="${p.id}" data-g="${esc(g)}"
                  title="${epuise ? 'Épuisé — cliquer pour le remettre' : 'Disponible — cliquer pour le marquer épuisé'}">${esc(g)}</button>
                  <span class="muted">${ts.map(t => `<span class="${t.disponible === false && !epuise ? 'barre' : ''}">${esc(dh(t.prix) + (t.nom ? ' ' + t.nom : ''))}</span>`).join(' · ')}</span></div>`;
              }).join('')
              : taillesDe(p).length ? `<div class="muted small-note">Prix : ${taillesDe(p).map(t => `<span class="${t.disponible === false ? 'barre' : ''}">${esc(libellePrix(t))}</span>`).join(' · ')}</div>` : ''}
              ${variantesDe(p).length ? `<div class="puces-variantes">${variantesDe(p).map((v, i) => `
                <button class="puce ${v.disponible === false ? 'epuisee' : ''}" data-action="basculer-variante" data-id="${p.id}" data-i="${i}"
                  title="${v.disponible === false ? 'Épuisée — cliquer pour la remettre' : 'Disponible — cliquer pour la marquer épuisée'}">${esc(v.nom)}${esc(fmtSupplement(v))}</button>`).join('')}</div>` : ''}</td>
            <td class="num">${taillesDe(p).length ? 'dès ' : ''}${dh(prixMin(p))}</td>
            <td><span class="badge ${p.disponible ? 'ok' : 'danger'}">${p.disponible ? 'Disponible' : 'Épuisé'}</span></td>
            <td class="num">
              <button class="btn small" data-action="basculer-plat" data-id="${p.id}">${p.disponible ? 'Marquer épuisé' : 'Remettre'}</button>
              <button class="btn small" data-action="modifier-plat" data-id="${p.id}">Modifier</button>
              <button class="btn small danger" data-action="supprimer-plat" data-id="${p.id}">Supprimer</button>
            </td>
          </tr>`).join('')}
      </table></div>
    </div>`).join('') || '<div class="card empty">La carte est vide.</div>'}`;

function formPlat(p = {}) {
  const lignesPrix = taillesDe(p).length ? taillesDe(p) : [{ nom: '', prix: p.prix ?? '' }];
  // Regroupe les prix par sous-menu (un seul groupe sans nom pour un plat simple)
  const groupes = [];
  lignesPrix.forEach(t => {
    let g = groupes.find(x => x.nom === (t.groupe || ''));
    if (!g) groupes.push(g = { nom: t.groupe || '', lignes: [] });
    g.lignes.push(t);
  });
  groupes.forEach(g => {
    g.disponible = g.lignes.some(t => t.disponible !== false);
    // Sous-menu entièrement épuisé : les portions s'affichent cochées, c'est la case du sous-menu qui compte
    if (!g.disponible) g.lignes = g.lignes.map(t => ({ ...t, disponible: true }));
  });
  return `
    <label>Nom<input name="nom" required value="${esc(p.nom)}"></label>
    <label>Catégorie<input name="categorie" required list="liste-cat" value="${esc(p.categorie)}"></label>
    ${champPhoto('photo', p.photo, 'plat', 'Photo (visible sur la carte en ligne)')}
    <label>Description courte (facultatif)<input name="description" maxlength="140" placeholder="Ex. : Poulet braisé, attiéké et sauce piment" value="${esc(p.description)}"></label>
    <label><input type="checkbox" name="vedette" style="width:auto" ${p.vedette ? 'checked' : ''}> ⭐ À la une (rubrique « Meilleures offres » de la carte en ligne)</label>
    <fieldset class="variantes">
      <legend>Prix (DH) — et sous-menus si besoin (ex. : Poulet → Frit, Sauté, Choukouya…)</legend>
      <div id="liste-groupes">${groupes.map(groupePrix).join('')}</div>
      <button type="button" class="btn small" data-action="ajouter-groupe">+ Ajouter un sous-menu</button>
    </fieldset>
    <datalist id="liste-cat">${categories().map(c => `<option value="${esc(c)}">`).join('')}</datalist>
    <label><input type="checkbox" name="disponible" style="width:auto" ${p.disponible !== false ? 'checked' : ''}> Disponible</label>
    <fieldset class="variantes">
      <legend>Variantes (cuisson, garniture…) — facultatif</legend>
      <div id="variantes">${variantesDe(p).map(ligneVariante).join('')}</div>
      <button type="button" class="btn small" data-action="ajouter-variante">+ Ajouter une variante</button>
    </fieldset>`;
}

function ligneVariante(v = {}) {
  return `
    <div class="variante-row">
      <input class="v-nom" placeholder="Ex. : À point, Bien cuit…" value="${esc(v.nom)}">
      <input class="v-supp" type="number" step="0.01" min="0" placeholder="+ DH" title="Supplément en DH" value="${v.supplement ? esc(v.supplement) : ''}">
      <label class="v-dispo-label" title="Décochez si cette option est épuisée"><input type="checkbox" class="v-dispo" ${v.disponible !== false ? 'checked' : ''}> Dispo</label>
      <button type="button" class="btn small danger" data-action="retirer-variante" title="Supprimer définitivement">✕</button>
    </div>`;
}

function groupePrix(g = { nom: '', disponible: true, lignes: [{}] }) {
  return `
    <div class="groupe-prix">
      <div class="gp-entete">
        <input class="gp-nom" placeholder="Sous-menu (facultatif) — ex. : Frit" value="${esc(g.nom)}">
        <label class="v-dispo-label" title="Décochez si ce sous-menu est épuisé"><input type="checkbox" class="gp-dispo" ${g.disponible ? 'checked' : ''}> Dispo</label>
        <button type="button" class="btn small danger" data-action="retirer-groupe" title="Supprimer ce sous-menu et ses prix">✕</button>
      </div>
      <div class="gp-lignes">${g.lignes.map(lignePrix).join('')}</div>
      <button type="button" class="btn small" data-action="ajouter-prix">+ Ajouter un prix</button>
    </div>`;
}

function lignePrix(t = {}) {
  return `
    <div class="prix-row">
      <input class="px-prix" type="number" step="0.01" min="0" placeholder="DH" value="${esc(t.prix ?? '')}">
      <input class="px-nom" placeholder="Portion — ex. : 1/4" title="Précision facultative (ex. : 1/4, 500 g, Grand…)" value="${esc(t.nom)}">
      <label class="v-dispo-label" title="Décochez si cette portion est épuisée"><input type="checkbox" class="px-dispo" ${t.disponible !== false ? 'checked' : ''}> Dispo</label>
      <button type="button" class="btn small danger" data-action="retirer-prix" title="Retirer ce prix">✕</button>
    </div>`;
}

function lirePrix() {
  return $$('#liste-groupes .groupe-prix').flatMap(g => {
    const groupe = $('.gp-nom', g).value.trim();
    const dispo = $('.gp-dispo', g).checked;
    return $$('.prix-row', g).map(r => ({ groupe, dispo: dispo && $('.px-dispo', r).checked, prix: $('.px-prix', r).value, nom: $('.px-nom', r).value.trim() }));
  });
}

function lireVariantes() {
  return $$('#variantes .variante-row')
    .map(r => ({ nom: $('.v-nom', r).value.trim(), supplement: Number($('.v-supp', r).value) || 0,
      ...($('.v-dispo', r).checked ? {} : { disponible: false }) }))
    .filter(v => v.nom);
}

function lirePlat(d) {
  const lignes = lirePrix();
  const sansPrix = lignes.find(l => l.nom && l.prix === '');
  if (sansPrix) { alert(`Indiquez le prix pour « ${sansPrix.nom} ».`); return null; }
  const prixListe = lignes.filter(l => l.prix !== '').map(l => ({
    nom: l.nom, prix: Number(l.prix),
    ...(l.groupe ? { groupe: l.groupe } : {}),
    ...(l.dispo ? {} : { disponible: false }),
  }));
  if (!prixListe.length) { alert('Indiquez au moins un prix.'); return null; }
  const avecSousMenus = prixListe.some(t => t.groupe);
  return { nom: d.nom.trim(), categorie: d.categorie.trim(), prix: Math.min(...prixListe.map(l => l.prix)),
    disponible: d.disponible, variantes: lireVariantes(), tailles: prixListe.length > 1 || avecSousMenus ? prixListe : [],
    photo: d.photo || '', description: (d.description || '').trim(), vedette: !!d.vedette };
}

function ajouterLigne(plat, taille, variante) {
  let c = commandeOuverte(tableSelectionnee);
  if (!c) {
    c = { id: uid(), tableId: tableSelectionnee, tableNom: db.tables.find(t => t.id === tableSelectionnee).nom,
      lignes: [], statut: 'ouverte', ouverteLe: new Date().toISOString(), type: 'sur_place' };
    db.commandes.push(c);
  }
  ajouterLigneA(c, plat, taille, variante, 1);
  sauver(); rendre();
}

function ajouterLigneA(c, plat, taille, variante, qte) {
  const nomTaille = (taille && nomTailleDe(taille)) || null;
  const nomVariante = variante ? variante.nom : null;
  const prixBase = Number(taille ? taille.prix : plat.prix);
  const prix = prixBase + (variante ? variante.supplement : 0);
  const ligne = c.lignes.find(l => l.platId === plat.id && (l.taille || null) === nomTaille
    && (l.variante || null) === nomVariante && l.prix === prix);
  if (ligne) ligne.qte += qte;
  else c.lignes.push({
    platId: plat.id,
    taille: nomTaille,
    variante: nomVariante,
    nom: plat.nom + (nomTaille ? ` — ${nomTaille}${!taille.nom ? ' ' + dh(taille.prix) : ''}` : taille ? ` ${dh(taille.prix)}` : '') + (variante ? ` (${variante.nom})` : ''),
    supplement: variante ? variante.supplement : 0,
    prix,
    qte,
  });
}

// Demande le prix (si le plat en a plusieurs) puis la variante, avant d'ajouter la ligne.
function choisirOptions(plat, iTaille = null, groupe = null) {
  const tailles = taillesDe(plat);
  const variantes = variantesDe(plat);
  if (tailles.length && iTaille == null) {
    const dispo = tailles.map((t, i) => ({ t, i })).filter(x => x.t.disponible !== false);
    if (!dispo.length) return alert(`« ${plat.nom} » est épuisé.`);
    const groupes = [...new Set(dispo.map(x => x.t.groupe || ''))];
    if (groupes.some(Boolean) && groupe == null) {
      if (groupes.length > 1) {
        return ouvrirModal(plat.nom, `
          <p class="muted">Choisissez :</p>
          <div class="choix-variantes">
            ${groupes.map(g => {
              const prix = dispo.filter(x => (x.t.groupe || '') === g).map(x => x.t.prix);
              return `<button type="button" class="btn" data-action="choisir-groupe" data-id="${plat.id}" data-g="${esc(g)}">
                ${esc(g || plat.nom)}<span class="muted">${prix.length > 1 ? 'dès ' : ''}${dh(Math.min(...prix))}</span></button>`;
            }).join('')}
          </div>
          ${groupesDe(plat).filter(g => !groupes.includes(g)).length ? `<p class="muted small-note">Épuisé : ${groupesDe(plat).filter(g => !groupes.includes(g)).map(esc).join(', ')}</p>` : ''}`, null, null);
      }
      groupe = groupes[0];
    }
    const liste = groupe == null ? dispo : dispo.filter(x => (x.t.groupe || '') === groupe);
    if (liste.length > 1) {
      return ouvrirModal(plat.nom + (groupe ? ` — ${groupe}` : ''), `
        <p class="muted">Choisissez ${liste.some(x => x.t.nom) ? 'la portion' : 'le prix'} :</p>
        <div class="choix-variantes">
          ${liste.map(({ t, i }) => `
            <button type="button" class="btn" data-action="choisir-taille" data-id="${plat.id}" data-t="${i}">
              ${dh(t.prix)}<span class="muted">${esc(t.nom)}</span>
            </button>`).join('')}
        </div>`, null, null);
    }
    iTaille = liste[0].i;
  }
  const taille = iTaille == null ? null : tailles[iTaille];
  if (variantes.some(v => v.disponible !== false)) {
    return ouvrirModal(plat.nom + (taille ? ` — ${libellePrix(taille)}` : ''), `
      <p class="muted">Choisissez la variante :</p>
      <div class="choix-variantes">
        ${variantes.map((v, i) => v.disponible === false ? '' : `
          <button type="button" class="btn" data-action="choisir-variante" data-id="${plat.id}" data-t="${iTaille ?? ''}" data-i="${i}">
            ${esc(v.nom)}<span class="muted">${v.supplement ? '+' + dh(v.supplement) : ''}</span>
          </button>`).join('')}
      </div>
      ${variantes.some(v => v.disponible === false) ? `<p class="muted small-note">Épuisé : ${variantes.filter(v => v.disponible === false).map(v => esc(v.nom)).join(', ')}</p>` : ''}`, null, null);
  }
  if (modal.open) modal.close();
  ajouterLigne(plat, taille, null);
}

/* ---------- Réservations ---------- */
let filtreResa = 'avenir';

vues.reservations = () => {
  const jour = aujourdHui();
  let liste = [...db.reservations].sort((a, b) => (a.date + a.heure).localeCompare(b.date + b.heure));
  if (filtreResa === 'avenir') liste = liste.filter(r => r.date >= jour);
  if (filtreResa === 'jour') liste = liste.filter(r => r.date === jour);
  if (filtreResa === 'passees') liste = liste.filter(r => r.date < jour).reverse();

  return `
    <div class="toolbar">
      <h1>Réservations</h1>
      <div class="row" style="flex:0 0 auto">
        <select data-action="filtre-resa" style="width:auto">
          <option value="jour" ${filtreResa === 'jour' ? 'selected' : ''}>Aujourd'hui</option>
          <option value="avenir" ${filtreResa === 'avenir' ? 'selected' : ''}>À venir</option>
          <option value="passees" ${filtreResa === 'passees' ? 'selected' : ''}>Passées</option>
          <option value="toutes" ${filtreResa === 'toutes' ? 'selected' : ''}>Toutes</option>
        </select>
        <button class="btn primary" data-action="ajouter-resa">+ Réservation</button>
      </div>
    </div>
    <div class="card table-wrap">
      ${liste.length ? `
        <table class="list">
          <tr><th>Date</th><th>Heure</th><th>Nom</th><th>Téléphone</th><th class="num">Couverts</th><th>Table</th><th>Note</th><th></th></tr>
          ${liste.map(r => `
            <tr>
              <td>${fmtDate(r.date)}</td><td>${esc(r.heure)}</td><td>${esc(r.nom)}</td><td>${esc(r.tel)}</td>
              <td class="num">${esc(r.couverts)}</td>
              <td>${esc(db.tables.find(t => t.id === r.tableId)?.nom || '—')}</td>
              <td class="muted">${esc(r.note)}</td>
              <td class="num">
                <button class="btn small" data-action="modifier-resa" data-id="${r.id}">Modifier</button>
                <button class="btn small danger" data-action="supprimer-resa" data-id="${r.id}">Supprimer</button>
              </td>
            </tr>`).join('')}
        </table>` : '<div class="empty">Aucune réservation.</div>'}
    </div>`;
};

function formResa(r = {}) {
  return `
    <label>Nom du client<input name="nom" required value="${esc(r.nom)}"></label>
    <label>Téléphone<input name="tel" type="tel" value="${esc(r.tel)}"></label>
    <div class="row">
      <label>Date<input name="date" type="date" required value="${esc(r.date || aujourdHui())}"></label>
      <label>Heure<input name="heure" type="time" required value="${esc(r.heure || '20:00')}"></label>
    </div>
    <div class="row">
      <label>Couverts<input name="couverts" type="number" min="1" required value="${esc(r.couverts || 2)}"></label>
      <label>Table
        <select name="tableId">
          <option value="">— Non attribuée —</option>
          ${db.tables.map(t => `<option value="${t.id}" ${r.tableId === t.id ? 'selected' : ''}>${esc(t.nom)} (${esc(t.places)} pl.)</option>`).join('')}
        </select>
      </label>
    </div>
    <label>Note (allergies, occasion…)<textarea name="note" rows="2">${esc(r.note)}</textarea></label>`;
}

/* ---------- Stock ---------- */
vues.stock = () => `
  <div class="toolbar">
    <h1>Stock</h1>
    <button class="btn primary" data-action="ajouter-stock">+ Nouveau produit</button>
  </div>
  <div class="card table-wrap">
    ${db.stock.length ? `
      <table class="list">
        <tr><th>Produit</th><th class="num">Quantité</th><th>Unité</th><th class="num">Seuil d'alerte</th><th class="num">Dernier prix d'achat</th><th>État</th><th></th></tr>
        ${[...db.stock].sort((a, b) => a.nom.localeCompare(b.nom)).map(s => {
          const bas = Number(s.quantite) <= Number(s.seuil);
          return `
            <tr class="${bas ? 'alert' : ''}">
              <td>${esc(s.nom)}</td>
              <td class="num">
                <button class="btn qty-btn" data-action="stock-moins" data-id="${s.id}">−</button>
                <strong style="display:inline-block;min-width:40px;text-align:center">${esc(s.quantite)}</strong>
                <button class="btn qty-btn" data-action="stock-plus" data-id="${s.id}">+</button>
              </td>
              <td>${esc(s.unite)}</td>
              <td class="num">${esc(s.seuil)}</td>
              <td class="num">${s.prixAchat ? `${dh(s.prixAchat)} / ${esc(s.unite)}` : '<span class="muted">—</span>'}</td>
              <td><span class="badge ${bas ? 'warn' : 'ok'}">${bas ? 'À commander' : 'OK'}</span></td>
              <td class="num">
                <button class="btn small" data-action="modifier-stock" data-id="${s.id}">Modifier</button>
                <button class="btn small danger" data-action="supprimer-stock" data-id="${s.id}">Supprimer</button>
              </td>
            </tr>`;
        }).join('')}
      </table>
      <p class="muted" style="margin-top:12px">Valeur estimée du stock (au dernier prix d'achat) :
        <strong>${dh(db.stock.reduce((t, s) => t + (Number(s.quantite) * Number(s.prixAchat || 0)), 0))}</strong></p>` : '<div class="empty">Aucun produit en stock.</div>'}
  </div>`;

function formStock(s = {}) {
  return `
    <label>Produit<input name="nom" required value="${esc(s.nom)}"></label>
    <div class="row">
      <label>Quantité<input name="quantite" type="number" step="any" min="0" required value="${esc(s.quantite ?? 0)}"></label>
      <label>Unité<input name="unite" required placeholder="kg, L, pièces…" value="${esc(s.unite)}"></label>
    </div>
    <label>Seuil d'alerte<input name="seuil" type="number" step="any" min="0" required value="${esc(s.seuil ?? 0)}"></label>`;
}

/* ---------- Ventes ---------- */
let periodeVentes = 7;

vues.ventes = () => {
  const debut = new Date();
  debut.setHours(0, 0, 0, 0);
  debut.setDate(debut.getDate() - (periodeVentes - 1));
  const payees = db.commandes.filter(c => c.statut === 'payee' && new Date(c.payeeLe) >= debut);

  const parJour = {};
  for (let i = 0; i < periodeVentes; i++) {
    const d = new Date(debut);
    d.setDate(d.getDate() + i);
    parJour[jourDe(d)] = 0;
  }
  payees.forEach(c => { parJour[jourDe(c.payeeLe)] += totalCommande(c); });
  const max = Math.max(1, ...Object.values(parJour));

  const parPlat = {};
  payees.forEach(c => c.lignes.forEach(l => {
    parPlat[l.nom] ??= { qte: 0, montant: 0 };
    parPlat[l.nom].qte += l.qte;
    parPlat[l.nom].montant += l.qte * l.prix;
  }));
  const top = Object.entries(parPlat).sort((a, b) => b[1].montant - a[1].montant);

  const parPaiement = {};
  payees.forEach(c => { parPaiement[c.paiement] = (parPaiement[c.paiement] || 0) + totalCommande(c); });
  const parMode = {};
  payees.forEach(c => { const m = MODES[modeDe(c)].libelle; parMode[m] = (parMode[m] || 0) + totalCommande(c); });


  const ca = payees.reduce((s, c) => s + totalCommande(c), 0);
  const tva = Number(db.restaurant.tva) || 0;
  const ht = ca / (1 + tva / 100);

  return `
    <div class="toolbar">
      <h1>Ventes</h1>
      <select data-action="periode-ventes" style="width:auto">
        ${[1, 7, 30, 90].map(n => `<option value="${n}" ${periodeVentes === n ? 'selected' : ''}>${n === 1 ? "Aujourd'hui" : `${n} derniers jours`}</option>`).join('')}
      </select>
    </div>
    <div class="grid cols-4">
      <div class="card stat"><div class="label">CA TTC</div><div class="value">${dh(ca)}</div></div>
      <div class="card stat"><div class="label">CA HT (TVA ${tva} %)</div><div class="value">${dh(ht)}</div></div>
      <div class="card stat"><div class="label">Tickets</div><div class="value">${payees.length}</div></div>
      <div class="card stat"><div class="label">Ticket moyen</div><div class="value">${dh(payees.length ? ca / payees.length : 0)}</div></div>
    </div>
    ${periodeVentes > 1 && periodeVentes <= 30 ? `
      <div class="card" style="margin-top:16px">
        <h2>Chiffre d'affaires par jour</h2>
        <div class="bar-chart">
          ${Object.entries(parJour).map(([j, v]) => `
            <div class="bar-col" title="${fmtDate(j)} : ${dh(v)}">
              <div class="bar-value">${v ? Math.round(v) + ' DH' : ''}</div>
              <div class="bar" style="height:${(v / max) * 100}%"></div>
              <div class="bar-label">${j.slice(8)}/${j.slice(5, 7)}</div>
            </div>`).join('')}
        </div>
      </div>` : ''}
    <div class="grid cols-2" style="margin-top:16px">
      <div class="card table-wrap">
        <h2>Meilleures ventes</h2>
        ${top.length ? `
          <table class="list">
            <tr><th>Article</th><th class="num">Qté</th><th class="num">Montant</th></tr>
            ${top.map(([nom, v]) => `<tr><td>${esc(nom)}</td><td class="num">${v.qte}</td><td class="num">${dh(v.montant)}</td></tr>`).join('')}
          </table>` : '<div class="empty">Aucune vente sur la période.</div>'}
      </div>
      <div class="card">
        <h2>Par moyen de paiement</h2>
        ${Object.keys(parPaiement).length ? `
          <table class="list">
            ${Object.entries(parPaiement).map(([m, v]) => `<tr><td>${esc(m)}</td><td class="num">${dh(v)}</td></tr>`).join('')}
          </table>` : '<div class="empty">—</div>'}
        <h2 style="margin-top:20px">Par mode de service</h2>
        ${Object.keys(parMode).length ? `
          <table class="list">
            ${Object.entries(parMode).map(([m, v]) => `<tr><td>${esc(m)}</td><td class="num">${dh(v)}</td></tr>`).join('')}
          </table>` : '<div class="empty">—</div>'}
        <h2 style="margin-top:20px">Derniers tickets</h2>
        ${payees.length ? `
          <table class="list">
            ${[...payees].reverse().slice(0, 10).map(c => `
              <tr><td>${fmtDate(jourDe(c.payeeLe))} ${fmtHeure(c.payeeLe)}</td>
              <td>${esc(c.tableNom)}</td><td class="num">${dh(totalCommande(c))}</td>
              <td class="num">${db.factures.some(f => f.commandeId === c.id)
                ? `<span class="badge ok">${esc(db.factures.find(f => f.commandeId === c.id).numero)}</span>`
                : `<button class="btn small" data-action="facturer-ticket" data-id="${c.id}">Facture</button>`}</td></tr>`).join('')}
          </table>` : '<div class="empty">—</div>'}
      </div>
    </div>`;
};

/* ---------- Paramètres ---------- */
vues.parametres = () => `
  <h1>Paramètres</h1>
  ${carteSync()}
  <div class="grid cols-2">
    <div class="card">
      <h2>Restaurant</h2>
      <form id="form-params">
        <label>Nom du restaurant<input name="nom" required value="${esc(db.restaurant.nom)}"></label>
        <label>Taux de TVA restauration (%)<input name="tva" type="number" step="0.1" min="0" value="${esc(db.restaurant.tva)}"></label>
        <label>Adresse<input name="adresse" value="${esc(db.restaurant.adresse)}"></label>
        <label>Téléphone<input name="telephone" type="tel" value="${esc(db.restaurant.telephone)}"></label>
        <p class="muted small-note">Mentions légales imprimées sur les factures :</p>
        <div class="row">
          <label>ICE<input name="ice" value="${esc(db.restaurant.ice)}"></label>
          <label>IF (identifiant fiscal)<input name="if" value="${esc(db.restaurant.if)}"></label>
        </div>
        <div class="row">
          <label>RC<input name="rc" value="${esc(db.restaurant.rc)}"></label>
          <label>Patente<input name="patente" value="${esc(db.restaurant.patente)}"></label>
          <label>CNSS<input name="cnss" value="${esc(db.restaurant.cnss)}"></label>
        </div>
        <button class="btn primary" type="submit">Enregistrer</button>
      </form>
    </div>
    <div class="card">
      <h2>Sauvegarde des données</h2>
      <p class="muted">${syncEtat.connecte
        ? 'Les données sont enregistrées dans ce navigateur et synchronisées en ligne. Un export de temps en temps reste une bonne précaution.'
        : 'Les données sont enregistrées dans ce navigateur. Exportez-les régulièrement pour ne rien perdre, ou pour les transférer sur un autre appareil.'}</p>
      <div class="row" style="flex-wrap:wrap">
        <button class="btn" data-action="exporter">⬇️ Exporter (JSON)</button>
        <label class="btn" style="margin:0;text-align:center;color:var(--text)">⬆️ Importer
          <input type="file" accept="application/json" data-action="importer" hidden>
        </label>
      </div>
      ${copiesSecurite().length ? `<p class="muted small-note" style="margin-top:16px">Copies de sécurité automatiques sur cet appareil :</p>
        ${copiesSecurite().map((c, i) => `<p style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
          <span>${new Date(c.date).toLocaleString('fr-FR')} — ${esc(c.raison)} (${(c.donnees.commandes || []).length} commandes, ${(c.donnees.carte || []).length} plats)</span>
          <button class="btn small" data-action="restaurer-copie" data-i="${i}">Restaurer</button></p>`).join('')}` : ''}
      <p style="margin-top:20px"><button class="btn danger" data-action="reinitialiser">Réinitialiser toutes les données</button></p>
    </div>
  </div>`;

/* =========================================================
   Actions (délégation d'événements)
   ========================================================= */

const actions = {
  /* Salle & commandes */
  'ajouter-table': () => ouvrirModal('Nouvelle table', `
      <label>Nom<input name="nom" required value="Table ${db.tables.length + 1}"></label>
      <label>Nombre de places<input name="places" type="number" min="1" required value="4"></label>`,
    d => { db.tables.push({ id: uid(), nom: d.nom.trim(), places: Number(d.places) }); }),

  'mode-salle': el => { modeSalle = el.dataset.mode; rendre(); },

  'nouvelle-commande-externe': () => {
    const type = modeSalle;
    const livraison = type === 'livraison';
    ouvrirModal(livraison ? 'Nouvelle commande à livrer' : 'Nouvelle commande à emporter', formClient({}, livraison), d => {
      const c = creerCommandeExterne(type, lireClient(d));
      if (livraison && Number(d.frais) > 0) c.lignes.push({ platId: null, nom: 'Frais de livraison', prix: Number(d.frais), supplement: 0, qte: 1 });
      tableSelectionnee = c.tableId;
    }, 'Créer la commande');
  },

  'modifier-client': () => {
    const c = commandeOuverte(tableSelectionnee);
    ouvrirModal('Client', formClient(c.client || {}, modeDe(c) === 'livraison', false), d => {
      c.client = lireClient(d);
      c.tableNom = c.tableNom.replace(/ — .*$/, '') + (c.client.nom ? ' — ' + c.client.nom : '');
    });
  },

  'ouvrir-table': el => { tableSelectionnee = el.dataset.id; rendre(); },
  'retour-salle': () => { tableSelectionnee = null; rendre(); },

  'supprimer-table': el => {
    if (commandeOuverte(el.dataset.id)) return alert('Cette table a une commande en cours.');
    if (!confirmer('Supprimer cette table ?')) return;
    db.tables = db.tables.filter(t => t.id !== el.dataset.id);
    tableSelectionnee = null;
    sauver(); rendre();
  },

  'ajouter-ligne': el => choisirOptions(db.carte.find(p => p.id === el.dataset.id)),

  'choisir-taille': el => choisirOptions(db.carte.find(p => p.id === el.dataset.id), Number(el.dataset.t)),
  'choisir-groupe': el => choisirOptions(db.carte.find(p => p.id === el.dataset.id), null, el.dataset.g),

  'choisir-variante': el => {
    const plat = db.carte.find(p => p.id === el.dataset.id);
    const taille = el.dataset.t === '' ? null : taillesDe(plat)[el.dataset.t];
    modal.close();
    ajouterLigne(plat, taille, variantesDe(plat)[el.dataset.i]);
  },

  'plus': el => { commandeOuverte(tableSelectionnee).lignes[el.dataset.i].qte++; sauver(); rendre(); },
  'moins': el => {
    const c = commandeOuverte(tableSelectionnee);
    const l = c.lignes[el.dataset.i];
    if (--l.qte <= 0) c.lignes.splice(el.dataset.i, 1);
    if (!c.lignes.length && modeDe(c) === 'sur_place') db.commandes = db.commandes.filter(x => x !== c);
    sauver(); rendre();
  },

  'annuler-commande': () => {
    if (!confirmer('Annuler toute la commande de cette table ?')) return;
    const c = commandeOuverte(tableSelectionnee);
    db.commandes = db.commandes.filter(x => x !== c);
    sauver(); rendre();
  },

  'imprimer': () => imprimerAddition(commandeOuverte(tableSelectionnee)),

  'encaisser': () => {
    const c = commandeOuverte(tableSelectionnee);
    const prevu = { especes: 'Espèces', tpe: 'Carte bancaire', en_ligne: 'Carte bancaire en ligne' }[c.paiementPrevu] || 'Carte bancaire';
    ouvrirModal(`Encaisser ${dh(totalCommande(c))}`, `
      <label>Moyen de paiement
        <select name="paiement">
          ${optionsHtml(['Carte bancaire', 'Espèces', 'Carte bancaire en ligne', 'Ticket restaurant', 'Chèque'], prevu)}
        </select>
      </label>`,
    d => {
      c.statut = 'payee';
      c.paiement = d.paiement;
      c.payeeLe = new Date().toISOString();
      tableSelectionnee = null;
    }, 'Valider le paiement');
  },

  /* Carte */
  'ajouter-plat': () => ouvrirModal('Nouveau plat', formPlat(), d => {
    const plat = lirePlat(d);
    if (!plat) return false;
    db.carte.push({ id: uid(), ...plat });
  }),
  'modifier-plat': el => {
    const p = db.carte.find(x => x.id === el.dataset.id);
    ouvrirModal('Modifier le plat', formPlat(p), d => {
      const plat = lirePlat(d);
      if (!plat) return false;
      Object.assign(p, plat);
    });
  },
  'ajouter-prix': el => {
    const lignes = $('.gp-lignes', el.closest('.groupe-prix'));
    lignes.insertAdjacentHTML('beforeend', lignePrix());
    $('.prix-row:last-child .px-prix', lignes).focus();
  },
  'retirer-prix': el => el.closest('.prix-row').remove(),
  // Nouveau sous-menu : reprend les portions du premier (1/4, 1/2…) avec des prix à remplir
  'ajouter-groupe': () => {
    const premier = $('#liste-groupes .groupe-prix');
    const portions = premier ? $$('.px-nom', premier).map(i => i.value.trim()).filter(Boolean) : [];
    const html = groupePrix({ nom: '', disponible: true, lignes: portions.length ? portions.map(nom => ({ nom })) : [{}] });
    $('#liste-groupes').insertAdjacentHTML('beforeend', html);
    $('#liste-groupes .groupe-prix:last-child .gp-nom').focus();
  },
  'retirer-groupe': el => {
    el.closest('.groupe-prix').remove();
    if (!$('#liste-groupes .groupe-prix')) $('#liste-groupes').insertAdjacentHTML('beforeend', groupePrix());
  },
  'basculer-groupe': el => {
    const ts = taillesDe(db.carte.find(p => p.id === el.dataset.id)).filter(t => t.groupe === el.dataset.g);
    const epuise = ts.every(t => t.disponible === false);
    ts.forEach(t => { if (epuise) delete t.disponible; else t.disponible = false; });
    sauver(); rendre();
  },
  'basculer-variante': el => {
    const v = variantesDe(db.carte.find(p => p.id === el.dataset.id))[el.dataset.i];
    if (v.disponible === false) delete v.disponible; else v.disponible = false;
    sauver(); rendre();
  },
  'ajouter-variante': () => {
    $('#variantes').insertAdjacentHTML('beforeend', ligneVariante());
    $('#variantes .variante-row:last-child .v-nom').focus();
  },
  'retirer-variante': el => el.closest('.variante-row').remove(),

  'basculer-plat': el => {
    const p = db.carte.find(x => x.id === el.dataset.id);
    p.disponible = !p.disponible;
    sauver(); rendre();
  },
  'supprimer-plat': el => {
    if (!confirmer('Supprimer ce plat de la carte ?')) return;
    db.carte = db.carte.filter(p => p.id !== el.dataset.id);
    sauver(); rendre();
  },

  /* Réservations */
  'ajouter-resa': () => ouvrirModal('Nouvelle réservation', formResa(), d => {
    db.reservations.push({ id: uid(), ...nettoyerResa(d) });
  }),
  'modifier-resa': el => {
    const r = db.reservations.find(x => x.id === el.dataset.id);
    ouvrirModal('Modifier la réservation', formResa(r), d => { Object.assign(r, nettoyerResa(d)); });
  },
  'supprimer-resa': el => {
    if (!confirmer('Supprimer cette réservation ?')) return;
    db.reservations = db.reservations.filter(r => r.id !== el.dataset.id);
    sauver(); rendre();
  },

  /* Stock */
  'ajouter-stock': () => ouvrirModal('Nouveau produit', formStock(), d => {
    db.stock.push({ id: uid(), nom: d.nom.trim(), quantite: Number(d.quantite), unite: d.unite.trim(), seuil: Number(d.seuil) });
  }),
  'modifier-stock': el => {
    const s = db.stock.find(x => x.id === el.dataset.id);
    ouvrirModal('Modifier le produit', formStock(s), d => {
      Object.assign(s, { nom: d.nom.trim(), quantite: Number(d.quantite), unite: d.unite.trim(), seuil: Number(d.seuil) });
    });
  },
  'stock-plus': el => { const s = db.stock.find(x => x.id === el.dataset.id); s.quantite = +(Number(s.quantite) + 1).toFixed(3); sauver(); rendre(); },
  'stock-moins': el => { const s = db.stock.find(x => x.id === el.dataset.id); s.quantite = Math.max(0, +(Number(s.quantite) - 1).toFixed(3)); sauver(); rendre(); },
  'supprimer-stock': el => {
    if (!confirmer('Supprimer ce produit du stock ?')) return;
    db.stock = db.stock.filter(s => s.id !== el.dataset.id);
    sauver(); rendre();
  },

  /* Paramètres */
  'exporter': () => {
    const photosUtiles = Object.fromEntries([...photosReferencees(db)].filter(id => photos.has(id)).map(id => [id, photos.get(id)]));
    const blob = new Blob([JSON.stringify({ ...db, photos: photosUtiles }, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `sauvegarde-restaurant-${aujourdHui()}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  },
  'reinitialiser': () => {
    if (!confirmer('Effacer TOUTES les données (carte, commandes, réservations, stock) ? Cette action est irréversible.')) return;
    if (syncEtat.connecte && !confirmer('La synchronisation est active : les données seront aussi effacées sur TOUS les appareils. Continuer ?')) return;
    copieSecurite('avant réinitialisation');
    db = structuredClone(DONNEES_DEMO);
    tableSelectionnee = null;
    sauver(); rendre();
  },
};

function formClient(cl, livraison, avecFrais = true) {
  return `
    <label>Nom du client${livraison ? '' : ' (facultatif)'}<input name="nom" ${livraison ? 'required' : ''} value="${esc(cl.nom)}"></label>
    <label>Téléphone${livraison ? '' : ' (facultatif)'}<input name="tel" type="tel" ${livraison ? 'required' : ''} value="${esc(cl.tel)}"></label>
    ${livraison ? `<label>Adresse de livraison<textarea name="adresse" rows="2" required>${esc(cl.adresse)}</textarea></label>` : ''}
    ${livraison && avecFrais ? '<label>Frais de livraison (DH, facultatif)<input name="frais" type="number" step="0.01" min="0" placeholder="0"></label>' : ''}`;
}

function lireClient(d) {
  return { nom: (d.nom || '').trim(), tel: (d.tel || '').trim(), adresse: (d.adresse || '').trim() };
}

function nettoyerResa(d) {
  return { nom: d.nom.trim(), tel: d.tel.trim(), date: d.date, heure: d.heure,
    couverts: Number(d.couverts), tableId: d.tableId || null, note: d.note.trim() };
}

function imprimerAddition(c) {
  const w = window.open('', '_blank', 'width=380,height=600');
  if (!w) return alert('Autorisez les fenêtres pop-up pour imprimer l\'addition.');
  const tva = Number(db.restaurant.tva) || 0;
  const total = totalCommande(c);
  const ht = total / (1 + tva / 100);
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Addition</title>
    <style>body{font-family:monospace;padding:16px;max-width:320px}h2{text-align:center;margin:0 0 4px}
    .c{text-align:center}.l{display:flex;justify-content:space-between}hr{border:none;border-top:1px dashed #000}</style></head><body>
    <h2>${esc(db.restaurant.nom)}</h2>
    <div class="c">${esc(c.tableNom)} — ${new Date().toLocaleString('fr-FR')}</div>
    ${modeDe(c) !== 'sur_place' ? `<div class="c">${MODES[modeDe(c)].libelle}${c.client?.tel ? ' — ' + esc(c.client.tel) : ''}</div>` : ''}
    ${c.client?.adresse ? `<div class="c">${esc(c.client.adresse)}</div>` : ''}
    ${c.note ? `<div class="c">Remarque : ${esc(c.note)}</div>` : ''}<hr>
    ${c.lignes.map(l => `<div class="l"><span>${l.qte} × ${esc(l.nom)}</span><span>${dh(l.qte * l.prix)}</span></div>`).join('')}
    <hr><div class="l"><span>Total HT</span><span>${dh(ht)}</span></div>
    <div class="l"><span>TVA ${tva} %</span><span>${dh(total - ht)}</span></div>
    <div class="l"><strong>TOTAL TTC</strong><strong>${dh(total)}</strong></div>
    <hr><div class="c">Merci de votre visite !</div>
    <script>window.print()<\/script></body></html>`);
  w.document.close();
}

document.addEventListener('click', e => {
  const el = e.target.closest('[data-action]');
  if (!el || el.tagName === 'SELECT' || el.tagName === 'INPUT') return;
  const fn = actions[el.dataset.action];
  if (fn) fn(el);
});

document.addEventListener('change', e => {
  const el = e.target;
  switch (el.dataset.action) {
    case 'filtre-resa': filtreResa = el.value; rendre(); break;
    case 'periode-ventes': periodeVentes = Number(el.value); rendre(); break;
    case 'importer': {
      const fichier = el.files[0];
      if (!fichier) return;
      fichier.text().then(async txt => {
        const data = JSON.parse(txt);
        if (!Array.isArray(data.carte) || !Array.isArray(data.commandes)) throw new Error('format inattendu');
        if (!confirmer(syncEtat.connecte
          ? 'Remplacer toutes les données par celles du fichier, sur TOUS les appareils synchronisés ?'
          : 'Remplacer toutes les données actuelles par celles du fichier ?')) return;
        copieSecurite('avant import');
        for (const [id, img] of Object.entries(data.photos || {})) {
          photos.set(id, img);
          await PhotosLocales.mettre(id, img).catch(() => {});
        }
        delete data.photos;
        db = migrer(data);
        sauver(); rendre();
        window.syncApi?.envoyerMaintenant();
        alert('Données importées avec succès.');
      }).catch(err => alert('Fichier invalide : ' + err.message));
      break;
    }
  }
});

document.addEventListener('submit', e => {
  if (e.target.id !== 'form-params') return;
  e.preventDefault();
  const d = Object.fromEntries(new FormData(e.target));
  db.restaurant.nom = d.nom.trim();
  db.restaurant.tva = Number(d.tva);
  ['adresse', 'telephone', 'ice', 'if', 'rc', 'patente', 'cnss'].forEach(k => { db.restaurant[k] = d[k].trim(); });
  sauver(); rendre();
  alert('Paramètres enregistrés.');
});

/* =========================================================
   Achats (fournisseurs, factures, entrée en stock)
   ========================================================= */

const TAUX_TVA = [0, 7, 10, 14, 20];
const PAIEMENTS = ['Espèces', 'Carte bancaire', 'Virement', 'Chèque'];
const CATEGORIES_DEPENSES = ['Loyer', 'Salaires', 'Charges sociales (CNSS)', 'Électricité', 'Eau', 'Gaz', 'Internet / Téléphone',
  'Entretien / Réparations', 'Assurance', 'Impôts et taxes', 'Frais bancaires', 'Publicité', 'Matériel', 'Autre'];
const CATEGORIES_RECETTES = ['Apport', 'Traiteur / Événement', 'Remboursement', 'Autre'];

const totalAchat = a => a.lignes.reduce((s, l) => s + Number(l.quantite) * Number(l.pu), 0);
const ht = (ttc, taux) => ttc / (1 + (Number(taux) || 0) / 100);
const nomFournisseur = id => db.fournisseurs.find(f => f.id === id)?.nom || '—';
const optionsHtml = (liste, choisi) => liste.map(v => `<option value="${esc(v)}" ${String(v) === String(choisi) ? 'selected' : ''}>${esc(v)}</option>`).join('');

let ongletAchats = 'achats';
let moisAchats = aujourdHui().slice(0, 7);
let anneeAchats = false;

vues.achats = () => {
  const onglets = `
    <div class="onglets">
      <button class="btn ${ongletAchats === 'achats' ? 'primary' : ''}" data-action="onglet-achats" data-o="achats">Factures d'achat</button>
      <button class="btn ${ongletAchats === 'fournisseurs' ? 'primary' : ''}" data-action="onglet-achats" data-o="fournisseurs">Fournisseurs</button>
    </div>`;

  if (ongletAchats === 'fournisseurs') {
    return `
      <div class="toolbar"><h1>Achats</h1>
        <button class="btn primary" data-action="ajouter-fournisseur">+ Nouveau fournisseur</button></div>
      ${onglets}
      <div class="card table-wrap">
        ${db.fournisseurs.length ? `
          <table class="list">
            <tr><th>Fournisseur</th><th>Téléphone</th><th>Produits</th><th class="num">Total acheté</th><th class="num">Reste à payer</th><th></th></tr>
            ${[...db.fournisseurs].sort((a, b) => a.nom.localeCompare(b.nom)).map(f => {
              const achats = db.achats.filter(a => a.fournisseurId === f.id);
              const du = achats.filter(a => !a.paye).reduce((s, a) => s + totalAchat(a), 0);
              return `
                <tr>
                  <td>${esc(f.nom)}</td><td>${esc(f.tel)}</td><td class="muted">${esc(f.note)}</td>
                  <td class="num">${dh(achats.reduce((s, a) => s + totalAchat(a), 0))}</td>
                  <td class="num">${du ? `<span class="badge warn">${dh(du)}</span>` : '—'}</td>
                  <td class="num">
                    <button class="btn small" data-action="modifier-fournisseur" data-id="${f.id}">Modifier</button>
                    <button class="btn small danger" data-action="supprimer-fournisseur" data-id="${f.id}">Supprimer</button>
                  </td>
                </tr>`;
            }).join('')}
          </table>` : '<div class="empty">Aucun fournisseur.</div>'}
      </div>`;
  }

  const prefixe = anneeAchats ? moisAchats.slice(0, 4) : moisAchats;
  const libellePeriode = anneeAchats ? 'de l\'année' : 'du mois';
  const liste = db.achats.filter(a => a.date.startsWith(prefixe)).sort((a, b) => b.date.localeCompare(a.date));
  const total = liste.reduce((s, a) => s + totalAchat(a), 0);
  const aPayer = db.achats.filter(a => !a.paye);
  return `
    <div class="toolbar"><h1>Achats</h1>
      <div class="row" style="flex:0 0 auto">
        <input type="month" data-action="mois-achats" value="${moisAchats}" style="width:auto">
        <select data-action="annee-achats" style="width:auto">
          <option value="0" ${!anneeAchats ? 'selected' : ''}>Mois</option>
          <option value="1" ${anneeAchats ? 'selected' : ''}>Année ${moisAchats.slice(0, 4)}</option>
        </select>
        <button class="btn primary" data-action="ajouter-achat">+ Nouvel achat</button>
      </div>
    </div>
    ${onglets}
    <div class="grid cols-4">
      <div class="card stat"><div class="label">Achats ${libellePeriode} (TTC)</div><div class="value">${dh(total)}</div></div>
      <div class="card stat"><div class="label">Factures ${libellePeriode}</div><div class="value">${liste.length}</div></div>
      <div class="card stat"><div class="label">Reste à payer (toutes périodes)</div><div class="value">${dh(aPayer.reduce((s, a) => s + totalAchat(a), 0))}</div></div>
    </div>
    ${blocHistogrammesAchats(liste, anneeAchats ? null : moisAchats)}
    <div class="card table-wrap" style="margin-top:16px">
      ${liste.length ? `
        <table class="list">
          <tr><th>Date</th><th>Fournisseur</th><th>N° facture</th><th>Produits</th><th class="num">Total TTC</th><th>Paiement</th><th></th></tr>
          ${liste.map(a => `
            <tr>
              <td>${fmtDate(a.date)}</td>
              <td>${esc(nomFournisseur(a.fournisseurId))}</td>
              <td>${esc(a.reference)}</td>
              <td class="muted small-note">${a.lignes.map(l => `${esc(l.quantite)} ${esc(l.unite)} ${esc(l.produit)}`).join(', ')}</td>
              <td class="num">${dh(totalAchat(a))}</td>
              <td>${a.paye ? `<span class="badge ok">Payé${a.paiement ? ' · ' + esc(a.paiement) : ''}</span>`
                : `<button class="btn small" data-action="payer-achat" data-id="${a.id}">À payer → Marquer payé</button>`}</td>
              <td class="num">
                <button class="btn small" data-action="modifier-achat" data-id="${a.id}">Modifier</button>
                <button class="btn small danger" data-action="supprimer-achat" data-id="${a.id}">Supprimer</button>
              </td>
            </tr>`).join('')}
        </table>` : '<div class="empty">Aucun achat ce mois-ci.</div>'}
    </div>`;
};

function formFournisseur(f = {}) {
  return `
    <label>Nom<input name="nom" required value="${esc(f.nom)}"></label>
    <label>Téléphone<input name="tel" type="tel" value="${esc(f.tel)}"></label>
    <label>Produits fournis / notes<input name="note" placeholder="Ex. : poissons, légumes…" value="${esc(f.note)}"></label>`;
}

function formAchat(a = {}) {
  const lignes = a.lignes?.length ? a.lignes : [{}];
  return `
    <div class="row">
      <label>Date<input name="date" type="date" required value="${esc(a.date || aujourdHui())}"></label>
      <label>Fournisseur
        <select name="fournisseurId">
          <option value="">— Aucun —</option>
          ${db.fournisseurs.map(f => `<option value="${f.id}" ${a.fournisseurId === f.id ? 'selected' : ''}>${esc(f.nom)}</option>`).join('')}
        </select>
      </label>
      <label>N° facture<input name="reference" value="${esc(a.reference)}"></label>
    </div>
    <fieldset class="variantes">
      <legend>Produits achetés (prix TTC)</legend>
      <div class="achat-row muted small-note"><span>Produit</span><span>Qté</span><span>Unité</span><span>Prix unit.</span><span></span></div>
      <div id="lignes-achat">${lignes.map(ligneAchat).join('')}</div>
      <button type="button" class="btn small" data-action="ajouter-ligne-achat">+ Ajouter un produit</button>
      <div class="ticket-total" style="font-size:1.1rem"><span>Total TTC</span><span id="total-achat">${dh(a.lignes ? totalAchat(a) : 0)}</span></div>
    </fieldset>
    <datalist id="liste-stock">${db.stock.map(s => `<option value="${esc(s.nom)}">`).join('')}</datalist>
    <label><input type="checkbox" name="versStock" style="width:auto" ${a.versStock !== false ? 'checked' : ''}> Ajouter les quantités au stock</label>
    <div class="row">
      <label>TVA<select name="tva">${TAUX_TVA.map(t => `<option value="${t}" ${Number(a.tva ?? 20) === t ? 'selected' : ''}>${t} %</option>`).join('')}</select></label>
      <label>Statut<select name="paye"><option value="1" ${a.paye !== false ? 'selected' : ''}>Payé</option><option value="0" ${a.paye === false ? 'selected' : ''}>À payer</option></select></label>
      <label>Moyen de paiement<select name="paiement">${optionsHtml(PAIEMENTS, a.paiement)}</select></label>
    </div>`;
}

function ligneAchat(l = {}) {
  return `
    <div class="achat-row">
      <input class="la-produit" list="liste-stock" placeholder="Ex. : Sole" value="${esc(l.produit)}">
      <input class="la-qte" type="number" step="any" min="0" value="${esc(l.quantite ?? '')}">
      <input class="la-unite" placeholder="kg" value="${esc(l.unite)}">
      <input class="la-pu" type="number" step="0.01" min="0" placeholder="DH" value="${esc(l.pu ?? '')}">
      <button type="button" class="btn small danger" data-action="retirer-ligne-achat" title="Retirer">✕</button>
    </div>`;
}

function lireLignesAchat() {
  return $$('#lignes-achat .achat-row').map(r => ({
    produit: $('.la-produit', r).value.trim(),
    quantite: Number($('.la-qte', r).value) || 0,
    unite: $('.la-unite', r).value.trim(),
    pu: Number($('.la-pu', r).value) || 0,
  })).filter(l => l.produit);
}

// Ajoute (sens = 1) ou retire (sens = -1) les quantités d'un achat dans le stock.
function appliquerStock(achat, sens) {
  if (!achat.versStock) return;
  achat.lignes.forEach(l => {
    let s = db.stock.find(x => x.id === l.stockId) || db.stock.find(x => x.nom.toLowerCase() === l.produit.toLowerCase());
    if (!s) {
      if (sens < 0) return;
      s = { id: uid(), nom: l.produit, quantite: 0, unite: l.unite || 'unité', seuil: 0 };
      db.stock.push(s);
    }
    l.stockId = s.id;
    s.quantite = Math.max(0, +(Number(s.quantite) + sens * l.quantite).toFixed(3));
    if (sens > 0 && l.pu) s.prixAchat = l.pu;
  });
}

function enregistrerAchat(achat, d) {
  const lignes = lireLignesAchat();
  if (!lignes.length) { alert('Ajoutez au moins un produit.'); return false; }
  if (achat) appliquerStock(achat, -1);
  const donnees = { date: d.date, fournisseurId: d.fournisseurId || null, reference: d.reference.trim(), lignes,
    versStock: d.versStock, tva: Number(d.tva), paye: d.paye === '1', paiement: d.paiement };
  if (achat) Object.assign(achat, donnees);
  else { achat = { id: uid(), ...donnees }; db.achats.push(achat); }
  appliquerStock(achat, 1);
}

/* =========================================================
   Comptabilité
   ========================================================= */

let periodeCompta = { mois: aujourdHui().slice(0, 7), annee: false };

const prefixeCompta = () => (periodeCompta.annee ? periodeCompta.mois.slice(0, 4) : periodeCompta.mois);

// Mouvements dont la date commence par le préfixe (« 2026 » pour une année, « 2026-09 » pour un mois)
function mouvementsCompta(prefixe = prefixeCompta()) {
  const dans = ymd => ymd.startsWith(prefixe);
  const tvaResto = Number(db.restaurant.tva) || 0;
  const mvts = [];

  // Ventes regroupées par jour
  const ventesParJour = {};
  db.commandes.filter(c => c.statut === 'payee' && dans(jourDe(c.payeeLe))).forEach(c => {
    const j = jourDe(c.payeeLe);
    ventesParJour[j] ??= { ttc: 0, n: 0 };
    ventesParJour[j].ttc += totalCommande(c);
    ventesParJour[j].n++;
  });
  Object.entries(ventesParJour).forEach(([j, v]) => mvts.push({
    date: j, sens: 'recette', categorie: 'Ventes', libelle: `Ventes du jour (${v.n} ticket${v.n > 1 ? 's' : ''})`,
    ttc: v.ttc, tva: tvaResto, paiement: '',
  }));

  db.achats.filter(a => dans(a.date)).forEach(a => mvts.push({
    date: a.date, sens: 'depense', categorie: 'Achats marchandises',
    libelle: `Achat ${nomFournisseur(a.fournisseurId) !== '—' ? nomFournisseur(a.fournisseurId) : ''}${a.reference ? ' — n° ' + a.reference : ''}`.trim(),
    ttc: totalAchat(a), tva: a.tva, paiement: a.paye ? a.paiement : 'À payer',
  }));

  db.factures.filter(f => !f.commandeId && dans(f.date)).forEach(f => mvts.push({
    date: f.date, sens: 'recette', categorie: 'Factures', libelle: `Facture ${f.numero} — ${f.client.nom}`,
    ttc: totalFacture(f), tva: f.tva, paiement: f.paiement,
  }));

  db.operations.filter(o => dans(o.date)).forEach(o => mvts.push({
    date: o.date, sens: o.sens, categorie: o.categorie, libelle: o.libelle, ttc: Number(o.montant),
    tva: o.tva, paiement: o.paiement, operationId: o.id,
  }));

  return mvts.sort((a, b) => b.date.localeCompare(a.date));
}

/* ---------- Histogrammes de la comptabilité ---------- */

const MOIS_COURTS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
const MOIS_LONGS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

// Montant court pour les axes : 12 500 → « 12,5 k »
const dhCourt = n => Math.abs(n) >= 1000
  ? (n / 1000).toLocaleString('fr-FR', { maximumFractionDigits: 1 }) + ' k'
  : (Math.round(n) || 0).toLocaleString('fr-FR');

// Pas « rond » pour les graduations (1, 2, 2,5 ou 5 × 10^n)
function pasRond(max, nb = 4) {
  if (max <= 0) return 1;
  const brut = max / nb, p = 10 ** Math.floor(Math.log10(brut));
  return [1, 2, 2.5, 5, 10].map(m => m * p).find(s => s >= brut);
}

function totauxParMois(annee) {
  return MOIS_COURTS.map((_, i) => {
    const prefixe = `${annee}-${String(i + 1).padStart(2, '0')}`;
    const m = mouvementsCompta(prefixe);
    const r = m.filter(x => x.sens === 'recette').reduce((s, x) => s + x.ttc, 0);
    const d = m.filter(x => x.sens === 'depense').reduce((s, x) => s + x.ttc, 0);
    return { i, prefixe, r, d, solde: r - d };
  });
}

// Graduations horizontales + libellés de l'axe vertical
function grille(min, max, pas) {
  const lignes = [];
  for (let v = min; v <= max + pas / 2; v += pas) {
    const bas = ((v - min) / (max - min)) * 100;
    lignes.push(`<div class="grid-line ${Math.abs(v) < pas / 2 ? 'zero' : ''}" style="bottom:${bas}%"><span>${dhCourt(v)}</span></div>`);
  }
  return lignes.join('');
}

function histoRecettesDepenses(mois, moisChoisi) {
  const pas = pasRond(Math.max(...mois.map(m => Math.max(m.r, m.d))));
  const max = pas * Math.max(1, Math.ceil(Math.max(...mois.map(m => Math.max(m.r, m.d))) / pas));
  const h = v => (v / max) * 100;
  return `
    <div class="chart">
      <div class="chart-legend">
        <span><i style="background:var(--series-1)"></i>Recettes</span>
        <span><i style="background:var(--series-2)"></i>Dépenses</span>
      </div>
      <div class="chart-plot">
        ${grille(0, max, pas)}
        <div class="chart-cols">
          ${mois.map(m => `
            <div class="col-slot ${m.prefixe === moisChoisi ? 'actif' : ''}"
              data-tip="${esc(`${MOIS_LONGS[m.i]} — Recettes : ${dh(m.r)} · Dépenses : ${dh(m.d)} · Solde : ${dh(m.solde)}`)}">
              <div class="col-bar haut" style="height:${h(m.r)}%;background:var(--series-1)"></div>
              <div class="col-bar haut" style="height:${h(m.d)}%;background:var(--series-2)"></div>
            </div>`).join('')}
        </div>
      </div>
      <div class="chart-xlabels">${mois.map(m => `<span class="${m.prefixe === moisChoisi ? 'actif' : ''}">${MOIS_COURTS[m.i]}</span>`).join('')}</div>
    </div>`;
}

function histoSolde(mois, moisChoisi) {
  const valeurs = mois.map(m => m.solde);
  const pas = pasRond(Math.max(...valeurs.map(Math.abs)), 3);
  const min = -pas * Math.max(0, Math.ceil(-Math.min(0, ...valeurs) / pas));
  let max = pas * Math.max(0, Math.ceil(Math.max(0, ...valeurs) / pas));
  if (max === min) max = pas;
  const etendue = max - min;
  const zero = (-min / etendue) * 100;
  return `
    <div class="chart">
      <div class="chart-legend">
        <span><i style="background:var(--series-1)"></i>Bénéfice</span>
        <span><i style="background:var(--negatif)"></i>Perte</span>
      </div>
      <div class="chart-plot">
        ${grille(min, max, pas)}
        <div class="chart-cols">
          ${mois.map(m => {
            const hauteur = (Math.abs(m.solde) / etendue) * 100;
            const positif = m.solde >= 0;
            return `
              <div class="col-slot ${m.prefixe === moisChoisi ? 'actif' : ''}" data-tip="${esc(`${MOIS_LONGS[m.i]} — Solde : ${dh(m.solde)}`)}">
                <div class="col-bar ${positif ? 'haut' : 'bas'}" style="position:absolute;bottom:${positif ? zero : zero - hauteur}%;
                  height:${hauteur}%;background:var(${positif ? '--series-1' : '--negatif'})"></div>
              </div>`;
          }).join('')}
        </div>
      </div>
      <div class="chart-xlabels">${mois.map(m => `<span class="${m.prefixe === moisChoisi ? 'actif' : ''}">${MOIS_COURTS[m.i]}</span>`).join('')}</div>
    </div>`;
}

function barresCategories(lignes, couleur) {
  if (!lignes.length) return '<div class="empty">Aucune donnée sur la période.</div>';
  const max = Math.max(...lignes.map(l => l[1])) || 1;
  return `
    <div class="hbars">
      ${lignes.map(([cat, v]) => `
        <div class="hbar-row" data-tip="${esc(`${cat} : ${dh(v)}`)}">
          <span class="hbar-label">${esc(cat)}</span>
          <span class="hbar-track"><span class="hbar" style="width:${(v / max) * 100}%;background:var(${couleur})"></span></span>
          <span class="hbar-value">${dh(v)}</span>
        </div>`).join('')}
    </div>`;
}

function blocHistogrammes(recettes, depenses, parCategorie) {
  const annee = periodeCompta.mois.slice(0, 4);
  const moisChoisi = periodeCompta.annee ? null : periodeCompta.mois;
  const mois = totauxParMois(annee);
  const periode = periodeCompta.annee ? `l'année ${annee}` : `${MOIS_LONGS[Number(periodeCompta.mois.slice(5)) - 1]} ${annee}`;
  return `
    <div class="grid cols-2" style="margin-top:16px">
      <div class="card">
        <h2>Recettes et dépenses par mois — ${annee}</h2>
        ${histoRecettesDepenses(mois, moisChoisi)}
      </div>
      <div class="card">
        <h2>Solde par mois — ${annee}</h2>
        ${histoSolde(mois, moisChoisi)}
      </div>
    </div>
    <details class="card" style="margin-top:16px">
      <summary>Voir les chiffres mois par mois</summary>
      <div class="table-wrap"><table class="list">
        <tr><th>Mois</th><th class="num">Recettes</th><th class="num">Dépenses</th><th class="num">Solde</th></tr>
        ${mois.map(m => `<tr><td>${MOIS_LONGS[m.i]}</td><td class="num">${dh(m.r)}</td><td class="num">${dh(m.d)}</td>
          <td class="num">${dh(m.solde)}</td></tr>`).join('')}
      </table></div>
    </details>
    <div class="grid cols-2" style="margin-top:16px">
      <div class="card"><h2>Dépenses par catégorie — ${periode}</h2>${barresCategories(parCategorie(depenses), '--series-2')}</div>
      <div class="card"><h2>Recettes par catégorie — ${periode}</h2>${barresCategories(parCategorie(recettes), '--series-1')}</div>
    </div>`;
}

// Info-bulle au survol des barres
const infobulle = document.createElement('div');
infobulle.className = 'infobulle';
document.body.appendChild(infobulle);
document.addEventListener('mouseover', e => {
  const cible = e.target.closest('[data-tip]');
  if (!cible) { infobulle.style.display = 'none'; return; }
  infobulle.textContent = cible.dataset.tip;
  infobulle.style.display = 'block';
});
document.addEventListener('mousemove', e => {
  if (infobulle.style.display !== 'block') return;
  const x = Math.min(e.clientX + 14, window.innerWidth - infobulle.offsetWidth - 8);
  infobulle.style.left = x + 'px';
  infobulle.style.top = (e.clientY + 16) + 'px';
});

vues.comptabilite = () => {
  const mvts = mouvementsCompta();
  const somme = (liste, f = m => m.ttc) => liste.reduce((s, m) => s + f(m), 0);
  const recettes = mvts.filter(m => m.sens === 'recette');
  const depenses = mvts.filter(m => m.sens === 'depense');
  const totalR = somme(recettes), totalD = somme(depenses);
  const tvaCollectee = somme(recettes, m => m.ttc - ht(m.ttc, m.tva));
  const tvaDeductible = somme(depenses, m => m.ttc - ht(m.ttc, m.tva));
  const resultatHT = somme(recettes, m => ht(m.ttc, m.tva)) - somme(depenses, m => ht(m.ttc, m.tva));
  const parCategorie = liste => Object.entries(liste.reduce((acc, m) => { acc[m.categorie] = (acc[m.categorie] || 0) + m.ttc; return acc; }, {}))
    .sort((a, b) => b[1] - a[1]);
  const dettes = db.achats.filter(a => !a.paye).reduce((s, a) => s + totalAchat(a), 0);

  return `
    <div class="toolbar"><h1>Comptabilité</h1>
      <div class="row" style="flex:0 0 auto;flex-wrap:wrap">
        <input type="month" data-action="mois-compta" value="${periodeCompta.mois}" style="width:auto">
        <select data-action="annee-compta" style="width:auto">
          <option value="0" ${!periodeCompta.annee ? 'selected' : ''}>Mois</option>
          <option value="1" ${periodeCompta.annee ? 'selected' : ''}>Année ${periodeCompta.mois.slice(0, 4)}</option>
        </select>
        <button class="btn" data-action="ajouter-operation" data-sens="depense">+ Dépense</button>
        <button class="btn" data-action="ajouter-operation" data-sens="recette">+ Recette</button>
        <button class="btn" data-action="exporter-compta">⬇️ Export Excel (CSV)</button>
      </div>
    </div>
    <div class="grid cols-4">
      <div class="card stat"><div class="label">Recettes (TTC)</div><div class="value" style="color:var(--ok)">${dh(totalR)}</div></div>
      <div class="card stat"><div class="label">Dépenses (TTC)</div><div class="value" style="color:var(--danger)">${dh(totalD)}</div></div>
      <div class="card stat"><div class="label">Solde (recettes − dépenses)</div><div class="value">${dh(totalR - totalD)}</div></div>
      <div class="card stat"><div class="label">Résultat hors taxes</div><div class="value">${dh(resultatHT)}</div></div>
    </div>
    ${blocHistogrammes(recettes, depenses, parCategorie)}
    <div class="grid cols-2" style="margin-top:16px">
      <div class="card">
        <h2>TVA de la période (estimation)</h2>
        <table class="list">
          <tr><td>TVA collectée sur les recettes</td><td class="num">${dh(tvaCollectee)}</td></tr>
          <tr><td>TVA déductible sur les dépenses</td><td class="num">− ${dh(tvaDeductible)}</td></tr>
          <tr><td><strong>${tvaCollectee - tvaDeductible >= 0 ? 'TVA à payer' : 'Crédit de TVA'}</strong></td>
            <td class="num"><strong>${dh(Math.abs(tvaCollectee - tvaDeductible))}</strong></td></tr>
        </table>
        <p class="muted small-note">À faire vérifier par votre comptable. Factures fournisseurs non payées : <strong>${dh(dettes)}</strong>.</p>
      </div>
      <div class="card">
        <h2>Répartition</h2>
        <table class="list">
          ${parCategorie(recettes).map(([c, v]) => `<tr><td><span class="badge ok">Recette</span> ${esc(c)}</td><td class="num">${dh(v)}</td></tr>`).join('')}
          ${parCategorie(depenses).map(([c, v]) => `<tr><td><span class="badge danger">Dépense</span> ${esc(c)}</td><td class="num">${dh(v)}</td></tr>`).join('')}
        </table>
        ${mvts.length ? '' : '<div class="empty">Aucun mouvement sur la période.</div>'}
      </div>
    </div>
    <div class="card table-wrap" style="margin-top:16px">
      <h2>Journal</h2>
      ${mvts.length ? `
        <table class="list">
          <tr><th>Date</th><th>Catégorie</th><th>Libellé</th><th>Paiement</th><th class="num">Recette</th><th class="num">Dépense</th><th></th></tr>
          ${mvts.map(m => `
            <tr>
              <td>${fmtDate(m.date)}</td><td>${esc(m.categorie)}</td><td>${esc(m.libelle)}</td><td class="muted">${esc(m.paiement)}</td>
              <td class="num" style="color:var(--ok)">${m.sens === 'recette' ? dh(m.ttc) : ''}</td>
              <td class="num" style="color:var(--danger)">${m.sens === 'depense' ? dh(m.ttc) : ''}</td>
              <td class="num">${m.operationId ? `
                <button class="btn small" data-action="modifier-operation" data-id="${m.operationId}">Modifier</button>
                <button class="btn small danger" data-action="supprimer-operation" data-id="${m.operationId}">✕</button>` : ''}</td>
            </tr>`).join('')}
        </table>` : '<div class="empty">Aucun mouvement sur la période.</div>'}
      <p class="muted small-note">Les ventes viennent des tickets encaissés et les achats de la page Achats. Ajoutez ici les autres dépenses (loyer, salaires, électricité…) et recettes.</p>
    </div>`;
};

function formOperation(o) {
  const cats = o.sens === 'recette' ? CATEGORIES_RECETTES : CATEGORIES_DEPENSES;
  return `
    <div class="row">
      <label>Date<input name="date" type="date" required value="${esc(o.date || aujourdHui())}"></label>
      <label>Catégorie<input name="categorie" required list="liste-cat-op" value="${esc(o.categorie)}"></label>
    </div>
    <datalist id="liste-cat-op">${cats.map(c => `<option value="${esc(c)}">`).join('')}</datalist>
    <label>Libellé<input name="libelle" placeholder="Ex. : Loyer de mars" value="${esc(o.libelle)}"></label>
    <div class="row">
      <label>Montant TTC (DH)<input name="montant" type="number" step="0.01" min="0" required value="${esc(o.montant ?? '')}"></label>
      <label>TVA<select name="tva">${TAUX_TVA.map(t => `<option value="${t}" ${Number(o.tva ?? 0) === t ? 'selected' : ''}>${t} %</option>`).join('')}</select></label>
      <label>Paiement<select name="paiement">${optionsHtml(PAIEMENTS, o.paiement)}</select></label>
    </div>`;
}

function lireOperation(d, sens) {
  return { sens, date: d.date, categorie: d.categorie.trim(), libelle: d.libelle.trim() || d.categorie.trim(),
    montant: Number(d.montant), tva: Number(d.tva), paiement: d.paiement };
}

function exporterCompta() {
  const mvts = [...mouvementsCompta()].reverse();
  const nombre = n => n.toFixed(2).replace('.', ',');
  const cellule = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const lignes = [['Date', 'Type', 'Catégorie', 'Libellé', 'Montant TTC', 'Taux TVA', 'TVA', 'Montant HT', 'Paiement']]
    .concat(mvts.map(m => [fmtDate(m.date), m.sens === 'recette' ? 'Recette' : 'Dépense', m.categorie, m.libelle,
      nombre(m.ttc), m.tva + ' %', nombre(m.ttc - ht(m.ttc, m.tva)), nombre(ht(m.ttc, m.tva)), m.paiement]));
  const csv = '﻿' + lignes.map(l => l.map(cellule).join(';')).join('\r\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  a.download = `comptabilite-${periodeCompta.annee ? periodeCompta.mois.slice(0, 4) : periodeCompta.mois}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}

Object.assign(actions, {
  'onglet-achats': el => { ongletAchats = el.dataset.o; rendre(); },

  'ajouter-fournisseur': () => ouvrirModal('Nouveau fournisseur', formFournisseur(), d => {
    db.fournisseurs.push({ id: uid(), nom: d.nom.trim(), tel: d.tel.trim(), note: d.note.trim() });
  }),
  'modifier-fournisseur': el => {
    const f = db.fournisseurs.find(x => x.id === el.dataset.id);
    ouvrirModal('Modifier le fournisseur', formFournisseur(f), d => {
      Object.assign(f, { nom: d.nom.trim(), tel: d.tel.trim(), note: d.note.trim() });
    });
  },
  'supprimer-fournisseur': el => {
    if (db.achats.some(a => a.fournisseurId === el.dataset.id)) return alert('Ce fournisseur a des achats enregistrés : supprimez-les d\'abord.');
    if (!confirmer('Supprimer ce fournisseur ?')) return;
    db.fournisseurs = db.fournisseurs.filter(f => f.id !== el.dataset.id);
    sauver(); rendre();
  },

  'ajouter-achat': () => ouvrirModal('Nouvel achat', formAchat(), d => enregistrerAchat(null, d)),
  'modifier-achat': el => {
    const a = db.achats.find(x => x.id === el.dataset.id);
    ouvrirModal('Modifier l\'achat', formAchat(a), d => enregistrerAchat(a, d));
  },
  'supprimer-achat': el => {
    const a = db.achats.find(x => x.id === el.dataset.id);
    if (!confirmer(a.versStock ? 'Supprimer cet achat ? Les quantités seront retirées du stock.' : 'Supprimer cet achat ?')) return;
    appliquerStock(a, -1);
    db.achats = db.achats.filter(x => x !== a);
    sauver(); rendre();
  },
  'payer-achat': el => {
    const a = db.achats.find(x => x.id === el.dataset.id);
    ouvrirModal(`Payer ${dh(totalAchat(a))}`, `
      <label>Moyen de paiement<select name="paiement">${optionsHtml(PAIEMENTS, a.paiement)}</select></label>`,
    d => { a.paye = true; a.paiement = d.paiement; }, 'Marquer comme payé');
  },
  'ajouter-ligne-achat': () => {
    $('#lignes-achat').insertAdjacentHTML('beforeend', ligneAchat());
    $('#lignes-achat .achat-row:last-child .la-produit').focus();
  },
  'retirer-ligne-achat': el => { el.closest('.achat-row').remove(); majTotalAchat(); },

  'ajouter-operation': el => {
    const sens = el.dataset.sens;
    ouvrirModal(sens === 'recette' ? 'Nouvelle recette' : 'Nouvelle dépense', formOperation({ sens }), d => {
      db.operations.push({ id: uid(), ...lireOperation(d, sens) });
    });
  },
  'modifier-operation': el => {
    const o = db.operations.find(x => x.id === el.dataset.id);
    ouvrirModal(o.sens === 'recette' ? 'Modifier la recette' : 'Modifier la dépense', formOperation(o), d => {
      Object.assign(o, lireOperation(d, o.sens));
    });
  },
  'supprimer-operation': el => {
    if (!confirmer('Supprimer cette opération ?')) return;
    db.operations = db.operations.filter(o => o.id !== el.dataset.id);
    sauver(); rendre();
  },
  'exporter-compta': exporterCompta,
});

function majTotalAchat() {
  const el = $('#total-achat');
  if (el) el.textContent = dh(lireLignesAchat().reduce((s, l) => s + l.quantite * l.pu, 0));
}

document.addEventListener('input', e => {
  const r = e.target.closest('.achat-row');
  if (!r) return;
  // Unité reprise du stock quand on choisit un produit connu
  if (e.target.classList.contains('la-produit')) {
    const s = db.stock.find(x => x.nom.toLowerCase() === e.target.value.trim().toLowerCase());
    if (s && !$('.la-unite', r).value) $('.la-unite', r).value = s.unite;
    if (s && s.prixAchat && !$('.la-pu', r).value) $('.la-pu', r).value = s.prixAchat;
  }
  majTotalAchat();
});

document.addEventListener('change', e => {
  const el = e.target;
  switch (el.dataset.action) {
    case 'mois-achats': if (el.value) { moisAchats = el.value; rendre(); } break;
    case 'annee-achats': anneeAchats = el.value === '1'; rendre(); break;
    case 'mois-compta': if (el.value) { periodeCompta.mois = el.value; rendre(); } break;
    case 'annee-compta': periodeCompta.annee = el.value === '1'; rendre(); break;
  }
});

/* =========================================================
   Factures clients
   ========================================================= */

const totalFacture = f => f.lignes.reduce((s, l) => s + Number(l.qte) * Number(l.pu), 0);

function prochainNumero(date) {
  const annee = date.slice(0, 4);
  const n = db.factures.filter(f => f.numero.startsWith(`F-${annee}-`)).length + 1;
  return `F-${annee}-${String(n).padStart(4, '0')}`;
}

// Montant en toutes lettres (ex. : 1 250,50 → « mille deux cent cinquante dirhams et cinquante centimes »)
function enLettres(n) {
  const unites = ['zéro', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf', 'dix', 'onze', 'douze',
    'treize', 'quatorze', 'quinze', 'seize', 'dix-sept', 'dix-huit', 'dix-neuf'];
  const dizaines = ['', '', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante'];
  const moinsDeCent = x => {
    if (x < 20) return unites[x];
    const d = Math.floor(x / 10), u = x % 10;
    if (d === 7 || d === 9) return (d === 7 ? 'soixante' : 'quatre-vingt') + (x % 20 === 11 && d === 7 ? ' et ' : '-') + unites[10 + u];
    if (d === 8) return u ? 'quatre-vingt-' + unites[u] : 'quatre-vingts';
    return dizaines[d] + (u === 1 ? ' et un' : u ? '-' + unites[u] : '');
  };
  const moinsDeMille = x => {
    const c = Math.floor(x / 100), r = x % 100;
    const cents = c === 0 ? '' : c === 1 ? 'cent' : unites[c] + ' cent' + (r ? '' : 's');
    return [cents, r ? moinsDeCent(r) : ''].filter(Boolean).join(' ');
  };
  const entier = x => {
    if (x === 0) return 'zéro';
    const parts = [];
    const milliards = Math.floor(x / 1e9), millions = Math.floor(x / 1e6) % 1000, milliers = Math.floor(x / 1000) % 1000, reste = x % 1000;
    if (milliards) parts.push(moinsDeMille(milliards) + (milliards > 1 ? ' milliards' : ' milliard'));
    if (millions) parts.push(moinsDeMille(millions) + (millions > 1 ? ' millions' : ' million'));
    if (milliers) parts.push(milliers === 1 ? 'mille' : moinsDeMille(milliers).replace(/cents$/, 'cent') + ' mille');
    if (reste) parts.push(moinsDeMille(reste));
    return parts.join(' ');
  };
  const cts = Math.round(n * 100);
  const dhs = Math.floor(cts / 100), c = cts % 100;
  let txt = entier(dhs) + (dhs > 1 ? ' dirhams' : ' dirham');
  if (c) txt += ' et ' + entier(c) + (c > 1 ? ' centimes' : ' centime');
  return txt;
}

vues.factures = () => {
  const factures = [...db.factures].sort((a, b) => b.numero.localeCompare(a.numero));
  const facturees = new Set(db.factures.map(f => f.commandeId).filter(Boolean));
  const tickets = db.commandes.filter(c => c.statut === 'payee' && !facturees.has(c.id))
    .sort((a, b) => b.payeeLe.localeCompare(a.payeeLe)).slice(0, 15);
  const infosManquantes = !db.restaurant.ice;

  return `
    <div class="toolbar"><h1>Factures clients</h1>
      <button class="btn primary" data-action="nouvelle-facture">+ Facture libre</button></div>
    ${infosManquantes ? `<div class="card" style="margin-bottom:16px;background:#fdf3e1">
      ⚠️ Pensez à renseigner l'adresse, l'ICE, l'IF et le RC du restaurant dans <a href="#parametres">Paramètres</a> : ils apparaissent sur les factures.</div>` : ''}
    <div class="grid cols-2">
      <div class="card table-wrap">
        <h2>Tickets encaissés à facturer</h2>
        ${tickets.length ? `
          <table class="list">
            ${tickets.map(c => `
              <tr><td>${fmtDate(jourDe(c.payeeLe))} ${fmtHeure(c.payeeLe)}</td><td>${esc(c.tableNom)}</td>
                <td class="num">${dh(totalCommande(c))}</td>
                <td class="num"><button class="btn small" data-action="facturer-ticket" data-id="${c.id}">Faire la facture</button></td></tr>`).join('')}
          </table>` : '<div class="empty">Aucun ticket récent à facturer.</div>'}
      </div>
      <div class="card table-wrap">
        <h2>Factures émises</h2>
        ${factures.length ? `
          <table class="list">
            <tr><th>N°</th><th>Date</th><th>Client</th><th class="num">Total TTC</th><th></th></tr>
            ${factures.map((f, i) => `
              <tr><td>${esc(f.numero)}</td><td>${fmtDate(f.date)}</td><td>${esc(f.client.nom)}</td>
                <td class="num">${dh(totalFacture(f))}</td>
                <td class="num">
                  <button class="btn small" data-action="imprimer-facture" data-id="${f.id}">🖨️ Imprimer</button>
                  <button class="btn small" data-action="modifier-facture" data-id="${f.id}">Modifier</button>
                  ${i === 0 ? `<button class="btn small danger" data-action="supprimer-facture" data-id="${f.id}" title="Seule la dernière facture peut être supprimée">✕</button>` : ''}
                </td></tr>`).join('')}
          </table>` : '<div class="empty">Aucune facture émise.</div>'}
      </div>
    </div>`;
};

function formFacture(f) {
  return `
    ${f.numero ? `<p class="muted">Facture n° <strong>${esc(f.numero)}</strong></p>` : ''}
    <div class="row">
      <label>Client (nom ou société)<input name="clientNom" required value="${esc(f.client?.nom)}"></label>
      <label>ICE du client<input name="clientIce" placeholder="Facultatif" value="${esc(f.client?.ice)}"></label>
    </div>
    <label>Adresse du client<input name="clientAdresse" placeholder="Facultatif" value="${esc(f.client?.adresse)}"></label>
    <div class="row">
      <label>Date<input name="date" type="date" required value="${esc(f.date || aujourdHui())}"></label>
      <label>Paiement<select name="paiement">${optionsHtml(['Espèces', 'Carte bancaire', 'Virement', 'Chèque', 'Ticket restaurant', 'À régler'], f.paiement)}</select></label>
    </div>
    <fieldset class="variantes">
      <legend>Lignes (prix TTC)</legend>
      <div class="facture-row muted small-note"><span>Désignation</span><span>Qté</span><span>Prix unit.</span><span></span></div>
      <div id="lignes-facture">${(f.lignes?.length ? f.lignes : [{}]).map(ligneFacture).join('')}</div>
      <button type="button" class="btn small" data-action="ajouter-ligne-facture">+ Ajouter une ligne</button>
      <div class="ticket-total" style="font-size:1.1rem"><span>Total TTC</span><span id="total-facture">${dh(f.lignes ? totalFacture(f) : 0)}</span></div>
    </fieldset>`;
}

function ligneFacture(l = {}) {
  return `
    <div class="facture-row">
      <input class="lf-des" value="${esc(l.designation)}" placeholder="Ex. : Menu du jour">
      <input class="lf-qte" type="number" step="any" min="0" value="${esc(l.qte ?? 1)}">
      <input class="lf-pu" type="number" step="0.01" min="0" placeholder="DH" value="${esc(l.pu ?? '')}">
      <button type="button" class="btn small danger" data-action="retirer-ligne-facture" title="Retirer">✕</button>
    </div>`;
}

function lireLignesFacture() {
  return $$('#lignes-facture .facture-row').map(r => ({
    designation: $('.lf-des', r).value.trim(), qte: Number($('.lf-qte', r).value) || 0, pu: Number($('.lf-pu', r).value) || 0,
  })).filter(l => l.designation);
}

function enregistrerFacture(f, d) {
  const lignes = lireLignesFacture();
  if (!lignes.length) { alert('Ajoutez au moins une ligne.'); return false; }
  Object.assign(f, {
    date: d.date, paiement: d.paiement, lignes,
    client: { nom: d.clientNom.trim(), ice: d.clientIce.trim(), adresse: d.clientAdresse.trim() },
  });
  if (!f.id) {
    f.id = uid();
    f.numero = prochainNumero(f.date);
    f.tva = Number(db.restaurant.tva) || 0;
    db.factures.push(f);
  }
  setTimeout(() => imprimerFacture(f));
}

function ouvrirFacture(f) {
  ouvrirModal(f.id ? `Modifier la facture ${f.numero}` : 'Nouvelle facture', formFacture(f),
    d => enregistrerFacture(f, d), f.id ? 'Enregistrer et imprimer' : 'Créer et imprimer');
}

function imprimerFacture(f) {
  const w = window.open('', '_blank', 'width=820,height=1000');
  if (!w) return alert('Autorisez les fenêtres pop-up pour imprimer la facture.');
  const r = db.restaurant;
  const ttc = totalFacture(f);
  const montantHT = ht(ttc, f.tva);
  const legal = [r.ice && `ICE : ${r.ice}`, r.if && `IF : ${r.if}`, r.rc && `RC : ${r.rc}`, r.patente && `Patente : ${r.patente}`,
    r.cnss && `CNSS : ${r.cnss}`].filter(Boolean).join(' — ');
  w.document.write(`<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>Facture ${esc(f.numero)}</title>
    <style>
      body{font-family:Arial,Helvetica,sans-serif;color:#222;margin:0;padding:40px;font-size:14px}
      .entete{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:40px}
      h1{margin:0 0 6px;font-size:24px} .titre{font-size:26px;font-weight:bold;text-align:right}
      .client{border:1px solid #ccc;border-radius:6px;padding:12px 16px;width:45%;margin-left:auto;margin-bottom:30px}
      table{width:100%;border-collapse:collapse;margin-bottom:20px} th,td{padding:8px;border-bottom:1px solid #ddd;text-align:left}
      th{background:#f3f3f3} .n{text-align:right}
      .totaux{width:45%;margin-left:auto} .totaux td{border:none;padding:4px 8px} .totaux tr:last-child td{font-weight:bold;font-size:16px;border-top:2px solid #222}
      .lettres{margin:24px 0;font-style:italic} .pied{position:fixed;bottom:30px;left:40px;right:40px;text-align:center;font-size:11px;color:#555;border-top:1px solid #ccc;padding-top:8px}
      @media print{body{padding:20px 30px}}
    </style></head><body>
    <div class="entete">
      <div><h1>${esc(r.nom)}</h1>${esc(r.adresse || '')}<br>${esc(r.telephone ? 'Tél. : ' + r.telephone : '')}</div>
      <div class="titre">FACTURE<div style="font-size:14px;font-weight:normal">N° ${esc(f.numero)}<br>Date : ${fmtDate(f.date)}</div></div>
    </div>
    <div class="client"><strong>${esc(f.client.nom)}</strong>${f.client.adresse ? '<br>' + esc(f.client.adresse) : ''}${f.client.ice ? '<br>ICE : ' + esc(f.client.ice) : ''}</div>
    <table>
      <tr><th>Désignation</th><th class="n">Qté</th><th class="n">Prix unit. TTC</th><th class="n">Total TTC</th></tr>
      ${f.lignes.map(l => `<tr><td>${esc(l.designation)}</td><td class="n">${esc(l.qte)}</td><td class="n">${dh(l.pu)}</td><td class="n">${dh(l.qte * l.pu)}</td></tr>`).join('')}
    </table>
    <table class="totaux">
      <tr><td>Total HT</td><td class="n">${dh(montantHT)}</td></tr>
      <tr><td>TVA ${esc(f.tva)} %</td><td class="n">${dh(ttc - montantHT)}</td></tr>
      <tr><td>Total TTC</td><td class="n">${dh(ttc)}</td></tr>
    </table>
    <p class="lettres">Arrêtée la présente facture à la somme de : <strong>${esc(enLettres(ttc))}</strong> TTC.</p>
    <p>Mode de paiement : ${esc(f.paiement)}</p>
    <div class="pied">${esc(r.nom)}${r.adresse ? ' — ' + esc(r.adresse) : ''}<br>${esc(legal)}</div>
    <script>window.onload = () => window.print()<\/script></body></html>`);
  w.document.close();
}

Object.assign(actions, {
  'nouvelle-facture': () => ouvrirFacture({}),
  'facturer-ticket': el => {
    const c = db.commandes.find(x => x.id === el.dataset.id);
    ouvrirFacture({
      commandeId: c.id, date: jourDe(c.payeeLe), paiement: c.paiement,
      client: c.client ? { nom: c.client.nom || '', adresse: c.client.adresse || '', ice: '' } : undefined,
      lignes: c.lignes.map(l => ({ designation: l.nom, qte: l.qte, pu: l.prix })),
    });
  },
  'modifier-facture': el => ouvrirFacture(db.factures.find(f => f.id === el.dataset.id)),
  'imprimer-facture': el => imprimerFacture(db.factures.find(f => f.id === el.dataset.id)),
  'supprimer-facture': el => {
    const f = db.factures.find(x => x.id === el.dataset.id);
    if (!confirmer(`Supprimer la facture ${f.numero} ? Le numéro sera réutilisé pour la prochaine facture.`)) return;
    db.factures = db.factures.filter(x => x !== f);
    sauver(); rendre();
  },
  'ajouter-ligne-facture': () => {
    $('#lignes-facture').insertAdjacentHTML('beforeend', ligneFacture());
    $('#lignes-facture .facture-row:last-child .lf-des').focus();
  },
  'retirer-ligne-facture': el => { el.closest('.facture-row').remove(); majTotalFacture(); },
});

function majTotalFacture() {
  const el = $('#total-facture');
  if (el) el.textContent = dh(lireLignesFacture().reduce((s, l) => s + l.qte * l.pu, 0));
}
document.addEventListener('input', e => { if (e.target.closest('.facture-row')) majTotalFacture(); });


/* ---------- Histogrammes des achats (totaux par intrant) ---------- */

const fmtQte = n => (+n.toFixed(3)).toLocaleString('fr-FR');

// Regroupe les lignes d'achat par produit (sans tenir compte des majuscules)
function totauxParProduit(achats) {
  const produits = {};
  achats.forEach(a => a.lignes.forEach(l => {
    const cle = l.produit.trim().toLowerCase();
    const nom = db.stock.find(x => x.nom.toLowerCase() === cle)?.nom || cle.charAt(0).toUpperCase() + l.produit.trim().slice(1);
    const p = produits[cle] ??= { nom, montant: 0, quantites: {}, nbAchats: 0 };
    p.montant += Number(l.quantite) * Number(l.pu);
    const u = l.unite || '';
    p.quantites[u] = (p.quantites[u] || 0) + Number(l.quantite);
    p.nbAchats++;
  }));
  return Object.values(produits).sort((a, b) => b.montant - a.montant).map(p => {
    const unites = Object.entries(p.quantites);
    const qte = unites.map(([u, q]) => `${fmtQte(q)}${u ? ' ' + u : ''}`).join(' + ');
    const prixMoyen = unites.length === 1 && unites[0][1] ? p.montant / unites[0][1] : null;
    return { ...p, qte, prixMoyen, unite: unites.length === 1 ? (unites[0][0] || 'unité') : null };
  });
}

// Au-delà de 12 produits, les plus petits sont regroupés dans « Autres produits »
function barresProduits(produits) {
  if (!produits.length) return '<div class="empty">Aucun achat sur la période.</div>';
  const MAX = 12;
  const affiches = produits.length > MAX ? produits.slice(0, MAX - 1) : produits;
  const reste = produits.slice(affiches.length);
  const lignes = affiches.map(p => ({ nom: p.nom, montant: p.montant, detail: p.qte,
    tip: `${p.nom} : ${dh(p.montant)} — ${p.qte}${p.prixMoyen ? ` — prix moyen ${dh(p.prixMoyen)} / ${p.unite}` : ''} — ${p.nbAchats} achat${p.nbAchats > 1 ? 's' : ''}` }));
  if (reste.length) {
    const m = reste.reduce((s, p) => s + p.montant, 0);
    lignes.push({ nom: `Autres produits (${reste.length})`, montant: m, detail: '', tip: `${reste.map(p => p.nom).join(', ')} : ${dh(m)}` });
  }
  const max = Math.max(...lignes.map(l => l.montant)) || 1;
  return `
    <div class="hbars">
      ${lignes.map(l => `
        <div class="hbar-row hbar-produit" data-tip="${esc(l.tip)}">
          <span class="hbar-label">${esc(l.nom)}${l.detail ? `<small>${esc(l.detail)}</small>` : ''}</span>
          <span class="hbar-track"><span class="hbar" style="width:${(l.montant / max) * 100}%;background:var(--series-2)"></span></span>
          <span class="hbar-value">${dh(l.montant)}</span>
        </div>`).join('')}
    </div>`;
}

function histoAchatsParMois(annee, moisChoisi) {
  const mois = MOIS_COURTS.map((_, i) => {
    const prefixe = `${annee}-${String(i + 1).padStart(2, '0')}`;
    return { i, prefixe, total: db.achats.filter(a => a.date.startsWith(prefixe)).reduce((s, a) => s + totalAchat(a), 0) };
  });
  const plusHaut = Math.max(...mois.map(m => m.total));
  const pas = pasRond(plusHaut);
  const max = pas * Math.max(1, Math.ceil(plusHaut / pas));
  return `
    <div class="chart">
      <div class="chart-plot">
        ${grille(0, max, pas)}
        <div class="chart-cols">
          ${mois.map(m => `
            <div class="col-slot ${m.prefixe === moisChoisi ? 'actif' : ''}" data-tip="${esc(`${MOIS_LONGS[m.i]} : ${dh(m.total)}`)}">
              <div class="col-bar haut" style="height:${(m.total / max) * 100}%;background:var(--series-2);width:min(20px, 60%)"></div>
            </div>`).join('')}
        </div>
      </div>
      <div class="chart-xlabels">${mois.map(m => `<span class="${m.prefixe === moisChoisi ? 'actif' : ''}">${MOIS_COURTS[m.i]}</span>`).join('')}</div>
    </div>`;
}

function blocHistogrammesAchats(liste, moisChoisi) {
  const annee = moisAchats.slice(0, 4);
  const periode = moisChoisi ? `${MOIS_LONGS[Number(moisChoisi.slice(5)) - 1]} ${annee}` : `année ${annee}`;
  const produits = totauxParProduit(liste);
  const parFournisseur = Object.entries(liste.reduce((acc, a) => {
    const f = a.fournisseurId ? nomFournisseur(a.fournisseurId) : 'Sans fournisseur';
    acc[f] = (acc[f] || 0) + totalAchat(a);
    return acc;
  }, {})).sort((a, b) => b[1] - a[1]);
  return `
    <div class="grid cols-2" style="margin-top:16px">
      <div class="card">
        <h2>Total acheté par produit — ${periode}</h2>
        ${barresProduits(produits)}
      </div>
      <div class="card">
        <h2>Achats par mois — ${annee}</h2>
        ${histoAchatsParMois(annee, moisChoisi)}
        <h2 style="margin-top:24px">Par fournisseur — ${periode}</h2>
        ${barresCategories(parFournisseur, '--series-2')}
      </div>
    </div>
    ${produits.length ? `
      <details class="card" style="margin-top:16px">
        <summary>Voir le détail par produit</summary>
        <div class="table-wrap"><table class="list">
          <tr><th>Produit</th><th class="num">Quantité totale</th><th class="num">Prix moyen</th><th class="num">Nb d'achats</th><th class="num">Montant TTC</th></tr>
          ${produits.map(p => `<tr><td>${esc(p.nom)}</td><td class="num">${esc(p.qte)}</td>
            <td class="num">${p.prixMoyen ? `${dh(p.prixMoyen)} / ${esc(p.unite)}` : '—'}</td>
            <td class="num">${p.nbAchats}</td><td class="num">${dh(p.montant)}</td></tr>`).join('')}
        </table></div>
      </details>` : ''}`;
}

/* =========================================================
   Menu en ligne (front office clients) et import des commandes WhatsApp
   ========================================================= */

// Adresse publique de la carte en ligne (même dossier que l'application)
const urlMenuPublic = () => new URL('../', location.href.split('#')[0]).href;
// Lien à donner aux clients : le lien court s'il est renseigné, sinon l'adresse complète
const urlPartage = () => db.menuEnLigne.lienCourt || urlMenuPublic();

// Lien direct vers l'envoi de fichiers sur GitHub (dépôt déduit de l'adresse GitHub Pages)
function urlEnvoiGitHub() {
  const m = /^([^.]+)\.github\.io$/.exec(location.hostname);
  const depot = m ? `${m[1]}/${location.pathname.split('/')[1]}` : 'restojguiro-tech/Appli-JGuiro';
  return `https://github.com/${depot}/upload/claude/festive-goodall-ja1s1s`;
}

function qrCodeSvg(texte) {
  if (typeof qrcode !== 'function') return '';
  const qr = qrcode(0, 'M');
  qr.addData(texte);
  qr.make();
  return qr.createSvgTag({ cellSize: 6, margin: 2, scalable: true });
}

vues.menuenligne = () => {
  const cfg = db.menuEnLigne;
  const url = urlPartage();
  const nbPlats = db.carte.filter(p => p.disponible).length;
  return `
    <div class="toolbar"><h1>Menu en ligne</h1>
      <div class="row" style="flex:0 0 auto;flex-wrap:wrap">
        <button class="btn" data-action="recuperer-carte">🔄 Récupérer la carte en ligne</button>
        <button class="btn primary" data-action="importer-whatsapp">📥 Importer une commande WhatsApp</button>
      </div></div>
    <p class="muted">Vos clients consultent la carte sur leur téléphone, composent leur panier et vous envoient la commande par WhatsApp.
      Ensuite, collez le message reçu avec « Importer une commande WhatsApp » : la commande se crée toute seule.</p>
    <div class="grid cols-2">
      <div class="card">
        <h2>1. Réglages</h2>
        <form id="form-menu-en-ligne">
          <label>Numéro WhatsApp du restaurant (format international, sans le +)
            <input name="whatsapp" inputmode="tel" placeholder="Ex. : 212612345678" value="${esc(cfg.whatsapp)}" required></label>
          <label>Lien court vers la carte (facultatif)
            <input name="lienCourt" type="url" placeholder="Ex. : https://tinyurl.com/…" value="${esc(cfg.lienCourt)}"></label>
          <p class="muted small-note">Il doit mener directement vers ${esc(urlMenuPublic())}, sans page de publicité
            (TinyURL ou is.gd conviennent). Laissez vide pour utiliser l'adresse directe.</p>
          <label>Message d'accueil (facultatif)<input name="accueil" placeholder="Ex. : Ouvert tous les jours de 12 h à 23 h" value="${esc(cfg.accueil)}"></label>
          <p class="muted small-note">Modes proposés aux clients :</p>
          <div class="row" style="flex-wrap:wrap">
            ${Object.entries(MODES).map(([k, m]) => `
              <label style="flex:0 0 auto"><input type="checkbox" name="mode_${k}" style="width:auto" ${cfg.modes[k] !== false ? 'checked' : ''}> ${m.icone} ${m.libelle}</label>`).join('')}
          </div>
          <label>Numéro WhatsApp de la cuisine (les commandes lui sont transmises en un clic)
            <input name="cuisine" inputmode="tel" placeholder="Ex. : 212707198724" value="${esc(cfg.cuisine)}"></label>
          <label>Temps de préparation habituel (minutes, indiqué au client)
            <input name="delai" type="number" min="5" step="5" value="${esc(cfg.delai || 30)}"></label>
          <fieldset class="variantes">
            <legend>🛵 Frais de livraison selon la distance</legend>
            <label>Position du restaurant (latitude, longitude — ou collez un lien Google Maps)
              <input name="position" placeholder="Ex. : 33.5731, -7.5898" value="${cfg.position ? esc(cfg.position.lat + ', ' + cfg.position.lng) : ''}"></label>
            ${cfg.position ? '' : `<p class="erreur-sync" style="margin-top:-4px">⚠️ Position non enregistrée : la carte en ligne la cherche depuis l'adresse du restaurant (moins précis).
              Le mieux : appuyez sur « Ma position actuelle » au restaurant, puis Enregistrer.</p>`}
            <div class="row" style="flex-wrap:wrap;margin-bottom:10px">
              <button type="button" class="btn small" data-action="position-ici">📍 Ma position actuelle (au restaurant)</button>
              <button type="button" class="btn small" data-action="position-adresse">🔎 Depuis l'adresse du restaurant</button>
              ${cfg.position ? `<a class="btn small" target="_blank" rel="noopener" href="https://maps.google.com/?q=${cfg.position.lat},${cfg.position.lng}">Vérifier sur la carte</a>` : ''}
            </div>
            <table class="tranches">
              <tr><th>Distance</th><th>Prix (DH)</th></tr>
              ${(cfg.tranches?.length ? cfg.tranches : TRANCHES_LIVRAISON).map((t, i, l) => `
                <tr><td>${i ? `de ${esc(l[i - 1].max)} ` : 'de 0 '}à <input name="tr_max_${i}" type="number" step="0.5" min="0" value="${esc(t.max)}"> km</td>
                  <td><input name="tr_prix_${i}" type="number" step="0.5" min="0" value="${esc(t.prix)}"></td></tr>`).join('')}
              <tr><td>au-delà (majoration possible)</td><td><input name="auDela" type="number" step="0.5" min="0" value="${esc(cfg.auDela ?? PRIX_LIVRAISON_AU_DELA)}"></td></tr>
            </table>
            <p class="muted small-note">Le client indique sa position (GPS ou adresse) : la distance par la route est calculée et les frais s'ajoutent au panier.
              Sans position du restaurant, les frais fixes ci-dessous sont utilisés.</p>
            <label>Frais fixes si la position du restaurant n'est pas indiquée (DH)<input name="fraisLivraison" type="number" step="0.01" min="0" value="${esc(cfg.fraisLivraison || 0)}"></label>
          </fieldset>
          <p class="muted small-note">Moyens de paiement proposés aux clients :</p>
          <div class="row" style="flex-wrap:wrap">
            <label style="flex:0 0 auto"><input type="checkbox" name="pay_especes" style="width:auto" ${cfg.paiements.especes !== false ? 'checked' : ''}> 💵 Espèces (à table, au retrait, à la livraison)</label>
            <label style="flex:0 0 auto"><input type="checkbox" name="pay_tpe" style="width:auto" ${cfg.paiements.tpe !== false ? 'checked' : ''}> 💳 Carte bancaire sur terminal (TPE)</label>
            <label style="flex:0 0 auto"><input type="checkbox" name="pay_en_ligne" style="width:auto" ${cfg.paiements.en_ligne ? 'checked' : ''}> 🌐 Carte bancaire en ligne</label>
          </div>
          <label>Lien de paiement en ligne (fourni par votre banque ou votre prestataire de paiement)
            <input name="lienPaiement" type="url" placeholder="https://…" value="${esc(cfg.lienPaiement)}"></label>
          <p class="muted small-note">Nécessaire pour la carte en ligne. Si votre prestataire accepte le montant dans l'adresse, écrivez
            <code>{montant}</code> à cet endroit : il sera remplacé par le total de la commande.</p>
          <button class="btn primary" type="submit">Enregistrer</button>
        </form>
      </div>
      <div class="card">
        <h2>2. Vérifier</h2>
        <p>Regardez la carte telle que vos clients la verront (${nbPlats} plat${nbPlats > 1 ? 's' : ''} disponible${nbPlats > 1 ? 's' : ''}) :</p>
        <p><a class="btn" href="../?apercu" target="_blank" rel="noopener">👀 Aperçu de la carte en ligne</a></p>
        <h2 style="margin-top:20px">3. Publier</h2>
        ${syncEtat.connecte ? `<p class="note-sync">✅ Synchronisation active : la carte en ligne se met à jour <strong>automatiquement</strong>
          à chaque changement. Les étapes ci-dessous ne sont plus nécessaires.</p>` : ''}
        <p class="muted small-note">À refaire après chaque changement de la carte ou des réglages.</p>
        <ol class="etapes">
          <li><button class="btn small" data-action="telecharger-menu">⬇️ Télécharger le fichier menu.json</button></li>
          <li><a class="btn small" href="${esc(urlEnvoiGitHub())}" target="_blank" rel="noopener">⬆️ Ouvrir GitHub</a>
            puis glissez le fichier <strong>menu.json</strong> dans la page et cliquez sur <strong>Commit changes</strong>.</li>
          <li>Après une ou deux minutes, la carte en ligne est à jour.</li>
        </ol>
      </div>
    </div>
    ${carteApparence()}
    <div class="card" style="margin-top:16px">
      <h2>4. Partager avec vos clients</h2>
      <div class="partage">
        <div class="qr">${qrCodeSvg(url)}</div>
        <div>
          <p>Adresse de la carte en ligne :</p>
          <p><a href="${esc(url)}" target="_blank" rel="noopener"><strong>${esc(url)}</strong></a></p>
          <p style="display:flex;flex-wrap:wrap;gap:8px">
            <button class="btn small" data-action="copier-lien-menu">📋 Copier le lien</button>
            <button class="btn small" data-action="imprimer-qr">🖨️ Imprimer le QR code (pour les tables)</button>
          </p>
          <p class="muted small-note">Collez le lien dans votre statut WhatsApp, sur Instagram, Facebook ou Google Maps.
            Imprimez le QR code et posez-le sur les tables : les clients le scannent avec l'appareil photo de leur téléphone.</p>
        </div>
      </div>
    </div>`;
};

/* ---------- Apparence de la carte en ligne (couleur, logo, bannières, photos) ---------- */

const COULEUR_DEFAUT = '#d62828';

function carteApparence() {
  const cfg = db.menuEnLigne;
  const bannieres = cfg.bannieres || [];
  const photosCat = cfg.photosCategories || {};
  return `
    <div class="card" style="margin-top:16px">
      <h2>🎨 Apparence de la carte en ligne</h2>
      <div class="grid cols-2">
        <form id="form-apparence">
          <label>Couleur principale (boutons, prix, titres)
            <input type="color" name="couleur" value="${esc(cfg.couleur || COULEUR_DEFAUT)}" style="height:44px;padding:4px"></label>
          ${champPhoto('logo', cfg.logo, 'logo', 'Logo (facultatif — sinon le nom du restaurant est affiché)')}
          <button class="btn primary" type="submit">Enregistrer</button>
        </form>
        <div>
          <p style="margin-top:0"><strong>Bannières</strong> <span class="muted">— grandes images qui défilent en haut de la carte</span></p>
          ${bannieres.length ? bannieres.map((b, i) => `
            <div class="banniere-ligne">
              <div class="cp-apercu banniere">${srcPhoto(b.photo) ? `<img src="${srcPhoto(b.photo)}" alt="">` : '<span>Sans photo</span>'}</div>
              <div class="bl-texte"><strong>${esc(b.titre || 'Sans titre')}</strong><span class="muted small-note">${esc(b.texte || '')}${b.categorie ? ` → ${esc(b.categorie)}` : ''}</span></div>
              <div class="bl-boutons">
                <button class="btn small" data-action="monter-banniere" data-i="${i}" title="Monter" ${i === 0 ? 'disabled' : ''}>↑</button>
                <button class="btn small" data-action="modifier-banniere" data-i="${i}">Modifier</button>
                <button class="btn small danger" data-action="supprimer-banniere" data-i="${i}" title="Supprimer">✕</button>
              </div>
            </div>`).join('') : '<p class="muted small-note">Aucune bannière : un bandeau avec le nom du restaurant et le message d\'accueil est affiché.</p>'}
          ${bannieres.length < 6 ? '<button class="btn small" data-action="ajouter-banniere">+ Ajouter une bannière</button>' : ''}
          <p class="muted small-note">Conseil : photo horizontale (format paysage), avec le plat bien visible au centre.</p>
        </div>
      </div>
      <p><strong>Photos des catégories</strong> <span class="muted">— rubrique « Explorer le menu »</span></p>
      <div class="photos-cat">
        ${categories().map(c => `
          <div class="photo-cat">
            <div class="cp-apercu categorie">${srcPhoto(photosCat[c]) ? `<img src="${srcPhoto(photosCat[c])}" alt="">` : '<span>Aucune photo</span>'}</div>
            <strong>${esc(c)}</strong>
            <div class="row" style="gap:6px;justify-content:center">
              <label class="btn small" style="margin:0">📷<input type="file" accept="image/*" hidden data-photo-cat="${esc(c)}"></label>
              ${photosCat[c] ? `<button class="btn small danger" data-action="retirer-photo-cat" data-cat="${esc(c)}" title="Retirer la photo">✕</button>` : ''}
            </div>
          </div>`).join('')}
      </div>
      <p class="muted small-note">Les photos des plats s'ajoutent dans <a href="#carte">Carte</a> → Modifier.
        Pour les « Meilleures offres », cochez « ⭐ À la une » sur les plats choisis (sinon, les plats les plus vendus sont affichés).</p>
    </div>`;
}

function formBanniere(b = {}) {
  return `
    ${champPhoto('photo', b.photo, 'banniere', 'Image')}
    <label>Titre (facultatif)<input name="titre" maxlength="40" placeholder="Ex. : Poulet braisé" value="${esc(b.titre)}"></label>
    <label>Texte (facultatif)<input name="texte" maxlength="90" placeholder="Ex. : Avec attiéké ou alloco, dès 60 DH" value="${esc(b.texte)}"></label>
    <label>Le bouton « Commander maintenant » mène à
      <select name="categorie"><option value="">Toute la carte</option>${optionsHtml(categories(), b.categorie)}</select></label>`;
}

function lireBanniere(d) {
  if (!d.photo && !d.titre.trim()) { alert('Ajoutez une image ou un titre.'); return null; }
  return { photo: d.photo, titre: d.titre.trim(), texte: d.texte.trim(), categorie: d.categorie };
}

Object.assign(actions, {
  'ajouter-banniere': () => ouvrirModal('Nouvelle bannière', formBanniere(), d => {
    const b = lireBanniere(d);
    if (!b) return false;
    (db.menuEnLigne.bannieres ||= []).push({ id: uid(), ...b });
  }),
  'modifier-banniere': el => {
    const b = db.menuEnLigne.bannieres[el.dataset.i];
    ouvrirModal('Modifier la bannière', formBanniere(b), d => {
      const n = lireBanniere(d);
      if (!n) return false;
      Object.assign(b, n);
    });
  },
  'monter-banniere': el => {
    const l = db.menuEnLigne.bannieres;
    const i = Number(el.dataset.i);
    [l[i - 1], l[i]] = [l[i], l[i - 1]];
    sauver(); rendre();
  },
  'supprimer-banniere': el => {
    if (!confirmer('Supprimer cette bannière ?')) return;
    db.menuEnLigne.bannieres.splice(Number(el.dataset.i), 1);
    sauver(); rendre();
  },
  'retirer-photo-cat': el => {
    delete db.menuEnLigne.photosCategories?.[el.dataset.cat];
    sauver(); rendre();
  },
});

document.addEventListener('change', async e => {
  const cat = e.target.dataset?.photoCat;
  if (cat == null || !e.target.files[0]) return;
  const id = await nouvellePhoto(e.target.files[0], 'categorie');
  if (!id) return;
  (db.menuEnLigne.photosCategories ||= {})[cat] = id;
  sauver(); rendre();
});

document.addEventListener('submit', e => {
  if (e.target.id !== 'form-apparence') return;
  e.preventDefault();
  const d = Object.fromEntries(new FormData(e.target));
  db.menuEnLigne.couleur = /^#[0-9a-f]{6}$/i.test(d.couleur) ? d.couleur : '';
  db.menuEnLigne.logo = d.logo || '';
  sauver(); rendre();
  alert('Apparence enregistrée.');
});

/* ---------- Réponse au client et envoi en cuisine (WhatsApp) ---------- */

// Numéro au format international sans « + » (06… → 2126…)
function telInternational(tel) {
  let n = String(tel || '').replace(/\D/g, '').replace(/^00/, '');
  if (/^0[5-7]\d{8}$/.test(n)) n = '212' + n.slice(1);
  else if (/^[5-7]\d{8}$/.test(n)) n = '212' + n;
  return n;
}

const lignesTexte = c => c.lignes.filter(l => l.platId).map(l => `• ${l.qte} × ${l.nom}`);

function messageClient(c, delai) {
  const mode = modeDe(c);
  const prenom = (c.client?.nom || '').split(' ')[0];
  const quand = mode === 'livraison' ? `livrée dans environ ${delai} min` : mode === 'emporter' ? `prête dans environ ${delai} min` : `servie dans environ ${delai} min`;
  return [
    `Bonjour${prenom ? ' ' + prenom : ''} 👋`,
    `Merci pour votre commande chez *${db.restaurant.nom}* ! ✅ Elle est bien reçue et part en cuisine.`,
    '',
    ...c.lignes.map(l => `• ${l.qte} × ${l.nom} = ${dh(l.prix * l.qte)}`),
    `*Total : ${dh(totalCommande(c))}*`,
    '',
    `${MODES[mode].icone} ${MODES[mode].libelle}${mode === 'livraison' && c.client?.adresse ? ` — ${c.client.adresse}` : ''}`,
    c.paiementPrevu ? `Paiement : ${MENU_PAIEMENTS[c.paiementPrevu]}` : null,
    `⏱️ Votre commande sera ${quand}.`,
    '',
    'À tout de suite !',
  ].filter(l => l !== null).join('\n');
}

function messageCuisine(c) {
  const mode = modeDe(c);
  return [
    `👨‍🍳 *COMMANDE — ${MODES[mode].libelle.toUpperCase()}*`,
    `${c.tableNom} · reçue à ${fmtHeure(c.ouverteLe)}`,
    '',
    ...lignesTexte(c),
    c.note ? `\n📝 ${c.note}` : null,
  ].filter(l => l !== null).join('\n');
}

function ouvrirWhatsApp(numero, texte) {
  window.open(`https://wa.me/${numero}?text=${encodeURIComponent(texte)}`, '_blank', 'noopener');
}

function boutonsWhatsApp(c) {
  const tel = telInternational(c.client?.tel);
  return `
    <div class="row envois-wa">
      ${tel ? `<button class="btn ${c.confirmeeLe ? '' : 'wa'}" data-action="confirmer-client">${c.confirmeeLe ? '✓ Client prévenu' : '✅ Confirmer au client'}</button>` : ''}
      <button class="btn ${c.cuisineLe ? '' : 'wa'}" data-action="envoyer-cuisine">${c.cuisineLe ? '✓ Envoyée en cuisine' : '👨‍🍳 Envoyer en cuisine'}</button>
    </div>`;
}

// Juste après l'import d'une commande WhatsApp : les deux envois en deux clics
function proposerEnvois(c) {
  const tel = telInternational(c.client?.tel);
  ouvrirModal('Commande importée ✅', `
    <p>${esc(c.tableNom)} — ${c.lignes.length} ligne(s), <strong>${dh(totalCommande(c))}</strong></p>
    <label>Délai annoncé au client (minutes)<input id="delai-prep" type="number" min="5" step="5" value="${esc(db.menuEnLigne.delai || 30)}"></label>
    <div class="choix-variantes" style="grid-template-columns:1fr">
      ${tel ? `<button type="button" class="btn wa" data-action="confirmer-client">1. ✅ Confirmer la commande au client<span class="muted">WhatsApp s'ouvre avec le message prêt : appuyez sur Envoyer.</span></button>`
        : '<p class="muted">Pas de numéro client : la confirmation se fait sur place.</p>'}
      ${db.menuEnLigne.cuisine ? `<button type="button" class="btn wa" data-action="envoyer-cuisine">${tel ? '2' : '1'}. 👨‍🍳 Envoyer la commande à la cuisine<span class="muted">Au ${esc('+' + db.menuEnLigne.cuisine)}</span></button>`
        : '<p class="muted">Indiquez le numéro de la cuisine dans Menu en ligne → Réglages.</p>'}
    </div>`, null, 'Fermer');
}

Object.assign(actions, {
  'position-ici': () => {
    if (!navigator.geolocation) return alert('Localisation impossible sur cet appareil.');
    navigator.geolocation.getCurrentPosition(
      p => { $('#form-menu-en-ligne [name=position]').value = `${p.coords.latitude.toFixed(6)}, ${p.coords.longitude.toFixed(6)}`; },
      () => alert('Localisation refusée ou impossible. Autorisez la localisation, ou collez un lien Google Maps.'),
      { enableHighAccuracy: true, timeout: 15000 });
  },
  'position-adresse': async () => {
    const adresse = db.restaurant.adresse;
    if (!adresse) return alert("Indiquez d'abord l'adresse du restaurant dans Paramètres.");
    try {
      const pos = await geocoderAdresse(adresse);
      if (!pos) return alert('Adresse introuvable sur la carte. Utilisez « Ma position actuelle » au restaurant, ou collez un lien Google Maps.');
      $('#form-menu-en-ligne [name=position]').value = `${pos.lat}, ${pos.lng}`;
      alert('Position trouvée. Vérifiez-la avec « Vérifier sur la carte » après avoir enregistré.');
    } catch (e) { alert('Recherche impossible pour le moment (connexion internet ?).'); }
  },
  'confirmer-client': () => {
    const c = commandeOuverte(tableSelectionnee);
    if (!c) return;
    const delai = Number($('#delai-prep')?.value) || db.menuEnLigne.delai || 30;
    ouvrirWhatsApp(telInternational(c.client?.tel), messageClient(c, delai));
    c.confirmeeLe = new Date().toISOString();
    sauver();
    marquerEnvoi('confirmer-client', '✓ Client prévenu');
  },
  'envoyer-cuisine': () => {
    const c = commandeOuverte(tableSelectionnee);
    if (!c) return;
    if (!db.menuEnLigne.cuisine) return alert('Indiquez le numéro WhatsApp de la cuisine dans Menu en ligne → Réglages.');
    ouvrirWhatsApp(db.menuEnLigne.cuisine, messageCuisine(c));
    c.cuisineLe = new Date().toISOString();
    sauver();
    marquerEnvoi('envoyer-cuisine', '✓ Envoyée en cuisine');
  },
});

// Met à jour le bouton sans redessiner la fenêtre ouverte
function marquerEnvoi(action, texte) {
  if (modal.open) {
    $$(`#modal [data-action="${action}"]`).forEach(b => { b.classList.remove('wa'); b.firstChild.textContent = texte + ' '; });
  } else rendre();
}

function creerCommandeExterne(type, client) {
  const jour = aujourdHui();
  const numero = db.commandes.filter(c => modeDe(c) !== 'sur_place' && jourDe(c.ouverteLe) === jour).length + 1;
  const c = { id: uid(), tableId: 'ext-' + uid(), type, client, lignes: [], statut: 'ouverte', ouverteLe: new Date().toISOString(),
    tableNom: `${MODES[type].libelle} n° ${numero}${client.nom ? ' — ' + client.nom : ''}` };
  db.commandes.push(c);
  return c;
}

// Crée la commande à partir du code JG1 contenu dans le message WhatsApp du client
function importerCommande(data) {
  const lignes = (data.l || []).map(([id, ti, vi, qte]) => {
    const plat = db.carte.find(p => p.id === id);
    if (!plat) return null;
    return { plat, taille: ti >= 0 ? taillesDe(plat)[ti] : null, variante: vi >= 0 ? variantesDe(plat)[vi] : null, qte: Number(qte) || 1 };
  });
  const manquants = lignes.filter(l => !l).length;
  const client = { nom: data.n || '', tel: data.t || '', adresse: data.a || '' };
  let c;
  let mode = MODES[data.m] ? data.m : 'emporter';
  if (mode === 'sur_place') {
    const table = db.tables.find(t => t.nom.toLowerCase() === String(data.tb || '').trim().toLowerCase());
    if (table) {
      c = commandeOuverte(table.id);
      if (!c) {
        c = { id: uid(), tableId: table.id, tableNom: table.nom, lignes: [], statut: 'ouverte', ouverteLe: new Date().toISOString(), type: 'sur_place' };
        db.commandes.push(c);
      }
    } else {
      mode = 'emporter';
      client.nom = `${client.nom ? client.nom + ' — ' : ''}table « ${data.tb || '?'} »`;
    }
  }
  if (!c) c = creerCommandeExterne(mode, client);
  if (mode === 'livraison' && data.g) c.client = { ...c.client, position: data.g };
  lignes.filter(Boolean).forEach(l => ajouterLigneA(c, l.plat, l.taille, l.variante, l.qte));
  // Frais calculés selon la distance sur la carte en ligne, sinon frais fixes
  const frais = mode === 'livraison' ? (data.f != null ? Number(data.f) : Number(db.menuEnLigne.fraisLivraison) || 0) : 0;
  if (frais > 0) {
    const km = data.d != null ? ` (${String(data.d).replace('.', ',')} km)` : '';
    c.lignes.push({ platId: null, nom: 'Frais de livraison' + km, prix: frais, supplement: 0, qte: 1 });
  }
  if (data.x) c.note = [c.note, data.x].filter(Boolean).join(' — ');
  if (MENU_PAIEMENTS[data.p]) c.paiementPrevu = data.p;
  modeSalle = mode;
  tableSelectionnee = c.tableId;
  return manquants;
}

// Copie sur cet appareil la carte publiée (menu.json) : utile pour avoir la même carte sur le téléphone et le PC
async function recupererCartePubliee() {
  let m;
  try {
    const rep = await fetch(new URL('menu.json', urlMenuPublic()).href + '?t=' + Date.now(), { cache: 'no-store' });
    if (!rep.ok) throw new Error(rep.status);
    m = await rep.json();
  } catch (e) {
    return alert("Impossible de récupérer la carte publiée. Vérifiez la connexion internet, ou que la carte a bien été publiée (Menu en ligne → Publier).");
  }
  const publieeLe = m.genereLe ? new Date(m.genereLe).toLocaleString('fr-FR') : '?';
  if (!confirmer(`Remplacer la carte de cet appareil (${db.carte.length} plats) par la carte publiée en ligne (${m.plats.length} plats, publiée le ${publieeLe}) ?\n\nLes ventes, achats et autres données ne sont pas modifiés.`)) return;

  db.carte = m.plats.map(p => ({
    id: p.id, nom: p.nom, categorie: p.categorie, prix: Number(p.prix), disponible: true,
    ...(p.photo ? { photo: p.photo } : {}), ...(p.description ? { description: p.description } : {}),
    tailles: (p.tailles || []).map(t => ({ nom: t.nom || '', prix: Number(t.prix), ...(t.groupe ? { groupe: t.groupe } : {}) })),
    variantes: (p.variantes || []).map(v => ({ nom: v.nom, supplement: Number(v.supplement) || 0 })),
  }));
  ['nom', 'adresse', 'telephone'].forEach(k => { if (m.restaurant?.[k]) db.restaurant[k] = m.restaurant[k]; });
  (m.tables || []).forEach(nom => {
    if (!db.tables.some(t => t.nom === nom)) db.tables.push({ id: uid(), nom, places: 4 });
  });
  Object.assign(db.menuEnLigne, {
    whatsapp: m.whatsapp || db.menuEnLigne.whatsapp,
    accueil: m.accueil ?? db.menuEnLigne.accueil,
    fraisLivraison: Number(m.fraisLivraison) || 0,
    lienPaiement: m.lienPaiement || db.menuEnLigne.lienPaiement,
  });
  if (Array.isArray(m.modes)) db.menuEnLigne.modes = Object.fromEntries(Object.keys(MODES).map(k => [k, m.modes.includes(k)]));
  if (Array.isArray(m.paiements)) db.menuEnLigne.paiements = Object.fromEntries(Object.keys(MENU_PAIEMENTS).map(k => [k, m.paiements.includes(k)]));
  Object.entries(m.photos || {}).forEach(([id, img]) => { photos.set(id, img); PhotosLocales.mettre(id, img).catch(() => {}); });
  sauver(); rendre();
  completerPhotos().then(rafraichir);
  alert(`Carte mise à jour : ${db.carte.length} plats.`);
}

function imprimerQr() {
  const w = window.open('', '_blank', 'width=600,height=800');
  if (!w) return alert('Autorisez les fenêtres pop-up pour imprimer le QR code.');
  w.document.write(`<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>QR code — ${esc(db.restaurant.nom)}</title>
    <style>body{font-family:Arial,sans-serif;text-align:center;padding:40px}h1{margin:0 0 8px}svg{width:320px;height:320px}
    p{font-size:18px}.url{font-size:12px;color:#555;word-break:break-all}</style></head><body>
    <h1>${esc(db.restaurant.nom)}</h1><p>📱 Scannez pour voir la carte et commander</p>
    ${qrCodeSvg(urlPartage())}<p class="url">${esc(urlPartage())}</p>
    <script>window.onload = () => window.print()<\/script></body></html>`);
  w.document.close();
}

Object.assign(actions, {
  'recuperer-carte': recupererCartePubliee,
  'telecharger-menu': () => {
    if (!db.menuEnLigne.whatsapp) return alert("Indiquez d'abord le numéro WhatsApp du restaurant dans les réglages.");
    const m = construireMenuPublic(db);
    m.photos = Object.fromEntries([...photosReferencees(db)].filter(id => photos.has(id)).map(id => [id, photos.get(id)]));
    const blob = new Blob([JSON.stringify(m, null, 1)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'menu.json';
    a.click();
    URL.revokeObjectURL(a.href);
  },
  'copier-lien-menu': () => {
    navigator.clipboard?.writeText(urlPartage()).then(() => alert('Lien copié.'), () => prompt('Copiez le lien :', urlPartage()));
  },
  'imprimer-qr': imprimerQr,
  'importer-whatsapp': () => ouvrirModal('Importer une commande WhatsApp', `
      <p class="muted">Dans WhatsApp, appuyez longuement sur le message de commande du client, choisissez <strong>Copier</strong>, puis collez-le ici.</p>
      <label>Message du client<textarea name="message" rows="8" required placeholder="🧾 Nouvelle commande…"></textarea></label>`,
    d => {
      const data = decoderCommande(d.message);
      if (!data) { alert('Ce message ne contient pas de code de commande (ligne commençant par « JG1: »). Vérifiez que tout le message a été copié.'); return false; }
      const manquants = importerCommande(data);
      if (manquants) alert(`${manquants} article(s) ne sont plus sur la carte et n'ont pas été ajoutés.`);
      if (location.hash !== '#commandes') { garderSelection = true; location.hash = '#commandes'; }
      const c = commandeOuverte(tableSelectionnee);
      if (c?.lignes.length) setTimeout(() => proposerEnvois(c), 0);
    }, 'Importer'),
});

document.addEventListener('submit', e => {
  if (e.target.id !== 'form-menu-en-ligne') return;
  e.preventDefault();
  const d = Object.fromEntries(new FormData(e.target));
  db.menuEnLigne = {
    ...db.menuEnLigne,
    whatsapp: d.whatsapp.replace(/\D/g, '').replace(/^00/, ''),
    accueil: d.accueil.trim(),
    lienCourt: d.lienCourt.trim(),
    fraisLivraison: Number(d.fraisLivraison) || 0,
    cuisine: telInternational(d.cuisine),
    position: lirePosition(d.position),
    tranches: [0, 1, 2, 3, 4, 5].filter(i => d['tr_max_' + i] !== undefined && d['tr_max_' + i] !== '')
      .map(i => ({ max: Number(d['tr_max_' + i]), prix: Number(d['tr_prix_' + i]) || 0 })).sort((a, b) => a.max - b.max),
    auDela: Number(d.auDela) || PRIX_LIVRAISON_AU_DELA,
    delai: Number(d.delai) || 30,
    lienPaiement: d.lienPaiement.trim(),
    paiements: { especes: !!d.pay_especes, tpe: !!d.pay_tpe, en_ligne: !!d.pay_en_ligne },
    modes: Object.fromEntries(Object.keys(MODES).map(k => [k, !!d['mode_' + k]])),
  };
  if (!Object.values(db.menuEnLigne.modes).some(Boolean)) db.menuEnLigne.modes.emporter = true;
  if (db.menuEnLigne.paiements.en_ligne && !db.menuEnLigne.lienPaiement) {
    alert("La carte en ligne ne sera pas proposée tant qu'aucun lien de paiement n'est indiqué.");
  }
  if (!paiementsActifs(db.menuEnLigne).length) db.menuEnLigne.paiements.especes = true;
  // Pas de position du restaurant : on la cherche depuis son adresse (à vérifier ensuite sur la carte)
  if (!db.menuEnLigne.position && db.restaurant.adresse) {
    geocoderAdresse(db.restaurant.adresse).then(pos => {
      if (!pos || db.menuEnLigne.position) return;
      db.menuEnLigne.position = pos;
      sauver(); rendre();
    }).catch(() => {});
  }
  sauver(); rendre();
  alert('Réglages enregistrés. Pensez à republier le fichier menu.json.');
});

/* =========================================================
   Synchronisation entre appareils (interface ; le moteur est dans sync.js)
   ========================================================= */

window.syncEtat = {
  configure: !!window.JGUIRO_SYNC?.firebase,
  connecte: false, email: '', statut: 'deconnecte', derniere: null, erreur: '',
};
const syncEtat = window.syncEtat;

const LIBELLES_SYNC = {
  deconnecte: ['', 'Non connecté'],
  connexion: ['⏳', 'Connexion…'],
  envoi: ['⏳', 'Envoi des changements…'],
  ok: ['☁️', 'Synchronisé'],
  hors_ligne: ['📴', 'Hors ligne — les changements seront envoyés au retour de la connexion'],
  erreur: ['⚠️', 'Erreur de synchronisation'],
};

function carteSync() {
  if (!syncEtat.configure) {
    return `<div class="card" style="margin-bottom:16px">
      <h2>☁️ Synchronisation entre appareils</h2>
      <p class="muted">Pas encore configurée : les données restent sur cet appareil. Suivez le guide de mise en place pour l'activer.</p>
    </div>`;
  }
  const [icone, texte] = LIBELLES_SYNC[syncEtat.statut] || ['', syncEtat.statut];
  if (!syncEtat.connecte) {
    return `<div class="card" style="margin-bottom:16px">
      <h2>☁️ Synchronisation entre appareils</h2>
      <p class="muted">Connectez cet appareil avec le compte du restaurant : les commandes, ventes, achats, la carte…
        seront partagés en temps réel avec vos autres appareils.</p>
      <form id="form-sync" class="row" style="flex-wrap:wrap;align-items:flex-end">
        <label>E-mail<input name="email" type="email" required autocomplete="username" value="${esc(syncEtat.email || localStorage.getItem('jguiro-sync-email') || '')}"></label>
        <label>Mot de passe<input name="motdepasse" type="password" required autocomplete="current-password"></label>
        <div style="flex:0 0 auto;margin-bottom:12px;display:flex;gap:8px">
          <button class="btn primary" type="submit">Se connecter</button>
          <button class="btn" type="button" data-action="sync-oubli">Mot de passe oublié</button>
        </div>
      </form>
      ${syncEtat.erreur ? `<p class="erreur-sync">⚠️ ${esc(syncEtat.erreur)}</p>` : ''}
    </div>`;
  }
  return `<div class="card" style="margin-bottom:16px">
    <h2>☁️ Synchronisation entre appareils</h2>
    <p>Connecté avec <strong>${esc(syncEtat.email)}</strong></p>
    <p>${icone} ${esc(texte)}${syncEtat.derniere && syncEtat.statut === 'ok' ? ` — ${new Date(syncEtat.derniere).toLocaleTimeString('fr-FR')}` : ''}</p>
    ${syncEtat.erreur ? `<p class="erreur-sync">⚠️ ${esc(syncEtat.erreur)}</p>` : ''}
    <button class="btn" data-action="sync-deconnexion">Déconnecter cet appareil</button>
  </div>`;
}

// Petit indicateur en haut de l'écran (hors de la zone redessinée)
function majIndicateurSync() {
  const el = document.getElementById('sync-badge');
  if (el) {
    const [icone, texte] = syncEtat.connecte ? (LIBELLES_SYNC[syncEtat.statut] || ['', '']) : ['', ''];
    el.textContent = icone;
    el.title = texte;
    el.hidden = !icone;
  }
  if (vueCourante() === 'parametres') rafraichir();
}

// Redessine après un changement reçu, sans gêner une saisie en cours
let rafraichissementEnAttente = null;
function rafraichir() {
  clearTimeout(rafraichissementEnAttente);
  const actif = document.activeElement;
  const saisie = actif && actif.closest('#app') && /^(INPUT|TEXTAREA|SELECT)$/.test(actif.tagName);
  if (modal.open || saisie) {
    rafraichissementEnAttente = setTimeout(rafraichir, 1500);
    return;
  }
  rendre();
}

// Premier branchement d'un appareil qui a déjà des données : que faire ?
function demanderChoixSync(nbEnLigne) {
  return new Promise(resoudre => {
    let reponse = null;
    ouvrirModal('Données déjà en ligne', `
      <p>Le compte contient déjà des données (${nbEnLigne} éléments). Que voulez-vous faire sur cet appareil ?</p>
      <div class="choix-variantes" style="grid-template-columns:1fr">
        <button type="button" class="btn" data-choix-sync="en_ligne">⬇️ Utiliser les données en ligne<span class="muted">Recommandé pour un nouvel appareil. Les données de cet appareil sont remplacées.</span></button>
        <button type="button" class="btn" data-choix-sync="appareil">⬆️ Envoyer les données de cet appareil<span class="muted">Les données en ligne sont remplacées par celles de cet appareil, sur tous les appareils.</span></button>
      </div>`, null, null);
    const clic = e => {
      const b = e.target.closest('[data-choix-sync]');
      if (!b) return;
      if (b.dataset.choixSync === 'appareil' && !confirmer('Remplacer les données en ligne (et sur tous les autres appareils) par celles de cet appareil ?')) return;
      reponse = b.dataset.choixSync;
      modal.close();
    };
    modal.addEventListener('click', clic);
    modal.addEventListener('close', () => { modal.removeEventListener('click', clic); resoudre(reponse); }, { once: true });
  });
}

window.app = {
  donnees: () => db,
  photo: id => photos.get(id),
  completerPhotos: () => completerPhotos().then(rafraichir),
  copieSecurite,
  ecrireLocal,
  rafraichir,
  majIndicateurSync,
  demanderChoixSync,
};

Object.assign(actions, {
  'restaurer-copie': el => {
    const c = copiesSecurite()[el.dataset.i];
    if (!c || !confirmer(`Restaurer la copie du ${new Date(c.date).toLocaleString('fr-FR')} ?${syncEtat.connecte ? ' Elle remplacera les données sur TOUS les appareils synchronisés.' : ''}`)) return;
    copieSecurite('avant restauration');
    db = migrer(c.donnees);
    sauver(); rendre();
    window.syncApi?.envoyerMaintenant();
    alert('Copie restaurée.');
  },
  'sync-deconnexion': () => {
    if (!confirmer('Déconnecter cet appareil ? Ses données restent disponibles, mais ne seront plus partagées.')) return;
    window.syncApi?.deconnecter();
  },
  'sync-oubli': () => {
    const email = $('#form-sync input[name=email]')?.value.trim();
    if (!email) return alert("Indiquez d'abord votre e-mail.");
    window.syncApi?.motDePasseOublie(email)
      .then(() => alert(`Un e-mail de réinitialisation a été envoyé à ${email}.`))
      .catch(() => alert("Impossible d'envoyer l'e-mail. Vérifiez l'adresse."));
  },
});

document.addEventListener('submit', e => {
  if (e.target.id !== 'form-sync') return;
  e.preventDefault();
  const d = Object.fromEntries(new FormData(e.target));
  if (!window.syncApi) return alert("Le module de synchronisation n'a pas pu se charger. Vérifiez la connexion internet puis rechargez la page.");
  try { localStorage.setItem('jguiro-sync-email', d.email.trim()); } catch (err) { /* ignoré */ }
  window.syncApi.connecter(d.email, d.motdepasse);
});

/* =========================================================
   Routage
   ========================================================= */

function vueCourante() {
  const v = location.hash.slice(1);
  return vues[v] ? v : 'tableau';
}

function rendre() {
  const v = vueCourante();
  $('#app').innerHTML = vues[v]();
  $$('#nav a').forEach(a => a.classList.toggle('active', a.getAttribute('href') === '#' + v));
}

// Changer de page ferme la commande en cours d'affichage, sauf juste après un import WhatsApp
let garderSelection = false;
window.addEventListener('hashchange', () => {
  if (!garderSelection) tableSelectionnee = null;
  garderSelection = false;
  rendre();
});
rendre();
chargerPhotosLocales();
