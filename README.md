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
| **Achats** | Fournisseurs, factures d'achat (produits, quantités, prix, TVA, payé / à payer), ajout automatique des quantités au stock, dernier prix d'achat et valeur du stock |
| **Ventes** | CA TTC/HT, ticket moyen, graphique par jour, meilleures ventes, répartition par moyen de paiement |
| **Comptabilité** | Par mois ou par année : recettes, dépenses, solde, résultat HT, estimation de la TVA à payer, dépenses courantes (loyer, salaires, électricité…), journal et export Excel (CSV) pour le comptable |
| **Paramètres** | Nom du restaurant, taux de TVA, export/import de sauvegarde, réinitialisation |

## Données

Les données sont enregistrées **dans le navigateur** (localStorage) de l'appareil utilisé.
- Pensez à **exporter une sauvegarde** régulièrement (Paramètres → Exporter).
- Pour passer sur un autre appareil : exportez le fichier, puis importez-le sur le nouvel appareil.
- Une carte, des tables et un stock d'exemple sont fournis au premier lancement. Modifiez-les ou supprimez-les selon vos besoins.

## Fichiers

- `index.html` : structure de la page
- `styles.css` : apparence
- `app.js` : logique de l'application
