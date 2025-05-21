'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
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

interface Task {
  id: string;
  title: string;
  details: string;
  type: TaskType;
  dateTime: string;
  userId: string;
  completed: boolean;
  priority?: string;
  reminder?: number;
}

export default function EditTaskPage() {
  const router = useRouter();
  const params = useParams();
  const taskId = params?.id as string;
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [title, setTitle] = useState('');
  const [details, setDetails] = useState('');
  const [taskType, setTaskType] = useState<TaskType>('other');
  const [dateTime, setDateTime] = useState('');
  const [completed, setCompleted] = useState(false);
  const [priority, setPriority] = useState('medium');
  const [reminder, setReminder] = useState(10);
  const [customReminder, setCustomReminder] = useState('');

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }

    if (!taskId) {
      setError('معرف المهمة غير صحيح');
      return;
    }

    fetchTask();
  }, [user, taskId]);

  const fetchTask = async () => {
    try {
      const taskDoc = await getDoc(doc(db, 'tasks', taskId));
      
      if (!taskDoc.exists()) {
        setError('المهمة غير موجودة');
        return;
      }

      const taskData = taskDoc.data() as Task;
      
      // التحقق من ملكية المهمة
      if (taskData.userId !== user?.uid) {
        setError('غير مصرح لك بتعديل هذه المهمة');
        return;
      }

      // تحويل التاريخ إلى التنسيق المناسب لحقل datetime-local
      const date = new Date(taskData.dateTime);
      date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
      const formattedDateTime = date.toISOString().slice(0, 16);

      setTitle(taskData.title);
      setDetails(taskData.details);
      setTaskType(taskData.type);
      setDateTime(formattedDateTime);
      setCompleted(taskData.completed);
      setPriority(taskData.priority || 'medium');
      setReminder(taskData.reminder || 10);
      setCustomReminder(taskData.reminder && !reminderOptions.some(opt => opt.value === taskData.reminder) ? String(taskData.reminder) : '');
    } catch (err) {
      setError('حدث خطأ أثناء جلب بيانات المهمة');
      console.error('Error fetching task:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !taskId) return;

    try {
      setSaving(true);
      setError('');

      const taskData = {
        title,
        details,
        type: taskType,
        dateTime: new Date(dateTime).toISOString(),
        completed,
        updatedAt: new Date().toISOString(),
        priority,
        reminder,
      };

      await updateDoc(doc(db, 'tasks', taskId), taskData);
      router.push('/tasks');
    } catch (err) {
      setError('حدث خطأ أثناء تحديث المهمة');
      console.error('Error updating task:', err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div>جاري التحميل...</div>;
  }

  if (error) {
    return (
      <Layout>
        <div className="max-w-2xl mx-auto p-4">
          <div className="text-red-500 text-center">{error}</div>
          <button
            onClick={() => router.push('/tasks')}
            className="mt-4 mx-auto block text-indigo-600 hover:text-indigo-800"
          >
            العودة إلى المهام
          </button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-[90vw] mx-auto p-0 sm:p-4 relative">
        <div className="flex items-center justify-between bg-white rounded-t-lg px-4 py-3 shadow-sm border-b mb-6">
          <button
            onClick={() => router.back()}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors"
            aria-label="رجوع"
          >
            <ArrowRightIcon className="w-6 h-6 text-[#2563eb]" />
          </button>
          <span className="text-lg font-bold text-[#2563eb] font-arabic">تعديل المهمة</span>
          <span className="w-8" />
        </div>
        <form onSubmit={handleSubmit} className="space-y-6 bg-white rounded-b-lg shadow p-4">
          {/* بطاقة معلومات المهمة */}
          <div className="bg-[#F5F7FB] rounded-xl shadow-sm p-3 mb-4">
            <div className="mb-3 text-[#2563eb] font-bold text-sm flex items-center gap-2">
              📝 معلومات المهمة
            </div>
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
          {/* أزرار الحفظ والإلغاء */}
          <div className="mt-6 flex flex-col gap-2">
            <button
              type="submit"
              disabled={saving}
              className={`w-full py-3 text-base font-bold rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500
                bg-[#2563eb] text-white hover:bg-[#1d4ed8] ${saving ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {saving ? (
                <span className="flex items-center gap-2 justify-center">
                  <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                  </svg>
                  جاري الحفظ...
                </span>
              ) : 'حفظ التعديلات'}
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