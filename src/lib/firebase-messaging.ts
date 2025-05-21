// src/lib/firebase-messaging.ts
import { getMessaging, getToken, onMessage, isSupported } from 'firebase/messaging';
import { firebaseApp } from './firebase';

let messaging: ReturnType<typeof getMessaging> | null = null;

// دالة لجلب FCM Token
export const requestForToken = async () => {
  // تحقق من دعم المتصفح
  const supported = await isSupported();
  if (!supported) {
    console.warn('المتصفح لا يدعم إشعارات FCM');
    return null;
  }
  if (!messaging) {
    messaging = getMessaging(firebaseApp);
  }
  try {
    const currentToken = await getToken(messaging, {
      vapidKey: 'BMksfZ9-rP5F7mwctyItXNVEcImuCg6WxZxIs1S9kNF4fU4-7-L5p18JY-ON9YoPB4W5uE3ewFEzBJnjmylrn28' // استبدلها بمفتاحك
    });
    if (currentToken) {
      console.log('FCM Token:', currentToken);
      return currentToken;
    } else {
      console.log('لم يتم الحصول على FCM token. يجب السماح بالإشعارات.');
      return null;
    }
  } catch (err) {
    console.error('فشل في جلب FCM token:', err);
    return null;
  }
};

// دالة للاستماع للإشعارات أثناء عمل التطبيق (Foreground)
export const onMessageListener = async () => {
  const supported = await isSupported();
  if (!supported) return;
  if (!messaging) {
    messaging = getMessaging(firebaseApp);
  }
  return new Promise((resolve) => {
    onMessage(messaging!, (payload) => {
      resolve(payload);
    });
  });
};

export const checkFcmSupport = async () => {
  return await isSupported();
};