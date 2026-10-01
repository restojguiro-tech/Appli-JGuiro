'use strict';

/* =========================================================
   Carte en ligne : les clients composent leur commande
   et l'envoient au restaurant par WhatsApp.
   ========================================================= */

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const dh = n => fmt.format(n || 0) + ' DH';

let menu = null;
let panier = [];   // { id, ti, vi, qte }
const CLE_PANIER = 'jguiro-panier';

/* ---------- Chargement de la carte ---------- */

// Aperçu : sur l'appareil du restaurant, la carte est lue directement dans l'application.
async function chargerMenu() {
  if (new URLSearchParams(location.search).has('apercu')) {
    const brut = localStorage.getItem(MENU_CLE_STOCKAGE);
    if (brut) return construireMenuPublic(JSON.parse(brut));
  }
  // Carte publiée automatiquement par l'application (synchronisation active), sinon le fichier menu.json
  const sync = window.JGUIRO_SYNC;
  if (sync?.firebase) {
    try {
      const base = sync.emulateur ? `http://${sync.emulateur.firestore}/v1` : 'https://firestore.googleapis.com/v1';
      const url = `${base}/projects/${sync.firebase.projectId}/databases/(default)/documents/publics/${sync.restaurantId || 'jguiro'}?key=${sync.firebase.apiKey}`;
      const r = await fetch(url, { cache: 'no-store' });
      if (r.ok) {
        const json = (await r.json()).fields?.json?.stringValue;
        if (json) return JSON.parse(json);
      }
    } catch (e) { /* on se rabat sur menu.json */ }
  }
  const rep = await fetch('menu.json?t=' + Date.now(), { cache: 'no-store' });
  if (!rep.ok) throw new Error('menu introuvable');
  return rep.json();
}

const platDe = id => menu.plats.find(p => p.id === id);

function prixLigne(l) {
  const p = platDe(l.id);
  if (!p) return 0;
  const base = l.ti >= 0 && p.tailles[l.ti] ? p.tailles[l.ti].prix : p.prix;
  return base + (l.vi >= 0 && p.variantes[l.vi] ? p.variantes[l.vi].supplement : 0);
}

function nomLigne(l) {
  const p = platDe(l.id);
  const t = l.ti >= 0 ? p.tailles[l.ti] : null;
  const v = l.vi >= 0 ? p.variantes[l.vi] : null;
  return p.nom + (t ? (t.nom ? ` — ${t.nom}` : ` ${dh(t.prix)}`) : '') + (v ? ` (${v.nom})` : '');
}

const totalPanier = () => panier.reduce((s, l) => s + prixLigne(l) * l.qte, 0);

function sauverPanier() {
  try { sessionStorage.setItem(CLE_PANIER, JSON.stringify(panier)); } catch (e) { /* navigation privée */ }
}

/* ---------- Affichage de la carte ---------- */

function rendreCarte() {
  const r = menu.restaurant;
  document.title = `${r.nom || 'Notre carte'} — Commander`;
  $('#nom-resto').textContent = r.nom || 'Notre carte';
  $('#infos-resto').textContent = [r.adresse, r.telephone && `📞 ${r.telephone}`].filter(Boolean).join(' · ');
  $('#accueil').textContent = menu.accueil || '';

  const ancre = c => 'cat-' + menu.categories.indexOf(c);
  $('#categories').innerHTML = menu.categories.map(c => `<a href="#${ancre(c)}">${esc(c)}</a>`).join('');

  if (!menu.plats.length) {
    $('#carte').innerHTML = '<p class="vide">La carte est momentanément indisponible.</p>';
    return;
  }
  $('#carte').innerHTML = menu.categories.map(c => `
    <h2 id="${ancre(c)}">${esc(c)}</h2>
    ${menu.plats.filter(p => p.categorie === c).map(p => {
      const dansPanier = panier.filter(l => l.id === p.id).reduce((s, l) => s + l.qte, 0);
      const prix = p.tailles.length
        ? `dès ${dh(Math.min(...p.tailles.map(t => t.prix)))}`
        : dh(p.prix);
      const detail = [
        p.tailles.length && p.tailles.some(t => t.nom) ? p.tailles.map(t => t.nom).filter(Boolean).join(' · ') : '',
        p.variantes.length ? p.variantes.map(v => v.nom).join(' · ') : '',
      ].filter(Boolean).join(' — ');
      return `
        <div class="plat">
          <div class="infos">
            <div class="nom">${esc(p.nom)}</div>
            ${detail ? `<div class="detail">${esc(detail)}</div>` : ''}
            <div class="prix">${prix}</div>
            ${dansPanier ? `<div class="qte-panier">✓ ${dansPanier} dans le panier</div>` : ''}
          </div>
          <button class="ajouter" data-ajouter="${esc(p.id)}" aria-label="Ajouter ${esc(p.nom)}">+</button>
        </div>`;
    }).join('')}`).join('');
  majBarre();
}

