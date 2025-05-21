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
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
          },
        },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error sending FCM:', error);
    return NextResponse.json({ error: 'فشل في إرسال الإشعار' }, { status: 500 });
  }
} 