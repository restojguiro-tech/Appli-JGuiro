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
  const nomT = t ? [t.groupe, t.nom].filter(Boolean).join(' ') : '';
  return p.nom + (t ? (nomT ? ` — ${nomT}${t.nom ? '' : ' ' + dh(t.prix)}` : ` ${dh(t.prix)}`) : '') + (v ? ` (${v.nom})` : '');
}

const totalPanier = () => panier.reduce((s, l) => s + prixLigne(l) * l.qte, 0);

function sauverPanier() {
  try { sessionStorage.setItem(CLE_PANIER, JSON.stringify(panier)); } catch (e) { /* navigation privée */ }
}

/* ---------- Photos ---------- */

const photos = new Map(); // id → image

// Icône de remplacement selon le nom de la catégorie ou du plat
function icone(texte) {
  const t = String(texte || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const regles = [
    [/poulet|chicken|aile|choukouya|braise/, '🍗'], [/poisson|sole|saumon|tilapia|capitaine|thon/, '🐟'],
    [/crevette|fruits? de mer|calamar/, '🦐'], [/boeuf|viande|entrecote|steak|mouton|agneau|brochette/, '🥩'],
    [/burger/, '🍔'], [/pizza/, '🍕'], [/frite|alloco|banane|plantain/, '🍟'], [/attieke|riz|garba|foutou|placali|sauce|plat/, '🍛'],
    [/salade|entree/, '🥗'], [/soupe/, '🍲'], [/supplement|accompagnement/, '🥔'], [/jus|bissap|gingembre/, '🧃'],
    [/cafe|the\b/, '☕'], [/vin|biere|cocktail/, '🍹'], [/boisson|eau|soda|coca/, '🥤'],
    [/dessert|gateau|creme|fondant|glace|patisserie/, '🍰'], [/sandwich|wrap|chawarma|tacos/, '🌯'],
  ];
  return (regles.find(([re]) => re.test(t)) || [, '🍽️'])[1];
}

// Image (remplie dès que la photo est chargée) ou visuel de remplacement
function visuel(idPhoto, texte, clair = false) {
  const src = idPhoto && photos.get(idPhoto);
  if (src) return `<img src="${src}" alt="" loading="lazy">`;
  return `<div class="sans-photo ${clair ? 'clair' : ''}" ${idPhoto ? `data-photo="${esc(idPhoto)}"` : ''} aria-hidden="true">${icone(texte)}</div>`;
}

async function chargerPhotos() {
  const ids = [...new Set([
    menu.logo, ...menu.bannieres.map(b => b.photo), ...Object.values(menu.photosCategories), ...menu.plats.map(p => p.photo),
  ].filter(Boolean))].filter(id => !photos.has(id));
  if (!ids.length) return;
  if (menu.photos) Object.entries(menu.photos).forEach(([id, data]) => photos.set(id, data)); // fichier menu.json
  if (new URLSearchParams(location.search).has('apercu')) (await PhotosLocales.tout()).forEach((v, k) => photos.set(k, v));
  const manquantes = ids.filter(id => !photos.has(id));
  for (let i = 0; i < manquantes.length; i += 100) {
    try { (await photosEnLigne(manquantes.slice(i, i + 100))).forEach((v, k) => photos.set(k, v)); } catch (e) { /* hors ligne */ }
  }
  rendreTout();
}

/* ---------- Affichage ---------- */

let modeActif = null;
const CLE_MODE = 'jguiro-mode';
const ICONES_MODES = { livraison: '🛵', emporter: '🛍️', sur_place: '🍽️' };
const ORDRE_MODES = ['livraison', 'emporter', 'sur_place'];

const ancre = c => 'cat-' + menu.categories.indexOf(c);
const taillesDispo = p => p.tailles.filter(t => t.disponible !== false);
const visible = p => p && !(p.tailles.length && !taillesDispo(p).length); // tout le plat épuisé → caché

function prixAffiche(p) {
  const ts = taillesDispo(p);
  if (!ts.length) return dh(p.prix);
  return `${ts.length > 1 ? '<small>dès </small>' : ''}${dh(Math.min(...ts.map(t => t.prix)))}`;
}

function detailPlat(p) {
  if (p.description) return p.description;
  const ts = taillesDispo(p);
  const groupes = [...new Set(ts.map(t => t.groupe).filter(Boolean))];
  return [
    groupes.length ? groupes.join(' · ') : ts.some(t => t.nom) ? ts.map(t => t.nom).filter(Boolean).join(' · ') : '',
    p.variantes.filter(v => v.disponible !== false).map(v => v.nom).join(' · '),
  ].filter(Boolean).join(' — ');
}

function ficheProduit(p) {
  const qte = panier.filter(l => l.id === p.id).reduce((s, l) => s + l.qte, 0);
  const detail = detailPlat(p);
  return `
    <article class="produit" data-ajouter="${esc(p.id)}">
      <div class="visuel">${visuel(p.photo, p.nom + ' ' + p.categorie, true)}</div>
      ${qte ? `<span class="dans-panier">✓ ${qte} dans le panier</span>` : ''}
      <div class="corps">
        <div class="nom">${esc(p.nom)}</div>
        ${detail ? `<div class="detail">${esc(detail)}</div>` : ''}
        <div class="bas">
          <span class="prix">${prixAffiche(p)}</span>
          <button class="ajouter" aria-label="Ajouter ${esc(p.nom)}">+</button>
        </div>
      </div>
    </article>`;
}

function rendreEntete() {
  const r = menu.restaurant;
  document.title = `${r.nom || 'Notre carte'} — Commander en ligne`;
  $('#logo').innerHTML = menu.logo && photos.get(menu.logo)
    ? `<img src="${photos.get(menu.logo)}" alt="${esc(r.nom)}">`
    : `<span id="nom-resto">${esc(r.nom || 'Notre carte')}</span>`;
  const modes = ORDRE_MODES.filter(m => menu.modes.includes(m));
  if (!modes.includes(modeActif)) modeActif = modes[0];
  $('#modes').innerHTML = modes.map(m => `
    <button class="mode" role="radio" aria-checked="${m === modeActif}" data-mode="${m}">
      <span class="ic" aria-hidden="true">${ICONES_MODES[m]}</span>${esc(MENU_MODES[m])}</button>`).join('');
  const tel = $('#haut-tel');
  tel.hidden = !r.telephone;
  if (r.telephone) {
    tel.href = 'tel:' + r.telephone.replace(/[^\d+]/g, '');
    tel.innerHTML = `Une question ? Appelez-nous<strong>📞 ${esc(r.telephone)}</strong>`;
  }
  $('#pied-nom').textContent = r.nom || '';
  $('#infos-resto').textContent = [r.adresse, r.telephone && `📞 ${r.telephone}`].filter(Boolean).join(' · ');
  $('#accueil').textContent = menu.accueil || '';
  $('#tiroir-liens').innerHTML = `
    <a href="#" data-fermer-tiroir>🏠 Accueil</a>
    <p class="sep">La carte</p>
    ${menu.categories.map(c => `<a href="#${ancre(c)}" data-fermer-tiroir>${icone(c)} ${esc(c)}</a>`).join('')}
    <p class="sep">Contact</p>
    ${r.telephone ? `<a href="tel:${esc(r.telephone.replace(/[^\d+]/g, ''))}">📞 Appeler le restaurant</a>` : ''}
    ${menu.whatsapp ? `<a href="https://wa.me/${esc(menu.whatsapp)}" target="_blank" rel="noopener">💬 WhatsApp</a>` : ''}
    ${r.adresse ? `<a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(r.adresse)}" target="_blank" rel="noopener">📍 ${esc(r.adresse)}</a>` : ''}`;
}

