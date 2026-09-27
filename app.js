'use strict';

/* =========================================================
   Données & stockage (localStorage)
   ========================================================= */

const STORAGE_KEY = 'jguiro-restaurant-v1';

const DONNEES_DEMO = {
  restaurant: { nom: 'Restaurant JGuiro', tva: 10 },
  carte: [
    { id: 'p1', nom: 'Salade César', categorie: 'Entrées', prix: 55, disponible: true },
    { id: 'p2', nom: 'Soupe du jour', categorie: 'Entrées', prix: 35, disponible: true },
    { id: 'p3', nom: 'Entrecôte frites', categorie: 'Plats', prix: 150, disponible: true },
    { id: 'p4', nom: 'Pavé de saumon', categorie: 'Plats', prix: 130, disponible: true },
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
  stock: [
    { id: 's1', nom: 'Farine', quantite: 10, unite: 'kg', seuil: 3 },
    { id: 's2', nom: 'Beurre', quantite: 2, unite: 'kg', seuil: 2 },
    { id: 's3', nom: 'Entrecôte', quantite: 12, unite: 'pièces', seuil: 5 },
    { id: 's4', nom: 'Saumon', quantite: 4, unite: 'kg', seuil: 2 },
    { id: 's5', nom: 'Vin rouge', quantite: 18, unite: 'bouteilles', seuil: 6 },
  ],
};

let db = charger();

function charger() {
  try {
    const brut = localStorage.getItem(STORAGE_KEY);
    if (brut) return { ...structuredClone(DONNEES_DEMO), ...JSON.parse(brut) };
  } catch (e) {
    console.warn('Lecture des données impossible', e);
  }
  return structuredClone(DONNEES_DEMO);
}

function sauver() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  } catch (e) {
    alert("Impossible d'enregistrer les données : " + e.message);
  }
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
const categories = () => [...new Set(db.carte.map(p => p.categorie))];

/* =========================================================
   Fenêtre modale générique
   ========================================================= */

const modal = $('#modal');
let modalSubmit = null;

