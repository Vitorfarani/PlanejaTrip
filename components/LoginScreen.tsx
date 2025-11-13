import React, { useState } from 'react';
import Logo from './Logo';
import PasswordInput from './PasswordInput';

interface LoginScreenProps {
  onLogin: (email: string, password: string) => Promise<string | null>;
  onRegister: (name: string, email: string, password: string) => Promise<string | null>;
  onForgotPassword: () => void;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin, onRegister, onForgotPassword }) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      if (mode === 'login') {
        if (email && password) {
          const result = await onLogin(email, password);
          if (result) setError(result);
        } else {
          setError('Por favor, preencha e-mail e senha.');
        }
      } else { // register mode
        if (name && email && password && confirmPassword) {
          if (password !== confirmPassword) {
            setError('As senhas não coincidem.');
            return;
          }
          const result = await onRegister(name, email, password);
          if (result) setError(result);
        } else {
          setError('Por favor, preencha todos os campos.');
        }
      }
    } catch (error) {
      console.error('Erro ao processar:', error);
      setError('Erro ao processar solicitação. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-brand-dark">
      <div className="max-w-md w-full bg-brand-light rounded-2xl shadow-2xl p-8 space-y-6">
        <Logo />
        <div className="flex border-b border-gray-700">
          <button
            onClick={() => { setMode('login'); setError(''); }}
            className={`w-1/2 py-3 text-lg font-semibold transition ${mode === 'login' ? 'border-b-2 border-brand-primary text-brand-text' : 'text-brand-subtext'}`}
          >
            Entrar
          </button>
          <button
            onClick={() => { setMode('register'); setError(''); }}
            className={`w-1/2 py-3 text-lg font-semibold transition ${mode === 'register' ? 'border-b-2 border-brand-primary text-brand-text' : 'text-brand-subtext'}`}
          >
            Cadastrar-se
          </button>
        </div>
        <div>
          <form className="space-y-4" onSubmit={handleSubmit}>
            {mode === 'register' && (
              <div>
                <label htmlFor="name" className="sr-only">Nome</label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  autoComplete="name"
                  required
                  className="appearance-none rounded-lg relative block w-full px-3 py-3 border border-gray-600 bg-gray-700 text-brand-text placeholder-gray-400 focus:outline-none focus:ring-brand-primary focus:border-brand-primary sm:text-sm"
                  placeholder="Seu nome completo"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
            )}
            <div>
              <label htmlFor="email" className="sr-only">Email</label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="appearance-none rounded-lg relative block w-full px-3 py-3 border border-gray-600 bg-gray-700 text-brand-text placeholder-gray-400 focus:outline-none focus:ring-brand-primary focus:border-brand-primary sm:text-sm"
                placeholder="Endereço de e-mail"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            
            <PasswordInput
              id="password"
              name="password"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              required
              placeholder="Senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            {mode === 'register' && (
               <PasswordInput
                id="confirm-password"
                name="confirm-password"
                autoComplete="new-password"
                required
                placeholder="Confirme sua senha"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            )}
            
            <div className="flex items-center justify-end">
                {mode === 'login' && (
                    <button type="button" onClick={onForgotPassword} className="text-sm font-medium text-brand-primary hover:underline">
                        Esqueceu a senha?
                    </button>
                )}
            </div>


            {error && <p className="text-red-400 text-sm text-center">{error}</p>}

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-bold rounded-lg text-white bg-brand-primary hover:bg-opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-brand-dark focus:ring-brand-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Processando...' : (mode === 'login' ? 'Entrar' : 'Cadastrar')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;