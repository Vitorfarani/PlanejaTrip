import { supabase } from '../src/lib/supabaseClient';
import { Invite } from '../types';
import { sendInviteEmail } from './emailService';

/**
 * Busca todos os convites pendentes de um usuário (pelo email)
 */
export const getUserInvites = async (userEmail: string): Promise<Invite[]> => {
  try {
    const { data, error } = await supabase
      .from('invites')
      .select('*')
      .eq('guest_email', userEmail)
      .in('status', ['PENDING', 'REJECTED']);

    if (error) {
      console.error('Erro ao buscar convites:', error);
      throw error;
    }

    // Mapear os dados do Supabase para o formato esperado pela aplicação
    return (data || []).map(invite => ({
      id: invite.id,
      tripId: invite.trip_id,
      tripName: invite.tripname || '',
      hostName: invite.hostname || '',
      hostEmail: invite.host_email,
      guestEmail: invite.guest_email,
      permission: invite.permission as 'EDIT' | 'VIEW_ONLY',
      status: invite.status as 'PENDING' | 'REJECTED'
    }));
  } catch (error) {
    console.error('Erro ao buscar convites:', error);
    return [];
  }
};

/**
 * Cria um novo convite
 */
export const createInvite = async (
  tripId: string,
  tripName: string,
  hostName: string,
  hostEmail: string,
  guestEmail: string,
  permission: 'EDIT' | 'VIEW_ONLY'
): Promise<Invite | null> => {
  try {
    // Verificar se já existe um convite para este email nesta viagem
    const { data: existing, error: existingError } = await supabase
      .from('invites')
      .select('*')
      .eq('trip_id', tripId)
      .eq('guest_email', guestEmail)
      .maybeSingle();

    if (existing) {
      console.log('Convite já existe para este usuário');
      return null;
    }

    // Criar novo convite
    const { data, error } = await supabase
      .from('invites')
      .insert({
        trip_id: tripId,
        tripname: tripName,
        hostname: hostName,
        host_email: hostEmail,
        guest_email: guestEmail,
        permission: permission,
        status: 'PENDING'
      })
      .select()
      .single();

    if (error) {
      console.error('Erro ao criar convite:', error);
      throw error;
    }

    // 🎯 ENVIAR EMAIL para o convidado
    await sendInviteEmail(guestEmail, tripName, hostName, permission);

    return {
      id: data.id,
      tripId: data.trip_id,
      tripName: data.tripname || '',
      hostName: data.hostname || '',
      hostEmail: data.host_email,
      guestEmail: data.guest_email,
      permission: data.permission as 'EDIT' | 'VIEW_ONLY',
      status: data.status as 'PENDING' | 'REJECTED'
    };
  } catch (error) {
    console.error('Erro ao criar convite:', error);
    return null;
  }
};

/**
 * Aceita um convite
 */
export const acceptInvite = async (inviteId: string, userId: string): Promise<boolean> => {
  try {
    // Buscar dados do convite
    const { data: invite, error: inviteError } = await supabase
      .from('invites')
      .select('*')
      .eq('id', inviteId)
      .single();

    if (inviteError || !invite) {
      console.error('Erro ao buscar convite:', inviteError);
      return false;
    }

    // Adicionar usuário como participante da viagem
    const { error: participantError } = await supabase
      .from('trip_participants')
      .insert({
        trip_id: invite.trip_id,
        user_id: userId,
        permission: invite.permission
      });

    if (participantError) {
      console.error('Erro ao adicionar participante:', participantError);
      return false;
    }

    // Deletar o convite
    const { error: deleteError } = await supabase
      .from('invites')
      .delete()
      .eq('id', inviteId);

    if (deleteError) {
      console.error('Erro ao deletar convite:', deleteError);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Erro ao aceitar convite:', error);
    return false;
  }
};

/**
 * Recusa um convite
 */
export const declineInvite = async (inviteId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('invites')
      .update({ status: 'REJECTED' })
      .eq('id', inviteId);

    if (error) {
      console.error('Erro ao recusar convite:', error);
      throw error;
    }

    return true;
  } catch (error) {
    console.error('Erro ao recusar convite:', error);
    return false;
  }
};

/**
 * Reenvia um convite (altera status de REJECTED para PENDING)
 */
export const resendInvite = async (inviteId: string): Promise<boolean> => {
  try {
    // Buscar dados do convite para enviar email
    const { data: invite, error: inviteError } = await supabase
      .from('invites')
      .select('*')
      .eq('id', inviteId)
      .single();

    if (inviteError || !invite) {
      console.error('Erro ao buscar convite:', inviteError);
      return false;
    }

    // Atualizar status para PENDING
    const { error } = await supabase
      .from('invites')
      .update({ status: 'PENDING' })
      .eq('id', inviteId);

    if (error) {
      console.error('Erro ao reenviar convite:', error);
      throw error;
    }

    // 🎯 REENVIAR EMAIL para o convidado
    await sendInviteEmail(
      invite.guest_email,
      invite.tripname || '',
      invite.hostname || '',
      invite.permission as 'EDIT' | 'VIEW_ONLY'
    );

    return true;
  } catch (error) {
    console.error('Erro ao reenviar convite:', error);
    return false;
  }
};

/**
 * Remove um convite rejeitado
 */
export const dismissRejection = async (inviteId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('invites')
      .delete()
      .eq('id', inviteId);

    if (error) {
      console.error('Erro ao remover convite:', error);
      throw error;
    }

    return true;
  } catch (error) {
    console.error('Erro ao remover convite:', error);
    return false;
  }
};

/**
 * Busca convites enviados por um usuário (como host)
 */
export const getSentInvites = async (hostEmail: string): Promise<Invite[]> => {
  try {
    const { data, error } = await supabase
      .from('invites')
      .select('*')
      .eq('host_email', hostEmail);

    if (error) {
      console.error('Erro ao buscar convites enviados:', error);
      throw error;
    }

    return (data || []).map(invite => ({
      id: invite.id,
      tripId: invite.trip_id,
      tripName: invite.tripname || '',
      hostName: invite.hostname || '',
      hostEmail: invite.host_email,
      guestEmail: invite.guest_email,
      permission: invite.permission as 'EDIT' | 'VIEW_ONLY',
      status: invite.status as 'PENDING' | 'REJECTED'
    }));
  } catch (error) {
    console.error('Erro ao buscar convites enviados:', error);
    return [];
  }
};
