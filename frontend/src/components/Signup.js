import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { AiOutlineEye, AiOutlineEyeInvisible } from 'react-icons/ai';
import { AiOutlineCheck, AiOutlineClose } from 'react-icons/ai';

const Signup = () => {
  const navigate = useNavigate();
  const { signup, error: authError, passwordRules, authConfig } = useAuth();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [stayConnected, setStayConnected] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setLocalError] = useState('');
  const [passwordValidation, setPasswordValidation] = useState({});

  // Check password strength when it changes
  useEffect(() => {
    if (!password) {
      setPasswordValidation({});
      return;
    }

    const validation = {
      minLength: password.length >= (passwordRules?.minLength || 8),
      uppercase: !passwordRules?.requireUppercase || /[A-Z]/.test(password),
      lowercase: !passwordRules?.requireLowercase || /[a-z]/.test(password),
      numbers: !passwordRules?.requireNumbers || /\d/.test(password),
      special: !passwordRules?.requireSpecial || /[!@#$%^&*(),.?":{}|<>]/.test(password),
    };

    setPasswordValidation(validation);
  }, [password, passwordRules]);

  const isPasswordValid = password && Object.values(passwordValidation).every(v => v);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError('');

    // Validation
    if (!email || !password || !confirmPassword) {
      setLocalError('All fields are required');
      return;
    }

    if (!isPasswordValid) {
      setLocalError('Password does not meet all requirements');
      return;
    }

    if (password !== confirmPassword) {
      setLocalError('Passwords do not match');
      return;
    }

    try {
      setLoading(true);
      await signup(email, password, stayConnected);
      navigate('/dashboard');
    } catch (err) {
      setLocalError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const renderRule = (label, isValid) => (
    <div className="flex items-center text-sm">
      {isValid !== undefined ? (
        isValid ? (
          <AiOutlineCheck className="text-green-600 dark:text-green-400 mr-2" size={16} />
        ) : (
          <AiOutlineClose className="text-red-600 dark:text-red-400 mr-2" size={16} />
        )
      ) : (
        <div className="w-4 h-4 border-2 border-gray-300 dark:border-gray-600 rounded-full mr-2" />
      )}
      <span className={isValid === false ? 'text-red-600 dark:text-red-400' : 'text-gray-700 dark:text-gray-300'}>
        {label}
      </span>
    </div>
  );

  if (!authConfig?.signup_enabled) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Sign Up Disabled</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Sign up is currently disabled. Please contact your administrator.
          </p>
          <Link to="/login" className="text-blue-600 hover:text-blue-700 dark:text-blue-400 font-medium">
            Back to Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
        <div className="flex justify-center mb-4">
          <img src="/agile-icon.png" alt="Agile Icon" width="48" height="48" />
        </div>
        <h1 className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-2">
          Agile Board
        </h1>
        <p className="text-center text-gray-600 dark:text-gray-400 mb-8">
          Create your account
        </p>

        {(error || authError) && (
          <div className="mb-4 p-3 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200 rounded">
            {error || authError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="you@example.com"
              disabled={loading}
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Required to become a potential assignee
            </p>
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="••••••••"
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
              >
                {showPassword ? <AiOutlineEyeInvisible size={18} /> : <AiOutlineEye size={18} />}
              </button>
            </div>

            {/* Password Rules */}
            {password && (
              <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-700 rounded space-y-2">
                <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">Password Requirements:</p>
                {passwordRules?.minLength && renderRule(`At least ${passwordRules.minLength} characters`, passwordValidation.minLength)}
                {passwordRules?.requireUppercase && renderRule('Include uppercase letter (A-Z)', passwordValidation.uppercase)}
                {passwordRules?.requireLowercase && renderRule('Include lowercase letter (a-z)', passwordValidation.lowercase)}
                {passwordRules?.requireNumbers && renderRule('Include number (0-9)', passwordValidation.numbers)}
                {passwordRules?.requireSpecial && renderRule('Include special character (!@#$%^&*)', passwordValidation.special)}
              </div>
            )}
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Confirm Password
            </label>
            <div className="relative">
              <input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={`w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  confirmPassword && password !== confirmPassword
                    ? 'border-red-500'
                    : 'border-gray-300 dark:border-gray-600'
                }`}
                placeholder="••••••••"
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
              >
                {showConfirmPassword ? <AiOutlineEyeInvisible size={18} /> : <AiOutlineEye size={18} />}
              </button>
            </div>
            {confirmPassword && password !== confirmPassword && (
              <p className="text-xs text-red-600 dark:text-red-400 mt-1">Passwords do not match</p>
            )}
          </div>

          <div className="flex items-center">
            <input
              id="stayConnected"
              type="checkbox"
              checked={stayConnected}
              onChange={(e) => setStayConnected(e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              disabled={loading}
            />
            <label htmlFor="stayConnected" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
              Stay connected
            </label>
          </div>

          <button
            type="submit"
            disabled={loading || !isPasswordValid || password !== confirmPassword || !email}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-lg transition duration-200"
          >
            {loading ? 'Creating account...' : 'Sign Up'}
          </button>
        </form>

        <p className="mt-6 text-center text-gray-600 dark:text-gray-400">
          Already have an account?{' '}
          <Link to="/login" className="text-blue-600 hover:text-blue-700 dark:text-blue-400 font-medium">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Signup;
