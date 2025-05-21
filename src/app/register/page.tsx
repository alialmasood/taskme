'use client';

import { useState } from 'react';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
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

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [phone, setPhone] = useState('');
  const router = useRouter();

  // تحقق فوري من تطابق كلمة المرور
  const passwordsMatch = confirmPassword.length > 0 ? password === confirmPassword : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setShowSuccessMessage(false);
    if (password !== confirmPassword) {
      setError('كلمات المرور غير متطابقة');
      setIsLoading(false);
      return;
    }
    if (!phone.trim()) {
      setError('يرجى إدخال رقم الهاتف');
      setIsLoading(false);
      return;
    }

    try {
      // إنشاء حساب المستخدم في Firebase Authentication
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // حفظ بيانات المستخدم في Firestore
      await setDoc(doc(db, 'users', user.uid), {
        name,
        email,
        phone,
        createdAt: new Date().toISOString(),
        lastLogin: new Date().toISOString(),
      });

      setShowSuccessMessage(true);
      setTimeout(() => {
        router.push('/');
      }, 1800);
      setIsLoading(false);
    } catch (error: any) {
      if (error.code === 'auth/email-already-in-use') {
        setError('حدث خطأ: البريد الإلكتروني مستخدم بالفعل.');
      } else if (error.code === 'auth/weak-password') {
        setError('حدث خطأ: كلمة المرور ضعيفة جدًا.');
      } else {
        setError('حدث خطأ أثناء إنشاء الحساب. يرجى المحاولة لاحقًا.');
      }
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 overflow-hidden">
      <style>{phoneInputStyles}</style>
      {/* زخرفات دوائر ملونة كخلفية */}
      <div className="absolute z-0 inset-0 pointer-events-none select-none">
        {/* دوائر كبيرة */}
        <div className="absolute top-[-60px] left-[-60px] w-48 h-48 bg-indigo-100 rounded-full opacity-60 animate-pulse-slow"></div>
        <div className="absolute bottom-[-80px] right-[-80px] w-64 h-64 bg-pink-100 rounded-full opacity-50 animate-pulse-slow"></div>
        {/* دوائر متوسطة */}
        <div className="absolute top-1/3 left-[-40px] w-24 h-24 bg-yellow-100 rounded-full opacity-50"></div>
        <div className="absolute bottom-1/4 right-[-32px] w-20 h-20 bg-green-100 rounded-full opacity-40"></div>
        {/* دوائر صغيرة */}
        <div className="absolute top-1/4 right-10 w-10 h-10 bg-blue-200 rounded-full opacity-40"></div>
        <div className="absolute bottom-10 left-1/3 w-8 h-8 bg-purple-200 rounded-full opacity-30"></div>
        <div className="absolute top-2/3 left-1/2 w-12 h-12 bg-pink-200 rounded-full opacity-30"></div>
      </div>
      <div className="max-w-md w-full space-y-8 relative z-10">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            إنشاء حساب جديد
          </h2>
          {showSuccessMessage && (
            <div className="bg-green-100 text-green-800 rounded p-3 mt-4 text-center font-bold animate-fade-in">
              تم إنشاء حسابك بنجاح! سيتم تحويلك إلى صفحتك الرئيسية.
            </div>
          )}
          {error && (
            <div className="bg-red-100 text-red-700 rounded p-3 mt-4 text-center font-bold animate-fade-in">
              {error}
            </div>
          )}
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div className="relative mb-4">
              <span className="absolute top-1/2 right-3 -translate-y-1/2 text-xl text-gray-400 pointer-events-none">👤</span>
              <input
                id="name"
                name="name"
                type="text"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm pr-10"
                placeholder="الاسم"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="relative mb-4">
              <span className="absolute top-1/2 right-3 -translate-y-1/2 text-xl text-gray-400 pointer-events-none">📧</span>
              <input
                id="email-address"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm pr-10"
                placeholder="البريد الإلكتروني"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="relative mb-4">
              <span className="absolute top-1/2 right-3 -translate-y-1/2 text-xl text-gray-400 pointer-events-none">🔒</span>
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm pr-10"
                placeholder="كلمة المرور"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                className="absolute top-1/2 left-3 -translate-y-1/2 text-xl text-gray-400 hover:text-gray-600 focus:outline-none"
                tabIndex={-1}
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
            <div className="relative mb-2">
              <input
                id="confirm-password"
                name="confirm-password"
                type={showConfirmPassword ? "text" : "password"}
                autoComplete="new-password"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm pr-10"
                placeholder="تأكيد كلمة المرور"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
              <button
                type="button"
                className="absolute top-1/2 left-3 -translate-y-1/2 text-xl text-gray-400 hover:text-gray-600 focus:outline-none"
                tabIndex={-1}
                onClick={() => setShowConfirmPassword((v) => !v)}
                aria-label={showConfirmPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
              >
                {showConfirmPassword ? '🙈' : '👁️'}
              </button>
              {/* تحقق فوري من التطابق */}
              {passwordsMatch !== null && (
                <div className={`mt-1 text-xs font-bold ${passwordsMatch ? 'text-green-600' : 'text-red-500'}`}
                  role="alert"
                >
                  {passwordsMatch ? '✓ متطابقة' : '❌ غير متطابقة'}
                </div>
              )}
            </div>
            <div className="relative mb-4">
              <span className="absolute top-1/2 right-3 -translate-y-1/2 text-xl text-gray-400 pointer-events-none">📱</span>
              <div className="pr-8">
                <PhoneInput
                  country={'iq'}
                  value={phone}
                  onChange={phone => setPhone(phone)}
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
              </div>
            </div>
          </div>

          <div>
            <button
              type="submit"
              className="group relative w-full max-w-xs mx-auto flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              style={{ width: '90%' }}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white mr-2" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                  </svg>
                  جاري إنشاء الحساب...
                </>
              ) : (
                'إنشاء حساب'
              )}
            </button>
          </div>
        </form>

        <div className="text-center mt-4">
          <p className="text-sm text-gray-600">
            لديك حساب بالفعل؟{' '}
            <Link href="/login" className="font-medium text-indigo-600 hover:text-indigo-500">
              تسجيل الدخول
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
} 