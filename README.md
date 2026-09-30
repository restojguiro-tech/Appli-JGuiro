# JGuiro — Application de gestion du restaurant

Application web simple, en français, pour gérer le restaurant au quotidien.
Aucune installation n'est nécessaire : ouvrez `index.html` dans un navigateur (Chrome, Firefox, Edge, Safari), sur ordinateur ou tablette.

## Fonctionnalités

| Module | Ce qu'il permet |
|---|---|
| **Tableau de bord** | Chiffre d'affaires du jour, tables occupées, réservations du jour, alertes de stock |
| **Commandes** | Plan de salle, prise de commande par table, impression de l'addition (HT / TVA / TTC, en dirhams), encaissement (CB, espèces, ticket restaurant, chèque) |
| **Carte** | Ajout, modification et suppression des plats par catégorie, avec un statut « épuisé », plusieurs prix possibles par plat (ex. : Sole 100, 120, 130, 140 DH selon la taille du poisson, avec une précision facultative comme « 500 g ») et des variantes (cuisson, garniture…) avec supplément facultatif |
| **Réservations** | Nom, téléphone, date, heure, couverts, table et notes (allergies…), avec des filtres |
| **Stock** | Quantités, unités, seuils d'alerte, boutons +/− rapides |
| **Achats** | Fournisseurs, factures d'achat (produits, quantités, prix, TVA, payé / à payer), ajout automatique des quantités au stock, dernier prix d'achat et valeur du stock ; histogrammes par mois ou par année : total acheté par produit (montant, quantité, prix moyen), achats par mois et par fournisseur |
| **Ventes** | CA TTC/HT, ticket moyen, graphique par jour, meilleures ventes, répartition par moyen de paiement |
| **Factures** | Factures clients numérotées (F-2026-0001…) à partir d'un ticket encaissé ou en facture libre (traiteur, événement), avec ICE/IF/RC du restaurant, ICE du client, TVA et montant en toutes lettres ; impression et modification |
| **Comptabilité** | Par mois ou par année : recettes, dépenses, solde, résultat HT, estimation de la TVA à payer, dépenses courantes (loyer, salaires, électricité…), histogrammes (recettes et dépenses par mois, solde par mois, dépenses et recettes par catégorie), journal et export Excel (CSV) pour le comptable |
| **Paramètres** | Nom du restaurant, taux de TVA, adresse et mentions légales (ICE, IF, RC, patente, CNSS), export/import de sauvegarde, réinitialisation |

## Données

Les données sont enregistrées **dans le navigateur** (localStorage) de l'appareil utilisé.
- Pensez à **exporter une sauvegarde** régulièrement (Paramètres → Exporter).
- Pour passer sur un autre appareil : exportez le fichier, puis importez-le sur le nouvel appareil.
- Une carte, des tables et un stock d'exemple sont fournis au premier lancement. Modifiez-les ou supprimez-les selon vos besoins.

## Fichiers

- `index.html` : structure de la page
- `styles.css` : apparence
- `app.js` : logique de l'application