function ouvrirModal(titre, corpsHtml, onSubmit, libelleOk = 'Enregistrer') {
  $('#modal-title').textContent = titre;
  $('#modal-body').innerHTML = corpsHtml;
  $('#modal-ok').textContent = libelleOk;
  modalSubmit = onSubmit;
  modal.showModal();
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
      <div class="card stat"><div class="label">Tables occupées</div><div class="value">${ouvertes.length} / ${db.tables.length}</div></div>
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

vues.commandes = () => {
  if (tableSelectionnee && db.tables.some(t => t.id === tableSelectionnee)) {
    return vuePriseCommande(tableSelectionnee);
  }
  tableSelectionnee = null;
  return `
    <div class="toolbar">
      <h1>Plan de salle</h1>
      <button class="btn" data-action="ajouter-table">+ Ajouter une table</button>
    </div>
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

  return `
    <div class="toolbar">
      <h1>${esc(table.nom)}</h1>
      <div>
        <button class="btn" data-action="retour-salle">← Plan de salle</button>
        <button class="btn danger" data-action="supprimer-table" data-id="${table.id}">Supprimer la table</button>
      </div>
    </div>
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
                    <div class="price">${dh(p.prix)}</div>
                  </button>`).join('')}
              </div>
            </div>`;
        }).join('') || '<div class="empty">La carte est vide.</div>'}
      </div>
      <div class="card" id="ticket">
        <h2>Ticket</h2>
        ${c ? `<p class="muted">Ouvert à ${fmtHeure(c.ouverteLe)}</p>` : ''}
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
    <button class="btn primary" data-action="ajouter-plat">+ Nouveau plat</button>
  </div>
  ${categories().map(cat => `
    <div class="card" style="margin-bottom:16px">
      <h2>${esc(cat)}</h2>
      <div class="table-wrap"><table class="list">
        <tr><th>Nom</th><th class="num">Prix</th><th>Statut</th><th></th></tr>
        ${db.carte.filter(p => p.categorie === cat).map(p => `
          <tr>
            <td>${esc(p.nom)}</td>
            <td class="num">${dh(p.prix)}</td>
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
  return `
    <label>Nom<input name="nom" required value="${esc(p.nom)}"></label>
    <div class="row">
      <label>Catégorie<input name="categorie" required list="liste-cat" value="${esc(p.categorie)}"></label>
      <label>Prix (DH)<input name="prix" type="number" step="0.01" min="0" required value="${esc(p.prix)}"></label>
    </div>
    <datalist id="liste-cat">${categories().map(c => `<option value="${esc(c)}">`).join('')}</datalist>
    <label><input type="checkbox" name="disponible" style="width:auto" ${p.disponible !== false ? 'checked' : ''}> Disponible</label>`;
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
        <tr><th>Produit</th><th class="num">Quantité</th><th>Unité</th><th class="num">Seuil d'alerte</th><th>État</th><th></th></tr>
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
              <td><span class="badge ${bas ? 'warn' : 'ok'}">${bas ? 'À commander' : 'OK'}</span></td>
              <td class="num">
                <button class="btn small" data-action="modifier-stock" data-id="${s.id}">Modifier</button>
                <button class="btn small danger" data-action="supprimer-stock" data-id="${s.id}">Supprimer</button>
              </td>
            </tr>`;
        }).join('')}
      </table>` : '<div class="empty">Aucun produit en stock.</div>'}
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
        <h2 style="margin-top:20px">Derniers tickets</h2>
        ${payees.length ? `
          <table class="list">
            ${[...payees].reverse().slice(0, 10).map(c => `
              <tr><td>${fmtDate(jourDe(c.payeeLe))} ${fmtHeure(c.payeeLe)}</td>
              <td>${esc(c.tableNom)}</td><td class="num">${dh(totalCommande(c))}</td></tr>`).join('')}
          </table>` : '<div class="empty">—</div>'}
      </div>
    </div>`;
};

/* ---------- Paramètres ---------- */
vues.parametres = () => `
  <h1>Paramètres</h1>
  <div class="grid cols-2">
    <div class="card">
      <h2>Restaurant</h2>
      <form id="form-params">
        <label>Nom du restaurant<input name="nom" required value="${esc(db.restaurant.nom)}"></label>
        <label>Taux de TVA restauration (%)<input name="tva" type="number" step="0.1" min="0" value="${esc(db.restaurant.tva)}"></label>
        <button class="btn primary" type="submit">Enregistrer</button>
      </form>
    </div>
    <div class="card">
      <h2>Sauvegarde des données</h2>
      <p class="muted">Les données sont enregistrées dans ce navigateur. Exportez-les régulièrement pour ne rien perdre, ou pour les transférer sur un autre appareil.</p>
      <div class="row" style="flex-wrap:wrap">
        <button class="btn" data-action="exporter">⬇️ Exporter (JSON)</button>
        <label class="btn" style="margin:0;text-align:center;color:var(--text)">⬆️ Importer
          <input type="file" accept="application/json" data-action="importer" hidden>
        </label>
      </div>
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

  'ouvrir-table': el => { tableSelectionnee = el.dataset.id; rendre(); },
  'retour-salle': () => { tableSelectionnee = null; rendre(); },

  'supprimer-table': el => {
    if (commandeOuverte(el.dataset.id)) return alert('Cette table a une commande en cours.');
    if (!confirmer('Supprimer cette table ?')) return;
    db.tables = db.tables.filter(t => t.id !== el.dataset.id);
    tableSelectionnee = null;
    sauver(); rendre();
  },

  'ajouter-ligne': el => {
    const plat = db.carte.find(p => p.id === el.dataset.id);
    let c = commandeOuverte(tableSelectionnee);
    if (!c) {
      c = { id: uid(), tableId: tableSelectionnee, tableNom: db.tables.find(t => t.id === tableSelectionnee).nom,
        lignes: [], statut: 'ouverte', ouverteLe: new Date().toISOString() };
      db.commandes.push(c);
    }
    const ligne = c.lignes.find(l => l.platId === plat.id);
    if (ligne) ligne.qte++;
    else c.lignes.push({ platId: plat.id, nom: plat.nom, prix: plat.prix, qte: 1 });
    sauver(); rendre();
  },

  'plus': el => { commandeOuverte(tableSelectionnee).lignes[el.dataset.i].qte++; sauver(); rendre(); },
  'moins': el => {
    const c = commandeOuverte(tableSelectionnee);
    const l = c.lignes[el.dataset.i];
    if (--l.qte <= 0) c.lignes.splice(el.dataset.i, 1);
    if (!c.lignes.length) db.commandes = db.commandes.filter(x => x !== c);
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
    ouvrirModal(`Encaisser ${dh(totalCommande(c))}`, `
      <label>Moyen de paiement
        <select name="paiement">
          <option>Carte bancaire</option><option>Espèces</option><option>Ticket restaurant</option><option>Chèque</option>
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
    db.carte.push({ id: uid(), nom: d.nom.trim(), categorie: d.categorie.trim(), prix: Number(d.prix), disponible: d.disponible });
  }),
  'modifier-plat': el => {
    const p = db.carte.find(x => x.id === el.dataset.id);
    ouvrirModal('Modifier le plat', formPlat(p), d => {
      Object.assign(p, { nom: d.nom.trim(), categorie: d.categorie.trim(), prix: Number(d.prix), disponible: d.disponible });
    });
  },
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
    const blob = new Blob([JSON.stringify(db, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `sauvegarde-restaurant-${aujourdHui()}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  },
  'reinitialiser': () => {
    if (!confirmer('Effacer TOUTES les données (carte, commandes, réservations, stock) ? Cette action est irréversible.')) return;
    db = structuredClone(DONNEES_DEMO);
    tableSelectionnee = null;
    sauver(); rendre();
  },
};

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
    <div class="c">${esc(c.tableNom)} — ${new Date().toLocaleString('fr-FR')}</div><hr>
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
      fichier.text().then(txt => {
        const data = JSON.parse(txt);
        if (!Array.isArray(data.carte) || !Array.isArray(data.commandes)) throw new Error('format inattendu');
        if (!confirmer('Remplacer toutes les données actuelles par celles du fichier ?')) return;
        db = { ...structuredClone(DONNEES_DEMO), ...data };
        sauver(); rendre();
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
  sauver(); rendre();
  alert('Paramètres enregistrés.');
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

window.addEventListener('hashchange', () => { tableSelectionnee = null; rendre(); });
rendre();
