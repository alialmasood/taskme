'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Layout from '@/components/Layout';
import { ClipboardDocumentListIcon, ClockIcon, CalendarDaysIcon } from '@heroicons/react/24/outline';
import { useSwipeable } from 'react-swipeable';
import { Pie, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement
} from 'chart.js';

interface Task {
  id: string;
  title: string;
  details: string;
  type: string;
  dateTime: string;
  status: string;
  completed: boolean;
}

const taskTypeLabels: { [key: string]: string } = {
  meeting: 'اجتماع',
  work: 'عمل',
  travel: 'سفر',
  family: 'عائلة',
  shopping: 'تسوق',
  company: 'شركة',
  other: 'أخرى',
};

// دالة لتنسيق التاريخ والوقت
const formatDateTime = (dateString: string) => {
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
};

// دالة لتصفية المهام حسب الفترة الزمنية
const filterTasksByPeriod = (tasks: Task[], period: 'today' | 'week' | 'month') => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const taskDate = (task: Task) => new Date(task.dateTime);

  switch (period) {
    case 'today':
      return tasks.filter(task => {
        const date = taskDate(task);
        return date >= today && date < new Date(today.getTime() + 24 * 60 * 60 * 1000);
      });
    case 'week':
      const weekStart = new Date(today.getTime() - today.getDay() * 24 * 60 * 60 * 1000);
      const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);
      return tasks.filter(task => {
        const date = taskDate(task);
        return date >= weekStart && date < weekEnd && date >= today;
      });
    case 'month':
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      return tasks.filter(task => {
        const date = taskDate(task);
        return date >= today && date <= monthEnd;
      });
    default:
      return [];
  }
};

const TaskCard = ({ task, onComplete, onDelay }: { task: Task, onComplete?: (id: string) => void, onDelay?: (id: string) => void }) => {
  const handlers = useSwipeable({
    onSwipedRight: () => onComplete && onComplete(task.id),
    onSwipedLeft: () => onDelay && onDelay(task.id),
    trackMouse: true,
  });
  return (
    <div
      {...handlers}
      className={`bg-white rounded-lg shadow-md p-3 sm:p-4 border-r-4 transition-transform duration-200 select-none ${
        task.completed
          ? 'border-[#10B981]'
          : task.status === 'urgent'
          ? 'border-[#EF4444]'
          : task.status === 'delayed'
          ? 'border-[#F59E0B]'
          : 'border-[#2563eb]'
      }`}
    >
      <h3 className="font-bold text-base sm:text-lg mb-2">{task.title}</h3>
      <p className="text-gray-600 text-xs sm:text-sm mb-2 font-light">{task.details}</p>
      <div className="flex flex-col space-y-2">
        <span className="bg-gray-100 px-2 py-1 rounded text-xs sm:text-sm" style={{ color: '#6B7280' }}>
          {taskTypeLabels[task.type]}
        </span>
        <span className="text-xs sm:text-sm" style={{ color: '#6B7280' }}>
          {formatDateTime(task.dateTime)}
        </span>
      </div>
    </div>
  );
};

const TaskSection = ({ title, tasks, showAll = false, onComplete, onDelay }: { title: string; tasks: Task[]; showAll?: boolean; onComplete?: (id: string) => void; onDelay?: (id: string) => void }) => (
  <div className="mb-6 sm:mb-8">
    <div className="flex justify-between items-center mb-3 sm:mb-4">
      <h2 className="text-lg sm:text-xl font-bold">{title}</h2>
      <span className="text-xs sm:text-sm" style={{ color: '#6B7280' }}>{tasks.length} مهمة</span>
    </div>
    {tasks.length === 0 ? (
      <div className="flex flex-col items-center justify-center py-4 sm:py-6">
        <ClipboardDocumentListIcon className="w-8 h-8 sm:w-12 sm:h-12 text-[#6B7280] mb-2" />
        <p className="text-center text-xs sm:text-sm mt-1" style={{ color: '#6B7280' }}>لا توجد مهام</p>
      </div>
    ) : (
      <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {(showAll ? tasks : tasks.slice(0, 3)).map((task) => (
          <TaskCard key={task.id} task={task} onComplete={onComplete} onDelay={onDelay} />
        ))}
      </div>
    )}
  </div>
);