function majBarre() {
  const nb = panier.reduce((s, l) => s + l.qte, 0);
  $('#barre-panier').hidden = nb === 0;
  $('#nb-articles').textContent = nb;
  $('#total-barre').textContent = dh(totalPanier());
}

/* ---------- Ajout au panier (avec choix du prix / de la variante) ---------- */

function ajouter(id, ti = -1, vi = -1) {
  const l = panier.find(x => x.id === id && x.ti === ti && x.vi === vi);
  if (l) l.qte++;
  else panier.push({ id, ti, vi, qte: 1 });
  sauverPanier();
  rendreCarte();
}

function choisirOptions(p) {
  if (!p.tailles.length && !p.variantes.length) return ajouter(p.id);
  $('#options-titre').textContent = p.nom;
  $('#options-corps').innerHTML = `
    ${p.tailles.length ? `
      <div class="groupe-titre">Choisissez ${p.tailles.some(t => t.nom) ? 'la taille' : 'le prix'}</div>
      <div class="options-liste">
        ${p.tailles.map((t, i) => `
          <label class="option"><input type="radio" name="ti" value="${i}" ${i === 0 ? 'checked' : ''}>
            <span>${esc(t.nom || dh(t.prix))}</span><span>${dh(t.prix)}</span></label>`).join('')}
      </div>` : ''}
    ${p.variantes.length ? `
      <div class="groupe-titre">Choisissez une option</div>
      <div class="options-liste">
        ${p.variantes.map((v, i) => `
          <label class="option"><input type="radio" name="vi" value="${i}" ${i === 0 ? 'checked' : ''}>
            <span>${esc(v.nom)}</span><span>${v.supplement ? '+ ' + dh(v.supplement) : ''}</span></label>`).join('')}
      </div>` : ''}`;
  const dlg = $('#options');
  dlg.returnValue = '';
  dlg.showModal();
  dlg.onclose = () => {
    if (dlg.returnValue !== 'ok') return;
    const ti = p.tailles.length ? Number($('input[name=ti]:checked', dlg)?.value ?? 0) : -1;
    const vi = p.variantes.length ? Number($('input[name=vi]:checked', dlg)?.value ?? 0) : -1;
    ajouter(p.id, ti, vi);
  };
}

/* ---------- Panier ---------- */

function modeChoisi() {
  return $('input[name=mode]:checked')?.value || menu.modes[0];
}

