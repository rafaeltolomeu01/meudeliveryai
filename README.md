# 🍔 MeuDeliveryAI

> Sistema SaaS multiempresa para gestão inteligente de restaurantes e delivery.

[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green)](https://nodejs.org)
[![React](https://img.shields.io/badge/React-18-blue)](https://reactjs.org)
[![MySQL](https://img.shields.io/badge/MySQL-8.0%2B-orange)](https://mysql.com)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.x-38bdf8)](https://tailwindcss.com)

---

## 📋 Sobre o Projeto

O **MeuDeliveryAI** é uma plataforma SaaS (Software as a Service) multiempresa para restaurantes, lanchonetes, pizzarias, hamburguerias, açaiterias e qualquer negócio de delivery.

Cada empresa tem seus próprios dados completamente isolados, compartilhando apenas a infraestrutura.

### Funcionalidades

- 🏪 **Multi-tenant**: Vários restaurantes na mesma plataforma, dados isolados
- 📦 **Gestão de Pedidos**: Kanban visual com todos os status
- 🍕 **Cardápio Digital**: Produtos, categorias e adicionais
- 👥 **Clientes**: CRM básico com histórico de pedidos
- 🚴 **Entregadores**: Gestão de frota e disponibilidade
- 📊 **Relatórios**: Faturamento, ticket médio, produtos mais vendidos
- ⚙️ **Configurações**: Horários, aparência, formas de pagamento
- 📱 **PWA**: Instalável como app no celular
- 🔐 **Seguro**: JWT + bcrypt + multi-tenant guard

---

## 🚀 Instalação Rápida

### Pré-requisitos

- Node.js 18 ou superior
- MySQL 8.0 ou superior
- npm ou yarn

### 1. Clone e configure

```bash
# Entre na pasta do projeto
cd MeuDeliveryAI

# Copie o arquivo de variáveis de ambiente
cp .env.example .env
# Edite o .env com suas configurações de banco de dados
```

### 2. Instale e configure o Backend

```bash
cd backend

# Instale as dependências
npm install

# Copie o .env do backend
cp .env.example .env
# Edite com suas configurações

# Crie o banco de dados MySQL
mysql -u root -p -e "CREATE DATABASE meudeliveryai CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# Execute as migrações (cria as tabelas e dados de exemplo)
npm run db:migrate

# Inicie o servidor de desenvolvimento
npm run dev
```

O backend estará rodando em: **http://localhost:3001**

### 3. Instale e configure o Frontend

```bash
# Em outro terminal, entre na pasta frontend
cd frontend

# Instale as dependências
npm install

# Inicie o servidor de desenvolvimento
npm run dev
```

O frontend estará em: **http://localhost:5173**

---

## 📁 Estrutura do Projeto

```
MeuDeliveryAI/
├── backend/                    # API Node.js + Express
│   ├── src/
│   │   ├── config/             # Banco de dados e env
│   │   ├── controllers/        # Lógica de negócio
│   │   ├── middlewares/        # Auth, tenant guard, erros
│   │   ├── models/             # Schema SQL e migrações
│   │   └── routes/             # Definição de endpoints
│   ├── uploads/                # Arquivos enviados (criado automaticamente)
│   ├── .env.example
│   ├── package.json
│   └── server.js
├── frontend/                   # React + Vite + TailwindCSS
│   ├── public/
│   │   ├── manifest.json       # PWA manifest
│   │   └── sw.js               # Service Worker
│   ├── src/
│   │   ├── components/         # Componentes reutilizáveis
│   │   ├── contexts/           # Context API (Auth)
│   │   ├── pages/              # Páginas da aplicação
│   │   ├── services/           # Chamadas à API
│   │   └── utils/              # Funções utilitárias
│   ├── .env.example
│   ├── tailwind.config.js
│   ├── vite.config.js
│   └── package.json
├── .env.example                # Variáveis globais de exemplo
└── README.md
```

---

## 🔌 API Endpoints

### Autenticação
| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/api/v1/auth/register` | Cadastro de restaurante |
| POST | `/api/v1/auth/login` | Login |
| GET | `/api/v1/auth/me` | Dados do usuário logado |
| PUT | `/api/v1/auth/change-password` | Alterar senha |

### Produtos
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/v1/products` | Listar produtos |
| POST | `/api/v1/products` | Criar produto |
| PUT | `/api/v1/products/:id` | Atualizar produto |
| DELETE | `/api/v1/products/:id` | Excluir produto |

### Pedidos
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/v1/orders` | Listar pedidos |
| POST | `/api/v1/orders` | Criar pedido |
| PATCH | `/api/v1/orders/:id/status` | Atualizar status |

> Veja todos os endpoints na documentação completa: `/api/v1` (em desenvolvimento)

---

## 🏗️ Arquitetura Multi-tenant

Todos os dados são isolados por `restaurant_id`:

```sql
-- Exemplo: produtos são sempre filtrados pelo restaurante do usuário logado
SELECT * FROM products WHERE restaurant_id = ? AND id = ?
```

O middleware `tenantGuard` garante que nenhum restaurante acesse dados de outro, extraindo o `restaurant_id` do token JWT.

---

## 📱 PWA (Progressive Web App)

O sistema está preparado para ser instalado como aplicativo:

1. Acesse pelo Chrome ou Safari mobile
2. Toque em "Adicionar à tela inicial"
3. Use como um app nativo

---

## 🔐 Segurança

- Senhas hasheadas com **bcrypt** (12 salt rounds)
- Autenticação via **JWT** com expiração configurável
- **Rate limiting** nas rotas de autenticação
- **Helmet.js** para headers de segurança
- **CORS** configurado para o domínio do frontend
- Prepared statements para prevenir **SQL Injection**
- Multi-tenant guard em todos os endpoints protegidos

---

## 💰 Planos

| Plano | Preço | Produtos | Pedidos/mês | Suporte |
|-------|-------|----------|-------------|---------|
| Starter | Grátis | Até 20 | Até 100 | Comunidade |
| Pro | R$ 149/mês | Ilimitados | Ilimitados | Email |
| Enterprise | R$ 349/mês | Ilimitados | Ilimitados | Prioritário |

---

## 🛠️ Desenvolvimento

### Scripts disponíveis

**Backend:**
```bash
npm run dev      # Servidor com hot-reload (nodemon)
npm run start    # Servidor em produção
npm run db:migrate  # Executa migrações do banco
```

**Frontend:**
```bash
npm run dev      # Servidor de desenvolvimento (Vite)
npm run build    # Build para produção
npm run preview  # Preview do build
```

---

## 🔮 Roadmap

- [ ] Integração com WhatsApp (envio de notificações)
- [ ] Cardápio público para clientes finais
- [ ] App mobile React Native
- [ ] Integração MercadoPago / Stripe
- [ ] WebSockets para pedidos em tempo real
- [ ] Sistema de cupons e promoções
- [ ] Programa de fidelidade
- [ ] Integração com iFood, Rappi (webhooks)

---

## 📄 Licença

Copyright © 2024 MeuDeliveryAI. Todos os direitos reservados.

---

## 🚀 Deploy no Render

Esta seção descreve o passo a passo para implantar o **MeuDeliveryAI** (Backend e Frontend) na plataforma [Render](https://render.com/).

### 📦 1. Estrutura de Implantação
Como o projeto está estruturado em um monorepo (backend + frontend separados), nós os implantaremos como dois serviços separados no Render:
1. **Backend**: Um *Web Service* rodando Node.js.
2. **Frontend**: Um *Static Site* compilando React com Vite.
3. **Banco de Dados**: Um banco MySQL externo (como [Aiven](https://aiven.io/), Clever Cloud, AWS RDS, etc.). 
   *Nota: O Render não oferece MySQL gerenciado nativo gratuito, então você precisará usar uma instância de MySQL externo.*

---

### 🗄️ 2. Configurando o MySQL Externo
Se você usar um provedor externo de MySQL (como Aiven ou AWS RDS):
1. Crie uma base de dados MySQL 8.0+.
2. Obtenha as credenciais de acesso (`host`, `user`, `password`, `database`, `port`).
3. Certifique-se de que a conexão exige SSL (a maioria dos bancos em nuvem exige). No painel do Render, você definirá a variável de ambiente `DATABASE_SSL=true`.

---

### 🖥️ 3. Deploy do Backend (Web Service)
No painel do Render, clique em **New > Web Service**:
1. Conecte seu repositório Git.
2. Defina os seguintes campos:
   - **Name**: `meudeliveryai-backend` (ou o nome que desejar)
   - **Environment**: `Node`
   - **Root Directory**: `backend` *(Importante! Isso faz o Render executar comandos dentro da pasta backend)*
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
3. Expanda a seção **Advanced** e adicione as **Environment Variables** (Variáveis de Ambiente):
   - `NODE_ENV`: `production`
   - `PORT`: `3001` (O Render injeta automaticamente, mas você pode definir a porta que deseja para documentação)
   - `DATABASE_HOST`: *(Endereço do seu MySQL externo)*
   - `DATABASE_USER`: *(Usuário do banco)*
   - `DATABASE_PASSWORD`: *(Senha do banco)*
   - `DATABASE_NAME`: *(Nome do banco de dados)*
   - `DATABASE_PORT`: `3306` (ou a porta correspondente)
   - `DATABASE_SSL`: `true` (caso seu banco exija SSL/conexão segura)
   - `JWT_SECRET`: *(Uma string longa e aleatória de no mínimo 32 caracteres)*
   - `JWT_EXPIRES_IN`: `7d`
   - `OPENAI_API_KEY`: *(Sua chave do OpenAI)*
   - `OPENAI_MODEL`: `gpt-4o-mini`
   - `FRONTEND_URL`: *(URL do seu Static Site do frontend após deploy no Render)*
   - `APP_URL`: *(URL deste backend após o deploy no Render)*
   - `EVOLUTION_API_URL`: *(URL da sua Evolution API se configurada)*
   - `EVOLUTION_API_KEY`: *(Chave da sua Evolution API se configurada)*

---

### 🖥️ 4. Rodando Migrações e Criando o Admin Geral
Após o backend inicializar com sucesso, você precisará rodar as migrações (criar as tabelas) e criar seu primeiro usuário Administrador Geral.

No painel do Render, vá na aba **Shell** do seu serviço backend e execute:

#### Rodar as Migrações (Cria as Tabelas):
```bash
npm run db:migrate
```
*Isso criará todas as tabelas necessárias no seu MySQL externo e povoará os dados iniciais do sistema e planos.*

#### Criar o Administrador Geral:
Execute o script interativo de criação de administrador geral passando os argumentos de Nome, E-mail e Senha de acesso:
```bash
npm run db:create-admin -- "Nome do Administrador" "admin@dominio.com" "SenhaSegura123"
```
*Substitua pelos dados desejados. Este usuário terá o papel `admin_geral` e poderá gerenciar todos os restaurantes da plataforma.*

---

### 🌐 5. Deploy do Frontend (Static Site)
No painel do Render, clique em **New > Static Site**:
1. Conecte seu repositório Git.
2. Defina os seguintes campos:
   - **Name**: `meudeliveryai`
   - **Root Directory**: `frontend` *(Importante! Executa os comandos na pasta do frontend)*
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `dist`
3. Clique em **Create Static Site**.
4. **Tratamento de Rotas (SPA)**: Como o frontend usa React Router (Single Page App), vá em **Redirects/Rewrites** no menu lateral do Render e crie a seguinte regra:
   - **Source**: `/*`
   - **Destination**: `/index.html`
   - **Action**: `Rewrite`
   *Isso evita erros 404 ao atualizar a página em rotas internas do React.*

---

### 🔗 6. Configurando Domínio Personalizado
Se você deseja usar seu próprio domínio (ex: `app.meudeliveryai.com` ou `meudeliveryai.com.br`):

1. **No Render**:
   - Acesse o painel do seu serviço (tanto Backend quanto Frontend).
   - Vá na aba **Settings** e localize a seção **Custom Domains**.
   - Clique em **Add Custom Domain** e digite seu domínio ou subdomínio (ex: `painel.seuprovedor.com` para o frontend e `api.seuprovedor.com` para o backend).
2. **No seu Provedor de DNS (ex: Cloudflare, GoDaddy, Registro.br)**:
   - Adicione os registros de DNS informados pelo Render:
     - **Para Subdomínios (ex: `painel.seuprovedor.com`):** Crie um registro do tipo `CNAME` apontando para a URL padrão do Render (ex: `meudeliveryai.onrender.com`).
     - **Para Domínios Raiz (ex: `seuprovedor.com`):** Crie um registro do tipo `ANAME` ou `ALIAS` (ou um `A` com os IPs fornecidos pelo Render).
3. Aguarde a propagação do DNS e a emissão automática do certificado SSL gratuito pelo Render.

---

Desenvolvido com ❤️ para o mercado brasileiro de delivery.

