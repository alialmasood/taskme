// public/firebase-messaging-sw.js
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyDCAbxKgru2hHOAT_SzSPHGSvSg7_WonLY",
  authDomain: "taskme-844c1.firebaseapp.com",
  projectId: "taskme-844c1",
  messagingSenderId: "261297719192",
  appId: "1:261297719192:web:5e749c448e34862c068ded"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage(function(payload) {
  self.registration.showNotification(payload.notification.title, {
    body: payload.notification.body,
    icon: '/icon-192x192.png'
  });
});