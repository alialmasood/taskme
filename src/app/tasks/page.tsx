'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { collection, query, where, orderBy, getDocs, deleteDoc, doc, setDoc, getDoc, updateDoc, addDoc, onSnapshot, limit, startAfter } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { getAuth } from 'firebase/auth';
import Layout from '@/components/Layout';
import { collection as fsCollection, query as fsQuery, where as fsWhere, orderBy as fsOrderBy, getDocs as fsGetDocs } from 'firebase/firestore';
import { AnimatePresence, motion } from 'framer-motion';
import { requestForToken, checkFcmSupport } from '@/lib/firebase-messaging';
import { TrashIcon } from '@heroicons/react/24/outline';

interface Task {
  id: string;
  title: string;
  details: string;
  type: string;
  dateTime: string;
  status: string;
  completed: boolean;
  createdAt: string;
  updatedAt: string;
  userId: string;
  priority?: string;
  reminder?: number;
  participants?: string[];
  sharedWith?: string[];
  originalCreator?: string;
}

interface Message {
  id: string;
  taskId: string;
  senderId: string;
  receiverId: string;
  senderName: string;
  content: string;
  timestamp: string;
  read: boolean;
}

interface User {
  uid: string;
  email: string;
  displayName: string | null;
}

interface UserData {
  uid: string;
  email: string | null;
  displayName: string | null;
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

const priorityLabels: { [key: string]: { label: string; icon: string; color: string } } = {
  high: { label: 'عالية', icon: '🔴', color: 'text-[#EF4444]' },
  medium: { label: 'متوسطة', icon: '🟡', color: 'text-[#F59E0B]' },
  low: { label: 'منخفضة', icon: '🟢', color: 'text-[#10B981]' },
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

// دالة لتنسيق التاريخ والوقت بشكل مختصر وجميل
const formatShortDateTime = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleString('ar-EG', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
};

interface TaskCardProps {
  task: Task;
  onDelete: (taskId: string) => Promise<void>;
  onStatusChange: (taskId: string, newStatus: string) => void;
}

const TaskCard = ({ task, onDelete, onStatusChange }: TaskCardProps) => {
  const { user } = useAuth();
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [showShareOptions, setShowShareOptions] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [showUsersModal, setShowUsersModal] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [error, setError] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [longPressTimeout, setLongPressTimeout] = useState<NodeJS.Timeout | null>(null);
  const [selectedMessage, setSelectedMessage] = useState<string | null>(null);
  const [userNames, setUserNames] = useState<{ [uid: string]: string }>({});
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [removingUserId, setRemovingUserId] = useState<string | null>(null);

  const syncUserToFirestore = async (userData: any) => {
    const userRef = doc(db, 'users', userData.uid);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      await setDoc(userRef, {
        uid: userData.uid,
        email: userData.email,
        displayName: userData.displayName || userData.email?.split('@')[0] || 'مستخدم',
        createdAt: new Date().toISOString()
      });
    }
  };

  const fetchUsers = async () => {
    if (!user) {
      setError('يجب تسجيل الدخول أولاً');
      return;
    }

    try {
      setLoadingUsers(true);
      setError('');

     // جلب المستخدمين من Firebase Authentication
const response = await fetch('/api/users');
const data = await response.json();
const authUsers = data.users || [];

if (!authUsers || data.error) {
  throw new Error(data?.error || 'خطأ في جلب المستخدمين');
}

      // جلب بيانات Firestore لكل مستخدم
      const usersData = await Promise.all(
        authUsers
          .filter((authUser: any) => authUser.uid !== user.uid)
          .map(async (authUser: any) => {
            const userRef = doc(db, 'users', authUser.uid);
            const userDoc = await getDoc(userRef);
            let name = '';
            if (userDoc.exists()) {
              name = userDoc.data().name || '';
            }
            return {
              uid: authUser.uid,
              email: authUser.email,
              displayName: name || authUser.displayName || authUser.email?.split('@')[0] || 'مستخدم'
            };
          })
      );

      setUsers(usersData);
      if (usersData.length === 0) {
        setError('لا يوجد مستخدمين آخرين حالياً');
      }

    } catch (err) {
      console.error('Error in fetchUsers:', err);
      setError('حدث خطأ في جلب المستخدمين. الرجاء المحاولة مرة أخرى.');
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleEdit = () => {
    router.push(`/tasks/edit/${task.id}`);
  };

  const handleShare = () => {
    setShowUsersModal(true);
    fetchUsers();
  };

  const handleShareWhatsApp = () => {
    const text = encodeURIComponent(`${task.title}\n${task.details}\nالموعد: ${formatDateTime(task.dateTime)}`);
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  const copyToClipboard = async () => {
    try {
      const text = `${task.title}\n${task.details}\nالموعد: ${formatDateTime(task.dateTime)}`;
      await navigator.clipboard.writeText(text);
      alert('تم نسخ تفاصيل المهمة');
    } catch (error) {
      console.error('Error copying to clipboard:', error);
    }
    setShowShareOptions(false);
  };

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      await onDelete(task.id);
    } catch (error) {
      console.error('Error deleting task:', error);
    } finally {
      setIsDeleting(false);
      setShowConfirmDelete(false);
    }
  };

  const getStatusBadge = () => {
    const taskDate = new Date(task.dateTime);
    const currentDate = new Date();
    const isOverdue = taskDate < currentDate;

    // إذا كانت المهمة مكتملة
    if (task.completed) {
      return (
        <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
          مكتملة
        </span>
      );
    }
    
    // إذا كانت المهمة مؤجلة
    if (task.status === 'delayed') {
      return (
        <span className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
          </svg>
          مؤجلة
        </span>
      );
    }
    
    // إذا كانت المهمة متأخرة (تجاوزت تاريخها)
    if (isOverdue) {
      return (
        <span className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
          </svg>
          متأخرة
        </span>
      );
    }
    
    // إذا كانت المهمة قيد التنفيذ
    return (
      <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.707l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L9 9.414V13a1 1 0 102 0V9.414l1.293 1.293a1 1 0 001.414-1.414z" clipRule="evenodd" />
        </svg>
        قيد التنفيذ
      </span>
    );
  };

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return 'منذ أقل من دقيقة';
    if (diffInSeconds < 3600) return `منذ ${Math.floor(diffInSeconds / 60)} دقيقة`;
    if (diffInSeconds < 86400) return `منذ ${Math.floor(diffInSeconds / 3600)} ساعة`;
    if (diffInSeconds < 2592000) return `منذ ${Math.floor(diffInSeconds / 86400)} يوم`;
    return formatDateTime(dateString);
  };

  // دالة مشاركة المهمة مع مستخدم آخر
  const shareTaskWithUser = async (targetUser: User) => {
    try {
      const taskRef = doc(db, 'tasks', task.id);
      const taskDoc = await getDoc(taskRef);
      
      if (!taskDoc.exists()) {
        throw new Error('المهمة غير موجودة');
      }

      const currentSharedWith = taskDoc.data().sharedWith || [];
      const currentParticipants = taskDoc.data().participants || [];

      // إضافة المستخدم الجديد إلى قائمة المشاركين والمشاركة
      const updatedSharedWith = [...new Set([...currentSharedWith, targetUser.uid])];
      const updatedParticipants = [...new Set([...currentParticipants, targetUser.uid])];

      // تحديث المهمة في Firestore
      await updateDoc(taskRef, {
        sharedWith: updatedSharedWith,
        participants: updatedParticipants,
        updatedAt: new Date().toISOString()
      });

      // إضافة إشعار للمستخدم الجديد
      await addDoc(collection(db, 'notifications'), {
        userId: targetUser.uid,
        taskId: task.id,
        type: 'task_shared',
        message: `تمت مشاركة مهمة "${task.title}" معك`,
        createdAt: new Date().toISOString(),
        read: false
      });

      // إضافة رسالة ترحيبية في المحادثة
      await addDoc(collection(db, 'messages'), {
        taskId: task.id,
        senderId: user?.uid,
        senderName: user?.displayName || user?.email || 'مستخدم',
        content: `تمت مشاركة هذه المهمة مع ${targetUser.displayName || targetUser.email}`,
        timestamp: new Date().toISOString(),
        read: false
      });

      alert(`تمت مشاركة المهمة مع ${targetUser.displayName || targetUser.email}`);
    } catch (error) {
      console.error('Error sharing task:', error);
      alert('حدث خطأ أثناء مشاركة المهمة');
    }
  };

  // عند فتح تفاصيل المهمة، إذا كان هناك مشاركان فقط، حدد الطرف الآخر تلقائيًا
  useEffect(() => {
    if (task.participants && user && user.uid) {
      const others = task.participants.filter(uid => uid !== user.uid);
      if (others.length === 1) {
        setSelectedUserId(others[0]);
      } else {
        setSelectedUserId(null); // يجب على المستخدم اختيار الطرف الآخر
      }
    }
  }, [task.participants, user]);

  // الاستماع للرسائل في الوقت الفعلي
  useEffect(() => {
    if (!user || !task.id) return;

    // إنشاء استعلام للرسائل الخاصة بهذه المهمة
    const messagesQuery = query(
      collection(db, 'messages'),
      where('taskId', '==', task.id),
      orderBy('timestamp', 'asc')
    );

    // الاشتراك في التحديثات المباشرة
    const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
      const messagesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Message[];
      setMessages(messagesData);
      
      // التمرير التلقائي إلى آخر رسالة
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }, (error) => {
      console.error("Error fetching messages:", error);
      setError('حدث خطأ في تحميل الرسائل');
    });

    return () => unsubscribe();
  }, [task.id, user]);

  // دالة إرسال رسالة جديدة
  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newMessage.trim()) return;

    try {
      const messageData = {
        taskId: task.id,
        senderId: user.uid,
        senderName: user.displayName || user.email || 'مستخدم',
        content: newMessage.trim(),
        timestamp: new Date().toISOString(),
        read: false
      };

      await addDoc(collection(db, 'messages'), messageData);
      setNewMessage('');

      // إرسال إشعار FCM للطرف الآخر (أول مشارك غير المرسل)
      let receiverId = null;
      if (task.participants && Array.isArray(task.participants)) {
        receiverId = task.participants.find(uid => uid !== user.uid);
      } else if (task.userId && task.userId !== user.uid) {
        receiverId = task.userId;
      }
      if (receiverId) {
        await fetch('/api/send-fcm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            toUserId: receiverId,
            title: 'رسالة جديدة',
            body: `${user.displayName || user.email || 'مستخدم'}: ${newMessage.trim()}`
          })
        });
      }
    } catch (err) {
      console.error('Error sending message:', err);
      setError('حدث خطأ أثناء إرسال الرسالة');
    }
  };

  // دالة حذف الرسالة
  const deleteMessage = async (messageId: string) => {
    try {
      await deleteDoc(doc(db, 'messages', messageId));
      setSelectedMessage(null);
      setShowDeleteConfirm(null);
    } catch (err) {
      console.error('Error deleting message:', err);
      setError('حدث خطأ أثناء حذف الرسالة');
    }
  };

  // دالة معالجة الضغط المطول
  const handleLongPress = (messageId: string) => {
    const timeout = setTimeout(() => {
      setSelectedMessage(messageId);
      if (window.navigator.vibrate) {
        window.navigator.vibrate(50);
      }
    }, 500);
    setLongPressTimeout(timeout);
  };

  // دالة معالجة إلغاء الضغط
  const handlePressEnd = () => {
    if (longPressTimeout) {
      clearTimeout(longPressTimeout);
      setLongPressTimeout(null);
    }
  };

  // دالة لجلب اسم المستخدم من قاعدة البيانات
  const fetchUserName = async (uid: string) => {
    if (userNames[uid]) return userNames[uid];
    try {
      const userRef = doc(db, 'users', uid);
      const userDoc = await getDoc(userRef);
      if (userDoc.exists()) {
        const data = userDoc.data();
        const name = data.name || data.displayName || data.email || 'مستخدم';
        setUserNames(prev => ({ ...prev, [uid]: name }));
        return name;
      }
    } catch (e) {
      // تجاهل الخطأ
    }
    setUserNames(prev => ({ ...prev, [uid]: 'مستخدم' }));
    return 'مستخدم';
  };

  // عند تحديث الرسائل، جلب أسماء المرسلين غير الموجودين في الكاش
  useEffect(() => {
    const missingUids = messages
      .map(m => m.senderId)
      .filter(uid => uid && !userNames[uid]);
    if (missingUids.length > 0) {
      missingUids.forEach(uid => fetchUserName(uid));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages]);

  const updateTaskStatus = async (newStatus: string) => {
    try {
      const taskRef = doc(db, 'tasks', task.id);
      if (newStatus === 'completed') {
        await updateDoc(taskRef, {
          completed: true,
          status: 'completed',
          updatedAt: new Date().toISOString()
        });
        onStatusChange(task.id, newStatus);
        setShowStatusMenu(false);
        setShowSuccess(true);
        setTimeout(() => {
          setShowSuccess(false);
          router.push('/');
        }, 1200);
        return;
      } else if (newStatus === 'delayed') {
        await updateDoc(taskRef, {
          completed: false,
          status: 'delayed',
          updatedAt: new Date().toISOString()
        });
      } else {
        await updateDoc(taskRef, {
          completed: false,
          status: 'in_progress',
          updatedAt: new Date().toISOString()
        });
      }
      onStatusChange(task.id, newStatus);
      setShowStatusMenu(false);
    } catch (error) {
      console.error('Error updating task status:', error);
      setError('حدث خطأ أثناء تحديث حالة المهمة');
    }
  };

  // إغلاق القائمة عند النقر خارجها
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showStatusMenu) {
        setShowStatusMenu(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [showStatusMenu]);

  // إخفاء زر الحذف عند النقر خارج الرسالة
  useEffect(() => {
    if (!selectedMessage) return;
    const handleClick = (e: MouseEvent) => {
      // إذا كان العنصر المستهدف داخل فقاعة الرسالة أو زر الحذف، لا تفعل شيئًا
      const target = e.target as HTMLElement;
      if (target.closest('.message-bubble')) return;
      setSelectedMessage(null);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [selectedMessage]);

  // دالة لإزالة مشترك من المهمة (فقط للمالك الأصلي)
  const removeParticipant = async (uid: string) => {
    if (!user || user.uid !== task.userId) return;
    setRemovingUserId(uid);
    try {
      const taskRef = doc(db, 'tasks', task.id);
      const updatedSharedWith = (task.sharedWith || []).filter(id => id !== uid);
      const updatedParticipants = (task.participants || []).filter(id => id !== uid);
      await updateDoc(taskRef, {
        sharedWith: updatedSharedWith,
        participants: updatedParticipants,
        updatedAt: new Date().toISOString(),
      });
    } catch (err) {
      setError('حدث خطأ أثناء إزالة المشاركة');
    } finally {
      setRemovingUserId(null);
    }
  };

  return (
    <div 
      className="bg-white rounded-xl shadow-md p-4 border-r-4 border-indigo-500 relative cursor-pointer hover:shadow-lg transition-shadow flex flex-col gap-2"
      onClick={() => setShowDetails(true)}
    >
      {showSuccess && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <div className="bg-white border border-green-200 shadow-lg rounded-lg px-8 py-6 flex flex-col items-center animate-fade-in">
            <span className="text-3xl mb-2">✅</span>
            <span className="text-green-700 font-bold text-lg">تم نقل المهمة إلى المهام المكتملة</span>
          </div>
        </div>
      )}
      <div className="flex items-center gap-2 mb-1">
        <span className="text-lg">{taskTypeIcons[task.type] || '🗂️'}</span>
        <h3 className="font-bold text-base flex-1 truncate">{task.title}</h3>
        <div className="flex items-center gap-1">
          {getStatusBadge()}
          <div className="relative" onClick={e => e.stopPropagation()}>
            <button
              className="p-1 hover:bg-gray-100 rounded-full transition-colors"
              title="تغيير الحالة"
              onClick={(e) => {
                e.stopPropagation();
                setShowStatusMenu(!showStatusMenu);
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-500" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
              </svg>
            </button>
            {showStatusMenu && (
              <div className="absolute left-0 mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                <div className="py-1">
                  <button
                    onClick={() => updateTaskStatus('completed')}
                    className="w-full text-right px-4 py-2 text-sm hover:bg-gray-100 flex items-center gap-2"
                  >
                    <span className="w-2 h-2 rounded-full bg-green-500"></span>
                    مكتملة
                  </button>
                  <button
                    onClick={() => updateTaskStatus('delayed')}
                    className="w-full text-right px-4 py-2 text-sm hover:bg-gray-100 flex items-center gap-2"
                  >
                    <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
                    مؤجلة
                  </button>
                  <button
                    onClick={() => updateTaskStatus('in_progress')}
                    className="w-full text-right px-4 py-2 text-sm hover:bg-gray-100 flex items-center gap-2"
                  >
                    <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                    قيد التنفيذ
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      <p className="text-gray-600 text-sm mb-1 line-clamp-2 font-light">{task.details}</p>
      <div className="flex flex-wrap items-center gap-2 text-xs mt-1">
        <span className="bg-gray-100 px-2 py-1 rounded text-xs text-gray-500 flex items-center gap-1">
          {taskTypeIcons[task.type] || '🗂️'} {taskTypeLabels[task.type]}
        </span>
        <span className="text-xs text-gray-500 flex items-center gap-1">
          <span>📅</span> {formatDateTime(task.dateTime)}
        </span>
        {task.reminder !== undefined && (
          <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded text-xs flex items-center gap-1">
            ⏰ تذكير: قبل {task.reminder} دقيقة
          </span>
        )}
      </div>
      {/* أزرار التفاعل (تعديل/مشاركة/حذف) */}
      <div className="flex space-x-2 space-x-reverse mt-2" onClick={e => e.stopPropagation()}>
        <button
          onClick={handleEdit}
          className="text-gray-600 hover:text-indigo-600 transition-colors"
          title="تعديل"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
          </svg>
        </button>
        <button
          onClick={handleShare}
          className="text-gray-600 hover:text-indigo-600 transition-colors"
          title="مشاركة"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z" />
          </svg>
        </button>
        <button
          onClick={handleShareWhatsApp}
          className="text-green-600 hover:bg-green-50 p-1 rounded-full transition-colors"
          title="مشاركة عبر واتساب"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 32 32" fill="currentColor">
            <path d="M16 3C9.373 3 4 8.373 4 15c0 2.385.832 4.584 2.236 6.418L4 29l7.793-2.236C13.416 27.168 15.615 28 18 28c6.627 0 12-5.373 12-12S22.627 3 16 3zm0 22c-2.021 0-3.938-.627-5.543-1.793l-.393-.279-4.625 1.326 1.326-4.625-.279-.393C5.627 18.938 5 17.021 5 15c0-6.065 4.935-11 11-11s11 4.935 11 11-4.935 11-11 11zm5.293-7.707l-2.586-2.586a1 1 0 00-1.414 0l-1.293 1.293a6.978 6.978 0 01-3.293-3.293l1.293-1.293a1 1 0 000-1.414l-2.586-2.586a1 1 0 00-1.414 0l-1.293 1.293A9.978 9.978 0 0016 25a9.978 9.978 0 0010-10c0-2.021-.627-3.938-1.793-5.543l-1.293 1.293a1 1 0 000 1.414z" />
          </svg>
        </button>
        <button
          onClick={() => setShowConfirmDelete(true)}
          className="text-gray-600 hover:text-red-600 transition-colors"
          title="حذف"
          disabled={isDeleting}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        </button>
      </div>

      {/* مربع حوار تفاصيل المهمة */}
      {showDetails && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white w-full h-full sm:h-auto sm:max-h-[95vh] mx-0 sm:mx-4 overflow-y-auto sm:rounded-lg sm:max-w-2xl shadow-lg flex flex-col relative">
            {/* زر الإغلاق في الزاوية العلوية اليسرى */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowDetails(false);
              }}
              className="absolute top-2 left-2 sm:top-6 sm:left-6 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full p-2 sm:p-4 text-xl sm:text-3xl font-bold shadow transition-all z-20"
              aria-label="إغلاق"
              title="إغلاق"
            >
              ×
            </button>

            {/* العنوان مع الأيقونة */}
            <div className="flex items-center gap-3 mb-4 mt-8 sm:mt-0 px-4 sm:px-6">
              <span className="text-2xl sm:text-4xl">{taskTypeIcons[task.type] || '🗂️'}</span>
              <h2 className="text-xl sm:text-3xl font-extrabold text-gray-900">{task.title}</h2>
            </div>

            <div className="flex-1 overflow-hidden flex flex-col px-4 sm:px-6">
              {/* معلومات المهمة في صف واحد */}
              <div className="flex flex-wrap gap-2 sm:gap-3 mb-3 sm:mb-4">
                <div className="flex items-center bg-gray-50 rounded-lg p-2 gap-2 shadow-sm">
                  <span className="text-lg">🔖</span>
                  <div className="flex items-center gap-2">
                    <div className="text-xs text-gray-500">{taskTypeLabels[task.type]}</div>
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-bold
                        ${task.completed ? 'bg-green-100 text-green-700' :
                          (task.status === 'cancelled' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-800')}
                      `}
                    >
                      {task.completed ? 'مكتملة' : (task.status === 'cancelled' ? 'ملغاة' : 'قيد التنفيذ')}
                    </span>
                  </div>
                </div>
                <div className="flex items-center bg-gray-50 rounded-lg p-2 gap-2 shadow-sm">
                  <span className="text-lg">🕒</span>
                  <div className="text-xs text-gray-500">{formatDateTime(task.dateTime)}</div>
                </div>
                <div className="flex items-center bg-gray-50 rounded-lg p-2 gap-2 shadow-sm">
                  <span className="text-lg">📅</span>
                  <div className="text-xs text-gray-500">آخر تحديث: {getTimeAgo(task.updatedAt)}</div>
                </div>
              </div>

              {/* تفاصيل المهمة */}
              <div className="mb-3 sm:mb-4">
                <h3 className="text-sm font-semibold mb-1 text-gray-700">التفاصيل</h3>
                <p className="text-gray-600 text-sm whitespace-pre-wrap">{task.details}</p>
              </div>

              {/* قسم المحادثة */}
              <div className="flex-1 border-t pt-3 sm:pt-4 flex flex-col">
                <div className="flex justify-between items-center mb-2 sm:mb-3">
                  <h3 className="text-sm font-semibold text-gray-700">المحادثة</h3>
                  {task.participants && (
                    <span className="text-xs text-gray-500 flex items-center gap-2">
                      {task.participants.length} مشارك
                      {/* قائمة المشاركين مع زر إزالة للمشارك (للمالك فقط) */}
                      {user?.uid === task.userId && (
                        <div className="flex flex-wrap gap-1 ms-2">
                          {task.participants.filter(uid => uid !== task.userId).map(uid => (
                            <span key={uid} className="inline-flex items-center bg-gray-100 text-gray-700 rounded-full px-2 py-0.5 text-xs me-1">
                              {userNames[uid] || 'مستخدم'}
                              <button
                                onClick={() => removeParticipant(uid)}
                                disabled={removingUserId === uid}
                                className="ml-1 text-red-500 hover:bg-red-100 rounded-full p-0.5 transition-colors disabled:opacity-50"
                                title="إزالة المشاركة"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                    </span>
                  )}
                </div>
                
                {/* عرض الرسائل */}
                <div className="flex-1 min-h-[200px] sm:min-h-[300px] max-h-[40vh] sm:max-h-[50vh] overflow-y-auto mb-2 sm:mb-3 p-2 sm:p-3 bg-gray-50 rounded-lg">
                  {messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center text-gray-500">
                      <span className="text-4xl mb-2">💬</span>
                      <p className="text-sm">لا توجد رسائل بعد</p>
                      <p className="text-xs mt-1 text-gray-400">ابدأ المحادثة مع المشاركين في المهمة</p>
                    </div>
                  ) : (
                    <div className="space-y-2 sm:space-y-3">
                      {messages.map((message, idx) => {
                        const isMine = message.senderId === user?.uid;
                        const prevMsg = messages[idx - 1];
                        const nextMsg = messages[idx + 1];
                        const showName = !prevMsg || prevMsg.senderId !== message.senderId;
                        const isLastInGroup = !nextMsg || nextMsg.senderId !== message.senderId;
                        const senderName = userNames[message.senderId] || message.senderName || 'مستخدم';
                        const messageTime = new Date(message.timestamp);
                        const showTime = !nextMsg || 
                          new Date(nextMsg.timestamp).getTime() - messageTime.getTime() > 5 * 60 * 1000;

                        return (
                          <div
                            key={message.id}
                            className={`flex ${isMine ? 'justify-end' : 'justify-start'} group relative`}
                            onMouseDown={() => handleLongPress(message.id)}
                            onMouseUp={handlePressEnd}
                            onTouchStart={() => handleLongPress(message.id)}
                            onTouchEnd={handlePressEnd}
                          >
                            <div className={`flex flex-col max-w-[85%] sm:max-w-[80%] ${isMine ? 'items-end' : 'items-start'} relative message-bubble`}>
                              {showName && (
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-xs font-medium text-gray-700">{senderName}</span>
                                  {isMine && message.read && (
                                    <span className="text-xs text-green-500" title="تمت القراءة">
                                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                      </svg>
                                    </span>
                                  )}
                                </div>
                              )}
                              <div
                                className={`relative rounded-2xl px-3 sm:px-4 py-2 sm:py-3 ${
                                  isMine
                                    ? 'bg-indigo-500 text-white rounded-br-sm'
                                    : 'bg-white text-gray-800 rounded-bl-sm shadow-sm'
                                } ${!isLastInGroup ? 'mb-0.5' : ''}`}
                              >
                                {/* زر الحذف بجوار الفقاعة */}
                                {selectedMessage === message.id && (
                                  <button
                                    onClick={() => {
                                      setShowDeleteConfirm(message.id);
                                      setSelectedMessage(null);
                                    }}
                                    className={`bg-white shadow text-red-600 hover:bg-red-50 px-2 py-1 rounded-full text-xs flex items-center gap-1 border border-red-100 z-20 absolute top-1/2 -translate-y-1/2 ${isMine ? 'left-full ms-2' : 'right-full me-2'}`}
                                    style={{ minWidth: '32px' }}
                                  >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                      <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                    </svg>
                                    حذف
                                  </button>
                                )}
                                <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                                {showTime && (
                                  <span className={`text-xs opacity-70 mt-1 block ${isMine ? 'text-indigo-100' : 'text-gray-500'}`}>
                                    {getTimeAgo(message.timestamp)}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      <div ref={messagesEndRef} />
                    </div>
                  )}
                </div>

                {/* نموذج إرسال الرسالة */}
                <form onSubmit={sendMessage} className="flex gap-2 mt-auto sticky bottom-0 bg-white pt-2">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="اكتب رسالتك هنا..."
                    className="flex-1 rounded-lg border border-gray-300 px-4 sm:px-5 py-3 sm:py-4 text-base focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    style={{ minHeight: '56px' }}
                  />
                  <button
                    type="submit"
                    disabled={!newMessage.trim()}
                    className="bg-indigo-500 text-white px-5 sm:px-6 py-3 sm:py-4 rounded-lg text-base font-medium hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed min-w-[80px]"
                  >
                    إرسال
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* مربع حوار عرض المستخدمين */}
      {showUsersModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
             onClick={() => setShowUsersModal(false)}>
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4"
               onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">اختر شخصاً</h3>
              <button
                onClick={() => setShowUsersModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {error && (
              <div className="bg-red-50 text-red-500 p-3 rounded-md mb-4">
                {error}
              </div>
            )}

            {loadingUsers ? (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
                <p className="mt-2">جاري التحميل...</p>
              </div>
            ) : users.length === 0 ? (
              <div className="text-center text-gray-500 py-4">لا يوجد مستخدمين</div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {users.map((user) => (
                  <button
                    key={user.uid}
                    onClick={async () => {
                      await shareTaskWithUser(user);
                      setShowUsersModal(false);
                    }}
                    className="w-full text-right p-3 hover:bg-gray-50 rounded-lg transition-colors flex items-center space-x-3 space-x-reverse"
                  >
                    <div className="bg-indigo-100 rounded-full p-2">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-indigo-600" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">{user.displayName || 'مستخدم'}</div>
                      <div className="text-sm text-gray-500">{user.email}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* مربع حوار خيارات المشاركة */}
      {showShareOptions && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">مشاركة المهمة</h3>
            <div className="space-y-4">
              <button
                onClick={copyToClipboard}
                className="w-full px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-colors"
              >
                نسخ إلى الحافظة
              </button>
              <button
                onClick={() => setShowShareOptions(false)}
                className="w-full px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* مربع حوار تأكيد الحذف */}
      {showConfirmDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">تأكيد الحذف</h3>
            <p className="text-gray-600 mb-6">هل أنت متأكد من حذف هذه المهمة؟</p>
            <div className="flex justify-end space-x-4 space-x-reverse">
              <button
                onClick={() => setShowConfirmDelete(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
                disabled={isDeleting}
              >
                إلغاء
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                disabled={isDeleting}
              >
                {isDeleting ? 'جاري الحذف...' : 'حذف'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* مربع حوار تأكيد حذف الرسالة */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">تأكيد حذف الرسالة</h3>
            <p className="text-gray-600 mb-6">هل أنت متأكد من حذف هذه الرسالة؟</p>
            <div className="flex justify-end space-x-4 space-x-reverse">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                إلغاء
              </button>
              <button
                onClick={() => deleteMessage(showDeleteConfirm)}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                حذف
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const PAGE_SIZE = 10;

export default function TasksPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notifications, setNotifications] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [fcmSupported, setFcmSupported] = useState(true);
  const [lastDoc, setLastDoc] = useState<any>(null);
  const [hasMore, setHasMore] = useState(true);
  const [showFcmAlert, setShowFcmAlert] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }
    if (user) {
      let firstMyTasks = true;
      let firstSharedTasks = true;
      // الاستماع اللحظي للمهام الخاصة والمشتركة
      const unsubMyTasks = onSnapshot(
        query(
          collection(db, 'tasks'),
          where('userId', '==', user.uid),
          orderBy('dateTime', 'asc')
        ),
        (snapshot) => {
          const myTasks: Task[] = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
              id: doc.id,
              title: data.title || '',
              details: data.details || '',
              type: data.type || '',
              dateTime: data.dateTime || '',
              status: data.status || '',
              completed: data.completed || false,
              createdAt: data.createdAt || '',
              updatedAt: data.updatedAt || '',
              userId: data.userId || '',
              priority: data.priority || '',
              reminder: data.reminder || 0,
              participants: data.participants || [],
              sharedWith: data.sharedWith || [],
              originalCreator: data.originalCreator || ''
            };
          });
          setTasks(prev => {
            const shared = prev.filter(t => t.sharedWith && t.sharedWith.includes(user.uid) && t.userId !== user.uid);
            const all = [...myTasks, ...shared];
            all.sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime());
            return all;
          });
          if (firstMyTasks) {
            setLoading(false);
            firstMyTasks = false;
          }
        }
      );
      const unsubSharedTasks = onSnapshot(
        query(
          collection(db, 'tasks'),
          where('sharedWith', 'array-contains', user.uid),
          orderBy('dateTime', 'asc')
        ),
        (snapshot) => {
          const sharedTasks: Task[] = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
              id: doc.id,
              title: data.title || '',
              details: data.details || '',
              type: data.type || '',
              dateTime: data.dateTime || '',
              status: data.status || '',
              completed: data.completed || false,
              createdAt: data.createdAt || '',
              updatedAt: data.updatedAt || '',
              userId: data.userId || '',
              priority: data.priority || '',
              reminder: data.reminder || 0,
              participants: data.participants || [],
              sharedWith: data.sharedWith || [],
              originalCreator: data.originalCreator || ''
            };
          });
          setTasks(prev => {
            const mine = prev.filter(t => t.userId === user.uid);
            const all = [...mine, ...sharedTasks];
            all.sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime());
            return all;
          });
          if (firstSharedTasks) {
            setLoading(false);
            firstSharedTasks = false;
          }
        }
      );
      // تنظيف عند الخروج
      return () => {
        unsubMyTasks();
        unsubSharedTasks();
      };
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    checkFcmSupport().then(setFcmSupported);
  }, []);

  // حفظ FCM Token عند دخول المستخدم
  useEffect(() => {
    const saveFcmToken = async () => {
      if (user) {
        const token = await requestForToken();
        if (token) {
          await setDoc(doc(db, 'users', user.uid), { fcmToken: token }, { merge: true });
        }
      }
    };
    saveFcmToken();
  }, [user]);

  useEffect(() => {
    // تحقق من localStorage إذا تم إغلاق الرسالة مسبقًا
    if (typeof window !== 'undefined') {
      const dismissed = localStorage.getItem('fcmAlertDismissed');
      setShowFcmAlert(!dismissed);
    }
  }, []);

  const handleCloseFcmAlert = () => {
    setShowFcmAlert(false);
    if (typeof window !== 'undefined') {
      localStorage.setItem('fcmAlertDismissed', '1');
    }
  };

  const fetchTasks = async (firstLoad = false) => {
    try {
      setLoading(true);
      let q = query(
        collection(db, 'tasks'),
        where('userId', '==', user?.uid),
        orderBy('dateTime', 'asc'),
        limit(PAGE_SIZE)
      );

      // إضافة استعلام للمهام المشتركة
      let sharedQ = query(
        collection(db, 'tasks'),
        where('sharedWith', 'array-contains', user?.uid),
        orderBy('dateTime', 'asc'),
        limit(PAGE_SIZE)
      );

      if (!firstLoad && lastDoc) {
        q = query(
          collection(db, 'tasks'),
          where('userId', '==', user?.uid),
          orderBy('dateTime', 'asc'),
          startAfter(lastDoc),
          limit(PAGE_SIZE)
        );
        sharedQ = query(
          collection(db, 'tasks'),
          where('sharedWith', 'array-contains', user?.uid),
          orderBy('dateTime', 'asc'),
          startAfter(lastDoc),
          limit(PAGE_SIZE)
        );
      }

      const [snapshot, sharedSnapshot] = await Promise.all([
        getDocs(q),
        getDocs(sharedQ)
      ]);

      const newTasks: Task[] = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          title: data.title || '',
          details: data.details || '',
          type: data.type || '',
          dateTime: data.dateTime || '',
          status: data.status || '',
          completed: data.completed || false,
          createdAt: data.createdAt || '',
          updatedAt: data.updatedAt || '',
          userId: data.userId || '',
          priority: data.priority || '',
          reminder: data.reminder || 0,
          participants: data.participants || [],
          sharedWith: data.sharedWith || [],
          originalCreator: data.originalCreator || ''
        };
      });
      const sharedTasks: Task[] = sharedSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          title: data.title || '',
          details: data.details || '',
          type: data.type || '',
          dateTime: data.dateTime || '',
          status: data.status || '',
          completed: data.completed || false,
          createdAt: data.createdAt || '',
          updatedAt: data.updatedAt || '',
          userId: data.userId || '',
          priority: data.priority || '',
          reminder: data.reminder || 0,
          participants: data.participants || [],
          sharedWith: data.sharedWith || [],
          originalCreator: data.originalCreator || ''
        };
      });

      // دمج المهام الخاصة والمشتركة
      const allTasks = [...newTasks, ...sharedTasks];
      
      // ترتيب المهام حسب التاريخ
      allTasks.sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime());

      setTasks(prev => firstLoad ? allTasks : [...prev, ...allTasks]);
      setLastDoc(snapshot.docs[snapshot.docs.length - 1]);
      setHasMore(snapshot.docs.length === PAGE_SIZE || sharedSnapshot.docs.length === PAGE_SIZE);
    } catch (err) {
      setError('حدث خطأ أثناء جلب المهام');
      console.error('Error fetching tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchNotifications = async () => {
    if (!user) return;
    const notificationsQuery = fsQuery(
      fsCollection(db, 'notifications'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await fsGetDocs(notificationsQuery);
    setNotifications(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      await deleteDoc(doc(db, 'tasks', taskId));
      setTasks(tasks.filter(task => task.id !== taskId));
    } catch (error) {
      console.error('Error deleting task:', error);
      setError('حدث خطأ أثناء حذف المهمة');
    }
  };

  // دالة لتحديث حالة المهمة في الواجهة مباشرة
  const handleStatusChange = (taskId: string, newStatus: string) => {
    setTasks(prevTasks => prevTasks.map(task => {
      if (task.id === taskId) {
        if (newStatus === 'completed') {
          return { ...task, completed: true, status: 'completed', updatedAt: new Date().toISOString() };
        } else if (newStatus === 'delayed') {
          return { ...task, completed: false, status: 'delayed', updatedAt: new Date().toISOString() };
        } else {
          return { ...task, completed: false, status: 'in_progress', updatedAt: new Date().toISOString() };
        }
      }
      return task;
    }));
  };

  // دالة لتحديث حالة المهمة في الواجهة مباشرة
  const handleRestoreTask = async (taskId: string) => {
    console.log('بدء تنفيذ handleRestoreTask مع معرف المهمة:', taskId);
    try {
      if (!taskId) {
        console.error('معرف المهمة غير موجود');
        return;
      }

      // تحديث المهمة في Firestore
      const taskRef = doc(db, 'tasks', taskId);
      console.log('جاري تحديث المهمة في Firestore...');
      
      await updateDoc(taskRef, {
        completed: false,
        status: 'in_progress',
        updatedAt: new Date().toISOString()
      });
      console.log('تم تحديث المهمة في Firestore بنجاح');

      // تحديث القائمة المحلية
      setTasks(prevTasks => {
        console.log('تحديث القائمة المحلية...');
        return prevTasks.map(task => 
          task.id === taskId 
            ? { ...task, completed: false, status: 'in_progress', updatedAt: new Date().toISOString() }
            : task
        );
      });

      // إعادة تحميل المهام
      console.log('جاري إعادة تحميل المهام...');
      await fetchTasks(false);
      console.log('تم إعادة تحميل المهام بنجاح');
    } catch (error) {
      console.error('خطأ في استعادة المهمة:', error);
      setError('حدث خطأ أثناء إرجاع المهمة');
    }
  };

  // تصفية المهام حسب البحث
  const filteredTasks = tasks.filter(task => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      task.title.toLowerCase().includes(q) ||
      task.details.toLowerCase().includes(q) ||
      (taskTypeLabels[task.type] && taskTypeLabels[task.type].toLowerCase().includes(q))
    );
  });

  // قسم المهام المتأخرة والمؤجلة
  const delayedOrOverdueTasks = filteredTasks.filter(task => task.status === 'delayed');
  const delayedOrOverdueIds = new Set(delayedOrOverdueTasks.map(task => task.id));
  const completedTasks = filteredTasks.filter(task => (task.status === 'completed' || task.completed === true) && !delayedOrOverdueIds.has(task.id));
  const otherTasks = filteredTasks.filter(task => task.status === 'in_progress' && !delayedOrOverdueIds.has(task.id));

  if (authLoading || loading) {
    return <div>جاري التحميل...</div>;
  }

  if (!user) {
    return null;
  }

  return (
    <Layout>
      {!fcmSupported && showFcmAlert && (
        <div className="bg-yellow-100 text-yellow-800 p-3 rounded-lg mb-4 font-bold relative">
          <button
            className="absolute top-2 left-2 text-yellow-700 hover:text-yellow-900 text-xl font-bold focus:outline-none"
            onClick={handleCloseFcmAlert}
            aria-label="إغلاق التنبيه"
          >
            ×
          </button>
          <div className="text-center">
            إشعارات المهام الفورية غير مدعومة في متصفحك الحالي.<br />
            إذا كنت تستخدم <b>iPhone</b> أو <b>Safari</b>، يرجى العلم أن الإشعارات غير متاحة حاليًا.<br />
            جرب استخدام متصفح <b>Chrome</b> على الحاسوب أو أندرويد لمزيد من الميزات.
          </div>
        </div>
      )}
      <div className="max-w-4xl mx-auto p-4">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">المهام</h1>
        </div>

        {/* مربع البحث */}
        <div className="mb-6">
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="ابحث عن مهمة بالعنوان أو النوع أو التفاصيل..."
            className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-base bg-white"
          />
        </div>

        {error && (
          <div className="text-red-500 text-sm text-center mb-2">{error}</div>
        )}

        {/* قسم باقي المهام */}
        {otherTasks.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            لا توجد مهام. قم بإضافة مهمة جديدة!
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <AnimatePresence>
              {otherTasks.map((task) => (
                <motion.div
                  key={task.id}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -30 }}
                  transition={{ duration: 0.35 }}
                >
                  <TaskCard
                    task={task}
                    onDelete={handleDeleteTask}
                    onStatusChange={handleStatusChange}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}

        {/* قسم المهام المكتملة */}
        <div className="mb-8 mt-12">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <span className="text-green-500">✓</span>
              المهام المكتملة
            </h2>
            <span className="text-sm text-green-700 font-bold">{completedTasks.length} مهمة</span>
          </div>
          {completedTasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-6">
              <span className="text-4xl text-green-300 mb-2">✓</span>
              <p className="text-center text-sm mt-1 text-green-700">لا توجد مهام مكتملة بعد</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <AnimatePresence>
                {completedTasks.map((task, idx) => (
                  <motion.div
                    key={task.id}
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -30 }}
                    transition={{ duration: 0.35 }}
                  >
                    <div className="bg-white rounded-lg shadow-md p-4 border-r-4 border-green-400 flex flex-col gap-2">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-green-500 font-bold">{idx + 1}</span>
                        <h3 className="font-bold text-base flex-1 truncate">{task.title}</h3>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRestoreTask(task.id);
                          }}
                          className="ml-2 px-2 py-1 bg-yellow-100 text-yellow-700 rounded hover:bg-yellow-200 text-xs font-bold transition-colors"
                          title="إرجاع المهمة إلى الجارية"
                        >
                          إرجاع
                        </button>
                      </div>
                      <p className="text-gray-600 text-sm mb-1 line-clamp-2 font-light">{task.details}</p>
                      <div className="flex flex-wrap items-center gap-2 text-xs mt-1">
                        <span className="bg-gray-100 px-2 py-1 rounded text-xs text-gray-500 flex items-center gap-1">
                          {taskTypeIcons[task.type] || '🗂️'} {taskTypeLabels[task.type]}
                        </span>
                        <span className="text-xs text-gray-500 flex items-center gap-1">
                          <span>📅</span> {formatDateTime(task.dateTime)}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* قسم المهام المتأخرة والمؤجلة */}
        <div className="mb-8 mt-12">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <span className="text-yellow-500">⏰</span>
              المهام المتأخرة والمؤجلة
            </h2>
            <span className="text-sm text-yellow-700 font-bold">{delayedOrOverdueTasks.length} مهمة</span>
          </div>
          {delayedOrOverdueTasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-6">
              <span className="text-4xl text-yellow-300 mb-2">⏰</span>
              <p className="text-center text-sm mt-1 text-yellow-700">لا توجد مهام متأخرة أو مؤجلة</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <AnimatePresence>
                {delayedOrOverdueTasks.map((task, idx) => (
                  <motion.div
                    key={task.id}
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -30 }}
                    transition={{ duration: 0.35 }}
                  >
                    <div className="bg-white rounded-lg shadow-md p-4 border-r-4 border-yellow-400 flex flex-col gap-2">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-yellow-500 font-bold">{idx + 1}</span>
                        <h3 className="font-bold text-base flex-1 truncate">{task.title}</h3>
                        <button
                          onClick={(e) => {
                            console.log('تم النقر على زر الإرجاع للمهمة:', task.id);
                            e.preventDefault();
                            e.stopPropagation();
                            handleRestoreTask(task.id);
                          }}
                          className="ml-2 px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 text-xs font-bold transition-colors"
                          title="إرجاع المهمة إلى الجارية"
                        >
                          إرجاع
                        </button>
                      </div>
                      <p className="text-gray-600 text-sm mb-1 line-clamp-2 font-light">{task.details}</p>
                      <div className="flex flex-wrap items-center gap-2 text-xs mt-1">
                        <span className="bg-gray-100 px-2 py-1 rounded text-xs text-gray-500 flex items-center gap-1">
                          {taskTypeIcons[task.type] || '🗂️'} {taskTypeLabels[task.type]}
                        </span>
                        <span className="text-xs text-gray-500 flex items-center gap-1">
                          <span>📅</span> {formatDateTime(task.dateTime)}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
} 