'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useAuth } from '@/components/AuthProvider';
import { ArrowRightOnRectangleIcon } from '@heroicons/react/24/outline';
import { collection, query, where, orderBy, onSnapshot, updateDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { motion } from 'framer-motion';

const Header = () => {
  const router = useRouter();
  const { user } = useAuth();
  const [dateTime, setDateTime] = useState(new Date());
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);

  useEffect(() => {
    const interval = setInterval(() => {
      setDateTime(new Date());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!user) return;
    let previousCount = 0;
    const notificationsQuery = query(
      collection(db, 'notifications'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );
    const unsubscribe = onSnapshot(notificationsQuery, (querySnapshot) => {
      const notifs = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          read: data.read ?? false,
          ...data
        };
      });
      const unreadCount = notifs.filter(n => !n.read).length;
      if (unreadCount > previousCount && window.navigator.vibrate) {
        window.navigator.vibrate([200, 100, 200]);
      }
      previousCount = unreadCount;
      setNotifications(notifs);
    });
    return () => unsubscribe();
  }, [user]);

  const formattedTime = dateTime.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const formattedDate = dateTime.toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      router.push('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <header className="fixed top-0 left-0 right-0 bg-white shadow-md z-50 font-arabic">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex flex-col items-start">
            <motion.span
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: 'easeOut' }}
              className="text-2xl sm:text-3xl font-extrabold text-[#2563eb] leading-tight"
              style={{ fontFamily: 'Tajawal, Tajawal-Bold, Arial, sans-serif' }}
            >
              TaskFlow
            </motion.span>
            <span className="text-[11px] sm:text-xs font-normal text-gray-500 mt-1 tracking-wide">أنجز بذكاء، نظم حياتك.</span>
          </div>
          
          {user && (
            <nav className="flex items-center space-x-4 space-x-reverse">
              <div className="flex items-center ml-4 text-sm text-gray-600 font-medium">
                <span className="ml-2">{formattedTime}</span>
                <span className="mx-2">|</span>
                <span>{formattedDate}</span>
              </div>
              <button
                className="relative p-2 rounded-full bg-gray-100 hover:bg-gray-200 shadow-sm transition-colors duration-200"
                aria-label="الإشعارات"
                title="الإشعارات"
                onClick={() => setShowNotifications(!showNotifications)}
              >
                {notifications.filter(n => !n.read).length > 0 ? (
                  <motion.svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-6 w-6 text-gray-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    animate={{ rotate: [0, -10, 10, -10, 10, 0] }}
                    transition={{ duration: 0.7, repeat: Infinity, repeatDelay: 2 }}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </motion.svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                )}
                {notifications.filter(n => !n.read).length > 0 && (
                  <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
                )}
              </button>
            </nav>
          )}
        </div>
      </div>
      {showNotifications && (
        <div className="fixed top-16 right-4 bg-white shadow-2xl rounded-xl w-96 z-50 border animate-fade-in">
          <div className="p-4 border-b font-bold text-gray-700 flex justify-between items-center">
            <span className="flex items-center gap-2">
              <svg className="w-5 h-5 text-[#facc15]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              الإشعارات
            </span>
            <button onClick={() => setShowNotifications(false)} className="text-gray-400 hover:text-gray-700 text-xl font-bold">×</button>
          </div>
          <div className="max-h-96 overflow-y-auto p-2">
            {notifications.length === 0 ? (
              <div className="p-6 text-gray-500 text-center">لا توجد إشعارات جديدة</div>
            ) : (
              notifications.filter(n => !n.read).map((notif) => (
                <div
                  key={notif.id}
                  className="flex items-center gap-3 bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-2 shadow-sm hover:bg-yellow-100 transition"
                >
                  <svg className="w-6 h-6 text-[#facc15]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M12 20a8 8 0 100-16 8 8 0 000 16z" />
                  </svg>
                  <span className="flex-1 text-sm text-gray-800">{notif.message}</span>
                  <button
                    className="bg-green-500 hover:bg-green-600 text-white rounded-full w-8 h-8 flex items-center justify-center transition"
                    title="تعليم كمقروء"
                    onClick={async () => {
                      await updateDoc(doc(db, 'notifications', notif.id), { read: true });
                    }}
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </header>
  );
};

export default Header; 