let diapoActive = 0;
function rendreBandeau() {
  const r = menu.restaurant;
  const diapos = menu.bannieres.length ? menu.bannieres : [{ titre: r.nom || 'Notre carte', texte: menu.accueil || 'Commandez en ligne, on s’occupe du reste.' }];
  $('#hero-piste').innerHTML = diapos.map((b, i) => {
    const src = b.photo && photos.get(b.photo);
    const cible = b.categorie ? '#' + ancre(b.categorie) : '#carte';
    return `
      <div class="diapo ${src ? 'avec-photo' : ''} ${src && !b.titre && !b.texte ? 'seule-photo' : ''}" role="group" aria-label="${i + 1} sur ${diapos.length}">
        ${src ? `<img src="${src}" alt="${esc(b.titre)}">` : ''}
        <div class="texte">
          ${b.titre ? `<h2>${esc(b.titre)}</h2>` : ''}
          ${b.texte ? `<p>${esc(b.texte)}</p>` : ''}
          <a class="cta" href="${cible}">Commander maintenant</a>
        </div>
      </div>`;
  }).join('');
  const plusieurs = diapos.length > 1;
  $('#hero-points').innerHTML = plusieurs ? diapos.map((_, i) => `<button data-diapo="${i}" aria-label="Image ${i + 1}"></button>`).join('') : '';
  $$('.hero-fleche').forEach(b => { b.hidden = !plusieurs; });
  diapoActive = Math.min(diapoActive, diapos.length - 1);
  majPoints();
}