// دالة لحساب العد التنازلي
function getCountdown(dateString: string) {
  const now = new Date();
  const target = new Date(dateString);
  const diff = target.getTime() - now.getTime();
  if (diff <= 0) return 'انتهى الوقت';
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  if (days > 0) return `بعد ${days} يوم${days === 1 ? '' : 'ٍ'} و${hours} ساعة`;
  if (hours > 0) return `بعد ${hours} ساعة و${minutes} دقيقة`;
  return `بعد ${minutes} دقيقة`;
}

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, PointElement, LineElement);

// دالة لإيجاد نوع المهمة الأهم في يوم معين
function getMainTaskType(tasks: Task[]) {
  if (!tasks.length) return null;
  // أولوية الأنواع: اجتماع > سفر > لقاء > عمل > عائلة > تسوق > شركة > نزهة > أخرى
  const priority = ['meeting', 'travel', 'gathering', 'work', 'family', 'shopping', 'company', 'outing', 'other'];
  for (const type of priority) {
    const found = tasks.find(t => t.type === type);
    if (found) return found.type;
  }
  return tasks[0].type;
}

function getHourColor(hour: number, tasks: Task[], nowHour: number) {
  const hourTasks = tasks.filter(task => new Date(task.dateTime).getHours() === hour);
  if (hourTasks.length > 0) {
    // تدرج أحمر حسب عدد المهام
    const intensity = Math.min(1, hourTasks.length / 3); // 3 مهام أو أكثر = أقصى شدة
    return `rgba(239,68,68,${0.3 + 0.5 * intensity})`; // من أحمر فاتح إلى غامق
  } else {
    // تدرج أخضر حسب قرب الساعة من الوقت الحالي
    const diff = Math.abs(hour - nowHour);
    const intensity = Math.max(0.2, 1 - diff / 12); // أقرب للآن = أخضر غامق
    return `rgba(34,197,94,${intensity})`;
  }
}

// مكون مؤشر الاتصال
const ConnectionStatus = ({ online }: { online: boolean }) => (
  <div className={`flex items-center gap-2 px-3 py-1 rounded-lg shadow-sm transition-all duration-300 text-sm font-medium ${
    online ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
  }`}>
    <span className={`w-2 h-2 rounded-full ${online ? 'bg-green-500' : 'bg-red-500'} animate-pulse`}></span>
    <span>{online ? 'متصل بالإنترنت' : 'غير متصل بالإنترنت'}</span>
  </div>
);

// دوال مساعدة للتواريخ
const getStartOfDay = (date: Date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};
const getStartOfWeek = (date: Date) => {
  const start = getStartOfDay(date);
  start.setDate(start.getDate() - start.getDay());
  return start;
};
const getWeekDays = () => {
  const startOfWeek = getStartOfWeek(new Date());
  return Array.from({ length: 7 }, (_, i) => {
    const day = new Date(startOfWeek);
    day.setDate(startOfWeek.getDate() + i);
    day.setHours(0, 0, 0, 0);
    return day;
  });
};
const getMonthDays = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  return Array.from({ length: daysInMonth }, (_, i) => {
    const day = new Date(year, month, i + 1);
    day.setHours(0, 0, 0, 0);
    return day;
  });
};

// دالة مقارنة دقيقة
const isSameDay = (date1: Date, date2: Date) => {
  return date1.getFullYear() === date2.getFullYear() &&
         date1.getMonth() === date2.getMonth() &&
         date1.getDate() === date2.getDate();
};

