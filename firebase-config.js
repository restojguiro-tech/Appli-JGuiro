// Configuration de la synchronisation entre appareils (Firebase).
// Tant que « firebase » vaut null, l'application fonctionne sans synchronisation.
// Ces valeurs ne sont pas secrètes : l'accès aux données est protégé par le compte et les règles de sécurité (firestore.rules).
window.JGUIRO_SYNC = {
  restaurantId: 'jguiro',
  firebase: {
    apiKey: 'AIzaSyApgbc2V4fdGTHVqWVBS5eeRzLkPHvg-3g',
    authDomain: 'jguiro-1678f.firebaseapp.com',
    projectId: 'jguiro-1678f',
    storageBucket: 'jguiro-1678f.firebasestorage.app',
    messagingSenderId: '540001058834',
    appId: '1:540001058834:web:2431a05c6ab44391d3d8cb',
  },
};
