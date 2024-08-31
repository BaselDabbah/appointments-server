// firebase.js
const admin = require('firebase-admin');
const serviceAccount = require('./config/serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: 'appointment-managment.appspot.com'
});

// Firestore database reference
const db = admin.firestore();

// Firebase Storage reference
const bucket = admin.storage().bucket();

module.exports = { db, bucket };