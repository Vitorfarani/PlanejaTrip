import React, { useState, useMemo } from 'react';
import { Trip, Activity } from '../types';
import { ChartPieIcon, UsersIcon } from './IconComponents';
import PieChart from './PieChart';

interface FinancialViewProps {
  trip: Trip;
  onUpdateBudget: (newBudget: number) => Promise<void>;
  canEdit: boolean;
}

const currencySymbols = {
    BRL: 'R$',
    USD: '$',
    EUR: '€',
};

type SortOrder = 'default' | 'name_asc' | 'spent_asc' | 'spent_desc';


const COLORS = ['#00A8FF', '#00E0C7', '#FACC15', '#FF7A00', '#D600FF', '#00FF4C'];

const FinancialView: React.FC<FinancialViewProps> = ({ trip, onUpdateBudget, canEdit }) => {
  const [selectedTraveler, setSelectedTraveler] = useState<string | null>(null);
  const [isEditingBudget, setIsEditingBudget] = useState(false);
  const [newBudget, setNewBudget] = useState(trip.budget.toString());
  const [splitViewMode, setSplitViewMode] = useState<'individual' | 'equal'>('individual');
  const [sortOrder, setSortOrder] = useState<SortOrder>('default');
  const [isUpdating, setIsUpdating] = useState(false);
  
  const currencySymbol = currencySymbols[trip.currency];

  const confirmedActivities = useMemo(() => trip.days.flatMap(d => d.activities).filter(a => a.isConfirmed), [trip.days]);

  const expensesByCategory = useMemo(() => {
    let activitiesToConsider = confirmedActivities;
    if (selectedTraveler) {
        activitiesToConsider = confirmedActivities.filter(a => a.participants.includes(selectedTraveler));
    }

    // Accumulate costs by category, handling potential undefined realCost and division by zero.
    const data = activitiesToConsider.reduce((acc, activity) => {
        let cost = activity.realCost ?? 0;
        
        if (selectedTraveler) {
            const participantCount = activity.participants.length || 1;
            cost = cost / participantCount;
        }
        
        acc[activity.category] = (acc[activity.category] || 0) + cost;
        return acc;
    }, {} as Record<string, number>);

    return Object.entries(data).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [confirmedActivities, selectedTraveler]);
  
  const totalSpentOverall = useMemo(() => confirmedActivities.reduce((sum, act) => sum + (act.realCost ?? 0), 0), [confirmedActivities]);
  
  const totalSpentFiltered = useMemo(() => expensesByCategory.reduce((sum, item) => sum + item.value, 0), [expensesByCategory]);

  const individualSpending = useMemo(() => {
    const spending = trip.participants.map(participant => {
        const totalSpent = confirmedActivities.reduce((sum, activity) => {
            if (activity.participants.includes(participant.name)) {
                // FIX: The 'realCost' property on an activity can be undefined.
                // We must provide a fallback value (e.g., 0) to ensure arithmetic operations are safe.
                const cost = activity.realCost ?? 0;
                const participantCount = activity.participants.length || 1;
                const share = cost / participantCount;
                return sum + share;
            }
            return sum;
        }, 0);
        return { name: participant.name, spent: totalSpent };
    });

    switch (sortOrder) {
        case 'name_asc':
            return spending.sort((a, b) => a.name.localeCompare(b.name));
        case 'spent_asc':
            return spending.sort((a, b) => a.spent - b.spent);
        case 'spent_desc':
            return spending.sort((a, b) => b.spent - a.spent);
        case 'default':
        default:
            return spending;
    }
  }, [confirmedActivities, trip.participants, sortOrder]);


  const costPerPerson = totalSpentOverall / (trip.participants.length || 1);

  const filteredExpenses = useMemo(() => {
    const sortFn = (a: Activity, b: Activity) => parseInt(b.id) - parseInt(a.id);
    if (selectedTraveler) {
      return confirmedActivities.filter(a => a.participants.includes(selectedTraveler)).sort(sortFn);
    }
    return [...confirmedActivities].sort(sortFn);
  }, [confirmedActivities, selectedTraveler]);

  const handleBudgetSave = async () => {
    const budgetValue = parseFloat(newBudget);
    if(!isNaN(budgetValue)) {
      setIsUpdating(true);
      try {
        await onUpdateBudget(budgetValue);
        setIsEditingBudget(false);
      } catch (error) {
        console.error('Erro ao atualizar orçamento:', error);
      } finally {
        setIsUpdating(false);
      }
    }
  }

  const durationInDays = trip.days.length || 1;
  const participantsCount = trip.participants.length || 1;
  const dailySpendingRecommendation = (trip.budget / durationInDays) / participantsCount;
  
  return (
    <div className="space-y-8">
        {/* Financial Summary */}
        <div className="bg-brand-light p-6 rounded-xl shadow-lg">
             <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold">Resumo Financeiro</h3>
                {isEditingBudget ? (
                     <div className="flex items-center gap-2">
                        <input
                          type="number"
                          value={newBudget}
                          onChange={e => setNewBudget(e.target.value)}
                          disabled={isUpdating}
                          className="w-32 p-2 bg-gray-800 border-gray-600 rounded-lg disabled:opacity-50"
                        />
                        <button
                          onClick={handleBudgetSave}
                          disabled={isUpdating}
                          className="px-4 py-2 text-sm bg-brand-primary rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isUpdating ? 'Salvando...' : 'Salvar'}
                        </button>
                        <button
                          onClick={() => setIsEditingBudget(false)}
                          disabled={isUpdating}
                          className="px-2 py-2 text-sm bg-gray-600 rounded-lg leading-none disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          X
                        </button>
                     </div>
                ) : (
                    canEdit && <button onClick={() => setIsEditingBudget(true)} className="px-4 py-2 text-sm border border-gray-600 rounded-lg hover:bg-gray-700 transition">Editar Orçamento</button>
                )}
             </div>
             <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div className="bg-gray-800 p-4 rounded-lg">
                    <p className="text-sm text-brand-subtext">Orçamento Total</p>
                    <p className="text-2xl font-bold">{currencySymbol} {trip.budget.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                </div>
                 <div className="bg-gray-800 p-4 rounded-lg">
                    <p className="text-sm text-brand-subtext">Gasto Total</p>
                    <p className="text-2xl font-bold text-brand-secondary">{currencySymbol} {totalSpentOverall.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                </div>
                 <div className="bg-gray-800 p-4 rounded-lg">
                    <p className="text-sm text-brand-subtext">Saldo Restante</p>
                    <p className={`text-2xl font-bold ${trip.budget - totalSpentOverall < 0 ? 'text-red-400' : 'text-green-400'}`}>{currencySymbol} {(trip.budget - totalSpentOverall).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                </div>
                 <div className="bg-gray-800 p-4 rounded-lg">
                    <p className="text-sm text-brand-subtext">Média Diária Sugerida</p>
                    <p className="text-2xl font-bold text-yellow-400">{currencySymbol} {dailySpendingRecommendation.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                </div>
             </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Chart View */}
            <div className="bg-brand-light p-6 rounded-xl shadow-lg">
                <h3 className="text-2xl font-bold">Análise de Gastos</h3>
                    <div className="flex flex-col md:flex-row gap-8 items-center justify-center mt-4 pt-4 border-t border-gray-700">
                        {totalSpentFiltered > 0 ? (
                            <>
                                <div className="flex-shrink-0">
                                    <PieChart data={expensesByCategory} />
                                </div>
                                <div className="w-full md:w-64">
                                    <h4 className="font-semibold mb-2">Legenda por Categoria</h4>
                                    <ul className="space-y-2">
                                        {expensesByCategory.map((item, index) => (
                                            <li key={item.name} className="flex items-center justify-between">
                                                <div className="flex items-center">
                                                    <span className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: COLORS[index % COLORS.length] }}></span>
                                                    <span className="text-sm">{item.name}</span>
                                                </div>
                                                <span className="font-semibold text-sm">{currencySymbol} {item.value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </>
                        ) : (
                            <p className="text-brand-subtext text-center py-10">Nenhum gasto confirmado para exibir o gráfico.</p>
                        )}
                    </div>
            </div>
            
            {/* Traveler Breakdown */}
            {participantsCount > 0 && (
                <div className="bg-brand-light p-6 rounded-xl shadow-lg flex flex-col">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-2xl font-bold">Despesas por Viajante</h3>
                        <div className="flex items-center space-x-1 bg-gray-800 p-1 rounded-lg">
                            <button onClick={() => setSplitViewMode('individual')} className={`px-4 py-2 text-sm font-semibold rounded-md transition ${splitViewMode === 'individual' ? 'bg-brand-primary text-white' : 'text-brand-subtext hover:bg-gray-700'}`}>Individual</button>
                            <button onClick={() => setSplitViewMode('equal')} className={`px-4 py-2 text-sm font-semibold rounded-md transition ${splitViewMode === 'equal' ? 'bg-brand-primary text-white' : 'text-brand-subtext hover:bg-gray-700'}`}>Igualitário</button>
                        </div>
                    </div>
                     {splitViewMode === 'individual' && (
                        <div className="mb-3">
                             <label htmlFor="sortOrder" className="text-sm text-brand-subtext mr-2">Ordenar por:</label>
                             <select id="sortOrder" value={sortOrder} onChange={e => setSortOrder(e.target.value as SortOrder)} className="bg-gray-700 text-sm rounded-md p-1 border-gray-600">
                                 <option value="default">Padrão</option>
                                 <option value="name_asc">Nome (A-Z)</option>
                                 <option value="spent_desc">Gasto (Maior)</option>
                                 <option value="spent_asc">Gasto (Menor)</option>
                             </select>
                        </div>
                     )}
                    <div className="space-y-2 flex-grow overflow-y-auto pr-2 max-h-[350px]">
                        {splitViewMode === 'individual' ? (
                            individualSpending.map(item => (
                                <div key={item.name} className="flex justify-between items-center p-3 bg-gray-800 rounded-lg">
                                    <span className="font-medium">{item.name}</span>
                                    <span className="font-bold text-brand-primary text-lg">{currencySymbol} {item.spent.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                </div>
                            ))
                        ) : (
                            trip.participants.map(participant => (
                                <div key={participant.email} className="flex justify-between items-center p-3 bg-gray-800 rounded-lg">
                                    <span className="font-medium">{participant.name}</span>
                                    <span className="font-bold text-brand-primary text-lg">{currencySymbol} {costPerPerson.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>

        {/* Expenses List */}
        <div className="bg-brand-light p-6 rounded-xl shadow-lg">
            <div className="flex flex-col md:flex-row justify-between md:items-center mb-4 gap-4">
                 <h3 className="text-2xl font-bold">Detalhes dos Gastos</h3>
                 <div className="flex items-center gap-2">
                    <label htmlFor="traveler_filter" className="text-sm font-medium text-brand-subtext">Filtrar por:</label>
                    <select 
                        id="traveler_filter"
                        onChange={(e) => setSelectedTraveler(e.target.value === 'default' ? null : e.target.value)} 
                        value={selectedTraveler || "default"} 
                        className="w-full md:w-auto px-4 py-2 rounded-lg text-sm bg-gray-700 border border-transparent text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-primary"
                    >
                       <option value="default">Todos os Gastos</option>
                       {trip.participants.map(p => <option key={p.email} value={p.name}>{p.name}</option>)}
                    </select>
                 </div>
            </div>
             <div className="space-y-1">
                {filteredExpenses.length > 0 ? filteredExpenses.map(exp => (
                    <div key={exp.id} className="p-4 border-b border-gray-700 last:border-b-0 flex flex-col sm:flex-row justify-between sm:items-center hover:bg-gray-800/50 transition-colors rounded-lg">
                        <div>
                            <p className="font-bold">{exp.name}</p>
                            <p className="text-xs text-brand-subtext">{exp.category} - {new Date(parseInt(exp.id)).toLocaleDateString('pt-BR')}</p>
                        </div>
                        <div className="text-left sm:text-right mt-2 sm:mt-0">
                             <p className="text-lg font-semibold text-brand-secondary">{currencySymbol} {exp.realCost?.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                             <div className="flex items-center justify-start sm:justify-end text-xs text-brand-subtext" title={exp.participants.join(', ')}>
                                <UsersIcon className="w-4 h-4 mr-1"/>
                                <span>{exp.participants.length > 0 ? exp.participants.join(', ') : 'Nenhum participante'}</span>
                             </div>
                        </div>
                    </div>
                )) : <p className="text-center text-brand-subtext py-8">Nenhum gasto encontrado para esta seleção.</p>}
             </div>
        </div>
    </div>
  );
};

export default FinancialView;