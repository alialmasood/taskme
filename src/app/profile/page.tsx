'use client';
import { useEffect, useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { doc, getDoc, collection, query, where, getDocs, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Layout from '@/components/Layout';
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
import { signOut, updateProfile, updatePassword } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { ArrowRightOnRectangleIcon, ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline';
import PhoneInput from 'react-phone-input-2';
import 'react-phone-input-2/lib/style.css';

// تنسيقات مخصصة لحقل الهاتف
const phoneInputStyles = `
  .phone-input-container {
    direction: rtl;
    margin-bottom: 1rem;
  }
  .react-tel-input {
    direction: rtl;
    text-align: right;
  }
  .react-tel-input .flag-dropdown {
    order: 2;
    border-radius: 0 0.375rem 0.375rem 0 !important;
    margin-left: 0 !important;
    margin-right: 0.5rem !important;
    background-color: #f3f4f6 !important;
    border: 1px solid #e5e7eb !important;
  }
  .react-tel-input .form-control {
    border-radius: 0.375rem 0 0 0.375rem !important;
    border: 1px solid #e5e7eb !important;
    width: 100% !important;
    height: 2.5rem !important;
    font-size: 0.875rem !important;
    text-align: right !important;
    padding-right: 50px !important;
    padding-left: 10px !important;
  }
  .react-tel-input .form-control:focus {
    border-color: #818cf8 !important;
    box-shadow: 0 0 0 2px rgba(129, 140, 248, 0.2) !important;
  }
  .react-tel-input .selected-flag {
    flex-direction: row-reverse !important;
    justify-content: flex-end !important;
  }
  .react-tel-input .selected-flag .flag {
    margin-left: 0.5rem !important;
    margin-right: 0 !important;
  }
`;

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, PointElement, LineElement);

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

const taskTypeIcons: { [key: string]: string } = {
  work: '🧑‍💼',
  family: '👨‍👩‍👧‍👦',
  shopping: '🛒',
  travel: '🧳',
  outing: '🍃',
  meeting: '📅',
  gathering: '🤝',
  company: '🏢',
  other: '🗂️',
};

export default function ProfilePage() {
  const { user, loading } = useAuth();
  const [userName, setUserName] = useState('');
  const [userPhone, setUserPhone] = useState('');
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [tasks, setTasks] = useState<any[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState(userName);
  const [editPassword, setEditPassword] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState('');
  const [editSuccess, setEditSuccess] = useState('');
  const [showReport, setShowReport] = useState(false);
  const [showAllActivities, setShowAllActivities] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  useEffect(() => {
    const fetchUserName = async () => {
      if (user?.uid) {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          setUserName(data.name || data.displayName || data.email || 'مستخدم');
          setEditPhone(data.phone || '');
          setUserPhone(data.phone || '');
        } else {
          setUserName(user.displayName || user.email || 'مستخدم');
        }
      }
      setLoadingProfile(false);
    };
    fetchUserName();
  }, [user]);

  useEffect(() => {
    const fetchTasks = async () => {
      if (user?.uid) {
        setLoadingTasks(true);
        const q = query(collection(db, 'tasks'), where('userId', '==', user.uid));
        const snapshot = await getDocs(q);
        setTasks(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        setLoadingTasks(false);
      }
    };
    fetchTasks();
  }, [user]);

  useEffect(() => {
    setEditName(userName);
  }, [userName]);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      window.location.href = '/login';
    } catch (error) {
      alert('حدث خطأ أثناء تسجيل الخروج');
    }
  };

  if (loading || loadingProfile) {
    return <div>جاري التحميل...</div>;
  }

  // تحليل المهام
  const typeStats: { [key: string]: { total: number; completed: number; delayed: number } } = {};
  tasks.forEach(task => {
    if (!typeStats[task.type]) typeStats[task.type] = { total: 0, completed: 0, delayed: 0 };
    typeStats[task.type].total++;
    if (task.completed || task.status === 'completed') typeStats[task.type].completed++;
    if (task.status === 'delayed' || (task.status === 'in_progress' && new Date(task.dateTime) < new Date())) typeStats[task.type].delayed++;
  });

  // استخراج الإحصائيات
  const mostFrequentType = Object.entries(typeStats).sort((a, b) => b[1].total - a[1].total)[0]?.[0];
  const mostCompletedType = Object.entries(typeStats).sort((a, b) => b[1].completed - a[1].completed)[0]?.[0];
  const leastCompletedType = Object.entries(typeStats).sort((a, b) => a[1].completed - b[1].completed)[0]?.[0];
  const mostDelayedType = Object.entries(typeStats).sort((a, b) => b[1].delayed - a[1].delayed)[0]?.[0];

  // تحليل ذكي نصي مبسط
  let aiAnalysis = '';
  if (mostDelayedType && typeStats[mostDelayedType].delayed > 0) {
    aiAnalysis += `لاحظنا أن أكثر المهام تأجيلاً هي من نوع "${mostDelayedType}". حاول جدولة هذا النوع في أوقات أكثر ملاءمة أو تقسيمه إلى مهام أصغر.\n`;
  }
  if (mostCompletedType && typeStats[mostCompletedType].completed > 0) {
    aiAnalysis += `أنت متميز في إنجاز مهام "${mostCompletedType}". استمر بهذا الأداء!\n`;
  }
  if (leastCompletedType && typeStats[leastCompletedType].completed === 0) {
    aiAnalysis += `يوجد بعض التحديات في إنجاز مهام "${leastCompletedType}". حاول مراجعة أسباب التأجيل أو الصعوبة في هذا النوع.`;
  }

  // بيانات الرسوم البيانية
  const completedCount = tasks.filter(t => t.completed || t.status === 'completed').length;
  const nowDate = new Date();
  const delayedOrOverdueCount = tasks.filter(task => (task.status === 'delayed') || (task.status === 'in_progress' && new Date(task.dateTime) < nowDate)).length;
  const inProgressCount = tasks.filter(task => !task.completed && task.status !== 'completed' && !(task.status === 'delayed' || (task.status === 'in_progress' && new Date(task.dateTime) < nowDate))).length;

  // دالة تنسيق التاريخ مع يوم الأسبوع (للاستخدام عند الحاجة)
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

  // رسم بياني شريطي للمهام المنجزة يومياً خلال آخر 7 أيام
  const daysLabels: string[] = [];
  const completedPerDay: number[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const label = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
    daysLabels.push(label);
    completedPerDay.push(
      tasks.filter(task => (task.completed || task.status === 'completed') && task.dateTime.slice(0, 10) === label).length
    );
  }
  const barData = {
    labels: daysLabels.map(d => d.slice(5)),
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

  return (
    <Layout>
      <div className="flex flex-col items-center justify-center min-h-[30vh] mt-2 mb-6">
        <div className="bg-white rounded-2xl shadow-lg p-4 w-full max-w-sm flex flex-col items-center gap-3">
          {/* صورة شخصية دائرية أصغر */}
          <div className="w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center overflow-hidden border-4 border-indigo-200 shadow">
            <img
              src={user?.photoURL || '/avatar-placeholder.png'}
              alt="الصورة الشخصية"
              className="w-full h-full object-cover"
            />
          </div>
          {/* اسم المستخدم */}
          <div className="text-lg font-bold text-gray-800">{userName}</div>
          {/* رقم الهاتف */}
          <div className="flex items-center gap-2 text-gray-600 text-sm">
            <span className="text-base">📞</span>
            <span dir="ltr">{userPhone || 'غير محدد'}</span>
          </div>
          {/* الأزرار */}
          <div className="flex gap-2 w-full mt-1">
            <button
              onClick={() => setShowEditModal(true)}
              className="flex-1 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg py-2 text-sm font-semibold flex items-center justify-center gap-2 transition"
            >
              <span>✏️</span> تعديل البيانات
            </button>
            <button
              onClick={() => alert('إعدادات قادمة قريباً')}
              className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg py-2 text-sm font-semibold flex items-center justify-center gap-2 transition"
            >
              <span>⚙️</span> إعدادات
            </button>
          </div>
        </div>
      </div>
      {/* نافذة منبثقة لتعديل المعلومات */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50" onClick={() => setShowEditModal(false)}>
          <div className="bg-white rounded-lg shadow-2xl p-5 max-w-xs w-full relative animate-fade-in" onClick={e => e.stopPropagation()}>
            <button className="absolute top-2 left-2 text-indigo-500 text-lg font-bold" onClick={() => setShowEditModal(false)} aria-label="إغلاق">×</button>
            <h2 className="text-lg font-bold mb-4 text-indigo-800 text-center">تعديل المعلومات الشخصية</h2>
            <form
              onSubmit={async e => {
                e.preventDefault();
                setEditLoading(true);
                setEditError('');
                setEditSuccess('');
                try {
                  if (!user) throw new Error('المستخدم غير موجود');
                  // تحديث الاسم في Firestore وAuth
                  if (editName && editName !== userName) {
                    await updateProfile(user, { displayName: editName });
                    await updateDoc(doc(db, 'users', user.uid), { 
                      name: editName,
                      phone: editPhone 
                    });
                    setUserName(editName);
                  } else if (editPhone) {
                    await updateDoc(doc(db, 'users', user.uid), { 
                      phone: editPhone 
                    });
                  }
                  // تحديث كلمة المرور إذا تم إدخالها
                  if (editPassword) {
                    await updatePassword(user, editPassword);
                  }
                  setEditSuccess('تم تحديث المعلومات بنجاح');
                  setShowEditModal(false);
                } catch (err: any) {
                  setEditError(err.message || 'حدث خطأ أثناء التحديث');
                } finally {
                  setEditLoading(false);
                }
              }}
              className="flex flex-col gap-3"
            >
              <label className="text-sm font-bold text-gray-700">الاسم</label>
              <input
                type="text"
                className="border rounded px-3 py-2 text-sm focus:outline-none focus:ring focus:border-indigo-400"
                value={editName}
                onChange={e => setEditName(e.target.value)}
                required
              />
              <label className="text-sm font-bold text-gray-700">كلمة المرور الجديدة (اختياري)</label>
              <input
                type="password"
                className="border rounded px-3 py-2 text-sm focus:outline-none focus:ring focus:border-indigo-400"
                value={editPassword}
                onChange={e => setEditPassword(e.target.value)}
                minLength={6}
                placeholder="••••••"
              />
              <label className="text-sm font-bold text-gray-700">رقم الهاتف</label>
              <PhoneInput
                country={'iq'}
                value={editPhone}
                onChange={phone => setEditPhone(phone)}
                inputClass="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring focus:border-indigo-400"
                containerClass="phone-input-container"
                buttonClass="phone-input-button"
                dropdownClass="phone-input-dropdown"
                searchClass="phone-input-search"
                specialLabel=""
                inputProps={{
                  required: true,
                  placeholder: '7xxxxxxxx'
                }}
              />
              {editError && <div className="text-red-500 text-xs mt-1">{editError}</div>}
              {editSuccess && <div className="text-green-600 text-xs mt-1">{editSuccess}</div>}
              <button
                type="submit"
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 rounded mt-2 transition"
                disabled={editLoading}
              >{editLoading ? 'جاري الحفظ...' : 'حفظ التغييرات'}</button>
            </form>
          </div>
        </div>
      )}
      {/* تقرير الأعمال (Accordion) */}
      <div className="bg-white rounded-lg shadow p-3 sm:p-4 mt-4 sm:mt-8">
        <button
          className="flex items-center justify-between w-full text-right focus:outline-none"
          onClick={() => setShowReport((prev) => !prev)}
        >
          <span className="flex items-center gap-2 text-base sm:text-lg font-bold text-indigo-700">
            <span className="text-2xl">📊</span>
            تقرير المهام
          </span>
          {showReport ? (
            <ChevronUpIcon className="w-6 h-6 text-indigo-500" />
          ) : (
            <ChevronDownIcon className="w-6 h-6 text-indigo-500" />
          )}
        </button>
        {showReport && (
          <div className="mt-4 space-y-2 sm:space-y-3 border-t pt-4">
            <div className="flex items-center gap-2 text-green-700 text-sm sm:text-base">
              <span className="text-lg">✅</span>
              <span>أكثر المهام إنجازًا:</span>
              <span className="font-bold">{mostCompletedType ? taskTypeLabels[mostCompletedType] : '—'}</span>
            </div>
            <div className="flex items-center gap-2 text-red-700 text-sm sm:text-base">
              <span className="text-lg">❌</span>
              <span>أقل المهام إنجازًا:</span>
              <span className="font-bold">{leastCompletedType ? taskTypeLabels[leastCompletedType] : '—'}</span>
            </div>
            <div className="flex items-center gap-2 text-yellow-700 text-sm sm:text-base">
              <span className="text-lg">⏳</span>
              <span>أكثر المهام تأجيلًا:</span>
              <span className="font-bold">{mostDelayedType ? taskTypeLabels[mostDelayedType] : '—'}</span>
            </div>
            <div className="flex items-center gap-2 text-indigo-700 text-sm sm:text-base">
              <span className="text-lg">🔁</span>
              <span>أكثر المهام تكرارًا:</span>
              <span className="font-bold">{mostFrequentType ? taskTypeLabels[mostFrequentType] : '—'}</span>
            </div>
            {aiAnalysis && (
              <div className="bg-indigo-50 rounded-lg p-2 sm:p-3 mt-3 sm:mt-4 text-xs sm:text-sm text-indigo-900 whitespace-pre-line">
                <span className="font-bold text-indigo-700">تلميح:</span>
                <br />
                {aiAnalysis}
              </div>
            )}
          </div>
        )}
      </div>
      {/* سجل النشاطات */}
      <div className="bg-white rounded-lg shadow p-3 sm:p-4 mt-6">
        <h2 className="text-base sm:text-lg font-bold text-indigo-700 mb-3 sm:mb-4">سجل النشاطات</h2>
        {loadingTasks ? (
          <div className="text-center text-gray-500 text-sm sm:text-base">جاري تحميل النشاطات...</div>
        ) : tasks.length === 0 ? (
          <div className="text-center text-gray-400 text-sm sm:text-base">لا يوجد نشاطات بعد.</div>
        ) : (
          <div className="flex flex-col gap-3">
            {(showAllActivities
              ? tasks
                  .sort((a, b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime())
                  .slice(0, 10)
              : tasks
                  .sort((a, b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime())
                  .slice(0, 2)
            ).map((task) => {
              const date = new Date(task.dateTime);
              const dayName = date.toLocaleDateString('ar-EG', { weekday: 'long' });
              const day = date.getDate();
              const month = date.getMonth() + 1;
              const hour = date.getHours();
              const minute = date.getMinutes();
              const ampm = hour >= 12 ? 'م' : 'ص';
              const hour12 = hour % 12 === 0 ? 12 : hour % 12;
              return (
                <div
                  key={task.id}
                  className={`rounded-xl p-3 flex flex-col gap-1 shadow-sm border border-gray-100 bg-gray-50`}
                  style={{ fontSize: '1rem' }}
                >
                  <div className="flex items-center gap-2 text-gray-500 text-xs mb-1">
                    <span className="text-base">📅</span>
                    <span>{dayName} {day}/{month} - الساعة {hour12}:{minute.toString().padStart(2, '0')} {ampm}</span>
                  </div>
                  <div className="flex items-center gap-2 text-indigo-700 font-semibold text-sm">
                    <span className="text-lg">{taskTypeIcons[task.type] || taskTypeIcons['other']}</span>
                    <span>{taskTypeLabels[task.type] || 'أخرى'}</span>
                    <span className="text-gray-400">-</span>
                    <span className="truncate">{task.title}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    {task.completed || task.status === 'completed' ? (
                      <span className="bg-green-100 text-green-700 rounded-full px-2 py-0.5 text-xs flex items-center gap-1">
                        <span className="text-base">✅</span> مكتملة
                      </span>
                    ) : task.status === 'delayed' ? (
                      <span className="bg-yellow-100 text-yellow-700 rounded-full px-2 py-0.5 text-xs flex items-center gap-1">
                        <span className="text-base">⏳</span> مؤجلة
                      </span>
                    ) : (
                      <span className="bg-blue-100 text-blue-700 rounded-full px-2 py-0.5 text-xs flex items-center gap-1">
                        <span className="text-base">🕒</span> جارية
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
            {tasks.length > 2 && !showAllActivities && (
              <button
                className="mx-auto mt-2 px-4 py-1 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-full text-sm font-bold transition"
                onClick={() => setShowAllActivities(true)}
              >
                عرض المزيد
              </button>
            )}
            {showAllActivities && tasks.length > 2 && (
              <button
                className="mx-auto mt-2 px-4 py-1 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-full text-sm font-bold transition"
                onClick={() => setShowAllActivities(false)}
              >
                عرض أقل
              </button>
            )}
          </div>
        )}
      </div>

      {/* قسم الإحصائيات */}
      <div className="mt-4 sm:mt-8 mb-4 sm:mb-8 grid grid-cols-1 gap-4 sm:gap-8">
        <div className="bg-white rounded-lg shadow p-3 sm:p-6 flex flex-col items-center">
          <h3 className="font-bold text-base sm:text-lg mb-3 sm:mb-4">توزيع المهام حسب الحالة</h3>
          <div className="w-full max-w-[250px] sm:max-w-[300px]">
            <Pie data={pieData} options={{
              responsive: true,
              maintainAspectRatio: true,
              plugins: {
                legend: {
                  position: 'bottom',
                  labels: {
                    font: {
                      size: 12
                    }
                  }
                }
              }
            }} />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-3 sm:p-6 flex flex-col items-center">
          <h3 className="font-bold text-base sm:text-lg mb-3 sm:mb-4">عدد المهام المنجزة يومياً (آخر 7 أيام)</h3>
          <div className="w-full max-w-[250px] sm:max-w-[300px]">
            <Bar data={barData} options={{
              responsive: true,
              maintainAspectRatio: true,
              plugins: {
                legend: {
                  display: false
                }
              },
              scales: {
                y: {
                  beginAtZero: true,
                  ticks: {
                    font: {
                      size: 12
                    }
                  }
                },
                x: {
                  ticks: {
                    font: {
                      size: 12
                    }
                  }
                }
              }
            }} />
          </div>
        </div>
      </div>

      {/* زر تسجيل الخروج في الأسفل */}
      <div className="flex justify-center mt-8 mb-2">
        <button
          onClick={() => setShowLogoutConfirm(true)}
          className="flex items-center gap-2 px-5 py-3 bg-red-50 hover:bg-red-100 text-red-600 font-bold rounded-lg shadow transition-colors text-base"
        >
          <ArrowRightOnRectangleIcon className="w-6 h-6" />
          تسجيل الخروج
        </button>
      </div>
      {/* نافذة تأكيد تسجيل الخروج */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50" onClick={() => setShowLogoutConfirm(false)}>
          <div className="bg-white rounded-lg shadow-2xl p-6 max-w-xs w-full relative animate-fade-in" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold mb-4 text-red-700 text-center">تأكيد تسجيل الخروج</h2>
            <p className="text-gray-700 text-center mb-6">هل أنت متأكد أنك تريد تسجيل الخروج؟</p>
            <div className="flex justify-between gap-3">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded font-bold"
              >إلغاء</button>
              <button
                onClick={handleSignOut}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded font-bold"
              >تأكيد</button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
} 