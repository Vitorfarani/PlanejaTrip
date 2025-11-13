import React, { useState } from 'react';
import { Day, Activity, Category, Trip } from '../types';
import ActivityCard from './ActivityCard';
import { PlusCircleIcon, SparklesIcon, ArrowLeftIcon } from './IconComponents';
import { getActivitySuggestions } from '../services/geminiService';

interface DailyPlanProps {
  day: Day;
  trip: Trip;
  canEdit: boolean;
  onAddActivity: () => void;
  onEditActivity: (activity: Activity) => void;
  deleteActivity: (dayIndex: number, activityId: string) => void;
  onConfirmClick: (activity: Activity) => void;
  updateActivity: (dayIndex: number, activity: Activity) => Promise<void>;
  onBack: () => void;
}

const currencySymbols = {
    BRL: 'R$',
    USD: '$',
    EUR: '€',
};

const DailyPlan: React.FC<DailyPlanProps> = ({ day, trip, canEdit, onAddActivity, onEditActivity, deleteActivity, onConfirmClick, updateActivity, onBack }) => {
  const [isGettingSuggestions, setIsGettingSuggestions] = useState(false);

  const currencySymbol = currencySymbols[trip.currency];
  const totalEstimated = day.activities.reduce((sum, act) => sum + act.estimatedCost, 0);
  const totalConfirmed = day.activities.reduce((sum, act) => sum + (act.realCost ?? 0), 0);
  
  const handleGetSuggestions = async () => {
      setIsGettingSuggestions(true);
      try {
          const allActivities = trip.days.flatMap(d => d.activities);
          const suggestions = await getActivitySuggestions(trip.destination, trip.preferences, allActivities);

          // Adicionar atividades uma por uma de forma assíncrona
          for (const suggestion of suggestions) {
              const activity: Activity = {
                  ...suggestion,
                  id: Date.now().toString() + Math.random(),
                  isConfirmed: false,
                  participants: []
              };
              await updateActivity(day.dayNumber - 1, activity);
          }
      } catch (error) {
          console.error("Failed to get suggestions", error);
      } finally {
          setIsGettingSuggestions(false);
      }
  };

  const dayDate = new Date(day.date);
  const formattedDate = dayDate.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });

  return (
    <div className="bg-brand-light rounded-xl shadow-lg p-6 mb-6">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center border-b border-gray-700 pb-4 mb-4">
        <div className="flex items-center gap-4">
            <button onClick={onBack} className="text-brand-subtext hover:text-brand-text transition p-2 rounded-full hover:bg-gray-700">
                <ArrowLeftIcon className="w-6 h-6" />
            </button>
            <div>
                <h3 className="text-2xl font-bold">Dia {day.dayNumber}</h3>
                <p className="text-brand-subtext">{formattedDate}</p>
            </div>
        </div>
        <div className="mt-2 sm:mt-0 text-right">
            <p className="text-sm text-brand-subtext">Estimado: <span className="font-semibold text-brand-text">{currencySymbol} {totalEstimated.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></p>
            <p className="text-sm text-green-400">Confirmado: <span className="font-semibold">{currencySymbol} {totalConfirmed.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></p>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {day.activities.map(act => (
          <ActivityCard 
            key={act.id}
            canEdit={canEdit}
            activity={act}
            currencySymbol={currencySymbol}
            onDelete={() => deleteActivity(day.dayNumber - 1, act.id)}
            onConfirmClick={() => onConfirmClick(act)}
            onEdit={() => onEditActivity(act)}
          />
        ))}
        {canEdit && (
            <div className="flex flex-col gap-2">
                <button onClick={onAddActivity} className="flex items-center justify-center p-4 h-full rounded-lg bg-gray-800 border-2 border-dashed border-gray-600 text-brand-subtext hover:bg-gray-700 hover:border-brand-primary hover:text-brand-primary transition-all duration-300">
                    <PlusCircleIcon className="w-8 h-8 mr-2" />
                    <span className="font-semibold">Programar</span>
                </button>
                <button onClick={handleGetSuggestions} disabled={isGettingSuggestions} className="flex items-center justify-center p-4 rounded-lg bg-yellow-900/50 border-2 border-dashed border-yellow-700/50 text-yellow-400 hover:bg-yellow-800/50 hover:border-brand-accent hover:text-brand-accent transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed">
                    {isGettingSuggestions ? 'Buscando...' : <><SparklesIcon className="w-8 h-8 mr-2" /> <span className="font-semibold">Sugerir com IA</span></>}
                </button>
            </div>
        )}
      </div>
    </div>
  );
};

export default DailyPlan;