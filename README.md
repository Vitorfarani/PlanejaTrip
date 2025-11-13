# PlanejaTrip

Uma aplicação completa de planejamento de viagens colaborativo, desenvolvida com React, TypeScript, Supabase e integração com IA do Google Gemini.

## Funcionalidades

- **Autenticação de Usuários**: Sistema completo de login, registro e recuperação de senha
- **Planejamento Colaborativo**: Convide amigos para participar de suas viagens
- **Organização por Dias**: Estruture sua viagem dia a dia com atividades detalhadas
- **Gestão Financeira**: Controle orçamento estimado vs gastos reais por atividade
- **Categorização**: Organize atividades por categorias personalizadas
- **Múltiplas Moedas**: Suporte para BRL, USD e EUR
- **Permissões**: Controle de acesso com permissões de visualização e edição
- **IA Integrada**: Sugestões inteligentes de roteiro com Google Gemini
- **Sistema de Convites**: Convide participantes e gerencie aceites/rejeições

## Tecnologias Utilizadas

- **Frontend**: React 19 + TypeScript
- **Build Tool**: Vite
- **Backend**: Supabase (PostgreSQL + Auth + Storage)
- **IA**: Google Gemini API
- **Email**: EmailJS (envio de convites)
- **Estilização**: TailwindCSS (via classes utilitárias)

## Pré-requisitos

Antes de começar, certifique-se de ter instalado:

