'use client';

import { useState, useEffect } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Cairo } from 'next/font/google';
import { 
  EnvelopeIcon, 
  LockClosedIcon, 
  CheckCircleIcon, 
  EyeIcon, 
  EyeSlashIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

const cairo = Cairo({
  subsets: ['arabic'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
});

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const router = useRouter();

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) {
      setEmailError('البريد الإلكتروني مطلوب');
    } else if (!emailRegex.test(email)) {
      setEmailError('البريد الإلكتروني غير صالح');
    } else {
      setEmailError('');
    }
  };

  const validatePassword = (password: string) => {
    if (!password) {
      setPasswordError('كلمة المرور مطلوبة');
    } else if (password.length < 6) {
      setPasswordError('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
    } else {
      setPasswordError('');
    }
  };

  useEffect(() => {
    if (email) {
      validateEmail(email);
    }
  }, [email]);

  useEffect(() => {
    if (password) {
      validatePassword(password);
    }
  }, [password]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    
    validateEmail(email);
    validatePassword(password);

    if (emailError || passwordError) {
      setIsLoading(false);
      return;
    }

    try {
      await signInWithEmailAndPassword(auth, email, password);
      if (rememberMe) {
        // TODO: Implement remember me functionality
        localStorage.setItem('rememberMe', 'true');
      } else {
        localStorage.removeItem('rememberMe');
      }
      router.push('/');
    } catch (error: any) {
      setIsLoading(false);
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        setError('البريد الإلكتروني أو كلمة المرور غير صحيحة');
      } else {
        setError('حدث خطأ أثناء تسجيل الدخول. يرجى المحاولة مرة أخرى.');
      }
    }
  };

  return (
    <div className={`min-h-screen flex items-center justify-center bg-gradient-to-br from-[#4F46E5]/5 via-[#4F46E5]/10 to-[#4338CA]/5 py-16 px-4 sm:px-6 lg:px-8 ${cairo.className} relative`}>
      <div className="absolute inset-0 bg-[radial-gradient(#4F46E5_1px,transparent_1px)] [background-size:16px_16px] opacity-[0.15]"></div>
      <div className="max-w-md w-full space-y-12 bg-white/80 backdrop-blur-sm p-10 rounded-xl border border-gray-200/50 shadow-sm relative z-10">
        <div className="flex flex-col items-center">
          <div className="w-16 h-16 bg-gradient-to-br from-[#4F46E5] to-[#4338CA] rounded-2xl flex items-center justify-center mb-6 shadow-md">
            <CheckCircleIcon className="h-10 w-10 text-white" />
          </div>
          <h2 className="text-center text-4xl font-bold text-[#1A1A1A] mb-8">
            تسجيل الدخول إلى TaskMe
          </h2>
        </div>

        {error && (
          <div className="relative rounded-lg bg-red-50 p-4 transition-all duration-300 ease-in-out transform translate-y-0 opacity-100">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="mr-3">
                <p className="text-sm font-medium text-red-800">{error}</p>
              </div>
              <div className="mr-auto pl-3">
                <div className="-mx-1.5 -my-1.5">
                  <button
                    type="button"
                    onClick={() => setError('')}
                    className="inline-flex rounded-md bg-red-50 p-1.5 text-red-500 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-600 focus:ring-offset-2 focus:ring-offset-red-50"
                  >
                    <span className="sr-only">إغلاق</span>
                    <XMarkIcon className="h-5 w-5" aria-hidden="true" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <form className="space-y-8" onSubmit={handleSubmit}>
          <div className="rounded-xl shadow-sm -space-y-px bg-white border border-gray-200/50">
            <div className="relative">
              <label htmlFor="email-address" className="sr-only">
                البريد الإلكتروني
              </label>
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                <EnvelopeIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
              </div>
              <input
                id="email-address"
                name="email"
                type="email"
                autoComplete="email"
                required
                className={`appearance-none rounded-t-xl relative block w-full px-4 py-3.5 pr-10 border-b ${
                  emailError ? 'border-red-300' : 'border-gray-200'
                } placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#6B7280] focus:border-[#6B7280] focus:z-10 sm:text-sm`}
                placeholder="البريد الإلكتروني"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              {emailError && (
                <p className="mt-1 text-sm text-red-500 pr-2">{emailError}</p>
              )}
            </div>
            <div className="relative">
              <label htmlFor="password" className="sr-only">
                كلمة المرور
              </label>
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                <LockClosedIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
              </div>
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400 hover:text-gray-500 transition-colors duration-200"
              >
                {showPassword ? (
                  <EyeSlashIcon className="h-5 w-5" aria-hidden="true" />
                ) : (
                  <EyeIcon className="h-5 w-5" aria-hidden="true" />
                )}
              </button>
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                required
                className={`appearance-none rounded-b-xl relative block w-full px-4 py-3.5 pr-10 pl-10 border ${
                  passwordError ? 'border-red-300' : 'border-gray-200'
                } placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#6B7280] focus:border-[#6B7280] focus:z-10 sm:text-sm`}
                placeholder="كلمة المرور"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              {passwordError && (
                <p className="mt-1 text-sm text-red-500 pr-2">{passwordError}</p>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <input
                id="remember-me"
                name="remember-me"
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="h-4 w-4 text-[#4F46E5] focus:ring-[#4F46E5] border-gray-300 rounded transition-colors duration-200"
              />
              <label htmlFor="remember-me" className="mr-2 block text-sm text-gray-600">
                تذكرني
              </label>
            </div>
            <div className="text-sm">
              <Link href="/forgot-password" className="text-sm text-blue-500 hover:underline transition-colors duration-200">
                نسيت كلمة المرور؟
              </Link>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className={`group relative w-full flex justify-center py-3.5 px-4 border border-transparent text-sm font-medium rounded-xl text-white bg-[#4F46E5] hover:bg-[#4338CA] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#4F46E5] transition-colors duration-200 ${
                isLoading ? 'opacity-75 cursor-not-allowed' : ''
              }`}
            >
              {isLoading ? (
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : null}
              {isLoading ? 'جاري تسجيل الدخول...' : 'تسجيل الدخول'}
            </button>
          </div>
        </form>

        <div className="text-center border-t border-gray-200 pt-6">
          <p className="text-sm text-gray-600">
            ليس لديك حساب؟{' '}
            <Link href="/register" className="text-sm text-blue-500 hover:underline transition-colors duration-200">
              إنشاء حساب جديد
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
} 