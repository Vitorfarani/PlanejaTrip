import React, { useState, useEffect } from 'react';
import { Trip, User, Invite, Participant } from './types';
import LoginScreen from './components/LoginScreen';
import ProfileScreen from './components/ProfileScreen';
import TripForm from './components/TripForm';
import TripDashboard from './components/TripDashboard';
import ForgotPasswordModal from './components/ForgotPasswordModal';
import * as authService from './services/authService';
import * as tripService from './services/tripService';
import * as inviteService from './services/inviteService';
import * as profileService from './services/profileService';

type View = 'LOGIN' | 'PROFILE' | 'TRIP_FORM' | 'TRIP_DASHBOARD';

interface AppState {
  user: User | null;
  trips: Trip[];
  invites: Invite[];
}

const getInitialState = (): AppState => ({ user: null, trips: [], invites: [] });

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(getInitialState());
  const [currentView, setCurrentView] = useState<View>('LOGIN');
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Verificar se há uma sessão ativa ao carregar o app
    const checkSession = async () => {
      const user = await authService.getCurrentUser();
      if (user) {
        await loadUserData(user);
        setCurrentView('PROFILE');
      }
      setIsLoading(false);
    };

    checkSession();
  }, []);

  const loadUserData = async (user: User) => {
    try {
      // Carregar viagens do usuário
      const trips = await tripService.getUserTrips(user.id);

      // Carregar convites do usuário
      const invites = await inviteService.getUserInvites(user.email);

      // Carregar convites enviados pelo usuário (rejeitados)
      const sentInvites = await inviteService.getSentInvites(user.email);
      const rejectedInvites = sentInvites.filter(inv => inv.status === 'REJECTED');

      // Combinar convites recebidos (pending) e enviados (rejected)
      const allInvites = [...invites, ...rejectedInvites];

      setAppState({ user, trips, invites: allInvites });
    } catch (error) {
      console.error('Erro ao carregar dados do usuário:', error);
      setAppState({ user, trips: [], invites: [] });
    }
  };

  const handleLogin = async (email: string, password: string): Promise<string | null> => {
    const result = await authService.login(email, password);

    if (!result.success || !result.user) {
      return result.error || "Erro ao realizar login";
    }

    await loadUserData(result.user);
    setCurrentView('PROFILE');
    return null;
  };

  const handleRegister = async (name: string, email: string, password: string): Promise<string | null> => {
    const result = await authService.register(name, email, password);

    if (!result.success || !result.user) {
      return result.error || "Erro ao registrar usuário";
    }

    await loadUserData(result.user);
    setCurrentView('PROFILE');
    return null;
  };

  const handleLogout = async () => {
    await authService.logout();
    setAppState(getInitialState());
    setCurrentView('LOGIN');
  };

  const handlePasswordReset = async (email: string, newPassword: string): Promise<string | null> => {
    const result = await authService.updatePassword(newPassword);

    if (!result.success) {
      return result.error || "Erro ao redefinir senha";
    }

    return null;
  };

  const handleUpdateUser = async (updatedUser: User) => {
    if (!appState.user) return;

    const result = await profileService.updateProfile(appState.user.id, updatedUser.name);

    if (result) {
      setAppState(prev => ({ ...prev, user: result }));
    }
  };

  const handleSaveTrip = async (trip: Trip) => {
    if (!appState.user) return;

    const newTrip = await tripService.createTrip(trip, appState.user.id);

    if (newTrip) {
      setAppState(prev => ({ ...prev, trips: [...prev.trips, newTrip] }));
      setSelectedTripId(newTrip.id);
      setCurrentView('TRIP_DASHBOARD');
    }
  };

  const handleUpdateTrip = async (updatedTrip: Trip) => {
    if (!appState.user) return;

    const result = await tripService.updateTrip(updatedTrip.id, updatedTrip);

    if (result) {
      // Se o usuário atual foi removido da viagem, atualize sua lista de viagens
      if (!updatedTrip.participants.some(p => p.email === appState.user!.email)) {
        setAppState(prev => ({ ...prev, trips: prev.trips.filter(t => t.id !== updatedTrip.id) }));
        navigateToProfile();
      } else {
        setAppState(prev => ({
          ...prev,
          trips: prev.trips.map(t => t.id === updatedTrip.id ? result : t)
        }));
      }
    }
  };

  const handleConcludeTrip = async (tripId: string) => {
    const trip = appState.trips.find(t => t.id === tripId);
    if (!trip) return;

    const result = await tripService.concludeTrip(tripId, trip);

    if (result) {
      setAppState(prev => ({
        ...prev,
        trips: prev.trips.map(t => t.id === tripId ? result : t)
      }));
    }
  };

  const handleInvite = async (trip: Trip, guestEmail: string, permission: 'EDIT' | 'VIEW_ONLY'): Promise<string | null> => {
    if (!appState.user) return "Usuário não logado.";

    // Verificar se o email existe no sistema
    const guestProfile = await profileService.getProfileByEmail(guestEmail);
    if (!guestProfile) return "Nenhuma conta encontrada com este e-mail.";

    // Verificar se o usuário já participa da viagem
    if (trip.participants.some(p => p.email === guestEmail)) {
      return "Este usuário já participa da viagem.";
    }

    // Criar convite
    const invite = await inviteService.createInvite(
      trip.id,
      trip.name,
      appState.user.name,
      appState.user.email,
      guestEmail,
      permission
    );

    if (!invite) {
      return "Um convite para esta viagem já foi enviado a este usuário.";
    }

    // Adicionar participante imediatamente à viagem (antes mesmo de aceitar)
    const updatedTrip = {
      ...trip,
      participants: [
        ...trip.participants,
        {
          name: guestProfile.name,
          email: guestProfile.email,
          permission: permission
        }
      ]
    };

    // Atualizar a viagem no banco
    await handleUpdateTrip(updatedTrip);

    return null; // Success
  };

  const handleAcceptInvite = async (invite: Invite) => {
    if (!appState.user) return;

    // Buscar o perfil do convidado para obter o user_id
    const guestProfile = await profileService.getProfileByEmail(invite.guestEmail);
    if (!guestProfile) {
      console.error('Perfil do convidado não encontrado');
      return;
    }

    // Aceitar convite (adiciona à trip_participants, atualiza trip.participants e remove o convite)
    const success = await inviteService.acceptInvite(
      invite.id,
      guestProfile.id,
      guestProfile.name,
      guestProfile.email
    );

    if (success) {
      // Recarregar viagens e convites
      const trips = await tripService.getUserTrips(appState.user.id);
      const invites = await inviteService.getUserInvites(appState.user.email);

      setAppState(prev => ({ ...prev, trips, invites }));
    }
  };

  const handleDeclineInvite = async (invite: Invite) => {
    if (!appState.user) return;

    const success = await inviteService.declineInvite(invite.id);

    if (success) {
      setAppState(prev => ({
        ...prev,
        invites: prev.invites.filter(i => i.id !== invite.id)
      }));
    }
  };

  const handleResendInvite = async (inviteId: string) => {
    const success = await inviteService.resendInvite(inviteId);

    if (success) {
      setAppState(prev => ({
        ...prev,
        invites: prev.invites.filter(i => i.id !== inviteId)
      }));
    }
  };

  const handleDismissRejection = async (inviteId: string) => {
    const success = await inviteService.dismissRejection(inviteId);

    if (success) {
      setAppState(prev => ({
        ...prev,
        invites: prev.invites.filter(i => i.id !== inviteId)
      }));
    }
  };

  const handleSelectTrip = (trip: Trip) => {
    setSelectedTripId(trip.id);
    setCurrentView('TRIP_DASHBOARD');
  };

  const navigateToProfile = async () => {
    if (appState.user) await loadUserData(appState.user); // Recarregar dados ao voltar pro perfil
    setSelectedTripId(null);
    setCurrentView('PROFILE');
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
          fontSize: '18px'
        }}>
          Carregando...
        </div>
      );
    }

    switch (currentView) {
      case 'LOGIN':
        return <LoginScreen onLogin={handleLogin} onRegister={handleRegister} onForgotPassword={() => setIsForgotPasswordOpen(true)} />;
      case 'PROFILE':
        if (!appState.user) return <LoginScreen onLogin={handleLogin} onRegister={handleRegister} onForgotPassword={() => setIsForgotPasswordOpen(true)} />;
        return <ProfileScreen user={appState.user} trips={appState.trips} invites={appState.invites} onLogout={handleLogout} onNewTrip={() => setCurrentView('TRIP_FORM')} onSelectTrip={handleSelectTrip} onUpdateUser={handleUpdateUser} onConcludeTrip={handleConcludeTrip} onAcceptInvite={handleAcceptInvite} onDeclineInvite={handleDeclineInvite} onResendInvite={handleResendInvite} onDismissRejection={handleDismissRejection} />;
      case 'TRIP_FORM':
        if (!appState.user) return <LoginScreen onLogin={handleLogin} onRegister={handleRegister} onForgotPassword={() => setIsForgotPasswordOpen(true)} />;
        return <TripForm user={appState.user} onSave={handleSaveTrip} onCancel={() => setCurrentView('PROFILE')} />;
      case 'TRIP_DASHBOARD':
        const selectedTrip = appState.trips.find(t => t.id === selectedTripId);
        if (!selectedTrip || !appState.user) {
            navigateToProfile();
            return null;
        }
        return <TripDashboard user={appState.user} trip={selectedTrip} updateTrip={handleUpdateTrip} onBackToProfile={navigateToProfile} onInvite={handleInvite} />;
      default:
        return <LoginScreen onLogin={handleLogin} onRegister={handleRegister} onForgotPassword={() => setIsForgotPasswordOpen(true)} />;
    }
  };

  return (
    <>
        {renderContent()}
        {isForgotPasswordOpen && (
            <ForgotPasswordModal
                onClose={() => setIsForgotPasswordOpen(false)}
                onPasswordReset={handlePasswordReset}
            />
        )}
    </>
  );
};

export default App;
