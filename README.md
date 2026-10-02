# JGuiro — Application de gestion du restaurant

Application web simple, en français, pour gérer le restaurant au quotidien.
Aucune installation n'est nécessaire.

- **Carte pour les clients** : page d'accueil du site (`index.html`).
- **Application de gestion** : dossier `gestion/` (`gestion/index.html`), à ouvrir sur ordinateur ou tablette.

## Fonctionnalités

| Module | Ce qu'il permet |
|---|---|
| **Tableau de bord** | Chiffre d'affaires du jour, tables occupées, réservations du jour, alertes de stock |
| **Commandes** | Trois modes : sur place (plan de salle, commande par table), à emporter et livraison (nom, téléphone, adresse, frais de livraison facultatifs) ; impression de l'addition (HT / TVA / TTC, en dirhams), encaissement (CB, espèces, ticket restaurant, chèque) |
| **Carte** | Ajout, modification et suppression des plats par catégorie, avec un statut « épuisé », plusieurs prix possibles par plat (ex. : Sole 100, 120, 130, 140 DH selon la taille du poisson, avec une précision facultative comme « 500 g ») et des variantes (cuisson, garniture…) avec supplément facultatif |
| **Réservations** | Nom, téléphone, date, heure, couverts, table et notes (allergies…), avec des filtres |
| **Stock** | Quantités, unités, seuils d'alerte, boutons +/− rapides |
| **Achats** | Fournisseurs, factures d'achat (produits, quantités, prix, TVA, payé / à payer), ajout automatique des quantités au stock, dernier prix d'achat et valeur du stock ; histogrammes par mois ou par année : total acheté par produit (montant, quantité, prix moyen), achats par mois et par fournisseur |
| **Ventes** | CA TTC/HT, ticket moyen, graphique par jour, meilleures ventes, répartition par moyen de paiement et par mode de service |
| **Factures** | Factures clients numérotées (F-2026-0001…) à partir d'un ticket encaissé ou en facture libre (traiteur, événement), avec ICE/IF/RC du restaurant, ICE du client, TVA et montant en toutes lettres ; impression et modification |
| **Menu en ligne** | Carte publique pour les clients (page d'accueil du site) : panier, choix sur place / à emporter / livraison, choix du paiement (espèces ou carte sur terminal à table, au retrait ou à la livraison, carte bancaire en ligne via le lien de paiement de votre prestataire), envoi de la commande par WhatsApp ; QR code à imprimer pour les tables ; import du message WhatsApp dans les commandes en un clic |
| **Comptabilité** | Par mois ou par année : recettes, dépenses, solde, résultat HT, estimation de la TVA à payer, dépenses courantes (loyer, salaires, électricité…), histogrammes (recettes et dépenses par mois, solde par mois, dépenses et recettes par catégorie), journal et export Excel (CSV) pour le comptable |
| **Paramètres** | Nom du restaurant, taux de TVA, adresse et mentions légales (ICE, IF, RC, patente, CNSS), export/import de sauvegarde, réinitialisation |

## Adresses

- Carte pour les clients : https://jguiro.com/
- Application de gestion : https://jguiro.com/gestion/

Le fichier `CNAME` relie le site GitHub Pages au domaine jguiro.com (zone DNS chez OVH : 4 entrées A vers 185.199.108-111.153 et `www` en CNAME vers restojguiro-tech.github.io).

## Données

Les données sont enregistrées **dans le navigateur** (localStorage) de l'appareil utilisé.
- Pensez à **exporter une sauvegarde** régulièrement (Paramètres → Exporter).
- Pour passer sur un autre appareil : exportez le fichier, puis importez-le sur le nouvel appareil.
- Une carte, des tables et un stock d'exemple sont fournis au premier lancement. Modifiez-les ou supprimez-les selon vos besoins.

## Fichiers

- `index.html`, `menu.js`, `menu.css` : carte en ligne pour les clients (`menu.html` redirige vers la page d'accueil)
- `menu.json` : carte publiée (générée depuis l'application)
- `menu-commun.js` : code partagé entre la carte et l'application
- `gestion/` : application de gestion (`index.html`, `styles.css`, `app.js`)

## Carte en ligne pour les clients

1. Dans **Menu en ligne**, indiquez le numéro WhatsApp du restaurant et enregistrez.
2. Cliquez sur **Télécharger le fichier menu.json**, puis sur **Ouvrir GitHub** et déposez ce fichier dans le dépôt (bouton *Commit changes*).
3. La carte est alors visible sur la page d'accueil du site (l'application de gestion est dans `gestion/`). Partagez le lien ou imprimez le QR code.
4. Quand un client envoie sa commande par WhatsApp, copiez son message et collez-le dans **Importer une commande WhatsApp** : la commande est créée automatiquement.

À refaire (étape 2) après chaque modification de la carte.

### Apparence de la carte (vitrine)

La page d'accueil se présente comme un site de commande : en-tête avec Livraison / À emporter / Sur place et panier,
grandes bannières qui défilent, rubrique « Explorer le menu » (une vignette par catégorie), « Meilleures offres », puis toute la carte en fiches avec photos.

- **Menu en ligne → Apparence** : couleur principale, logo, bannières (image, titre, texte, catégorie visée) et photos des catégories.
- **Carte → Modifier** un plat : photo, description courte, case « ⭐ À la une » (rubrique « Meilleures offres » ; sans plat coché, les plus vendus des 60 derniers jours sont affichés).
- Les photos sont réduites automatiquement, gardées dans le navigateur (IndexedDB) et, avec la synchronisation, publiées dans des documents séparés `publics/jguiro__photo__…` (lisibles par tous, comme la carte). Elles sont incluses dans l'export de sauvegarde et dans le fichier `menu.json`.

`vendor/qrcode.js` : QR Code Generator for JavaScript, © 2009 Kazuhiko Arase, licence MIT.

## Synchronisation entre appareils (Firebase)

Le fichier `gestion/sync.js` partage les données en temps réel entre tous les appareils connectés au compte du restaurant. Il publie aussi automatiquement la carte en ligne, sans passer par `menu.json`. Chaque appareil garde une copie locale, ce qui lui permet de fonctionner hors ligne.

Mise en place (une seule fois) :
1. Sur https://console.firebase.google.com, créez un projet (par exemple « jguiro »), sans Google Analytics.
2. **Authentication → Commencer → E-mail/Mot de passe → Activer**. Ensuite, dans l'onglet **Utilisateurs**, ajoutez le compte `restojguiro@gmail.com` avec un mot de passe.
3. **Firestore Database → Créer une base de données**, emplacement `eur3 (europe-west)`, en mode production. Dans l'onglet **Règles**, collez le contenu de `firestore.rules` puis cliquez sur **Publier**.
4. **Paramètres du projet → Vos applications → Web (</>)** : enregistrez l'application, puis copiez `apiKey`, `authDomain`, `projectId` et `appId` dans `firebase-config.js`.
5. Sur chaque appareil, allez dans **jguiro.com/gestion/ → Paramètres → Synchronisation**, puis connectez-vous. Commencez par le PC qui contient les vraies données.
