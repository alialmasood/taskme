import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import * as admin from 'firebase-admin';

export async function POST(req: Request) {
  try {
    if (!db) {
      return NextResponse.json({ error: 'Database not initialized' }, { status: 500 });
    }

    const { toUserId, title, body } = await req.json();
    if (!toUserId || !title || !body) {
      return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 });
    }

    // جلب FCM Token من قاعدة بيانات المستخدمين
    const userDoc = await db.collection('users').doc(toUserId).get();
    const userData = userDoc.data();
    const fcmToken = userData?.fcmToken;
    if (!fcmToken) {
      return NextResponse.json({ error: 'لا يوجد FCM Token لهذا المستخدم' }, { status: 404 });
    }

    // إرسال إشعار FCM
    await admin.messaging().send({
      token: fcmToken,
      notification: {
        title,
        body
      },
      android: {
        priority: 'high',
        notification: {
          sound: 'default',
          defaultSound: true,
          defaultVibrateTimings: true,
          defaultLightSettings: true,
          visibility: 'public',
          channelId: 'high_importance_channel'
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

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error sending FCM:', error);
    return NextResponse.json({ error: 'فشل في إرسال الإشعار' }, { status: 500 });
  }
} 