import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Lock, User, ArrowRight } from 'lucide-react';
import { useToast } from '../components/common/Toast';

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier || !password) {
      showToast('Please enter both Badge Number and Password', 'error');
      return;
    }
    
    setIsLoading(true);
    // Simulate network request
    setTimeout(() => {
      setIsLoading(false);
      showToast('Authentication successful. Welcome, Officer.', 'success');
      navigate('/dashboard');
    }, 1200);
  };

  return (
    <div className="min-h-screen bg-ds-bg flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-ds-blue via-ds-red to-ds-blue"></div>
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-ds-blue-soft rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob"></div>
      <div className="absolute top-[20%] right-[-5%] w-72 h-72 bg-ds-red/10 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob animation-delay-2000"></div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="flex justify-center">
          <div className="w-20 h-20 bg-white rounded-2xl shadow-xl flex items-center justify-center border border-ds-border overflow-hidden p-2">
            <img src="/chd-police-logo.png" alt="Chandigarh Police Logo" className="w-full h-full object-contain bg-white" />
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-ds-navy tracking-tight">
          Rakshak Setu
        </h2>
        <p className="mt-2 text-center text-sm text-ds-muted">
          Secure Intelligence & Case Management System
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="bg-white py-8 px-4 shadow-2xl shadow-ds-blue/10 sm:rounded-xl sm:px-10 border border-ds-border relative overflow-hidden">
          {/* Top highlight bar */}
          <div className="absolute top-0 left-0 w-full h-1 bg-ds-blue"></div>

          <form className="space-y-6" onSubmit={handleLogin}>
            <div>
              <label htmlFor="identifier" className="block text-sm font-medium text-ds-navy">
                Badge Number / Username
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-ds-disabled" />
                </div>
                <input
                  id="identifier"
                  name="identifier"
                  type="text"
                  required
                  className="appearance-none block w-full pl-10 pr-3 py-2 border border-ds-border rounded-md text-ds-ink placeholder-ds-disabled focus:outline-none focus:ring-2 focus:ring-ds-blue focus:border-ds-blue sm:text-sm transition-colors"
                  placeholder="Enter your credentials"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-ds-navy">
                Password
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-ds-disabled" />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  className="appearance-none block w-full pl-10 pr-3 py-2 border border-ds-border rounded-md text-ds-ink placeholder-ds-disabled focus:outline-none focus:ring-2 focus:ring-ds-blue focus:border-ds-blue sm:text-sm transition-colors"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  className="h-4 w-4 text-ds-blue focus:ring-ds-blue border-ds-border rounded"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-ds-text">
                  Remember device
                </label>
              </div>

              <div className="text-sm">
                <a href="#" className="font-medium text-ds-blue hover:text-ds-blue-hover transition-colors">
                  Forgot credentials?
                </a>
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-ds-blue hover:bg-ds-blue-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ds-blue transition-all disabled:opacity-70 disabled:cursor-not-allowed group relative overflow-hidden"
              >
                {isLoading ? (
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  <>
                    <span className="relative z-10 flex items-center">
                      Login
                      <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                    </span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
