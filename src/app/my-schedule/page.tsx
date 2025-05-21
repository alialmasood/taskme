'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Layout from '@/components/Layout';

const taskTypeLabels: { [key: string]: string } = {
  meeting: 'اجتماع',
  work: 'عمل',
  travel: 'سفر',
  family: 'عائلة',
  shopping: 'تسوق',
  company: 'شركة',
  other: 'أخرى',
  outing: 'نزهة',
  gathering: 'لقاء',
};
const taskTypeColors: { [key: string]: string } = {
  meeting: 'bg-blue-100 text-blue-800',
  work: 'bg-indigo-100 text-indigo-800',
  travel: 'bg-yellow-100 text-yellow-800',
  family: 'bg-pink-100 text-pink-800',
  shopping: 'bg-green-100 text-green-800',
  company: 'bg-gray-100 text-gray-800',
  other: 'bg-gray-200 text-gray-700',
  outing: 'bg-teal-100 text-teal-800',
  gathering: 'bg-orange-100 text-orange-800',
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

function getRowColor(task: any) {
  if (task.completed || task.status === 'completed') return 'bg-green-50';
  if (task.status === 'delayed' || (task.status === 'in_progress' && new Date(task.dateTime) < new Date())) return 'bg-yellow-50';
  return 'bg-white';
}

function getStatusBadge(task: any) {
  if (task.completed || task.status === 'completed') return <span className="ml-2 px-2 py-0.5 rounded-full text-xs bg-green-200 text-green-800 font-bold">مكتملة</span>;
  if (task.status === 'delayed') return <span className="ml-2 px-2 py-0.5 rounded-full text-xs bg-yellow-200 text-yellow-800 font-bold">مؤجلة</span>;
  if (task.status === 'in_progress' && new Date(task.dateTime) < new Date()) return <span className="ml-2 px-2 py-0.5 rounded-full text-xs bg-yellow-200 text-yellow-800 font-bold">متأخرة</span>;
  return null;
}

export default function MySchedulePage() {
  const { user, loading: authLoading } = useAuth();
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showTimeline, setShowTimeline] = useState(false);

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
        where('userId', '==', user?.uid),
        orderBy('dateTime', 'asc')
      );
      const snapshot = await getDocs(q);
      setTasks(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (err) {
      setError('حدث خطأ أثناء جلب المهام');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-3xl mx-auto p-4">
        <h1 className="text-2xl font-bold mb-6 text-center text-indigo-700">جدول أعمالي</h1>
        {/* زر لفتح الجدول الزمني */}
        <div className="flex justify-center mb-4">
          <button
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-6 rounded-lg shadow transition-all text-base"
            onClick={() => setShowTimeline(true)}
          >
            جدول اليوم ساعة بساعة
          </button>
        </div>
        {/* نافذة منبثقة للجدول الزمني */}
        {showTimeline && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50" onClick={() => setShowTimeline(false)}>
            <div className="bg-white rounded-lg shadow-2xl p-4 max-w-2xl w-full relative animate-fade-in" onClick={e => e.stopPropagation()}>
              <button className="absolute top-2 left-2 text-indigo-500 text-lg font-bold" onClick={() => setShowTimeline(false)} aria-label="إغلاق">×</button>
              <h2 className="text-lg font-bold mb-4 text-indigo-800 text-center">جدول اليوم (ساعة بساعة)</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2">
                {Array.from({ length: 24 }).map((_, hour) => {
                  const now = new Date();
                  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                  const hourStart = new Date(today);
                  hourStart.setHours(hour, 0, 0, 0);
                  const hourEnd = new Date(hourStart);
                  hourEnd.setHours(hour + 1, 0, 0, 0);
                  const hourTasks = tasks.filter(task => {
                    const d = new Date(task.dateTime);
                    return d >= hourStart && d < hourEnd;
                  });
                  return (
                    <div key={hour} className={`rounded-lg border p-1 flex flex-col items-center min-h-[36px] ${hourTasks.length ? 'bg-white border-indigo-300' : 'bg-gray-100 border-gray-200'}`}>
                      <div className="font-bold text-indigo-700 text-[11px] mb-0.5">{hour}:00</div>
                      {hourTasks.length === 0 ? (
                        <span className="text-[10px] text-gray-400">لا مهام</span>
                      ) : (
                        hourTasks.map(task => (
                          <div key={task.id} className={`w-full my-0.5 px-0.5 py-0.5 rounded text-[10px] font-bold truncate ${taskTypeColors[task.type] || 'bg-gray-200 text-gray-700'}`} title={task.title}>
                            {task.title}
                            <span className="ml-0.5 font-normal">({taskTypeLabels[task.type] || 'أخرى'})</span>
                          </div>
                        ))
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
        {error && <div className="text-red-500 text-center mb-4">{error}</div>}
        {loading ? (
          <div className="text-center py-12 text-lg text-gray-500">جاري التحميل...</div>
        ) : tasks.length === 0 ? (
          <div className="text-center py-12 text-gray-400">لا توجد مهام في جدول أعمالك.</div>
        ) : (
          <div className="overflow-x-auto rounded-lg shadow bg-white">
            <table className="min-w-full text-sm text-right font-arabic">
              <thead>
                <tr className="bg-indigo-50 text-indigo-900">
                  <th className="py-3 px-4 font-bold">العنوان</th>
                  <th className="py-3 px-4 font-bold">التاريخ</th>
                  <th className="py-3 px-4 font-bold">النوع</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map(task => (
                  <tr key={task.id} className={`border-b transition ${getRowColor(task)} hover:bg-indigo-50`}>
                    <td className="py-2 px-4 font-bold text-indigo-900 flex items-center">
                      {task.title}
                      {getStatusBadge(task)}
                    </td>
                    <td className="py-2 px-4 text-gray-700">{formatDate(task.dateTime)}</td>
                    <td className="py-2 px-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${taskTypeColors[task.type] || 'bg-gray-200 text-gray-700'}`}>{taskTypeLabels[task.type] || 'أخرى'}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Layout>
  );
} 