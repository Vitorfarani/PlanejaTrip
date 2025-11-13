import React, { useState, useEffect } from 'react';
import { Trip, Category, Currency, User, TripPreferences } from '../types';
import { UsersIcon, TagIcon, GlobeIcon, PlusCircleIcon, TrashIcon, SparklesIcon } from './IconComponents';

interface SettingsViewProps {
  trip: Trip;
  user: User;
  onUpdateTrip: (updatedTrip: Trip) => Promise<void>; // ✅ agora retorna Promise
  onInvite: (trip: Trip, email: string, permission: 'EDIT' | 'VIEW_ONLY') => Promise<string | null>; // ✅ agora retorna Promise
}

const SettingsView: React.FC<SettingsViewProps> = ({ trip, user, onUpdateTrip, onInvite }) => {
  const [inviteData, setInviteData] = useState({ email: '', permission: 'VIEW_ONLY' as 'EDIT' | 'VIEW_ONLY' });
  const [newCategory, setNewCategory] = useState('');
  const [inviteFeedback, setInviteFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Local state for textareas to provide a better typing experience
  const [likesInput, setLikesInput] = useState(trip.preferences.likes.join(', '));
  const [dislikesInput, setDislikesInput] = useState(trip.preferences.dislikes.join(', '));

  // Loading geral do componente para qualquer operação async
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    setLikesInput(trip.preferences.likes.join(', '));
    setDislikesInput(trip.preferences.dislikes.join(', '));
  }, [trip.preferences]);

  const handleInvite = async () => {
    setInviteFeedback(null);
    setIsUpdating(true);
    try {
      if (inviteData.email) {
        const result = await onInvite(trip, inviteData.email, inviteData.permission); // ✅ await
        if (result) {
          setInviteFeedback({ type: 'error', message: result });
        } else {
          setInviteFeedback({ type: 'success', message: 'Convite enviado!' });
          setInviteData({ email: '', permission: 'VIEW_ONLY' });
        }
      } else {
        setInviteFeedback({ type: 'error', message: 'O e-mail é obrigatório.' });
      }
    } catch (error) {
      setInviteFeedback({ type: 'error', message: 'Erro ao enviar convite.' });
      console.error('Erro ao enviar convite:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleRemoveParticipant = async (participantEmail: string) => {
    if (participantEmail === trip.ownerEmail) return; // Prevent owner removal
    setIsUpdating(true);
    try {
      await onUpdateTrip({ ...trip, participants: trip.participants.filter(p => p.email !== participantEmail) }); // ✅ await
    } catch (error) {
      console.error('Erro ao remover participante:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handlePermissionChange = async (participantEmail: string, newPermission: 'EDIT' | 'VIEW_ONLY') => {
    setIsUpdating(true);
    try {
      const updatedParticipants = trip.participants.map(p =>
        p.email === participantEmail ? { ...p, permission: newPermission } : p
      );
      await onUpdateTrip({ ...trip, participants: updatedParticipants }); // ✅ await
    } catch (error) {
      console.error('Erro ao alterar permissão:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleAddCategory = async () => {
    if (newCategory && !trip.categories.find(c => c.name === newCategory)) {
      const category: Category = { id: Date.now().toString(), name: newCategory };
      setIsUpdating(true);
      try {
        await onUpdateTrip({ ...trip, categories: [...trip.categories, category] }); // ✅ await
        setNewCategory('');
      } catch (error) {
        console.error('Erro ao adicionar categoria:', error);
      } finally {
        setIsUpdating(false);
      }
    }
  };

  const handleRemoveCategory = async (categoryId: string) => {
    setIsUpdating(true);
    try {
      await onUpdateTrip({ ...trip, categories: trip.categories.filter(c => c.id !== categoryId) }); // ✅ await
    } catch (error) {
      console.error('Erro ao deletar categoria:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCurrencyChange = async (currency: Currency) => {
    setIsUpdating(true);
    try {
      await onUpdateTrip({ ...trip, currency }); // ✅ await
    } catch (error) {
      console.error('Erro ao alterar moeda:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handlePreferencesChange = async (field: keyof TripPreferences, value: string) => {
    const newPreferences = { ...trip.preferences };
    if (field === 'likes' || field === 'dislikes') {
      // Split by comma, trim whitespace from each item, and filter out any empty items
      newPreferences[field] = value.split(',').map(item => item.trim()).filter(Boolean);
    } else {
      newPreferences[field] = value as TripPreferences['budgetStyle'];
    }
    setIsUpdating(true);
    try {
      await onUpdateTrip({ ...trip, preferences: newPreferences }); // ✅ await
    } catch (error) {
      console.error('Erro ao salvar preferências:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <h2 className="text-3xl font-bold text-brand-text">Configurações da Viagem</h2>

      {/* Preferences */}
      <div className="bg-brand-light p-6 rounded-xl shadow-lg">
        <h3 className="text-xl font-bold mb-4 flex items-center"><SparklesIcon className="w-5 h-5 mr-2 text-brand-accent" />Preferências da Viagem</h3>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-brand-subtext mb-1 block">Estilo da Viagem</label>
            <select
              value={trip.preferences.budgetStyle}
              onChange={e => handlePreferencesChange('budgetStyle', e.target.value)}
              disabled={isUpdating}
              className="w-full p-2 bg-gray-700 border border-gray-600 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="economico">Econômico</option>
              <option value="confortavel">Confortável</option>
              <option value="luxo">Luxo</option>
              <option value="exclusivo">Exclusivo</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-brand-subtext mb-1 block">Gostos (itens separados por vírgula)</label>
            <textarea
              value={likesInput}
              onChange={e => setLikesInput(e.target.value)}
              onBlur={() => handlePreferencesChange('likes', likesInput)}
              placeholder="Ex: museus, comida local, parques"
              rows={2}
              disabled={isUpdating}
              className="w-full p-2 bg-gray-700 border border-gray-600 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-brand-subtext mb-1 block">Não Gostos (itens separados por vírgula)</label>
            <textarea
              value={dislikesInput}
              onChange={e => setDislikesInput(e.target.value)}
              onBlur={() => handlePreferencesChange('dislikes', dislikesInput)}
              placeholder="Ex: baladas, lugares muito cheios"
              rows={2}
              disabled={isUpdating}
              className="w-full p-2 bg-gray-700 border border-gray-600 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>
        </div>
      </div>

      {/* Participants */}
      <div className="bg-brand-light p-6 rounded-xl shadow-lg">
        <h3 className="text-xl font-bold mb-4 flex items-center"><UsersIcon className="w-5 h-5 mr-2" />Viajantes</h3>
        <div className="space-y-2 max-h-48 overflow-y-auto pr-1 mb-4">
          {trip.participants.map(p => (
            <div key={p.email} className="flex items-center justify-between bg-gray-700 p-2 rounded-lg">
              <div>
                <span className="font-semibold block text-sm">{p.name}</span>
                <span className="text-xs text-brand-subtext">{p.email}</span>
              </div>
              <div className="flex items-center gap-2">
                {p.email === trip.ownerEmail ? (
                  <span className="text-xs bg-brand-primary/50 text-brand-primary px-2 py-1 rounded font-bold">Dono</span>
                ) : trip.ownerEmail === user.email ? (
                  <>
                    <select
                      value={p.permission}
                      onChange={(e) => handlePermissionChange(p.email, e.target.value as 'EDIT' | 'VIEW_ONLY')}
                      disabled={isUpdating}
                      className="bg-gray-800 text-xs rounded border border-gray-600 p-1 focus:ring-brand-primary focus:border-brand-primary disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <option value="EDIT">Pode Editar</option>
                      <option value="VIEW_ONLY">Somente Visualizar</option>
                    </select>
                    <button onClick={() => handleRemoveParticipant(p.email)} title={`Remover ${p.name}`} disabled={isUpdating}>
                      <TrashIcon className="w-4 h-4 text-red-400 hover:text-red-500" />
                    </button>
                  </>
                ) : (
                  <span className="text-xs bg-gray-800 px-2 py-1 rounded font-medium">
                    {p.permission === 'EDIT' ? 'Pode Editar' : 'Somente Visualizar'}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
        {trip.ownerEmail === user.email && (
          <div className="border-t border-gray-700 pt-4 space-y-2">
            <h4 className="text-sm font-semibold">Convidar por e-mail</h4>
            <input
              type="email"
              value={inviteData.email}
              onChange={e => setInviteData(d => ({ ...d, email: e.target.value }))}
              placeholder="E-mail do usuário"
              disabled={isUpdating}
              className="w-full p-2 bg-gray-800 border border-gray-600 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <select
              value={inviteData.permission}
              onChange={e => setInviteData(d => ({ ...d, permission: e.target.value as 'EDIT' | 'VIEW_ONLY' }))}
              disabled={isUpdating}
              className="w-full p-2 bg-gray-800 border border-gray-600 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="VIEW_ONLY">Somente Visualizar</option>
              <option value="EDIT">Pode Editar</option>
            </select>
            {inviteFeedback && (
              <p className={`text-xs p-2 rounded-md ${inviteFeedback.type === 'success' ? 'bg-green-900/50 text-green-300' : 'bg-red-900/50 text-red-300'}`}>
                {inviteFeedback.message}
              </p>
            )}
            <button
              onClick={handleInvite}
              disabled={isUpdating}
              className="w-full p-2 bg-brand-primary rounded-lg text-sm font-bold flex items-center justify-center gap-2 hover:bg-opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <PlusCircleIcon className="w-5 h-5" /> {isUpdating ? 'Enviando...' : 'Convidar'}
            </button>
          </div>
        )}
      </div>

      {/* Categories */}
      <div className="bg-brand-light p-6 rounded-xl shadow-lg">
        <h3 className="text-xl font-bold mb-4 flex items-center"><TagIcon className="w-5 h-5 mr-2" />Categorias de Gastos</h3>
        <div className="space-y-2 mb-3">
          {trip.categories.map(c => (
            <div key={c.id} className="flex items-center justify-between bg-gray-700 p-2 rounded-lg">
              <span className="text-sm">{c.name}</span>
              <button onClick={() => handleRemoveCategory(c.id)} disabled={isUpdating}>
                <TrashIcon className="w-4 h-4 text-red-400 hover:text-red-500" />
              </button>
            </div>
          ))}
        </div>
        <div className="flex gap-2 border-t border-gray-700 pt-4">
          <input
            type="text"
            value={newCategory}
            onChange={e => setNewCategory(e.target.value)}
            placeholder="Nova categoria"
            disabled={isUpdating}
            className="flex-grow p-2 bg-gray-800 border border-gray-600 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <button onClick={handleAddCategory} disabled={isUpdating} className="p-2 bg-brand-primary rounded-lg disabled:opacity-50 disabled:cursor-not-allowed">
            <PlusCircleIcon className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Currency */}
      <div className="bg-brand-light p-6 rounded-xl shadow-lg">
        <h3 className="text-xl font-bold mb-4 flex items-center"><GlobeIcon className="w-5 h-5 mr-2" />Moeda</h3>
        <select
          value={trip.currency}
          onChange={e => handleCurrencyChange(e.target.value as Currency)}
          disabled={isUpdating}
          className="w-full p-2 bg-gray-700 border border-gray-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <option value="BRL">Real (BRL)</option>
          <option value="USD">Dólar (USD)</option>
          <option value="EUR">Euro (EUR)</option>
        </select>
      </div>
    </div>
  );
};

export default SettingsView;
