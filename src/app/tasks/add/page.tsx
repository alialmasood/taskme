'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { addDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Layout from '@/components/Layout';
import { ArrowRightIcon } from '@heroicons/react/24/outline';

type TaskType = 'meeting' | 'work' | 'travel' | 'family' | 'shopping' | 'company' | 'other' | 'outing' | 'gathering';

const taskTypes: { value: TaskType; label: string; icon: React.ReactNode }[] = [
  { value: 'work', label: 'عمل', icon: '🧑‍💼' },
  { value: 'family', label: 'عائلي', icon: '👨‍👩‍👧‍👦' },
  { value: 'shopping', label: 'تسوق', icon: '🛒' },
  { value: 'travel', label: 'سفر', icon: '🧳' },
  { value: 'outing', label: 'نزهة', icon: '🍃' },
  { value: 'meeting', label: 'اجتماع', icon: '📅' },
  { value: 'gathering', label: 'لقاء', icon: '🤝' },
  { value: 'company', label: 'شركة', icon: '🏢' },
  { value: 'other', label: 'أخرى', icon: '🗂️' },
];

const priorities = [
  { value: 'high', label: 'عالية', icon: '🔴', color: 'bg-[#EF4444] text-white', border: 'border-[#EF4444]' },
  { value: 'medium', label: 'متوسطة', icon: '🟡', color: 'bg-[#F59E0B] text-white', border: 'border-[#F59E0B]' },
  { value: 'low', label: 'منخفضة', icon: '🟢', color: 'bg-[#10B981] text-white', border: 'border-[#10B981]' },
];

const reminderOptions = [
  { value: 10, label: '⏱ قبل 10 دقائق' },
  { value: 20, label: '⏱ قبل 20 دقيقة' },
  { value: 30, label: '⏱ قبل 30 دقيقة' },
  { value: 60, label: '⏱ قبل 1 ساعة' },
];

type RepeatType = 'none' | 'daily' | 'weekly' | 'monthly';

const repeatOptions: { value: RepeatType; label: string }[] = [
  { value: 'none', label: 'لا تتكرر' },
  { value: 'daily', label: 'يوميًا' },
  { value: 'weekly', label: 'أسبوعيًا' },
  { value: 'monthly', label: 'شهريًا' },
];