export default function HomePage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'today' | 'week' | 'month'>('today');
  const [completedTasks, setCompletedTasks] = useState<Task[]>([]);
  const [notifications, setNotifications] = useState<{id: string, message: string, type: 'info'|'success'|'warning'|'error'}[]>([]);
  const prevTasksRef = useRef<Task[]>([]);
  const prevCompletedRef = useRef<number>(0);
  const [activeBusyDay, setActiveBusyDay] = useState<string | null>(null);
  const [online, setOnline] = useState(true);

  // --- منطق الشارات التحفيزية ---
  const achievementMilestones = [5, 10, 20, 50, 100];
  const [lastAchievement, setLastAchievement] = useState<number>(0);
  useEffect(() => {
    const completedCount = completedTasks.length;
    const nextMilestone = achievementMilestones.find(m => completedCount >= m && lastAchievement < m);
    if (nextMilestone) {
      setNotifications(n => [
        { id: `achieve-${nextMilestone}`, message: `مبروك! أنجزت ${nextMilestone} مهام 🎉`, type: 'success' },
        ...n
      ]);
      setLastAchievement(nextMilestone);
    }
  }, [completedTasks, lastAchievement]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }

    if (user) {
      fetchTasks();
      fetchCompletedTasks();
      fetchDelayedTasks();
    }
  }, [user, authLoading, router]);

  // جلب المهام المكتملة فعليًا من قاعدة البيانات
  useEffect(() => {
    if (!authLoading && user) {
      fetchCompletedTasks();
    }
  }, [user, authLoading]);

  const fetchTasks = async () => {
    try {
      const tasksQuery = query(
        collection(db, 'tasks'),
        where('userId', '==', user?.uid),
        where('completed', '==', false),
        orderBy('dateTime', 'asc')
      );

      const querySnapshot = await getDocs(tasksQuery);
      const tasksData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Task[];

      setTasks(tasksData);
    } catch (err) {
      setError('حدث خطأ أثناء جلب المهام');
      console.error('Error fetching tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  // جلب المهام المكتملة
  const fetchCompletedTasks = async () => {
    try {
      // جلب المهام المكتملة بالحقل completed
      const completedQuery1 = query(
        collection(db, 'tasks'),
        where('userId', '==', user?.uid),
        where('completed', '==', true)
      );
      // جلب المهام المكتملة بالحقل status
      const completedQuery2 = query(
        collection(db, 'tasks'),
        where('userId', '==', user?.uid),
        where('status', '==', 'completed')
      );
      const [snapshot1, snapshot2] = await Promise.all([
        getDocs(completedQuery1),
        getDocs(completedQuery2)
      ]);
      const completedData1 = snapshot1.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Task[];
      const completedData2 = snapshot2.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Task[];
      // دمج النتائج بدون تكرار
      const allCompleted = [...completedData1, ...completedData2.filter(task2 => !completedData1.some(task1 => task1.id === task2.id))];
      setCompletedTasks(allCompleted);
    } catch {
      // تجاهل الخطأ هنا
    }
  };

  // جلب المهام المؤجلة
  const fetchDelayedTasks = async () => {
    try {
      const delayedQuery = query(
        collection(db, 'tasks'),
        where('userId', '==', user?.uid),
        where('completed', '==', false),
        orderBy('dateTime', 'desc')
      );
      await getDocs(delayedQuery);
      // لم نعد نستخدم المتغيرات هنا
    } catch {
      // تجاهل الخطأ هنا
    }
  };

  // منطق الإشعارات الذكية
  useEffect(() => {
    // إشعار عند إضافة مهمة جديدة
    if (prevTasksRef.current.length && tasks.length > prevTasksRef.current.length) {
      setNotifications(n => [
        { id: Date.now() + '-add', message: 'تمت إضافة مهمة جديدة!', type: 'success' },
        ...n
      ]);
    }
    // إشعار عند اكتمال مهمة
    if (completedTasks.length > prevCompletedRef.current) {
      setNotifications(n => [
        { id: Date.now() + '-done', message: 'تم اكتمال مهمة بنجاح!', type: 'success' },
        ...n
      ]);
    }
    prevTasksRef.current = tasks;
    prevCompletedRef.current = completedTasks.length;
  }, [tasks, completedTasks]);

  // إشعار عند اقتراب موعد مهمة أو تأخرها
  useEffect(() => {
    const now = new Date();
    const soonTasks = tasks.filter(task => {
      const t = new Date(task.dateTime);
      return !task.completed && t > now && (t.getTime() - now.getTime()) <= 60 * 60 * 1000;
    });
    soonTasks.forEach(task => {
      if (!notifications.some(n => n.id === 'soon-' + task.id)) {
        setNotifications(n => [
          { id: 'soon-' + task.id, message: `اقترب موعد المهمة: ${task.title}`, type: 'warning' },
          ...n
        ]);
      }
    });
    // إشعار إذا أصبحت المهمة متأخرة
    const overdueTasks = tasks.filter(task => {
      const t = new Date(task.dateTime);
      return !task.completed && t < now;
    });
    overdueTasks.forEach(task => {
      if (!notifications.some(n => n.id === 'late-' + task.id)) {
        setNotifications(n => [
          { id: 'late-' + task.id, message: `المهمة متأخرة: ${task.title}`, type: 'error' },
          ...n
        ]);
      }
    });
    // تنظيف إشعارات المهام التي لم تعد قريبة أو متأخرة
    setNotifications(n => n.filter(notif => {
      if (notif.id.startsWith('soon-')) {
        return soonTasks.some(task => notif.id === 'soon-' + task.id);
      }
      if (notif.id.startsWith('late-')) {
        return overdueTasks.some(task => notif.id === 'late-' + task.id);
      }
      return true;
    }));
    // تحديث كل دقيقة
    const interval = setInterval(() => {
      setNotifications(n => [...n]);
    }, 60000);
    return () => clearInterval(interval);
  }, [tasks]);

  // دالة إغلاق الإشعار
  const closeNotification = (id: string) => {
    setNotifications(n => n.filter(notif => notif.id !== id));
  };

  useEffect(() => {
    setOnline(navigator.onLine);
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (authLoading || loading) {
    return <div>جاري التحميل...</div>;
  }

  if (!user) {
    return null;
  }

  // تصفية المهام حسب الفترة الزمنية
  const todayTasks = filterTasksByPeriod(tasks, 'today');
  const weekTasks = filterTasksByPeriod(tasks, 'week');
  const monthTasks = filterTasksByPeriod(tasks, 'month');

  let displayedTasks: Task[] = [];
  if (activeTab === 'today') displayedTasks = todayTasks;
  else if (activeTab === 'week') displayedTasks = weekTasks.filter(task => !todayTasks.includes(task));
  else if (activeTab === 'month') displayedTasks = monthTasks.filter(task => !weekTasks.includes(task));

  // دوال وهمية للتفاعل مع السحب
  const handleComplete = () => {
    alert('تم إنجاز المهمة!');
  };
  const handleDelay = () => {
    alert('تم تأجيل المهمة!');
  };

  // حساب توزيع المهام على أيام الأسبوع الحالي
  const now = new Date();
  const weekDays = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
  const weekStartBusyDays = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
  const busyDays: { [key: string]: Task[] } = {};
  for (let i = 0; i < 7; i++) {
    const day = new Date(weekStartBusyDays);
    day.setDate(weekStartBusyDays.getDate() + i);
    const dayKey = day.toISOString().slice(0, 10);
    busyDays[dayKey] = tasks.filter(task => task.dateTime.slice(0, 10) === dayKey);
  }

  // شريط اليوم (Timeline)
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const hourStatus: ('busy' | 'free')[] = hours.map(h => {
    return todayTasks.some(task => new Date(task.dateTime).getHours() === h) ? 'busy' : 'free';
  });

  // حساب عدد المهام المكتملة من قاعدة البيانات
  const completedCount = completedTasks.length;
  // حساب عدد المهام المتأخرة أو المؤجلة
  const nowDate = new Date();
  const delayedOrOverdueCount = tasks.filter(task => (task.status === 'delayed') || (task.status === 'in_progress' && new Date(task.dateTime) < nowDate)).length;
  const inProgressCount = tasks.length - delayedOrOverdueCount;

  // حساب عدد المهام الكلية (كل المهام الفريدة لهذا المستخدم)
  // اجمع كل المهام (جارية + مكتملة) بدون تكرار
  const allTaskIds = new Set([...tasks, ...completedTasks].map(task => task.id));
  const totalTasksCount = allTaskIds.size;

  // --- المهام القادمة ---
  // أقرب 3 مهام غير مكتملة وموعدها في المستقبل
  const nextUpTasks = tasks
    .filter(task => !task.completed && new Date(task.dateTime) > new Date())
    .sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime())
    .slice(0, 3);

  // --- بيانات الرسم البياني لتوزيع الحالات ---
  const pieData = {
    labels: ['مكتملة', 'مؤجلة/متأخرة', 'جارية'],
    datasets: [
      {
        data: [completedCount, delayedOrOverdueCount, inProgressCount],
        backgroundColor: ['#22c55e', '#f59e0b', '#2563eb'],
        borderColor: ['#16a34a', '#d97706', '#1d4ed8'],
        borderWidth: 1,
      },
    ],
  };

  // --- بيانات الرسم البياني الزمني للمهام المنجزة يومياً خلال آخر 7 أيام ---
  const daysLabels: string[] = [];
  const completedPerDay: number[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const label = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
    daysLabels.push(label);
    completedPerDay.push(
      completedTasks.filter(task => task.completed && task.dateTime.slice(0, 10) === label).length
    );
  }
  const barData = {
    labels: daysLabels.map(d => d.slice(5)), // عرض الشهر/اليوم فقط
    datasets: [
      {
        label: 'مهام مكتملة',
        data: completedPerDay,
        backgroundColor: '#22c55e',
        borderColor: '#16a34a',
        borderWidth: 2,
      },
    ],
  };

  // --- حساب نسبة الإنجاز الأسبوعي ---
  // تحديد بداية ونهاية الأسبوع الحالي
  const today = new Date();
  const weekStartStats = new Date(today);
  weekStartStats.setDate(today.getDate() - today.getDay());
  weekStartStats.setHours(0, 0, 0, 0);
  const weekEndStats = new Date(weekStartStats);
  weekEndStats.setDate(weekStartStats.getDate() + 7);

  // جميع المهام (مكتملة وغير مكتملة) خلال الأسبوع
  const allWeekTasks = [...tasks, ...completedTasks].filter(task => {
    const d = new Date(task.dateTime);
    return d >= weekStartStats && d < weekEndStats;
  });
  const weekCompleted = allWeekTasks.filter(task => task.completed || task.status === 'completed').length;
  const weekTotal = allWeekTasks.length;
  const weekProgress = weekTotal > 0 ? Math.round((weekCompleted / weekTotal) * 100) : 0;

  // حساب مهام اليوم
  const todayDate = new Date();
  const todayKey = todayDate.toISOString().slice(0, 10);
  const todayTasksCount = tasks.filter(task => task.dateTime.slice(0, 10) === todayKey).length;

  // حساب مهام الأسبوع (من بداية الأسبوع حتى نهايته)
  const weekStartTab = new Date(todayDate);
  weekStartTab.setDate(todayDate.getDate() - todayDate.getDay());
  weekStartTab.setHours(0, 0, 0, 0);
  const weekEndTab = new Date(weekStartTab);
  weekEndTab.setDate(weekStartTab.getDate() + 7);
  const weekTasksCount = tasks.filter(task => {
    const d = new Date(task.dateTime);
    return d >= weekStartTab && d < weekEndTab;
  }).length;

  // حساب مهام الشهر (من بداية الشهر حتى نهايته)
  const monthStartTab = new Date(todayDate.getFullYear(), todayDate.getMonth(), 1);
  const monthEndTab = new Date(todayDate.getFullYear(), todayDate.getMonth() + 1, 1);
  const monthTasksCount = tasks.filter(task => {
    const d = new Date(task.dateTime);
    return d >= monthStartTab && d < monthEndTab;
  }).length;

  // حساب عدد المهام المتبقية اليوم (غير مكتملة وتاريخها اليوم)
  todayDate.setHours(0, 0, 0, 0);
  const tomorrowDate = new Date(todayDate);
  tomorrowDate.setDate(todayDate.getDate() + 1);
  const remainingTodayCount = tasks.filter(task => {
    const taskDate = new Date(task.dateTime);
    return (
      taskDate >= todayDate &&
      taskDate < tomorrowDate &&
      !task.completed &&
      task.status !== 'completed'
    );
  }).length;

  return (
    <Layout>
      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6">
        {/* الإشعارات */}
        <div className="fixed top-4 right-4 z-50 space-y-2 w-full max-w-xs sm:max-w-sm">
          {notifications.map((notification) => (
            <div
              key={notification.id}
              className={`p-3 sm:p-4 rounded-lg shadow-lg text-sm sm:text-base transform transition-all duration-300 ${
                notification.type === 'success' ? 'bg-green-100 text-green-800' :
                notification.type === 'error' ? 'bg-red-100 text-red-800' :
                notification.type === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                'bg-blue-100 text-blue-800'
              }`}
            >
              <div className="flex justify-between items-start">
                <p className="flex-1">{notification.message}</p>
                <button
                  onClick={() => closeNotification(notification.id)}
                  className="mr-2 text-gray-500 hover:text-gray-700"
                >
                  ×
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* التبويبات */}
        <div className="flex items-center justify-between mb-4 sm:mb-6 overflow-x-auto pb-2">
          <div className="flex space-x-2 sm:space-x-4">
          {['today', 'week', 'month'].map((tab) => (
          <button
              key={tab}
              onClick={() => setActiveTab(tab as 'today' | 'week' | 'month')}
              className={`px-3 sm:px-4 py-2 rounded-lg text-sm sm:text-base whitespace-nowrap ${
                activeTab === tab
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {tab === 'today' ? 'اليوم' : tab === 'week' ? 'الأسبوع' : 'الشهر'}
          </button>
          ))}
          </div>
          <div className="me-2">
            <ConnectionStatus online={online} />
          </div>
        </div>

        {/* قسم المهام القادمة */}
        <div className="bg-white border-r-4 border-indigo-400 rounded-lg p-3 sm:p-4 mb-4 sm:mb-6 shadow flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2">
              <span className="text-indigo-500 text-lg sm:text-xl">⏳</span>
              <h2 className="text-3xl font-bold text-[#1A1A1A] mb-4" style={{ fontFamily: 'Cairo, Tajawal, sans-serif' }}>المهام القادمة</h2>
            </div>
            <div className="text-sm text-gray-500 font-medium">
              {(() => {
                const d = new Date();
                const dayKey = d.toISOString().slice(0, 10);
                return `${weekDays[d.getDay()]} ${dayKey.replace(/\d{4}-/, '').replace('-', '/')}`;
              })()}
            </div>
          </div>
          {nextUpTasks.length === 0 ? (
            <div className="text-gray-500 text-xs sm:text-sm">لا توجد مهام قادمة قريبة.</div>
          ) : (
            <div className="flex flex-col gap-2 sm:gap-3">
              {nextUpTasks.map((task) => (
                <div key={task.id} className="flex items-center justify-between bg-indigo-50 rounded p-2 sm:p-3">
                  <div>
                    <div className="font-bold text-sm sm:text-base text-indigo-800">{task.title}</div>
                    <div className="text-xs text-gray-500 mt-1">{formatDateTime(task.dateTime)}</div>
                  </div>
                  <div className="text-xs sm:text-sm font-bold text-indigo-600">
                    {getCountdown(task.dateTime)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* عرض مختصر للمهام حسب التبويب */}
        <div className="bg-indigo-50 rounded-lg p-3 sm:p-4 mb-4 sm:mb-6">
          {activeTab === 'today' && (
            <div className="flex flex-col items-center gap-2">
              {(() => {
                const d = new Date();
                const dayKey = d.toISOString().slice(0, 10);
                const dayTasks = tasks.filter(task => task.dateTime.slice(0, 10) === dayKey);
                const mainType = getMainTaskType(dayTasks);
                return (
                  <div className={`text-center text-sm sm:text-base font-bold text-indigo-900 rounded-lg p-2 sm:p-3 shadow mb-2 ${mainType ? 'bg-blue-100' : 'bg-white'}`}>
                    {`اليوم (${weekDays[d.getDay()]}) ${dayKey.replace(/\d{4}-/, '').replace('-', '/')} : `}
                    {mainType ? `لديك ${taskTypeLabels[mainType]}` : 'لا توجد مهام'}
                  </div>
                );
              })()}
            </div>
          )}
          {activeTab === 'week' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
              {getWeekDays().map((day) => {
                const dayTasks = tasks.filter(task => isSameDay(new Date(task.dateTime), day));
                const mainType = getMainTaskType(dayTasks);
                const dayKey = `${day.getFullYear()}-${(day.getMonth()+1).toString().padStart(2,'0')}-${day.getDate().toString().padStart(2,'0')}`;
                return (
                  <div key={dayKey} className={`rounded-lg shadow p-2 sm:p-3 text-center text-xs sm:text-sm font-bold text-indigo-900 ${mainType ? 'bg-blue-100' : 'bg-white'}`}>
                    {`${weekDays[day.getDay()]} ${dayKey.replace(/\d{4}-/, '').replace('-', '/')} : `}
                    {mainType ? `لديك ${taskTypeLabels[mainType]}` : 'لا توجد مهام'}
                  </div>
                );
              })}
            </div>
          )}
          {activeTab === 'month' && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {getMonthDays().map((day) => {
                const dayTasks = tasks.filter(task => isSameDay(new Date(task.dateTime), day));
                const mainType = getMainTaskType(dayTasks);
                const dayKey = `${day.getFullYear()}-${(day.getMonth()+1).toString().padStart(2,'0')}-${day.getDate().toString().padStart(2,'0')}`;
                return (
                  <div key={dayKey} className={`rounded-lg shadow p-2 sm:p-3 text-center text-xs sm:text-sm font-bold text-indigo-900 ${mainType ? 'bg-blue-100' : 'bg-white'}`}>
                    {`${weekDays[day.getDay()]} ${dayKey.replace(/\d{4}-/, '').replace('-', '/')} : `}
                    {mainType ? `لديك ${taskTypeLabels[mainType]}` : 'لا توجد مهام'}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* قسم الأيام المزدحمة */}
        <div className="bg-white p-3 sm:p-4 rounded-lg mb-4 sm:mb-6 shadow-sm">
          {Object.values(busyDays).some(dayTasks => dayTasks.length >= 3) ? (
            <div className="mb-3 text-red-600 font-bold flex items-center gap-2">
              <CalendarDaysIcon className="w-4 h-4 sm:w-5 sm:h-5 text-red-500" />
              <span className="text-sm sm:text-base">انتبه! لديك أيام مزدحمة هذا الأسبوع</span>
            </div>
          ) : (
            <div className="mb-3 text-green-700 font-bold flex items-center gap-2">
              <CalendarDaysIcon className="w-4 h-4 sm:w-5 sm:h-5 text-green-500" />
              <span className="text-sm sm:text-base">أسبوعك منظم! استمر بهذا الأداء 👏</span>
            </div>
          )}
          <div className="flex flex-row items-center justify-between gap-2 px-2 relative">
            {Object.entries(busyDays).map(([dayKey, dayTasks], idx) => {
              const isBusy = dayTasks.length >= 3;
              const dayName = weekDays[(weekStartBusyDays.getDay() + idx) % 7];
              return (
                <div key={dayKey} className="flex flex-col items-center relative"
                  onClick={() => isBusy && setActiveBusyDay(dayKey)}
                  style={{ cursor: isBusy ? 'pointer' : 'default' }}
                >
                  <div className={`flex items-center justify-center rounded-full transition-all duration-200 ${isBusy ? 'bg-red-100 text-red-600 border border-red-300' : 'bg-gray-200 text-gray-400'} w-8 h-8 sm:w-10 sm:h-10 mb-1 font-bold relative`}>
                    {isBusy ? <span className="text-sm sm:text-lg">🔥 {dayTasks.length}</span> : <span className="w-2 h-2 rounded-full bg-gray-400 inline-block"></span>}
                  </div>
                  <span className={`text-xs sm:text-sm font-bold ${isBusy ? 'text-red-600' : 'text-gray-400'}`}>{dayName}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* نافذة منبثقة لعرض مهام اليوم المزدحم */}
        {activeBusyDay && busyDays[activeBusyDay] && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50" onClick={() => setActiveBusyDay(null)}>
            <div className="bg-white border border-red-200 shadow-lg rounded-lg p-3 sm:p-4 min-w-[220px] max-w-xs text-xs sm:text-sm text-right animate-fade-in relative" onClick={e => e.stopPropagation()}>
              <button className="absolute top-2 left-2 text-red-500 text-lg font-bold" onClick={() => setActiveBusyDay(null)} aria-label="إغلاق">×</button>
              <div className="font-bold text-red-600 mb-2 flex items-center gap-1"><span>🔥</span>مهام هذا اليوم:</div>
              <ul className="space-y-1">
                {busyDays[activeBusyDay].slice(0, 8).map((task, i) => (
                  <li key={task.id || i} className="flex items-center gap-1">
                    <span className="text-indigo-700 font-bold">{task.title}</span>
                    <span className="text-gray-500">({taskTypeLabels[task.type] || 'أخرى'})</span>
                  </li>
                ))}
                {busyDays[activeBusyDay].length > 8 && <li className="text-gray-400">والمزيد...</li>}
              </ul>
            </div>
          </div>
        )}

        {/* البطاقات الأربع */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-6 mb-6">
          <div className="bg-white rounded-lg shadow p-4 flex flex-col items-center border-r-4 border-indigo-400">
            <span className="text-2xl font-bold text-indigo-700 mb-1">{totalTasksCount}</span>
            <span className="text-xs text-gray-500 font-bold">إجمالي المهام</span>
          </div>
          <div className="bg-white rounded-lg shadow p-4 flex flex-col items-center border-r-4 border-green-400">
            <span className="text-2xl font-bold text-green-700 mb-1">{completedCount}</span>
            <span className="text-xs text-gray-500 font-bold">مهام مكتملة</span>
          </div>
          <div className="bg-white rounded-lg shadow p-4 flex flex-col items-center border-r-4 border-yellow-400">
            <span className="text-2xl font-bold text-yellow-700 mb-1">{delayedOrOverdueCount}</span>
            <span className="text-xs text-gray-500 font-bold">مهام متأخرة</span>
          </div>
          <div className="bg-white rounded-lg shadow p-4 flex flex-col items-center border-r-4 border-blue-400">
            <span className="text-2xl font-bold text-blue-700 mb-1">{remainingTodayCount}</span>
            <span className="text-xs text-gray-500 font-bold">مهام اليوم المتبقية</span>
          </div>
        </div>

        {/* شريط اليوم (Timeline) */}
        <div className="bg-gray-50 p-4 sm:p-6 rounded-lg mb-4 sm:mb-6">
          <div className="flex items-center gap-2 mb-3 sm:mb-4">
            <ClockIcon className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-500" />
            <h2 className="text-base sm:text-xl font-bold">شريط اليوم</h2>
          </div>
          <div className="flex flex-row items-center gap-1 overflow-x-auto">
            {hours.map((h, idx) => {
              const hourTasks = todayTasks.filter(task => new Date(task.dateTime).getHours() === h);
              const nowHour = new Date().getHours();
              return (
                <div key={h} className="flex flex-col items-center w-6 sm:w-8 md:w-10 group relative">
                  <div
                    className={`h-5 w-5 sm:h-6 sm:w-6 md:h-8 md:w-8 rounded-full mb-1 transition-all duration-200 cursor-pointer border-2 border-white shadow`}
                    style={{ background: getHourColor(h, todayTasks, nowHour) }}
                  >
                  </div>
                  {/* Tooltip عند الـ hover */}
                  {hourTasks.length > 0 && (
                    <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 hidden group-hover:block bg-white text-gray-800 text-xs rounded shadow-lg px-2 py-1 min-w-[90px] text-center animate-fade-in border border-gray-200">
                      {hourTasks.length === 1
                        ? hourTasks[0].title
                        : `${hourTasks.length} مهام في هذه الساعة`}
                    </div>
                  )}
                  <span className="text-[8px] sm:text-[10px] text-gray-700">{h}:00</span>
                </div>
              );
            })}
          </div>
          <div className="text-xs text-gray-500 mt-2 flex gap-4">
            <span><span className="inline-block w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-red-400 mr-1"></span> مزدحم</span>
            <span><span className="inline-block w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-green-300 mr-1"></span> متاح</span>
          </div>
        </div>

        {/* قسم الإنجازات والتحفيز */}
        <div className="mb-8 sm:mb-12 mt-6 sm:mt-8 bg-white rounded-lg shadow p-4 sm:p-6 flex flex-col items-center">
          <h3 className="font-bold text-base sm:text-lg mb-3 sm:mb-4">إنجازك هذا الأسبوع</h3>
          <div className="w-full max-w-xl flex flex-col gap-2">
            <div className="w-full bg-gray-200 rounded-full h-4 sm:h-6 overflow-hidden relative">
              <div
                className="h-4 sm:h-6 bg-gradient-to-l from-green-400 to-green-600 text-right pr-2 sm:pr-3 flex items-center text-white font-bold text-xs sm:text-sm transition-all duration-700"
                style={{ width: `${weekProgress}%` }}
              >
                {/* النسبة المئوية تظهر دائمًا في منتصف الشريط */}
                <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-xs sm:text-sm font-bold text-white drop-shadow" style={{whiteSpace:'nowrap'}}>
                  {weekProgress}%
                </span>
              </div>
            </div>
            <div className="text-center text-xs sm:text-sm mt-2">
              {weekTotal === 0
                ? 'ابدأ أسبوعك بإنجاز أول مهمة!'
                : weekProgress === 100
                  ? 'مبروك! أنجزت جميع مهام هذا الأسبوع 🎉'
                  : `أنجزت ${weekCompleted} من أصل ${weekTotal} مهمة هذا الأسبوع.`}
            </div>
          </div>
        </div>

        {error && (
          <div className="text-red-500 text-center mt-4 text-sm sm:text-base">{error}</div>
        )}
        {loading && (
          <div className="text-center py-8 text-gray-500 text-sm sm:text-base">جاري التحميل...</div>
        )}
    </div>
    </Layout>
  );
}
