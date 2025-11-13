import React from 'react';
import { Trip } from '../types';
import { MapPinIcon, CalendarIcon } from './IconComponents';

interface TripConfirmationModalProps {
  trip: Trip;
  onConfirm: () => void;
  onCancel: () => void;
  isSaving?: boolean;
}

const TripConfirmationModal: React.FC<TripConfirmationModalProps> = ({ trip, onConfirm, onCancel, isSaving = false }) => {
  const startDate = new Date(trip.startDate).toLocaleDateString('pt-BR', { timeZone: 'UTC', day: '2-digit', month: 'long', year: 'numeric' });
  const endDate = new Date(trip.endDate).toLocaleDateString('pt-BR', { timeZone: 'UTC', day: '2-digit', month: 'long', year: 'numeric' });
  const duration = trip.days.length;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50 p-4">
      <div className="bg-brand-light rounded-xl shadow-2xl p-8 m-4 max-w-lg w-full transform transition-all duration-300 ease-out text-brand-text">
        <h2 className="text-2xl font-bold mb-4">Confirme os Detalhes</h2>
        <p className="text-brand-subtext mb-6">Sua aventura está quase pronta! Por favor, revise os detalhes abaixo.</p>

        <div className="space-y-4 bg-gray-800 p-6 rounded-lg mb-6">
            <div>
                <p className="text-sm text-brand-subtext">Nome da Viagem</p>
                <p className="text-lg font-semibold">{trip.name}</p>
            </div>
             <div>
                <p className="text-sm text-brand-subtext">Destino</p>
                <p className="text-lg font-semibold flex items-center"><MapPinIcon className="w-5 h-5 mr-2" /> {trip.destination}</p>
            </div>
            <div>
                <p className="text-sm text-brand-subtext">Período</p>
                <p className="text-lg font-semibold flex items-center"><CalendarIcon className="w-5 h-5 mr-2" /> {startDate} a {endDate} ({duration} {duration > 1 ? 'dias' : 'dia'})</p>
            </div>
             <div>
                <p className="text-sm text-brand-subtext">Orçamento</p>
                <p className="text-lg font-semibold">{trip.currency} {trip.budget.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </div>
        </div>

        <div className="flex justify-end space-x-4">
          <button
            onClick={onCancel}
            disabled={isSaving}
            className="px-6 py-2 rounded-lg bg-gray-600 hover:bg-gray-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Voltar e Editar
          </button>
          <button
            onClick={onConfirm}
            disabled={isSaving}
            className="px-6 py-2 rounded-lg text-white bg-brand-secondary hover:bg-opacity-90 transition font-semibold shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? 'Criando...' : 'Confirmar e Criar Viagem'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TripConfirmationModal;