function rendreChampsClient() {
  const mode = modeChoisi();
  const f = $('#form-panier');
  const garder = n => f.elements[n]?.value || '';
  const valeurs = { nom: garder('nom'), tel: garder('tel'), adresse: garder('adresse'), table: garder('table') };
  let html = '';
  if (mode === 'sur_place') {
    html = menu.tables.length
      ? `<label>Votre table<select name="table" required>
          <option value="">— Choisir —</option>
          ${menu.tables.map(t => `<option ${valeurs.table === t ? 'selected' : ''}>${esc(t)}</option>`).join('')}
        </select></label>`
      : `<label>Numéro de table<input name="table" required value="${esc(valeurs.table)}"></label>`;
    html += `<label>Votre prénom (facultatif)<input name="nom" value="${esc(valeurs.nom)}"></label>`;
  } else {
    html = `
      <label>Votre nom<input name="nom" required autocomplete="name" value="${esc(valeurs.nom)}"></label>
      <label>Votre téléphone<input name="tel" type="tel" required autocomplete="tel" value="${esc(valeurs.tel)}"></label>
      ${mode === 'livraison' ? `<label>Adresse de livraison<textarea name="adresse" rows="2" required autocomplete="street-address">${esc(valeurs.adresse)}</textarea></label>` : ''}`;
  }
  $('#champs-client').innerHTML = html;
}

// Le paiement se fait à table, au retrait ou à la livraison, sauf la carte en ligne
const momentPaiement = mode => ({ sur_place: 'à table', emporter: 'au retrait', livraison: 'à la livraison' }[mode]);
const paiementsMenu = () => (Array.isArray(menu.paiements) && menu.paiements.length ? menu.paiements : ['especes', 'tpe']);

function libellePaiement(p, mode) {
  return p === 'en_ligne' ? 'Carte bancaire en ligne (maintenant)' : `${MENU_PAIEMENTS[p]} ${momentPaiement(mode)}`;
}

function rendrePaiements() {
  const mode = modeChoisi();
  const actuel = $('input[name=paiement]:checked')?.value;
  const liste = paiementsMenu();
  const choisi = liste.includes(actuel) ? actuel : liste[0];
  const icones = { especes: '💵', tpe: '💳', en_ligne: '🌐' };
  $('#choix-paiement').innerHTML = liste.map(p => `
    <label class="option"><input type="radio" name="paiement" value="${p}" ${p === choisi ? 'checked' : ''}>
      <span>${icones[p]} ${esc(libellePaiement(p, mode))}</span></label>`).join('');
}

function rendrePanier() {
  const frais = modeChoisi() === 'livraison' ? menu.fraisLivraison : 0;
  $('#lignes-panier').innerHTML = panier.map((l, i) => `
    <div class="ligne-panier">
      <button type="button" class="btn" data-moins="${i}" aria-label="Retirer un">−</button>
      <strong>${l.qte}</strong>
      <button type="button" class="btn" data-plus="${i}" aria-label="Ajouter un">+</button>
      <span class="n">${esc(nomLigne(l))}</span>
      <span>${dh(prixLigne(l) * l.qte)}</span>
    </div>`).join('') + (frais ? `
    <div class="ligne-panier"><span class="n">Frais de livraison</span><span>${dh(frais)}</span></div>` : '');
  $('#total-panier').textContent = dh(totalPanier() + frais);
}

function ouvrirPanier() {
  $('#choix-modes').innerHTML = menu.modes.map((m, i) => `
    <label><input type="radio" name="mode" value="${m}" ${i === 0 ? 'checked' : ''}><span>${MENU_MODES[m]}</span></label>`).join('');
  rendreChampsClient();
  rendrePaiements();
  rendrePanier();
  $('#panier').showModal();
}

