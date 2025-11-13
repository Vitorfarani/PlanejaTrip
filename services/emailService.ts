import emailjs from '@emailjs/browser';

// Configurações do EmailJS (vêm do .env.local)
const EMAILJS_SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID;
const EMAILJS_TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;
const EMAILJS_PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;

/**
 * Envia um email de convite para uma viagem
 */
export const sendInviteEmail = async (
  guestEmail: string,
  tripName: string,
  hostName: string,
  permission: 'EDIT' | 'VIEW_ONLY'
): Promise<boolean> => {
  // Verificar se as variáveis de ambiente estão configuradas
  if (!EMAILJS_SERVICE_ID || !EMAILJS_TEMPLATE_ID || !EMAILJS_PUBLIC_KEY) {
    console.warn('⚠️ EmailJS não está configurado. O convite foi salvo, mas nenhum email foi enviado.');
    console.warn('Configure as variáveis VITE_EMAILJS_SERVICE_ID, VITE_EMAILJS_TEMPLATE_ID e VITE_EMAILJS_PUBLIC_KEY no .env.local');
    return false;
  }

  try {
    const templateParams = {
      to_email: guestEmail,
      to_name: guestEmail.split('@')[0], // Usa parte do email como nome
      trip_name: tripName,
      host_name: hostName,
      permission_text: permission === 'EDIT' ? 'editar a viagem' : 'apenas visualizar a viagem',
      app_url: window.location.origin, // URL do app para o usuário acessar
    };

    const response = await emailjs.send(
      EMAILJS_SERVICE_ID,
      EMAILJS_TEMPLATE_ID,
      templateParams,
      EMAILJS_PUBLIC_KEY
    );

    if (response.status === 200) {
      console.log('✅ Email enviado com sucesso!');
      return true;
    } else {
      console.error('❌ Erro ao enviar email:', response);
      return false;
    }
  } catch (error) {
    console.error('❌ Erro ao enviar email:', error);
    return false;
  }
};