export default function AddTaskPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);

  const [title, setTitle] = useState('');
  const [details, setDetails] = useState('');
  const [taskType, setTaskType] = useState<TaskType>('other');
  const [dateTime, setDateTime] = useState(() => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  });
  const [priority, setPriority] = useState('medium');
  const [reminder, setReminder] = useState(10);
  const [customReminder, setCustomReminder] = useState('');
  const [repeat, setRepeat] = useState<RepeatType>('none');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      setLoading(true);
      setError('');
      setShowSuccess(false);

      // تحقق من وجود مهمة بنفس التاريخ والوقت
      const q = query(
        collection(db, 'tasks'),
        where('userId', '==', user.uid),
        where('dateTime', '==', new Date(dateTime).toISOString())
      );
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        setError('يوجد لديك مهمة أخرى في نفس اليوم والساعة والدقيقة! يرجى اختيار وقت مختلف.');
        setLoading(false);
        return;
      }

      const taskData = {
        title,
        details,
        type: taskType,
        dateTime: new Date(dateTime).toISOString(),
        userId: user.uid,
        createdAt: new Date().toISOString(),
        status: 'in_progress',
        completed: false,
        updatedAt: new Date().toISOString(),
        priority,
        reminder,
        participants: [],
        sharedWith: [],
        repeat,
      };

      await addDoc(collection(db, 'tasks'), taskData);
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        router.push('/tasks');
      }, 1500);
    } catch (err) {
      setError('حدث خطأ أثناء إضافة المهمة');
      console.error('Error adding task:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-[90vw] mx-auto p-0 sm:p-4 relative">
        {/* رسالة نجاح متحركة */}
        {showSuccess && (
          <div className="fixed inset-0 flex items-center justify-center z-50">
            <div className="bg-white border border-green-200 shadow-lg rounded-lg px-8 py-6 flex flex-col items-center animate-fade-in">
              <span className="text-3xl mb-2">✅</span>
              <span className="text-green-700 font-bold text-lg">تمت إضافة المهمة بنجاح</span>
            </div>
          </div>
        )}
        <div className="flex items-center justify-between bg-white rounded-t-lg px-4 py-3 shadow-sm border-b mb-6">
          <button
            onClick={() => router.back()}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors"
            aria-label="رجوع"
          >
            <ArrowRightIcon className="w-6 h-6 text-[#2563eb]" />
          </button>
          <span className="text-lg font-bold text-[#2563eb] font-arabic">إضافة مهمة جديدة</span>
          <span className="w-8" /> {/* للموازنة */}
        </div>
        <form onSubmit={handleSubmit} className="space-y-6 bg-white rounded-b-lg shadow p-4">
          {/* بطاقة معلومات المهمة */}
          <div className="bg-[#F5F7FB] rounded-xl shadow-sm p-3 mb-4">
            <div className="mb-3 text-[#2563eb] font-bold text-sm flex items-center gap-2">
              📝 معلومات المهمة
            </div>
            {/* عنوان المهمة */}
            <div className="mb-4">
              <label htmlFor="title" className="block text-xs font-medium text-gray-700 mb-1 flex items-center gap-1">
                <span>📝</span> عنوان المهمة
              </label>
              <input
                type="text"
                id="title"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-arabic"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            {/* تفاصيل المهمة */}
            <div>
              <label htmlFor="details" className="block text-xs font-medium text-gray-700 mb-1 flex items-center gap-1">
                <span>📋</span> تفاصيل المهمة
              </label>
              <textarea
                id="details"
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-arabic"
                value={details}
                onChange={(e) => setDetails(e.target.value)}
              />
            </div>
          </div>

          {/* بطاقة نوع المهمة */}
          <div className="bg-[#F5F7FB] rounded-xl shadow-sm p-3 mb-4">
            <div className="mb-3 text-[#2563eb] font-bold text-sm flex items-center gap-2">
              🗂️ نوع المهمة
            </div>
            <div className="grid grid-cols-4 gap-3 justify-items-center">
              {taskTypes.map((type) => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => setTaskType(type.value as TaskType)}
                  className={`flex flex-col items-center justify-center gap-1 w-full min-w-[80px] max-w-[110px] h-16 min-h-[44px] rounded-md border transition-colors text-sm font-arabic
                    ${taskType === type.value ? 'bg-[#2563eb] text-white border-[#2563eb]' : 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-blue-50'}`}
                  style={{ aspectRatio: '1.1/1' }}
                >
                  <span className="text-lg">{type.icon}</span>
                  <span className="truncate">{type.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* بطاقة تاريخ ووقت المهمة */}
          <div className="bg-[#F5F7FB] rounded-xl shadow-sm p-3 mb-4">
            <div className="mb-3 text-[#2563eb] font-bold text-sm flex items-center gap-2">
              📅 تاريخ ووقت المهمة
            </div>
            <div>
              <label htmlFor="datetime" className="block text-xs font-medium text-gray-700 mb-1 flex items-center gap-1">
                <span>📅</span> اختر التاريخ والوقت
              </label>
              <input
                type="datetime-local"
                id="datetime"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-arabic"
                value={dateTime}
                onChange={(e) => setDateTime(e.target.value)}
              />
            </div>
          </div>

          {/* بطاقة الأولوية */}
          <div className="bg-[#F5F7FB] rounded-xl shadow-sm p-3 mb-4">
            <div className="mb-3 text-[#2563eb] font-bold text-sm flex items-center gap-2">
              ⚡ أولوية المهمة
            </div>
            <div className="flex gap-3 justify-between">
              {priorities.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => setPriority(p.value)}
                  className={`flex items-center justify-center gap-1 rounded-md border transition-colors text-sm font-arabic h-12 flex-1 min-w-[90px] max-w-[150px] min-h-[44px]
                    ${priority === p.value ? p.color + ' ' + p.border : 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-blue-50'}`}
                >
                  <span className="text-lg">{p.icon}</span>
                  <span>{p.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* بطاقة التذكير بالمهمة */}
          <div className="bg-[#F5F7FB] rounded-xl shadow-sm p-3 mb-4">
            <div className="mb-3 text-[#2563eb] font-bold text-sm flex items-center gap-2">
              ⏰ التذكير بالمهمة
            </div>
            <div className="grid grid-cols-4 gap-3 justify-items-center mb-2">
              {reminderOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => { setReminder(opt.value); setCustomReminder(''); }}
                  className={`w-full min-w-[80px] max-w-[110px] h-12 min-h-[44px] flex items-center justify-center rounded-md border text-sm font-arabic transition-all
                    ${reminder === opt.value && !customReminder ? 'bg-[#2563eb] text-white border-[#2563eb] shadow-md' : 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-blue-50'}`}
                  style={{ aspectRatio: '2.2/1' }}
                >
                  {opt.label}
                </button>
              ))}
              {/* حقل التخصيص اليدوي */}
              <div className="w-full min-w-[80px] max-w-[110px] h-12 min-h-[44px] flex flex-col items-center justify-center">
                <input
                  type="number"
                  min="1"
                  placeholder="تخصيص"
                  className="w-full px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 font-arabic text-center"
                  value={customReminder}
                  onChange={e => {
                    setCustomReminder(e.target.value);
                    setReminder(Number(e.target.value) || 0);
                  }}
                />
                <span className="text-xs text-gray-500 mt-1">دقيقة قبل الموعد</span>
              </div>
            </div>
          </div>

          {/* بطاقة تكرار المهمة */}
          <div className="bg-[#F5F7FB] rounded-xl shadow-sm p-3 mb-4">
            <div className="mb-3 text-[#2563eb] font-bold text-sm flex items-center gap-2">
              🔁 تكرار المهمة
            </div>
            <div className="flex flex-wrap gap-4">
              {repeatOptions.map(opt => (
                <label key={opt.value} className={`flex items-center gap-2 px-3 py-2 rounded cursor-pointer border transition-colors
                  ${repeat === opt.value ? 'bg-[#2563eb] text-white border-[#2563eb]' : 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-blue-50'}`}
                >
                  <input
                    type="radio"
                    name="repeat"
                    value={opt.value}
                    checked={repeat === opt.value}
                    onChange={() => setRepeat(opt.value)}
                    className="accent-[#2563eb]"
                  />
                  {opt.label}
                </label>
              ))}
            </div>
          </div>

          {error && (
            <div className="text-red-500 text-sm text-center">{error}</div>
          )}

          {/* أزرار الحفظ والإلغاء */}
          <div className="mt-6 flex flex-col gap-2">
            <button
              type="submit"
              disabled={loading}
              className={`w-full py-3 text-base font-bold rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500
                bg-[#2563eb] text-white hover:bg-[#1d4ed8] ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {loading ? (
                <span className="flex items-center gap-2 justify-center">
                  <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                  </svg>
                  جاري الإضافة...
                </span>
              ) : 'إضافة المهمة'}
            </button>
            <button
              type="button"
              onClick={() => router.back()}
              className="w-full py-3 text-base font-bold rounded-lg bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-300"
            >
              إلغاء
            </button>
          </div>
        </form>
      </div>
    </Layout>
  );
} 