function envoyer(e) {
  e.preventDefault();
  if (!panier.length) return;
  if (!menu.whatsapp) {
    alert("Le numéro WhatsApp du restaurant n'est pas encore configuré. Merci d'appeler le restaurant.");
    return;
  }
  const f = e.target.elements;
  const mode = modeChoisi();
  const val = n => (f[n]?.value || '').trim();
  const frais = mode === 'livraison' ? menu.fraisLivraison : 0;
  const paiement = $('input[name=paiement]:checked')?.value || paiementsMenu()[0];
  const total = totalPanier() + frais;
  const lignes = panier.map(l => `• ${l.qte} × ${nomLigne(l)} = ${dh(prixLigne(l) * l.qte)}`);
  if (frais) lignes.push(`• Frais de livraison = ${dh(frais)}`);
  const message = [
    `🧾 *Nouvelle commande — ${menu.restaurant.nom}*`,
    `Mode : *${MENU_MODES[mode]}*`,
    mode === 'sur_place' ? `Table : ${val('table')}` : null,
    val('nom') ? `Nom : ${val('nom')}` : null,
    val('tel') ? `Téléphone : ${val('tel')}` : null,
    val('adresse') ? `Adresse : ${val('adresse')}` : null,
    '',
    ...lignes,
    '',
    `*Total : ${dh(total)}*`,
    `Paiement : *${libellePaiement(paiement, mode)}*`,
    val('note') ? `Remarque : ${val('note')}` : null,
    '',
    encoderCommande({
      m: mode, tb: val('table'), n: val('nom'), t: val('tel'), a: val('adresse'), x: val('note'), p: paiement,
      l: panier.map(l => [l.id, l.ti, l.vi, l.qte]),
    }),
  ].filter(l => l !== null).join('\n');

  const lienWhatsApp = `https://wa.me/${menu.whatsapp}?text=${encodeURIComponent(message)}`;
  const viderPanier = () => { panier = []; sauverPanier(); rendreCarte(); };
  $('#panier').close();

  if (paiement !== 'en_ligne') {
    window.location.href = lienWhatsApp;
    viderPanier();
    return;
  }
  // Carte en ligne : le client envoie la commande puis ouvre la page de paiement du restaurant
  const montant = total.toFixed(2);
  const lienPaiement = menu.lienPaiement.replace(/\{montant\}/g, montant);
  $('#conf-total').textContent = dh(total);
  $('#conf-whatsapp').href = lienWhatsApp;
  $('#conf-payer').href = lienPaiement;
  $('#conf-payer').textContent = `2. Payer ${dh(total)} par carte bancaire`;
  $('#conf-aide').textContent = menu.lienPaiement.includes('{montant}')
    ? 'Le montant est déjà indiqué sur la page de paiement sécurisée.'
    : `Sur la page de paiement sécurisée, indiquez le montant de ${dh(total)} et votre nom.`;
  $('#conf-whatsapp').onclick = viderPanier;
  $('#confirmation').showModal();
}

/* ---------- Événements ---------- */

document.addEventListener('click', e => {
  const aj = e.target.closest('[data-ajouter]');
  if (aj) return choisirOptions(platDe(aj.dataset.ajouter));
  const plus = e.target.closest('[data-plus]');
  const moins = e.target.closest('[data-moins]');
  if (plus || moins) {
    const i = Number((plus || moins).dataset[plus ? 'plus' : 'moins']);
    panier[i].qte += plus ? 1 : -1;
    if (panier[i].qte <= 0) panier.splice(i, 1);
    sauverPanier();
    rendreCarte();
    if (!panier.length) return $('#panier').close();
    rendrePanier();
  }
  if (e.target.closest('[data-fermer]')) $('#panier').close();
});
$('#barre-panier').addEventListener('click', ouvrirPanier);
$('#choix-modes').addEventListener('change', () => { rendreChampsClient(); rendrePaiements(); rendrePanier(); });
document.addEventListener('click', e => { if (e.target.closest('[data-fermer-conf]')) $('#confirmation').close(); });
$('#form-panier').addEventListener('submit', envoyer);

// Catégorie active pendant le défilement
window.addEventListener('scroll', () => {
  let active = null;
  $$('main h2').forEach(h => { if (h.getBoundingClientRect().top < 120) active = h.id; });
  $$('#categories a').forEach(a => a.classList.toggle('active', a.getAttribute('href') === '#' + active));
}, { passive: true });

chargerMenu()
  .then(m => {
    menu = m;
    try { panier = JSON.parse(sessionStorage.getItem(CLE_PANIER) || '[]').filter(l => platDe(l.id)); } catch (e) { panier = []; }
    rendreCarte();
  })
  .catch(() => {
    $('#carte').innerHTML = '<p class="vide">La carte en ligne n\'est pas encore publiée. Revenez bientôt !</p>';
  });