function allerDiapo(i) {
  const piste = $('#hero-piste');
  const n = piste.children.length;
  if (!n) return;
  diapoActive = (i + n) % n;
  piste.scrollTo({ left: diapoActive * piste.clientWidth, behavior: 'smooth' });
  majPoints();
}
function majPoints() {
  $$('#hero-points button').forEach((b, i) => b.setAttribute('aria-current', String(i === diapoActive)));
}

function rendreRails() {
  $('#rail-categories').innerHTML = menu.categories.map(c => `
    <a class="tuile-cat" href="#${ancre(c)}">
      ${visuel(menu.photosCategories[c], c)}
      <span>${esc(c)}</span>
    </a>`).join('');
  const vedettes = menu.vedettes.map(platDe).filter(visible);
  $('#bloc-vedettes').hidden = !vedettes.length;
  $('#titre-vedettes').innerHTML = `${menu.vedettesAuto ? 'Les plus commandés' : 'Meilleures offres'} <span aria-hidden="true">✨</span>`;
  $('#rail-vedettes').innerHTML = vedettes.map(ficheProduit).join('');
  majFlechesRails();
}

function majFlechesRails() {
  $$('.rail').forEach(rail => {
    const [g, d] = $$('.rail-fleche', rail.parentElement);
    g.disabled = rail.scrollLeft <= 4;
    d.disabled = rail.scrollLeft + rail.clientWidth >= rail.scrollWidth - 4;
  });
}

function rendreCarte() {
  $('#categories').innerHTML = menu.categories.map(c => `<a href="#${ancre(c)}">${esc(c)}</a>`).join('');
  if (!menu.plats.length) {
    $('#carte').innerHTML = '<p class="vide">La carte est momentanément indisponible.</p>';
    return;
  }
  $('#carte').innerHTML = menu.categories.map(c => {
    const plats = menu.plats.filter(p => p.categorie === c && visible(p));
    return plats.length ? `<h2 id="${ancre(c)}">${esc(c)}</h2><div class="grille">${plats.map(ficheProduit).join('')}</div>` : '';
  }).join('');
  majBarre();
}

function rendreTout() {
  rendreEntete();
  rendreBandeau();
  rendreRails();
  rendreCarte();
}

