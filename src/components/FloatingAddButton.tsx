'use client';

import { useRouter } from 'next/navigation';
import { PlusIcon } from '@heroicons/react/24/solid';

const FloatingAddButton = () => {
  const router = useRouter();

  return (
    <button
      onClick={() => router.push('/tasks/add')}
      className="fixed left-4 bottom-20 w-14 h-14 bg-[#007AFF] hover:bg-[#2563eb] text-white rounded-full shadow-lg flex items-center justify-center transition-all duration-200 hover:scale-110 z-50"
      aria-label="إضافة مهمة جديدة"
    >
      <PlusIcon className="w-8 h-8" />
    </button>
  );
};

export default FloatingAddButton; 