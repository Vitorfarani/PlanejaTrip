import React, { useState } from 'react';
import { Trip, User, Invite } from '../types';
import Logo from './Logo';
import { LogoutIcon, PlusCircleIcon, UserCircleIcon, AtSymbolIcon, CheckCircleIcon, PaperAirplaneIcon, XCircleIcon, EnvelopeIcon } from './IconComponents';
import TripSummaryModal from './TripSummaryModal';
import ConcludeTripModal from './ConcludeTripModal';
import PasswordInput from './PasswordInput';

interface InvitesViewProps {
  pendingInvites: Invite[];
  rejectedNotifications: Invite[];
  onAccept: (invite: Invite) => Promise<void>;
  onDecline: (invite: Invite) => Promise<void>;
  onResend: (inviteId: string) => Promise<void>;
  onDismiss: (inviteId: string) => Promise<void>;
}

const InvitesView: React.FC<InvitesViewProps> = ({ pendingInvites, rejectedNotifications, onAccept, onDecline, onResend, onDismiss }) => {
  if (pendingInvites.length === 0 && rejectedNotifications.length === 0) {
    return (
      <div className="text-center py-20 bg-brand-light rounded-xl shadow-lg">
        <h3 className="text-xl font-bold text-brand-text mb-2">Nenhuma notificação</h3>
        <p className="text-brand-subtext">Convites pendentes ou recusados aparecerão aqui.</p>
      </div>
    );
  }

  return (
    <div className="bg-brand-light rounded-xl p-6 space-y-8">
      {pendingInvites.length > 0 && (
        <div>
          <h3 className="text-2xl font-bold text-brand-text border-b border-gray-700 pb-3 mb-4">Convites Pendentes</h3>
          <div className="space-y-4">
            {pendingInvites.map(invite => (
              <div key={invite.id} className="bg-gray-800 p-4 rounded-lg flex flex-col sm:flex-row justify-between items-center gap-4">
                <div>
                  <p className="font-semibold">
                    <span className="text-brand-primary">{invite.hostName}</span> convidou você para a viagem <span className="text-brand-primary">{invite.tripName}</span>.
                  </p>
                  <p className="text-sm text-brand-subtext">
                    Permissão solicitada: {invite.permission === 'EDIT' ? 'Pode Editar' : 'Somente Visualizar'}
                  </p>
                </div>
                <div className="flex-shrink-0 flex gap-2">
                  <button onClick={() => onAccept(invite)} className="px-4 py-2 text-sm font-semibold text-white bg-green-600 hover:bg-green-700 rounded-lg transition flex items-center gap-2">
                    <CheckCircleIcon className="w-5 h-5" /> Aceitar
                  </button>
                  <button onClick={() => onDecline(invite)} className="px-4 py-2 text-sm font-semibold text-white bg-red-500 hover:bg-red-600 rounded-lg transition flex items-center gap-2">
                    <XCircleIcon className="w-5 h-5" /> Recusar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {rejectedNotifications.length > 0 && (
         <div>
          <h3 className="text-2xl font-bold text-brand-text border-b border-gray-700 pb-3 mb-4">Notificações</h3>
          <div className="space-y-4">
            {rejectedNotifications.map(invite => (
              <div key={invite.id} className="bg-gray-800 p-4 rounded-lg flex flex-col sm:flex-row justify-between items-center gap-4">
                <p className="font-semibold text-amber-300">
                  O usuário <span className="text-brand-primary">{invite.guestEmail}</span> recusou seu convite para a viagem <span className="text-brand-primary">{invite.tripName}</span>.
                </p>
                <div className="flex-shrink-0 flex gap-2">
                  <button onClick={() => onDismiss(invite.id)} className="px-4 py-2 text-sm font-semibold text-white bg-gray-600 hover:bg-gray-700 rounded-lg transition">
                    OK
                  </button>
                  <button onClick={() => onResend(invite.id)} className="px-4 py-2 text-sm font-semibold text-white bg-brand-primary hover:bg-opacity-90 rounded-lg transition flex items-center gap-2">
                    <PaperAirplaneIcon className="w-5 h-5" /> Reenviar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};


interface ProfileScreenProps {
  user: User;
  trips: Trip[];
  invites: Invite[];
  onLogout: () => Promise<void>;
  onNewTrip: () => void;
  onSelectTrip: (trip: Trip) => void;
  onUpdateUser: (updatedUser: User) => Promise<void>;
  onConcludeTrip: (tripId: string) => Promise<void>;
  onAcceptInvite: (invite: Invite) => Promise<void>;
  onDeclineInvite: (invite: Invite) => Promise<void>;
  onResendInvite: (inviteId: string) => Promise<void>;
  onDismissRejection: (inviteId: string) => Promise<void>;
}

const ProfileScreen: React.FC<ProfileScreenProps> = ({ user, trips, invites, onLogout, onNewTrip, onSelectTrip, onUpdateUser, onConcludeTrip, onAcceptInvite, onDeclineInvite, onResendInvite, onDismissRejection }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [userData, setUserData] = useState({ name: user.name, email: user.email });
  const [passwordData, setPasswordData] = useState({ currentPassword: '', newPassword: '', confirmPassword: ''});
  const [summaryTrip, setSummaryTrip] = useState<Trip | null>(null);
  const [tripToConclude, setTripToConclude] = useState<Trip | null>(null);
  const [isInvitesOpen, setIsInvitesOpen] = useState(false);
  const [editError, setEditError] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  const activeTrips = trips.filter(t => !t.isCompleted);
  const completedTrips = trips.filter(t => t.isCompleted);

  const pendingInvites = invites.filter(inv => inv.status === 'PENDING');
  const rejectedNotifications = invites.filter(inv => inv.status === 'REJECTED');

  const handleSave = async () => {
    setEditError('');
    setIsUpdating(true);

    try {
      // Validação de senha (se fornecida)
      if (passwordData.newPassword) {
        if (passwordData.newPassword !== passwordData.confirmPassword) {
          setEditError('As novas senhas não coincidem.');
          return;
        }
        if (passwordData.newPassword.length < 4) {
          setEditError('A senha deve ter pelo menos 4 caracteres.');
          return;
        }
        // Atualizar perfil e senha
        await onUpdateUser({ ...user, ...userData });
        // Nota: A senha é atualizada via authService no App.tsx
      } else {
        // Apenas atualizar nome/email
        await onUpdateUser({ ...user, ...userData });
      }

      setIsEditing(false);
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: ''});
    } catch (error) {
      console.error('Erro ao atualizar perfil:', error);
      setEditError('Erro ao atualizar perfil. Tente novamente.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleConfirmConclusion = async () => {
    if(tripToConclude) {
      setIsUpdating(true);
      try {
        await onConcludeTrip(tripToConclude.id);
        setTripToConclude(null);
      } catch (error) {
        console.error('Erro ao concluir viagem:', error);
      } finally {
        setIsUpdating(false);
      }
    }
  }

  return (
    <div className="min-h-screen bg-brand-dark font-sans">
      <header className="bg-brand-light shadow-md">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <Logo />
            <button onClick={onLogout} className="flex items-center space-x-2 text-brand-subtext hover:text-brand-text transition">
              <LogoutIcon className="w-6 h-6" />
              <span>Sair</span>
            </button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-brand-light p-8 rounded-2xl shadow-xl mb-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between">
            <div>
              {isEditing ? (
                <div className="space-y-4 max-w-sm">
                    <input type="text" value={userData.name} onChange={e => setUserData({...userData, name: e.target.value})} className="bg-gray-700 border border-gray-600 rounded-lg w-full p-3 pl-4" placeholder="Nome" />
                    <input type="email" value={userData.email} disabled className="bg-gray-800 border border-gray-700 rounded-lg w-full p-3 pl-4 text-brand-subtext cursor-not-allowed" title="O e-mail não pode ser alterado."/>
                    <h4 className="text-lg font-semibold pt-2 border-t border-gray-700 mt-4">Alterar Senha</h4>
                    <PasswordInput value={passwordData.currentPassword} onChange={e => setPasswordData({...passwordData, currentPassword: e.target.value})} placeholder="Senha Atual" />
                    <PasswordInput value={passwordData.newPassword} onChange={e => setPasswordData({...passwordData, newPassword: e.target.value})} placeholder="Nova Senha" />
                    <PasswordInput value={passwordData.confirmPassword} onChange={e => setPasswordData({...passwordData, confirmPassword: e.target.value})} placeholder="Confirmar Nova Senha" />
                    {editError && <p className="text-red-400 text-sm">{editError}</p>}
                </div>
              ) : (
                <>
                  <h1 className="text-4xl font-extrabold tracking-tight text-brand-text">{user.name}</h1>
                  <p className="text-brand-subtext mt-1">{user.email}</p>
                </>
              )}
            </div>
            <div className="mt-4 md:mt-0 flex items-center gap-4">
                <button 
                    onClick={() => setIsInvitesOpen(true)}
                    className="relative p-3 rounded-lg bg-brand-light border border-gray-600 hover:bg-gray-700 transition"
                    aria-label="Ver convites e notificações"
                >
                    <EnvelopeIcon className="w-6 h-6" />
                    {invites.length > 0 && (
                        <span className="absolute -top-2 -right-2 flex h-6 w-6">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-secondary opacity-75"></span>
                            <span className="relative inline-flex items-center justify-center rounded-full h-6 w-6 bg-brand-secondary text-xs text-white font-bold">{invites.length}</span>
                        </span>
                    )}
                </button>
              {isEditing ? (
                 <div className="flex space-x-2">
                    <button
                      onClick={() => { setIsEditing(false); setEditError(''); }}
                      disabled={isUpdating}
                      className="px-4 py-2 rounded-lg bg-gray-600 hover:bg-gray-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={isUpdating}
                      className="px-4 py-2 rounded-lg bg-brand-primary hover:bg-opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isUpdating ? 'Salvando...' : 'Salvar'}
                    </button>
                 </div>
              ) : (
                <button onClick={() => setIsEditing(true)} className="px-4 py-2 rounded-lg bg-brand-light border border-gray-600 hover:bg-gray-700 transition">
                  Editar Perfil
                </button>
              )}
            </div>
          </div>
        </div>
        
        <div className="space-y-12">
            <div>
                <div className="flex justify-between items-center mb-6">
                <h2 className="text-3xl font-bold text-brand-text">Viagens Ativas</h2>
                <button onClick={onNewTrip} className="inline-flex items-center bg-brand-primary hover:bg-opacity-90 text-white font-bold py-2 px-4 rounded-lg shadow-lg transition duration-300 ease-in-out transform hover:scale-105">
                    <PlusCircleIcon className="w-5 h-5 mr-2" />
                    Nova Viagem
                </button>
                </div>
                {activeTrips.length === 0 ? (
                <div className="text-center py-20 bg-brand-light rounded-xl shadow-lg">
                    <h2 className="text-2xl font-bold text-brand-text mb-4">Nenhuma viagem planejada ainda!</h2>
                    <p className="text-brand-subtext">Clique em "Nova Viagem" para começar a organizar.</p>
                </div>
                ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {activeTrips.map(trip => (
                    <div key={trip.id} className="bg-brand-light rounded-xl shadow-lg transform hover:-translate-y-2 transition-transform duration-300 flex flex-col">
                        <div className="p-6 flex-grow">
                        <h3 className="text-xl font-bold text-brand-text">{trip.name}</h3>
                        <p className="text-brand-subtext mt-1">{trip.destination}</p>
                        <p className="text-sm text-gray-500 mt-2">{new Date(trip.startDate).toLocaleDateString('pt-BR', {timeZone: 'UTC'})} - {new Date(trip.endDate).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}</p>
                        </div>
                        <div className="px-4 py-3 bg-gray-800 flex flex-col gap-3">
                            <div className="grid grid-cols-2 gap-3">
                            <button onClick={() => setSummaryTrip(trip)} className="w-full bg-gray-700 text-brand-text font-semibold px-4 py-2 text-sm rounded-lg hover:bg-gray-600 transition">
                                Ver Resumo
                            </button>
                            <button onClick={() => onSelectTrip(trip)} className="w-full bg-brand-primary text-white font-semibold px-4 py-2 text-sm rounded-lg hover:bg-opacity-90 transition">
                                Planejar
                            </button>
                            </div>
                            {trip.ownerEmail === user.email && (
                            <button onClick={() => setTripToConclude(trip)} className="w-full bg-green-800 text-green-200 font-semibold px-4 py-2 text-sm rounded-lg hover:bg-green-700 transition flex items-center justify-center gap-2">
                                <CheckCircleIcon className="w-5 h-5"/> Concluir Viagem
                            </button>
                            )}
                        </div>
                    </div>
                    ))}
                </div>
                )}
            </div>
            {completedTrips.length > 0 && (
                <div>
                    <h2 className="text-3xl font-bold text-brand-text mb-6">Viagens Realizadas</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {completedTrips.map(trip => (
                    <div key={trip.id} className="bg-brand-light rounded-xl shadow-lg overflow-hidden flex flex-col opacity-70">
                        <div className="p-6 flex-grow">
                        <div className="flex justify-between items-start">
                            <h3 className="text-xl font-bold text-brand-text">{trip.name}</h3>
                            <CheckCircleIcon className="w-6 h-6 text-brand-secondary"/>
                        </div>
                        <p className="text-brand-subtext mt-1">{trip.destination}</p>
                        <p className="text-sm text-gray-500 mt-2">{new Date(trip.startDate).toLocaleDateString('pt-BR', {timeZone: 'UTC'})} - {new Date(trip.endDate).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}</p>
                        </div>
                        <div className="px-4 py-3 bg-gray-800 grid grid-cols-1">
                            <button onClick={() => setSummaryTrip(trip)} className="w-full bg-gray-700 text-brand-text font-semibold px-4 py-2 text-sm rounded-lg hover:bg-gray-600 transition">
                            Ver Resumo
                            </button>
                        </div>
                    </div>
                    ))}
                    </div>
                </div>
            )}
        </div>
      </main>

      {isInvitesOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50 p-4">
            <div className="bg-brand-light rounded-xl shadow-2xl p-6 m-4 max-w-2xl w-full max-h-[80vh] flex flex-col transform transition-all duration-300 ease-out text-brand-text">
                <div className="flex justify-between items-center pb-3 mb-4 border-b border-gray-700">
                     <h2 className="text-2xl font-bold">Convites & Notificações</h2>
                     <button onClick={() => setIsInvitesOpen(false)} className="text-brand-subtext hover:text-brand-text">
                        <XCircleIcon className="w-8 h-8" />
                     </button>
                </div>
                <div className="overflow-y-auto pr-2">
                    <InvitesView 
                        pendingInvites={pendingInvites} 
                        rejectedNotifications={rejectedNotifications} 
                        onAccept={onAcceptInvite} 
                        onDecline={onDeclineInvite} 
                        onResend={onResendInvite} 
                        onDismiss={onDismissRejection} 
                    />
                </div>
            </div>
        </div>
      )}
      {summaryTrip && <TripSummaryModal trip={summaryTrip} onClose={() => setSummaryTrip(null)} />}
      {tripToConclude && (
        <ConcludeTripModal 
            tripName={tripToConclude.name} 
            onConfirm={handleConfirmConclusion} 
            onCancel={() => setTripToConclude(null)} 
        />
      )}
    </div>
  );
};

export default ProfileScreen;