function appliquerCouleur(c) {
  if (!/^#[0-9a-f]{6}$/i.test(c || '')) return;
  const r = document.documentElement.style;
  r.setProperty('--accent', c);
  r.setProperty('--accent-fonce', `color-mix(in srgb, ${c} 78%, #000)`);
  r.setProperty('--accent-pale', `color-mix(in srgb, ${c} 9%, #fff)`);
  document.querySelector('meta[name=theme-color]')?.setAttribute('content', '#ffffff');
}

function majBarre() {
  const nb = panier.reduce((s, l) => s + l.qte, 0);
  $('#barre-panier').hidden = nb === 0;
  $('#nb-articles').textContent = nb;
  $('#total-barre').textContent = dh(totalPanier());
  $('#pastille').textContent = nb;
}

/* ---------- Ajout au panier (avec choix du prix / de la variante) ---------- */

function ajouter(id, ti = -1, vi = -1) {
  const l = panier.find(x => x.id === id && x.ti === ti && x.vi === vi);
  if (l) l.qte++;
  else panier.push({ id, ti, vi, qte: 1 });
  sauverPanier();
  rendreRails();
  rendreCarte();
}

function choisirOptions(p) {
  // Numéros des options encore disponibles (les épuisées ne sont pas proposées)
  const variantesDispo = p.variantes.map((v, i) => (v.disponible === false ? -1 : i)).filter(i => i >= 0);
  const taillesDispo = p.tailles.map((t, i) => ({ t, i })).filter(x => x.t.disponible !== false);
  if (!taillesDispo.length && !variantesDispo.length) return ajouter(p.id);
  // Sous-menus (ex. Poulet → Frit, Sauté…) : on choisit d'abord le sous-menu, puis la portion
  const groupes = [...new Set(taillesDispo.map(x => x.t.groupe || ''))];
  const avecGroupes = groupes.some(Boolean);
  $('#options-titre').textContent = p.nom;
  $('#options-corps').innerHTML = `
    ${p.photo && photos.get(p.photo) ? `<div class="options-photo"><img src="${photos.get(p.photo)}" alt=""></div>` : ''}
    ${p.description ? `<p class="options-desc">${esc(p.description)}</p>` : ''}
    ${avecGroupes && groupes.length > 1 ? `
      <div class="groupe-titre">Choisissez</div>
      <div class="options-liste">
        ${groupes.map((g, k) => {
          const prix = taillesDispo.filter(x => (x.t.groupe || '') === g).map(x => x.t.prix);
          return `<label class="option"><input type="radio" name="gi" value="${esc(g)}" ${k === 0 ? 'checked' : ''}>
            <span>${esc(g || p.nom)}</span><span>${prix.length > 1 ? 'dès ' : ''}${dh(Math.min(...prix))}</span></label>`;
        }).join('')}
      </div>` : ''}
    <div id="zone-tailles"></div>
    ${variantesDispo.length ? `
      <div class="groupe-titre">Choisissez une option</div>
      <div class="options-liste">
        ${p.variantes.map((v, i) => v.disponible === false ? '' : `
          <label class="option"><input type="radio" name="vi" value="${i}" ${i === variantesDispo[0] ? 'checked' : ''}>
            <span>${esc(v.nom)}</span><span>${v.supplement ? '+ ' + dh(v.supplement) : ''}</span></label>`).join('')}
      </div>` : ''}`;
  const rendreTailles = () => {
    const g = avecGroupes ? ($('input[name=gi]:checked')?.value ?? groupes[0]) : null;
    const liste = g == null ? taillesDispo : taillesDispo.filter(x => (x.t.groupe || '') === g);
    $('#zone-tailles').innerHTML = liste.length > 1 ? `
      <div class="groupe-titre">Choisissez ${liste.some(x => x.t.nom) ? 'la portion' : 'le prix'}${g ? ` — ${esc(g)}` : ''}</div>
      <div class="options-liste">
        ${liste.map(({ t, i }, k) => `
          <label class="option"><input type="radio" name="ti" value="${i}" ${k === 0 ? 'checked' : ''}>
            <span>${esc(t.nom || dh(t.prix))}</span><span>${dh(t.prix)}</span></label>`).join('')}
      </div>` : liste.length ? `<input type="hidden" name="ti" value="${liste[0].i}">` : '';
  };
  rendreTailles();
  $$('input[name=gi]').forEach(r => r.addEventListener('change', rendreTailles));
  const dlg = $('#options');
  dlg.returnValue = '';
  dlg.showModal();
  dlg.onclose = () => {
    if (dlg.returnValue !== 'ok') return;
    const champ = $('input[name=ti]:checked', dlg) || $('input[name=ti][type=hidden]', dlg);
    const ti = taillesDispo.length ? Number(champ?.value ?? taillesDispo[0].i) : -1;
    const vi = variantesDispo.length ? Number($('input[name=vi]:checked', dlg)?.value ?? variantesDispo[0]) : -1;
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
  if (!panier.length) return document.getElementById('carte').scrollIntoView();
  $('#choix-modes').innerHTML = menu.modes.map((m, i) => `
    <label><input type="radio" name="mode" value="${m}" ${(menu.modes.includes(modeActif) ? m === modeActif : i === 0) ? 'checked' : ''}><span>${MENU_MODES[m]}</span></label>`).join('');
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
  const viderPanier = () => { panier = []; sauverPanier(); rendreRails(); rendreCarte(); };
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
    rendreRails();
    rendreCarte();
    if (!panier.length) return $('#panier').close();
    rendrePanier();
  }
  if (e.target.closest('[data-fermer]')) $('#panier').close();
});
$('#barre-panier').addEventListener('click', ouvrirPanier);
$('#btn-panier').addEventListener('click', ouvrirPanier);
$('#choix-modes').addEventListener('change', () => {
  modeActif = modeChoisi();
  try { sessionStorage.setItem(CLE_MODE, modeActif); } catch (e) { /* ignoré */ }
  rendreEntete();
  rendreChampsClient(); rendrePaiements(); rendrePanier();
});

