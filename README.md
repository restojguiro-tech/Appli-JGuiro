# JGuiro — Application de gestion du restaurant

Application web simple, en français, pour gérer le restaurant au quotidien.
Aucune installation n'est nécessaire : ouvrez `index.html` dans un navigateur (Chrome, Firefox, Edge, Safari), sur ordinateur ou tablette.

## Fonctionnalités

| Module | Ce qu'il permet |
|---|---|
| **Tableau de bord** | Chiffre d'affaires du jour, tables occupées, réservations du jour, alertes de stock |
| **Commandes** | Plan de salle, prise de commande par table, impression de l'addition (HT / TVA / TTC), encaissement (CB, espèces, ticket restaurant, chèque) |
| **Carte** | Ajout, modification et suppression des plats par catégorie, avec un statut « épuisé » |
| **Réservations** | Nom, téléphone, date, heure, couverts, table et notes (allergies…), avec des filtres |
| **Stock** | Quantités, unités, seuils d'alerte, boutons +/− rapides |
| **Ventes** | CA TTC/HT, ticket moyen, graphique par jour, meilleures ventes, répartition par moyen de paiement |
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
