import React, { useState } from 'react';
import { XCircleIcon } from './IconComponents';
import PasswordInput from './PasswordInput';
import { sendPasswordResetEmail } from '../services/authService';

interface ForgotPasswordModalProps {
  onClose: () => void;
  onPasswordReset: (email: string, newPassword: string) => Promise<string | null>;
}

const ForgotPasswordModal: React.FC<ForgotPasswordModalProps> = ({ onClose, onPasswordReset }) => {
  const [step, setStep] = useState<'email' | 'success'>('email');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const result = await sendPasswordResetEmail(email);

      if (!result.success) {
        setError(result.error || "Erro ao enviar email de recuperação.");
        setIsLoading(false);
        return;
      }

      setStep('success');
    } catch (error) {
      console.error('Erro ao enviar email:', error);
      setError("Erro ao enviar email de recuperação.");
    } finally {
      setIsLoading(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 'email':
        return (
          <form onSubmit={handleEmailSubmit} className="space-y-4">
            <h2 className="text-2xl font-bold mb-4">Recuperar Senha</h2>
            <p className="text-brand-subtext mb-6">Insira o e-mail associado à sua conta. Enviaremos um link para redefinir sua senha.</p>
            <div>
              <label htmlFor="email-forgot" className="block text-sm font-medium text-brand-subtext mb-1">E-mail</label>
              <input
                id="email-forgot"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
                className="w-full p-3 bg-gray-700 border border-gray-600 rounded-md shadow-sm disabled:opacity-50"
                placeholder="seu.email@exemplo.com"
              />
            </div>
            {error && <p className="text-red-400 text-sm text-center">{error}</p>}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full px-6 py-3 rounded-lg text-white bg-brand-primary hover:bg-opacity-90 transition font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Enviando...' : 'Enviar Link de Recuperação'}
            </button>
          </form>
        );
      case 'success':
        return (
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-4">Email Enviado!</h2>
            <p className="text-brand-subtext mb-6">
              Um link para redefinir sua senha foi enviado para <strong>{email}</strong>.
              Verifique sua caixa de entrada e siga as instruções.
            </p>
            <p className="text-sm text-brand-subtext mb-6">
              Não recebeu o email? Verifique sua pasta de spam ou tente novamente em alguns minutos.
            </p>
            <button onClick={onClose} className="w-full px-6 py-3 rounded-lg text-white bg-brand-primary hover:bg-opacity-90 transition font-semibold">
              Voltar para o Login
            </button>
          </div>
        );
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50 p-4">
      <div className="bg-brand-light rounded-xl shadow-2xl p-8 m-4 max-w-md w-full relative transform transition-all duration-300 ease-out text-brand-text">
        <button onClick={onClose} className="absolute top-4 right-4 text-brand-subtext hover:text-brand-text">
          <XCircleIcon className="w-8 h-8" />
        </button>
        {renderStep()}
      </div>
    </div>
  );
};

export default ForgotPasswordModal;