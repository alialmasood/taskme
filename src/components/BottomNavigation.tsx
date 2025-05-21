'use client';

import { useRouter, usePathname } from 'next/navigation';
import { HomeIcon, CalendarIcon, UserIcon, ClipboardDocumentListIcon } from '@heroicons/react/24/outline';

const BottomNavigation = () => {
  const router = useRouter();
  const pathname = usePathname();

  const navigationItems = [
    { name: 'الرئيسية', href: '/', icon: HomeIcon },
    { name: 'المهام', href: '/tasks', icon: ClipboardDocumentListIcon },
    { name: 'جدول اعمالي', href: '/my-schedule', icon: CalendarIcon },
    { name: 'التقويم', href: '/calendar', icon: CalendarIcon },
    { name: 'الملف الشخصي', href: '/profile', icon: UserIcon },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 py-2 px-4 shadow-md">
      <div className="max-w-7xl mx-auto flex justify-around items-center">
        {navigationItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <button
              key={item.name}
              onClick={() => router.push(item.href)}
              className={`flex flex-col items-center space-y-1 font-arabic transition-colors duration-200 ${
                isActive ? 'text-[#2563eb]' : 'text-gray-500'
              }`}
            >
              <item.icon className="h-6 w-6" />
              <span className="text-xs">{item.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default BottomNavigation; 