# Configuração de Envio de Emails (EmailJS)

Este documento explica como configurar o envio de emails para convites de viagem.

## Por que preciso disso?

Atualmente, quando você convida alguém para uma viagem, o convite é salvo no banco de dados mas **nenhum email é enviado**. A pessoa convidada só vê o convite se fizer login no app.

Com esta configuração, a pessoa receberá um **email real** no endereço dela com as informações do convite.

## Passo a Passo

### 1. Criar conta no EmailJS (Gratuito)

1. Acesse: https://www.emailjs.com/
2. Clique em **"Sign Up"** (cadastro gratuito)
3. Crie sua conta com email e senha

### 2. Adicionar um Email Service

1. No dashboard, clique em **"Email Services"**
2. Clique em **"Add New Service"**
3. Escolha seu provedor de email:
   - **Gmail** (recomendado para testes)
   - Outlook
   - Yahoo
   - Ou qualquer outro
4. Conecte sua conta de email
5. Anote o **Service ID** (ex: `service_abc123`)

### 3. Criar um Template de Email

1. No dashboard, clique em **"Email Templates"**
2. Clique em **"Create New Template"**
3. Configure o template com estas variáveis:

**Subject (Assunto):**
```
Convite para viagem: {{trip_name}}
```

**Body (Corpo do email):**
```
Olá {{to_name}},

{{host_name}} convidou você para participar da viagem "{{trip_name}}"!

Você poderá {{permission_text}}.

Para aceitar ou recusar o convite, acesse:
{{app_url}}

Faça login com seu email ({{to_email}}) para ver os detalhes.

---
PlanejaTrip - Seu planejador de viagens
```

4. Clique em **"Save"**
5. Anote o **Template ID** (ex: `template_xyz789`)

### 4. Obter Public Key

1. No dashboard, clique em **"Account"**
2. Na seção **"API Keys"**, você verá sua **Public Key**
3. Anote a **Public Key** (ex: `abcXYZ123456789`)

### 5. Configurar no Projeto

Abra o arquivo `.env.local` e substitua os valores:

```env
VITE_EMAILJS_SERVICE_ID=service_abc123
VITE_EMAILJS_TEMPLATE_ID=template_xyz789
VITE_EMAILJS_PUBLIC_KEY=abcXYZ123456789
```

### 6. Reiniciar o Servidor

```bash
npm run dev
```

## Testar

1. Faça login no app
2. Crie ou abra uma viagem
3. Vá em **Settings** (configurações)
4. Convide alguém usando um email real
5. Verifique a caixa de entrada do email convidado

## Problemas Comuns

### "Email não chegou"

- Verifique a pasta de SPAM/Lixo Eletrônico
- Confirme que as variáveis no `.env.local` estão corretas
- Verifique o console do navegador (F12) para ver se há erros

### "EmailJS não está configurado"

- Você verá este aviso no console se as variáveis não estiverem configuradas
- O convite ainda será salvo no banco, mas o email não será enviado
- Configure as 3 variáveis no `.env.local`

### Limite de emails gratuito

- Plano gratuito: **200 emails/mês**
- Se ultrapassar, você pode:
  - Fazer upgrade para plano pago
  - Usar outro serviço de email
  - Esperar o próximo mês

## Alternativas

Se você não quiser usar EmailJS, pode usar:

- **Resend** (3.000 emails grátis/mês) - requer backend
- **SendGrid** (100 emails grátis/dia) - requer backend
- **Supabase Edge Functions** - mais complexo de configurar

## Código Relacionado

- **services/emailService.ts** - Serviço de envio de emails
- **services/inviteService.ts** - Integração com convites (linhas 84 e 202-207)
- **.env.local** - Variáveis de ambiente
