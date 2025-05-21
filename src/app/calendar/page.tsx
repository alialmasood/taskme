'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Layout from '@/components/Layout';
import FloatingAddButton from '@/components/FloatingAddButton';

const weekDays = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
const monthNames = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];

interface Task {
  id: string;
  title: string;
  details: string;
  type: string;
  dateTime: string;
  status: string;
  completed: boolean;
}

const taskTypeColors: { [key: string]: string } = {
  meeting: 'bg-blue-200 border-blue-400 text-blue-900',
  work: 'bg-green-200 border-green-400 text-green-900',
  travel: 'bg-yellow-200 border-yellow-400 text-yellow-900',
  family: 'bg-pink-200 border-pink-400 text-pink-900',
  shopping: 'bg-purple-200 border-purple-400 text-purple-900',
  company: 'bg-indigo-200 border-indigo-400 text-indigo-900',
  other: 'bg-gray-200 border-gray-400 text-gray-900',
};

function formatDate(dateString: string) {
  const date = new Date(dateString);
  return date.toLocaleString('ar-EG', {
    weekday: 'long',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
}

export default function CalendarPage() {
  const { user, loading: authLoading } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && user) {
      fetchTasks();
    }
  }, [user, authLoading]);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      setError('');
      const q = query(
        collection(db, 'tasks'),
        where('userId', '==', user?.uid)
      );
      const snapshot = await getDocs(q);
      setTasks(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Task)));
    } catch (err) {
      setError('حدث خطأ أثناء جلب المهام');
    } finally {
      setLoading(false);
    }
  };

  // تجهيز بيانات التقويم
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay();
  const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  // تجميع المهام حسب اليوم
  const tasksByDay: { [key: string]: Task[] } = {};
  tasks.forEach(task => {
    const d = new Date(task.dateTime);
    if (d.getFullYear() === year && d.getMonth() === month) {
      const day = d.getDate();
      if (!tasksByDay[day]) tasksByDay[day] = [];
      tasksByDay[day].push(task);
    }
  });

  // --- بطاقات المهام الشهرية ---
  const monthTasks = tasks.filter(task => {
    const d = new Date(task.dateTime);
    return d.getFullYear() === year && d.getMonth() === month;
  });

  return (
    <>
      <Layout>
        <div className="max-w-2xl mx-auto p-2 sm:p-4">
          <h1 className="text-2xl font-bold mb-6 text-center text-indigo-700">التقويم الشهري</h1>
          <div className="flex justify-between items-center mb-4">
            <button
              onClick={() => setCurrentDate(new Date(year, month - 1, 1))}
              className="px-3 py-1 rounded bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold"
            >
              ◀
            </button>
            <span className="font-bold text-lg text-indigo-800">{monthNames[month]} {year}</span>
            <button
              onClick={() => setCurrentDate(new Date(year, month + 1, 1))}
              className="px-3 py-1 rounded bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold"
            >
              ▶
            </button>
          </div>
          <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-2 text-center">
            {weekDays.map(day => (
              <div key={day} className="font-bold text-indigo-700 text-[10px] sm:text-xs">{day}</div>
            ))}
          </div>
          <div className="overflow-x-auto">
            <div className="grid grid-cols-7 gap-1 sm:gap-2 min-w-[420px] sm:min-w-0">
            {/* فراغات لبداية الشهر */}
            {Array.from({ length: firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1 }).map((_, i) => (
              <div key={i}></div>
            ))}
            {/* الأيام */}
            {daysArray.map(day => {
              const hasTasks = !!tasksByDay[day];
              return (
                <button
                  key={day}
                  className={`rounded-lg h-10 sm:h-16 flex flex-col items-center justify-center border transition-all font-bold text-[12px] sm:text-sm
                    ${hasTasks ? 'bg-blue-100 border-blue-400 text-blue-800 shadow' : 'bg-gray-50 border-gray-200 text-gray-400'}
                    ${selectedDay === String(day) ? 'ring-2 ring-indigo-400' : ''}`}
                  onClick={() => hasTasks ? setSelectedDay(String(day)) : null}
                >
                  <span>{day}</span>
                  {hasTasks && <span className="text-[10px] sm:text-xs mt-1 bg-blue-200 text-blue-900 rounded-full px-2">{tasksByDay[day].length} مهمة</span>}
                </button>
              );
            })}
            </div>
          </div>
          {/* بطاقات المهام الشهرية أسفل التقويم */}
          {monthTasks.length > 0 && (
            <div className="flex flex-wrap gap-2 justify-center my-4">
              {monthTasks.map((task) => (
                <div
                  key={task.id}
                  className={`min-w-[160px] max-w-xs p-3 rounded-lg border shadow-sm flex flex-col gap-1 transition-all duration-200 hover:scale-105 cursor-pointer ${taskTypeColors[task.type] || 'bg-gray-100 border-gray-300 text-gray-800'}`}
                >
                  <div className="font-bold text-base truncate">{task.title}</div>
                  <div className="text-xs font-light truncate">{task.details}</div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-[11px] font-bold">{task.completed ? '✓ مكتملة' : task.status === 'delayed' ? 'متأخرة' : 'نشطة'}</span>
                    <span className="text-[11px]">{new Date(task.dateTime).toLocaleDateString('ar-EG', { month: '2-digit', day: '2-digit' })}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
          {/* نافذة المهام لليوم المحدد */}
          {selectedDay && tasksByDay[selectedDay] && (
            <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50" onClick={() => setSelectedDay(null)}>
              <div className="bg-white border border-indigo-200 shadow-lg rounded-lg p-4 min-w-[180px] sm:min-w-[220px] max-w-xs text-[11px] sm:text-xs text-right animate-fade-in relative" onClick={e => e.stopPropagation()}>
                <button className="absolute top-2 left-2 text-indigo-500 text-lg font-bold" onClick={() => setSelectedDay(null)} aria-label="إغلاق">×</button>
                <div className="font-bold text-indigo-700 mb-2 flex items-center gap-1">مهام هذا اليوم:</div>
                <ul className="space-y-1">
                  {tasksByDay[selectedDay].map((task, i) => (
                    <li key={task.id || i} className="flex items-center gap-1">
                      <span className="text-indigo-700 font-bold">{task.title}</span>
                      <span className="text-gray-500">({task.type})</span>
                      <span className="text-gray-400">{formatDate(task.dateTime)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
          {error && <div className="text-red-500 text-center mt-4">{error}</div>}
          {loading && <div className="text-center py-8 text-gray-500">جاري التحميل...</div>}
        </div>
      </Layout>
      {/* زر إضافة مهمة في يسار الصفحة */}
      <div className="fixed left-4 bottom-20 z-50">
        <FloatingAddButton />
      </div>
    </>
  );
} 