- **Node.js** (versão 18 ou superior)
- **npm** ou **yarn**
- Conta no [Supabase](https://supabase.com)
- API Key do [Google AI Studio](https://ai.google.dev/)
- Conta no [EmailJS](https://www.emailjs.com/) (gratuita - 200 emails/mês)

## Configuração do Projeto

### 1. Clone o repositório

```bash
git clone <url-do-repositorio>
cd PlanejaTrip
```

### 2. Instale as dependências

```bash
npm install
```

### 3. Configure o Supabase

#### 3.1. Crie um novo projeto no Supabase

1. Acesse [supabase.com/dashboard](https://supabase.com/dashboard)
2. Clique em "New Project"
3. Preencha os dados e aguarde a criação

#### 3.2. Execute o script SQL para criar as tabelas

Vá em **SQL Editor** no painel do Supabase e execute:

```sql
-- Tabela de perfis de usuários
CREATE TABLE profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de viagens
CREATE TABLE trips (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  destination TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  description TEXT,
  budget NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'BRL',
  is_completed BOOLEAN DEFAULT FALSE,
  owner_email TEXT NOT NULL,
  days JSONB NOT NULL DEFAULT '[]',
  categories JSONB NOT NULL DEFAULT '[]',
  preferences JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de participantes de viagens
CREATE TABLE trip_participants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id UUID REFERENCES trips(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  permission TEXT NOT NULL CHECK (permission IN ('EDIT', 'VIEW_ONLY')),
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(trip_id, user_id)
);

-- Tabela de convites
CREATE TABLE invites (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id UUID REFERENCES trips(id) ON DELETE CASCADE,
  trip_name TEXT NOT NULL,
  host_name TEXT NOT NULL,
  host_email TEXT NOT NULL,
  guest_email TEXT NOT NULL,
  permission TEXT NOT NULL CHECK (permission IN ('EDIT', 'VIEW_ONLY')),
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'REJECTED')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(trip_id, guest_email)
);

-- Trigger para criar perfil automaticamente após registro
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', 'Usuário'),
    NEW.email
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Políticas de segurança (Row Level Security)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE invites ENABLE ROW LEVEL SECURITY;

-- Policies para profiles
CREATE POLICY "Profiles são públicos para leitura" ON profiles FOR SELECT USING (true);
CREATE POLICY "Usuários podem atualizar seu próprio perfil" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Policies para trips
CREATE POLICY "Usuários podem ver suas próprias viagens" ON trips FOR SELECT USING (
  owner_email = auth.jwt()->>'email' OR
  EXISTS (SELECT 1 FROM trip_participants WHERE trip_id = trips.id AND user_id = auth.uid())
);
CREATE POLICY "Usuários podem criar viagens" ON trips FOR INSERT WITH CHECK (true);
CREATE POLICY "Usuários podem atualizar suas viagens" ON trips FOR UPDATE USING (
  owner_email = auth.jwt()->>'email' OR
  EXISTS (SELECT 1 FROM trip_participants WHERE trip_id = trips.id AND user_id = auth.uid() AND permission = 'EDIT')
);
CREATE POLICY "Usuários podem deletar suas viagens" ON trips FOR DELETE USING (owner_email = auth.jwt()->>'email');

-- Policies para trip_participants
CREATE POLICY "Participantes podem ver suas participações" ON trip_participants FOR SELECT USING (
  user_id = auth.uid() OR
  EXISTS (SELECT 1 FROM trips WHERE id = trip_participants.trip_id AND owner_email = auth.jwt()->>'email')
);
CREATE POLICY "Participantes podem ser adicionados" ON trip_participants FOR INSERT WITH CHECK (true);
CREATE POLICY "Participantes podem ser removidos" ON trip_participants FOR DELETE USING (
  EXISTS (SELECT 1 FROM trips WHERE id = trip_participants.trip_id AND owner_email = auth.jwt()->>'email')
);

-- Policies para invites
CREATE POLICY "Usuários podem ver convites enviados a eles" ON invites FOR SELECT USING (guest_email = auth.jwt()->>'email' OR host_email = auth.jwt()->>'email');
CREATE POLICY "Usuários podem criar convites" ON invites FOR INSERT WITH CHECK (true);
CREATE POLICY "Usuários podem atualizar convites" ON invites FOR UPDATE USING (guest_email = auth.jwt()->>'email' OR host_email = auth.jwt()->>'email');
CREATE POLICY "Usuários podem deletar convites" ON invites FOR DELETE USING (guest_email = auth.jwt()->>'email' OR host_email = auth.jwt()->>'email');
```

#### 3.3. Configure a autenticação

No painel do Supabase:

1. Vá em **Authentication** → **Providers** → **Email**
2. **DESABILITE** a opção **"Confirm email"** (ou configure o email SMTP se quiser confirmação)
3. Em **Authentication** → **URL Configuration**:
   - **Site URL**: `http://localhost:5173`
   - **Redirect URLs**: `http://localhost:5173/**`

### 4. Configure o EmailJS (para envio de emails de convite)

Siga o guia completo em: [`docs/SETUP_EMAIL.md`](docs/SETUP_EMAIL.md)

**Resumo rápido:**

1. Crie conta gratuita em [emailjs.com](https://www.emailjs.com/)
2. Configure um serviço de email (Gmail recomendado)
3. Crie um template de email com as variáveis fornecidas
4. Copie Service ID, Template ID e Public Key

### 5. Configure as variáveis de ambiente

Crie um arquivo `.env.local` na raiz do projeto:

```bash
# Supabase
VITE_SUPABASE_URL=sua_url_do_supabase
VITE_SUPABASE_ANON_KEY=sua_anon_key_do_supabase

# Google Gemini API
GEMINI_API_KEY=sua_api_key_do_gemini

# EmailJS (para envio de convites)
VITE_EMAILJS_SERVICE_ID=seu_service_id
VITE_EMAILJS_TEMPLATE_ID=seu_template_id
VITE_EMAILJS_PUBLIC_KEY=sua_public_key
```

**Como obter as credenciais:**

- **Supabase**: Vá em **Project Settings** → **API** no painel do Supabase
  - `VITE_SUPABASE_URL`: Project URL
  - `VITE_SUPABASE_ANON_KEY`: anon/public key
- **Gemini API**: Acesse [Google AI Studio](https://ai.google.dev/) e gere uma API Key
- **EmailJS**: Siga o guia em [`docs/SETUP_EMAIL.md`](docs/SETUP_EMAIL.md)

### 6. Execute o projeto

```bash
npm run dev
```

O projeto estará disponível em: `http://localhost:5173`

## Scripts Disponíveis

```bash
# Desenvolvimento
npm run dev

# Build para produção
npm run build

# Preview da build
npm run preview

# Build alternativo com esbuild
npm run build:esbuild
```

## Estrutura do Projeto

```
PlanejaTrip/
├── components/          # Componentes React
│   ├── LoginScreen.tsx
│   ├── ProfileScreen.tsx
│   ├── TripForm.tsx
│   ├── TripDashboard.tsx
│   ├── DailyPlan.tsx
│   ├── FinancialView.tsx
│   └── ...
├── services/           # Serviços de integração
│   ├── authService.ts      # Autenticação
│   ├── tripService.ts      # Gestão de viagens
│   ├── inviteService.ts    # Sistema de convites
│   ├── emailService.ts     # Envio de emails (EmailJS)
│   └── profileService.ts   # Perfis de usuário
├── docs/               # Documentação
│   ├── SETUP_EMAIL.md      # Guia de configuração EmailJS
│   ├── database_schema.md  # Schema do banco
│   └── ...
├── src/
│   └── lib/
│       └── supabaseClient.ts  # Cliente Supabase
├── types.ts           # Definições TypeScript
├── App.tsx            # Componente principal
└── index.html         # Entrada HTML
```

## Funcionalidades Principais

### Autenticação
- Registro de novos usuários
- Login com email/senha
- Recuperação de senha
- Sessão persistente

### Gestão de Viagens
- Criar viagens com datas, orçamento e destino
- Organizar atividades por dia
- Categorizar atividades
- Controlar custos estimados vs reais
- Suporte a múltiplas moedas

### Colaboração
- Convidar participantes por email
- **Envio automático de emails** com detalhes do convite
- Permissões de edição ou visualização
- Aceitar/recusar convites
- Notificações de convites rejeitados
- Reenvio de convites

### IA (Google Gemini)
- Sugestões inteligentes de roteiros
- Geração de atividades baseadas em preferências
- Otimização de orçamento

## Troubleshooting

### Erro: "Email address is invalid"
- Desabilite a confirmação de email no Supabase (veja seção 3.3)
- Ou configure corretamente o SMTP

### Erro: "Invalid API key" (Supabase)
- Verifique se copiou a chave correta
- Certifique-se de usar a `anon/public key`, não a `service_role key`

### Tabelas não aparecem
- Execute todo o script SQL fornecido na seção 3.2
- Verifique as políticas RLS (Row Level Security)

### Build não funciona
- Limpe o cache: `rm -rf node_modules package-lock.json`
- Reinstale: `npm install`

### Emails de convite não chegam
- Verifique se as variáveis EmailJS estão configuradas no `.env.local`
- Verifique a pasta de SPAM do destinatário
- Confira o console do navegador para erros
- Siga o guia completo em [`docs/SETUP_EMAIL.md`](docs/SETUP_EMAIL.md)
- Limite gratuito: 200 emails/mês no EmailJS

## Contribuindo

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/MinhaFeature`)
3. Commit suas mudanças (`git commit -m 'Adiciona MinhaFeature'`)
4. Push para a branch (`git push origin feature/MinhaFeature`)
5. Abra um Pull Request

## Licença

Este projeto está sob a licença ISC.

## Suporte

Para problemas ou dúvidas, abra uma issue no repositório.
