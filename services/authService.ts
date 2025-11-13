import { supabase } from '../src/lib/supabaseClient';
import { User } from '../types';

interface AuthResult {
  success: boolean;
  error?: string;
  user?: User;
}

/**
 * Realiza login do usuário
 */
export const login = async (email: string, password: string): Promise<AuthResult> => {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      if (error.message.includes('Invalid login credentials')) {
        return { success: false, error: 'Email ou senha incorretos' };
      }
      return { success: false, error: error.message };
    }

    if (!data.user) {
      return { success: false, error: 'Nenhum usuário encontrado com esse e-mail' };
    }

    // Buscar perfil do usuário
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .single();

    if (profileError || !profile) {
      return { success: false, error: 'Erro ao carregar perfil do usuário' };
    }

    const user: User = {
      id: profile.id,
      name: profile.name,
      email: profile.email
    };

    return { success: true, user };
  } catch (error) {
    console.error('Erro no login:', error);
    return { success: false, error: 'Erro ao realizar login' };
  }
};

/**
 * Registra um novo usuário
 */
export const register = async (
  name: string,
  email: string,
  password: string
): Promise<AuthResult> => {
  try {
    if (!name || name.trim() === '') {
      return { success: false, error: 'O nome é obrigatório' };
    }

    // Criar usuário no Supabase Auth
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name: name.trim()
        }
      }
    });

    if (error) {
      console.error('Erro no registro do Supabase:', error);
      if (error.message.includes('User already registered')) {
        return { success: false, error: 'Este e-mail já está cadastrado' };
      }
      if (error.message.includes('invalid') || error.message.includes('Invalid')) {
        return { success: false, error: 'Email inválido. Verifique as configurações de autenticação no Supabase.' };
      }
      return { success: false, error: error.message };
    }

    if (!data.user) {
      return { success: false, error: 'Erro ao criar usuário' };
    }

    // Buscar o perfil criado automaticamente pelo trigger
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .single();

    if (profileError || !profile) {
      return { success: false, error: 'Erro ao criar perfil do usuário' };
    }

    const user: User = {
      id: profile.id,
      name: profile.name,
      email: profile.email
    };

    return { success: true, user };
  } catch (error) {
    console.error('Erro no registro:', error);
    return { success: false, error: 'Erro ao registrar usuário' };
  }
};

/**
 * Realiza logout do usuário
 */
export const logout = async (): Promise<void> => {
  await supabase.auth.signOut();
};

/**
 * Verifica se existe uma sessão ativa e retorna o usuário
 */
export const getCurrentUser = async (): Promise<User | null> => {
  try {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.user) {
      return null;
    }

    // Buscar perfil do usuário
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single();

    if (error || !profile) {
      return null;
    }

    return {
      id: profile.id,
      name: profile.name,
      email: profile.email
    };
  } catch (error) {
    console.error('Erro ao obter usuário atual:', error);
    return null;
  }
};

/**
 * Envia email de reset de senha
 */
export const sendPasswordResetEmail = async (email: string): Promise<{ success: boolean; error?: string }> => {
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Erro ao enviar email de reset:', error);
    return { success: false, error: 'Erro ao enviar email de recuperação' };
  }
};

/**
 * Atualiza a senha do usuário
 */
export const updatePassword = async (newPassword: string): Promise<{ success: boolean; error?: string }> => {
  try {
    const { error } = await supabase.auth.updateUser({
      password: newPassword
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Erro ao atualizar senha:', error);
    return { success: false, error: 'Erro ao atualizar senha' };
  }
};
