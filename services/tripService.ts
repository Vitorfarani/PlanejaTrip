import { supabase } from '../src/lib/supabaseClient';
import { Trip } from '../types';

/**
 * Busca todas as viagens do usuário atual
 * Inclui viagens próprias e viagens onde é participante
 */
export const getUserTrips = async (userId: string): Promise<Trip[]> => {
  try {
    // Buscar viagens onde o usuário é o dono
    const { data: ownTrips, error: ownError } = await supabase
      .from('trips')
      .select('*')
      .eq('owner_id', userId);

    if (ownError) {
      console.error('Erro ao buscar viagens próprias:', ownError);
      throw ownError;
    }

    // Buscar viagens onde o usuário é participante
    const { data: participantTrips, error: participantError } = await supabase
      .from('trip_participants')
      .select('trip_id')
      .eq('user_id', userId);

    if (participantError) {
      console.error('Erro ao buscar viagens como participante:', participantError);
      throw participantError;
    }

    // Se há viagens como participante, buscar os dados completos
    let sharedTrips: any[] = [];
    if (participantTrips && participantTrips.length > 0) {
      const tripIds = participantTrips.map(p => p.trip_id);
      const { data, error } = await supabase
        .from('trips')
        .select('*')
        .in('id', tripIds);

      if (error) {
        console.error('Erro ao buscar viagens compartilhadas:', error);
      } else {
        sharedTrips = data || [];
      }
    }

    // Combinar todas as viagens e extrair o campo 'data' (JSONB)
    const allTrips = [...(ownTrips || []), ...sharedTrips];
    return allTrips.map(trip => ({
      ...trip.data,
      id: trip.id // Garantir que o ID da tabela seja usado
    }));
  } catch (error) {
    console.error('Erro ao buscar viagens:', error);
    return [];
  }
};

/**
 * Cria uma nova viagem
 */
export const createTrip = async (tripData: Trip, userId: string): Promise<Trip | null> => {
  try {
    const { data, error } = await supabase
      .from('trips')
      .insert({
        owner_id: userId,
        data: tripData
      })
      .select()
      .single();

    if (error) {
      console.error('Erro ao criar viagem:', error);
      throw error;
    }

    return {
      ...data.data,
      id: data.id
    };
  } catch (error) {
    console.error('Erro ao criar viagem:', error);
    return null;
  }
};

/**
 * Atualiza uma viagem existente
 */
export const updateTrip = async (tripId: string, tripData: Trip): Promise<Trip | null> => {
  try {
    const { data, error } = await supabase
      .from('trips')
      .update({
        data: tripData
      })
      .eq('id', tripId)
      .select()
      .single();

    if (error) {
      console.error('Erro ao atualizar viagem:', error);
      throw error;
    }

    return {
      ...data.data,
      id: data.id
    };
  } catch (error) {
    console.error('Erro ao atualizar viagem:', error);
    return null;
  }
};

/**
 * Marca uma viagem como concluída
 */
export const concludeTrip = async (tripId: string, tripData: Trip): Promise<Trip | null> => {
  try {
    const updatedTripData = {
      ...tripData,
      isCompleted: true
    };

    const { data, error } = await supabase
      .from('trips')
      .update({
        data: updatedTripData
      })
      .eq('id', tripId)
      .select()
      .single();

    if (error) {
      console.error('Erro ao concluir viagem:', error);
      throw error;
    }

    return {
      ...data.data,
      id: data.id
    };
  } catch (error) {
    console.error('Erro ao concluir viagem:', error);
    return null;
  }
};

/**
 * Deleta uma viagem
 */
export const deleteTrip = async (tripId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('trips')
      .delete()
      .eq('id', tripId);

    if (error) {
      console.error('Erro ao deletar viagem:', error);
      throw error;
    }

    return true;
  } catch (error) {
    console.error('Erro ao deletar viagem:', error);
    return false;
  }
};

/**
 * Adiciona um participante a uma viagem
 */
export const addTripParticipant = async (
  tripId: string,
  userId: string,
  permission: 'EDIT' | 'VIEW_ONLY'
): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('trip_participants')
      .insert({
        trip_id: tripId,
        user_id: userId,
        permission
      });

    if (error) {
      console.error('Erro ao adicionar participante:', error);
      throw error;
    }

    return true;
  } catch (error) {
    console.error('Erro ao adicionar participante:', error);
    return false;
  }
};

/**
 * Remove um participante de uma viagem
 */
export const removeTripParticipant = async (tripId: string, userId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('trip_participants')
      .delete()
      .eq('trip_id', tripId)
      .eq('user_id', userId);

    if (error) {
      console.error('Erro ao remover participante:', error);
      throw error;
    }

    return true;
  } catch (error) {
    console.error('Erro ao remover participante:', error);
    return false;
  }
};