// Livraison / À emporter / Sur place en haut de la page
$('#modes').addEventListener('click', e => {
  const b = e.target.closest('[data-mode]');
  if (!b) return;
  modeActif = b.dataset.mode;
  try { sessionStorage.setItem(CLE_MODE, modeActif); } catch (err) { /* ignoré */ }
  rendreEntete();
});

// Menu latéral
$('#ouvrir-tiroir').addEventListener('click', () => $('#tiroir').showModal());
$('#tiroir').addEventListener('click', e => {
  if (e.target === e.currentTarget || e.target.closest('[data-fermer-tiroir]')) $('#tiroir').close();
});
$('#logo').addEventListener('click', e => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); });

// Bandeau : points, flèches, défilement automatique
let minuteurDiapo = null;
function relancerDiapos() {
  clearInterval(minuteurDiapo);
  minuteurDiapo = setInterval(() => { if (!document.hidden) allerDiapo(diapoActive + 1); }, 6000);
}
document.addEventListener('click', e => {
  const p = e.target.closest('[data-diapo]');
  const f = e.target.closest('[data-hero]');
  if (p) { allerDiapo(Number(p.dataset.diapo)); relancerDiapos(); }
  if (f) { allerDiapo(diapoActive + Number(f.dataset.hero)); relancerDiapos(); }
  const r = e.target.closest('[data-rail]');
  if (r) {
    const rail = document.getElementById(r.dataset.rail);
    rail.scrollBy({ left: Number(r.dataset.sens) * rail.clientWidth * 0.8, behavior: 'smooth' });
  }
});
$('#hero-piste').addEventListener('scroll', () => {
  const piste = $('#hero-piste');
  const i = Math.round(piste.scrollLeft / Math.max(1, piste.clientWidth));
  if (i !== diapoActive) { diapoActive = i; majPoints(); }
}, { passive: true });
$('#hero-piste').addEventListener('pointerdown', relancerDiapos);
$$('.rail').forEach(r => r.addEventListener('scroll', majFlechesRails, { passive: true }));
window.addEventListener('resize', majFlechesRails);
document.addEventListener('click', e => { if (e.target.closest('[data-fermer-conf]')) $('#confirmation').close(); });
$('#form-panier').addEventListener('submit', envoyer);

// Catégorie active pendant le défilement
window.addEventListener('scroll', () => {
  let active = null;
  $$('main h2').forEach(h => { if (h.getBoundingClientRect().top < 200) active = h.id; });
  $$('#categories a').forEach(a => a.classList.toggle('active', a.getAttribute('href') === '#' + active));
}, { passive: true });

chargerMenu()
  .then(m => {
    menu = m;
    menu.categories = trierCategories(menu.categories || []);
    menu.bannieres = menu.bannieres || [];
    menu.photosCategories = menu.photosCategories || {};
    menu.vedettes = menu.vedettes || [];
    appliquerCouleur(menu.couleur);
    try { panier = JSON.parse(sessionStorage.getItem(CLE_PANIER) || '[]').filter(l => platDe(l.id)); } catch (e) { panier = []; }
    try { modeActif = sessionStorage.getItem(CLE_MODE); } catch (e) { /* ignoré */ }
    rendreTout();
    relancerDiapos();
    chargerPhotos();
  })
  .catch(() => {
    $('#carte').innerHTML = '<p class="vide">La carte en ligne n\'est pas encore publiée. Revenez bientôt !</p>';
  });
