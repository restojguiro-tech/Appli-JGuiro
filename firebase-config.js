// Configuration de la synchronisation entre appareils (Firebase).
// Tant que « firebase » vaut null, l'application fonctionne sans synchronisation.
// Les valeurs se trouvent dans la console Firebase : Paramètres du projet → Vos applications → Configuration.
// Elles ne sont pas secrètes : l'accès aux données est protégé par le compte et les règles de sécurité.
window.JGUIRO_SYNC = {
  restaurantId: 'jguiro',
  firebase: null,
  // Exemple :
  // firebase: {
  //   apiKey: 'AIza…',
  //   authDomain: 'jguiro-xxxx.firebaseapp.com',
  //   projectId: 'jguiro-xxxx',
  //   appId: '1:…:web:…',
  // },
};
