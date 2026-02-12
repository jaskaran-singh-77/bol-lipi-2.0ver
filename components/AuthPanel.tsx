import React, { useState } from 'react';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, User } from 'firebase/auth';
import { auth } from '../services/firebase';
import { Language } from '../types';

interface AuthPanelProps {
  user: User | null;
  currentLang: Language;
}

const AuthPanel: React.FC<AuthPanelProps> = ({ user, currentLang }) => {
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError(currentLang === Language.HINDI ? 'कृपया सभी फ़ील्ड भरें' : 'Please fill all fields');
      return;
    }
    if (password.length < 6) {
      setError(currentLang === Language.HINDI ? 'पासवर्ड कम से कम 6 अक्षर का होना चाहिए' : 'Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await createUserWithEmailAndPassword(auth, email.trim(), password);
      setSuccess(currentLang === Language.HINDI ? 'खाता बनाया गया! अब आप साइन इन हैं।' : 'Account created! You are now signed in.');
      setEmail('');
      setPassword('');
    } catch (e: any) {
      console.error('Sign up error:', e);
      if (e.code === 'auth/email-already-in-use') {
        setError(currentLang === Language.HINDI ? 'यह ईमेल पहले से उपयोग में है' : 'This email is already in use');
      } else if (e.code === 'auth/invalid-email') {
        setError(currentLang === Language.HINDI ? 'अमान्य ईमेल पता' : 'Invalid email address');
      } else if (e.code === 'auth/weak-password') {
        setError(currentLang === Language.HINDI ? 'पासवर्ड बहुत कमजोर है' : 'Password is too weak');
      } else {
        setError(e.message || (currentLang === Language.HINDI ? 'साइन अप विफल' : 'Sign up failed'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError(currentLang === Language.HINDI ? 'कृपया सभी फ़ील्ड भरें' : 'Please fill all fields');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      setSuccess(currentLang === Language.HINDI ? 'साइन इन सफल!' : 'Signed in successfully!');
      setEmail('');
      setPassword('');
    } catch (e: any) {
      console.error('Sign in error:', e);
      if (e.code === 'auth/user-not-found' || e.code === 'auth/wrong-password' || e.code === 'auth/invalid-credential') {
        setError(currentLang === Language.HINDI ? 'गलत ईमेल या पासवर्ड' : 'Invalid email or password');
      } else if (e.code === 'auth/invalid-email') {
        setError(currentLang === Language.HINDI ? 'अमान्य ईमेल पता' : 'Invalid email address');
      } else {
        setError(e.message || (currentLang === Language.HINDI ? 'साइन इन विफल' : 'Sign in failed'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      setSuccess(currentLang === Language.HINDI ? 'साइन आउट सफल' : 'Signed out successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (e: any) {
      setError(e.message || 'Sign out failed');
    }
  };

  return (
    <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30">
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm font-black text-slate-800 dark:text-white">
          {currentLang === Language.HINDI ? 'खाता' : 'Account'}
        </div>
        <span className={`text-[10px] font-bold px-2 py-1 rounded ${
          user 
            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' 
            : 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
        }`}>
          {user ? (currentLang === Language.HINDI ? 'साइन इन' : 'Signed in') : (currentLang === Language.HINDI ? 'अतिथि' : 'Guest')}
        </span>
      </div>

      {user ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2 p-3 bg-white dark:bg-slate-800 rounded-xl">
            <span className="material-symbols-outlined text-emerald-600">account_circle</span>
            <div className="flex-1 min-w-0">
              <div className="text-xs text-slate-600 dark:text-slate-300 truncate">{user.email}</div>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="w-full px-4 py-2 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-xl text-sm font-bold hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-lg">logout</span>
            {currentLang === Language.HINDI ? 'साइन आउट' : 'Sign Out'}
          </button>
        </div>
      ) : (
        <form onSubmit={authMode === 'signup' ? handleSignUp : handleSignIn} className="space-y-3">
          {/* Mode Toggle */}
          <div className="flex gap-1 p-1 bg-slate-200 dark:bg-slate-800 rounded-xl">
            <button
              type="button"
              onClick={() => {
                setAuthMode('signup');
                setError(null);
                setSuccess(null);
              }}
              className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
                authMode === 'signup'
                  ? 'bg-white dark:bg-slate-700 text-primary shadow-sm'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              {currentLang === Language.HINDI ? 'साइन अप' : 'Sign Up'}
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthMode('signin');
                setError(null);
                setSuccess(null);
              }}
              className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
                authMode === 'signin'
                  ? 'bg-white dark:bg-slate-700 text-primary shadow-sm'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              {currentLang === Language.HINDI ? 'साइन इन' : 'Sign In'}
            </button>
          </div>

          {/* Form Fields */}
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={currentLang === Language.HINDI ? 'ईमेल' : 'Email'}
            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/50"
            disabled={loading}
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={currentLang === Language.HINDI ? 'पासवर्ड (कम से कम 6 अक्षर)' : 'Password (min 6 chars)'}
            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/50"
            disabled={loading}
          />

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-bold hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>{currentLang === Language.HINDI ? 'प्रतीक्षा करें...' : 'Please wait...'}</span>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-lg">
                  {authMode === 'signup' ? 'person_add' : 'login'}
                </span>
                <span>
                  {authMode === 'signup' 
                    ? (currentLang === Language.HINDI ? 'खाता बनाएं' : 'Create Account')
                    : (currentLang === Language.HINDI ? 'साइन इन करें' : 'Sign In')}
                </span>
              </>
            )}
          </button>

          {/* Error/Success Messages */}
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-start gap-2">
              <span className="material-symbols-outlined text-red-600 text-lg">error</span>
              <p className="text-xs text-red-600 dark:text-red-400 font-medium flex-1">{error}</p>
            </div>
          )}
          {success && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-start gap-2">
              <span className="material-symbols-outlined text-emerald-600 text-lg">check_circle</span>
              <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium flex-1">{success}</p>
            </div>
          )}

          {/* Helper Text */}
          <p className="text-[10px] text-slate-500 text-center">
            {authMode === 'signup'
              ? (currentLang === Language.HINDI 
                  ? 'पहले खाता बनाएं, फिर साइन इन करें' 
                  : 'Create an account first, then sign in')
              : (currentLang === Language.HINDI 
                  ? 'पहले से खाता है? साइन इन करें' 
                  : 'Already have an account? Sign in')}
          </p>
        </form>
      )}
    </div>
  );
};

export default AuthPanel;
