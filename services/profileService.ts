import { supabase } from '../src/lib/supabaseClient';
import { User } from '../types';

/**
 * Busca o perfil de um usuário pelo ID
 */
export const getProfile = async (userId: string): Promise<User | null> => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Erro ao buscar perfil:', error);
      throw error;
    }

    return {
      id: data.id,
      name: data.name,
      email: data.email
    };
  } catch (error) {
    console.error('Erro ao buscar perfil:', error);
    return null;
  }
};

/**
 * Busca um perfil pelo email
 */
export const getProfileByEmail = async (email: string): Promise<User | null> => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', email)
      .single();

    if (error) {
      console.error('Erro ao buscar perfil por email:', error);
      return null;
    }

    return {
      id: data.id,
      name: data.name,
      email: data.email
    };
  } catch (error) {
    console.error('Erro ao buscar perfil por email:', error);
    return null;
  }
};

/**
 * Atualiza o perfil do usuário
 */
export const updateProfile = async (userId: string, name: string): Promise<User | null> => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .update({ name, updated_at: new Date().toISOString() })
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      console.error('Erro ao atualizar perfil:', error);
      throw error;
    }

    return {
      id: data.id,
      name: data.name,
      email: data.email
    };
  } catch (error) {
    console.error('Erro ao atualizar perfil:', error);
    return null;
  }
};

/**
 * Verifica se um email existe no sistema
 */
export const emailExists = async (email: string): Promise<boolean> => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('email')
      .eq('email', email)
      .single();

    if (error) {
      return false;
    }

    return !!data;
  } catch (error) {
    return false;
  }
};
