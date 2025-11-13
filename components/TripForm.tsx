import React, { useState } from 'react';
import { Trip, Day, Category, Currency, User } from '../types';
import { MapPinIcon, CalendarIcon } from './IconComponents';
import TripConfirmationModal from './TripConfirmationModal';

interface TripFormProps {
  user: User;
  onSave: (trip: Trip) => Promise<void>;
  onCancel: () => void;
}

const defaultCategories: Category[] = [
    { id: '1', name: 'Hospedagem' },
    { id: '2', name: 'Alimentação' },
    { id: '3', name: 'Lazer' },
    { id: '4', name: 'Transporte' },
    { id: '5', name: 'Emergência' },
];

const TripForm: React.FC<TripFormProps> = ({ user, onSave, onCancel }) => {
  const [tripData, setTripData] = useState({
    name: '',
    destination: '',
    startDate: '',
    endDate: '',
    budget: '',
    currency: 'BRL' as Currency,
  });
  const [tripToConfirm, setTripToConfirm] = useState<Trip | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setTripData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!tripData.startDate || !tripData.endDate || !tripData.destination) {
      setError("Por favor, preencha o destino e as datas de início e término.");
      return;
    }

    const startParts = tripData.startDate.split('-').map(Number);
    const endParts = tripData.endDate.split('-').map(Number);
    
    const startDate = new Date(Date.UTC(startParts[0], startParts[1] - 1, startParts[2]));
    const endDate = new Date(Date.UTC(endParts[0], endParts[1] - 1, endParts[2]));
    
    if (startDate.getTime() > endDate.getTime()) {
        setError("A data de início não pode ser posterior à data de término.");
        return;
    }

    const days: Day[] = [];
    let currentDate = new Date(startDate);
    let dayNumber = 1;

    while (currentDate.getTime() <= endDate.getTime()) {
      days.push({
        date: currentDate.toISOString(),
        dayNumber,
        activities: [],
      });
      currentDate.setUTCDate(currentDate.getUTCDate() + 1);
      dayNumber++;
    }

    const newTrip: Trip = {
      id: Date.now().toString(),
      name: tripData.name.trim() || tripData.destination.trim(),
      destination: tripData.destination,
      startDate: tripData.startDate,
      endDate: tripData.endDate,
      budget: parseFloat(tripData.budget) || 0,
      days,
      participants: [{ name: user.name, email: user.email, permission: 'EDIT' }],
      categories: defaultCategories,
      currency: tripData.currency,
      isCompleted: false,
      ownerEmail: user.email,
      preferences: {
        likes: [],
        dislikes: [],
        budgetStyle: 'confortavel',
      },
    };
    setTripToConfirm(newTrip);
  };

  const handleConfirmCreation = async () => {
    if (tripToConfirm && !isSaving) {
      setIsSaving(true);
      try {
        await onSave(tripToConfirm);
        // Componente será desmontado após sucesso (navegação para dashboard)
      } catch (error) {
        console.error('Erro ao criar viagem:', error);
        setError('Erro ao criar viagem. Tente novamente.');
        setIsSaving(false);
        setTripToConfirm(null);
      }
    }
  };
  
  const handleCancelCreation = () => {
      setTripToConfirm(null);
  };

  return (
    <>
      <div className="max-w-2xl mx-auto my-10 p-8 bg-brand-light rounded-2xl shadow-xl text-brand-text">
        <h2 className="text-3xl font-bold mb-8 text-center">Planeje sua Próxima Aventura</h2>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-brand-subtext">Nome da Viagem (Opcional)</label>
            <input type="text" name="name" id="name" value={tripData.name} onChange={handleChange} className="mt-1 block w-full bg-gray-700 border-gray-600 rounded-md shadow-sm focus:ring-brand-primary focus:border-brand-primary p-3" placeholder="Ex: Eurotrip com os Amigos" />
          </div>
          <div>
            <label htmlFor="destination" className="block text-sm font-medium text-brand-subtext">Nome Completo do Destino Principal</label>
            <div className="mt-1 relative rounded-md shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MapPinIcon className="h-5 w-5 text-gray-400" />
              </div>
              <input type="text" name="destination" id="destination" required value={tripData.destination} onChange={handleChange} className="block w-full pl-10 bg-gray-700 border-gray-600 rounded-md focus:ring-brand-primary focus:border-brand-primary p-3" placeholder="Ex: Paris, França" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="startDate" className="block text-sm font-medium text-brand-subtext">Data de Início</label>
              <input type="date" name="startDate" id="startDate" required value={tripData.startDate} onChange={handleChange} className="mt-1 block w-full bg-gray-700 border-gray-600 rounded-md shadow-sm focus:ring-brand-primary focus:border-brand-primary p-3" />
            </div>
            <div>
              <label htmlFor="endDate" className="block text-sm font-medium text-brand-subtext">Data de Término</label>
              <input type="date" name="endDate" id="endDate" required value={tripData.endDate} onChange={handleChange} className="mt-1 block w-full bg-gray-700 border-gray-600 rounded-md shadow-sm focus:ring-brand-primary focus:border-brand-primary p-3" />
            </div>
          </div>
           <div>
            <label htmlFor="budget" className="block text-sm font-medium text-brand-subtext">Orçamento Total</label>
             <div className="flex gap-4 mt-1">
                <input type="number" name="budget" id="budget" required value={tripData.budget} onChange={handleChange} className="block w-2/3 bg-gray-700 border-gray-600 rounded-md shadow-sm focus:ring-brand-primary focus:border-brand-primary p-3" placeholder="Ex: 5000" />
                <select name="currency" id="currency" value={tripData.currency} onChange={handleChange} className="block w-1/3 bg-gray-700 border-gray-600 rounded-md shadow-sm focus:ring-brand-primary focus:border-brand-primary p-3">
                    <option value="BRL">BRL</option>
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                </select>
            </div>
          </div>
          {error && <p className="text-red-400 text-sm text-center bg-red-900/30 p-3 rounded-lg border border-red-500/50">{error}</p>}
          <div className="flex justify-end space-x-4 pt-4">
            <button type="button" onClick={onCancel} className="px-6 py-3 rounded-lg bg-gray-600 hover:bg-gray-700 transition font-semibold">Cancelar</button>
            <button type="submit" className="px-6 py-3 rounded-lg text-white bg-brand-primary hover:bg-opacity-90 transition font-bold shadow-lg transform hover:scale-105">Criar Viagem</button>
          </div>
        </form>
      </div>
      {tripToConfirm && (
        <TripConfirmationModal
            trip={tripToConfirm}
            onConfirm={handleConfirmCreation}
            onCancel={handleCancelCreation}
            isSaving={isSaving}
        />
      )}
    </>
  );
};

export default TripForm;