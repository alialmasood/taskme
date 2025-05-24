/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

import {onRequest} from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

admin.initializeApp();

export const sendTaskReminders = functions.pubsub.schedule('every 1 minutes').onRun(async (context) => {
  const now = Date.now();
  const db = admin.firestore();

  // جلب جميع المهام غير المكتملة
  const tasksSnapshot = await db.collection('tasks')
    .where('completed', '==', false)
    .get();

  for (const doc of tasksSnapshot.docs) {
    const task = doc.data();
    const taskTime = new Date(task.dateTime).getTime();
    const reminderMinutes = task.reminder || 0;
    const reminderTime = taskTime - reminderMinutes * 60 * 1000;

    // إذا حان وقت التذكير (خلال الدقيقة الحالية)
    if (reminderTime <= now && reminderTime + 60000 > now && !task.reminderSent) {
      // جلب FCM Token للمستخدم
      const userDoc = await db.collection('users').doc(task.userId).get();
      const userData = userDoc.data();
      const fcmToken = userData?.fcmToken;

      if (fcmToken) {
        // إرسال إشعار FCM
        await admin.messaging().send({
          token: fcmToken,
          notification: {
            title: 'تذكير بالمهمة',
            body: `اقترب موعد المهمة: ${task.title}`,
          },
          android: {
            priority: 'high',
            notification: {
              sound: 'default',
              defaultSound: true,
              defaultVibrateTimings: true,
              visibility: 'public',
              importance: 'high',
            }
          },
          apns: {
            payload: {
              aps: {
                sound: 'default',
                badge: 1,
                contentAvailable: true
              }
            },
            headers: {
              'apns-priority': '10'
            }
          },
          webpush: {
            headers: {
              Urgency: 'high'
            },
            notification: {
              requireInteraction: true,
              vibrate: [200, 100, 200]
            }
          }
        });

        // تحديث المهمة لمنع تكرار التذكير
        await doc.ref.update({ reminderSent: true });
      }
    }
  }

  return null;
});