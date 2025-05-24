'use client';

import { useState } from 'react';
import { getMessaging, getToken } from 'firebase/messaging';
import { firebaseApp } from '@/lib/firebase';

export default function TestNotification() {
  const [token, setToken] = useState<string>('');
  const [status, setStatus] = useState<string>('');

  const requestNotificationPermission = async () => {
    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        setStatus('تم منح الإذن بنجاح');
        const messaging = getMessaging(firebaseApp);
        const currentToken = await getToken(messaging, {
          vapidKey: 'BMksfZ9-rP5F7mwctyItXNVEcImcuCg6WxZxls1S9kNF4fU4-7-L5p18JY-ON9YoPB4W5uE3ewFEzBnjmyIrn28'
        });
        setToken(currentToken);
      } else {
        setStatus('تم رفض الإذن');
      }
    } catch (error) {
      setStatus('حدث خطأ: ' + error);
    }
  };

  const testNotification = async () => {
    try {
      const response = await fetch('/api/send-fcm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          toUserId: 'r2Do88OU7WMIQyvy1CeR0EJARaC2', // استخدم معرف المستخدم الخاص بك
          title: 'اختبار الإشعارات',
          body: 'هذا إشعار اختبار للتحقق من الصوت والاهتزاز'
        }),
      });
      
      if (response.ok) {
        setStatus('تم إرسال الإشعار بنجاح');
      } else {
        const error = await response.json();
        setStatus('فشل إرسال الإشعار: ' + error.error);
      }
    } catch (error) {
      setStatus('حدث خطأ: ' + error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-2xl font-bold mb-4 text-center">اختبار الإشعارات</h1>
        
        <div className="space-y-4">
          <button
            onClick={requestNotificationPermission}
            className="w-full bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600"
          >
            طلب إذن الإشعارات
          </button>

          <button
            onClick={testNotification}
            className="w-full bg-green-500 text-white py-2 px-4 rounded hover:bg-green-600"
          >
            إرسال إشعار تجريبي
          </button>

          {token && (
            <div className="mt-4 p-4 bg-gray-100 rounded">
              <p className="text-sm break-all">Token: {token}</p>
            </div>
          )}

          {status && (
            <div className="mt-4 p-4 bg-gray-100 rounded">
              <p className="text-sm">{status}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 