/**
 * Script: seed-demo.js
 * Uso: npm run seed-demo
 */
'use strict';

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const bcrypt = require('bcryptjs');
const { query, beginTransaction, queryTransaction, testConnection } = require('../config/database');

// Normalizar variáveis DATABASE_*
if (process.env.DATABASE_HOST) process.env.DB_HOST = process.env.DATABASE_HOST;
if (process.env.DATABASE_USER) process.env.DB_USER = process.env.DATABASE_USER;
if (process.env.DATABASE_PASSWORD) process.env.DB_PASSWORD = process.env.DATABASE_PASSWORD;
if (process.env.DATABASE_NAME) process.env.DB_NAME = process.env.DATABASE_NAME;
if (process.env.DATABASE_PORT) process.env.DB_PORT = process.env.DATABASE_PORT;

const CITIES = ['Governador Valadares', 'Belo Horizonte', 'Ipatinga', 'Teófilo Otoni'];
const CLIENT_NAMES = [
  'João Silva', 'Maria Santos', 'Pedro Oliveira', 'Ana Souza', 'Carlos Pereira', 'Julia Costa', 'Lucas Rodrigues', 'Beatriz Alves',
  'Fernanda Lima', 'Rodrigo Gomes', 'Camila Rocha', 'Gustavo Ribeiro', 'Patricia Carvalho', 'Bruno Araujo', 'Amanda Melo', 'Thiago Cardoso',
  'Aline Ferreira', 'Marcelo Santos', 'Gabriela Castro', 'Daniel Silva', 'Larissa Barbosa', 'Felipe Nunes', 'Vanessa Mendes', 'Ricardo Teixeira',
  'Juliana Vieira', 'Leonardo Ramos', 'Bianca Machado', 'Renato Dias', 'Camila Martins', 'Alexandre Duarte', 'Mariana Freitas', 'Eduardo Guimarães',
  'Paula Borges', 'Diego Correia', 'Carolina Pinto', 'Vitor Pinheiro', 'Sabrina Marques', 'Gabriel Andrade', 'Leticia Santos', 'Arthur Cruz',
  'Lorena Moreira', 'Matheus Ribeiro', 'Natalia Faria', 'Rafael Couto', 'Isabela Lopes', 'Guilherme Rezende', 'Clarissa Neves', 'Murilo Pacheco',
  'Tatiana Assis', 'Samuel Peixoto', 'Priscila Sobral', 'Daniela Amaral', 'Caio Toledo', 'Monique Cabral', 'Hugo Valente', 'Luana Viana',
  'Renan Lins', 'Milena Malta', 'Marcos Braga', 'Raquel Sales', 'Otavio Guedes', 'Thais Montenegro', 'Cesar Aguiar', 'Debora Salazar',
  'Alan Muniz', 'Kelly Padilha', 'Wellington Reis', 'Jessica Tavarez', 'Fabio Antunes', 'Eliana Cordeiro', 'Waldir Diniz', 'Sandra Ramos',
  'Tadeu Bastos', 'Gisele Pires', 'Roberto Lobato', 'Luciana Fontes', 'Leandro Guerra', 'Cristiane Abreu', 'Mauricio Basso', 'Regina Silveira'
];

const DRIVER_NAMES = [
  'Carlos Moto', 'Roberto Entrega', 'Marcos Veloz', 'Lucas Flash', 
  'André Rápido', 'Tiago Seta', 'Fabiano Giro', 'Jefferson Rota'
];

async function seed() {
  console.log('\n🔄 Iniciando Seeding do Ambiente de Demonstração...');
  
  try {
    await testConnection();
    
    // 1. Limpa dados anteriores usando cascade delete pelo slug 'demo'
    console.log('🧹 Limpando dados de demonstração antigos...');
    const existingRestaurant = await query('SELECT id FROM restaurants WHERE slug = ? LIMIT 1', ['demo']);
    if (existingRestaurant.length > 0) {
      await query('DELETE FROM restaurants WHERE id = ?', [existingRestaurant[0].id]);
      console.log('   ✅ Registros demo anteriores removidos.');
    }

    const connection = await beginTransaction();

    try {
      // 2. Insere Restaurante Demo
      console.log('🍔 Criando Restaurante Demo...');
      const restResult = await queryTransaction(connection,
        `INSERT INTO restaurants (name, slug, owner_name, email, phone, whatsapp, city, state, address, status, logo, cover_image)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)`,
        [
          'Hamburgueria do Chef Demo',
          'demo',
          'Restaurante Demo',
          'contato@hamburgueriachef.com',
          '(33) 99999-9999',
          '(33) 99999-9999',
          'Governador Valadares',
          'MG',
          'Rua Exemplo Delivery, 100 - Centro',
          '/uploads/restaurantes/logo-demo.webp',
          '/uploads/restaurantes/cover-demo.webp'
        ]
      );
      const restaurantId = restResult.insertId;

      // 3. Insere Usuário Dono do Demo
      console.log('👤 Criando Usuário de Demonstração (demo@meudeliveryai.com)...');
      const passwordHash = await bcrypt.hash('123456', 12);
      await queryTransaction(connection,
        `INSERT INTO users (restaurant_id, name, email, password_hash, role, status)
         VALUES (?, ?, ?, ?, 'dono', 'active')`,
        [restaurantId, 'Restaurante Demo', 'demo@meudeliveryai.com', passwordHash]
      );

      // Assinatura trial
      await queryTransaction(connection,
        `INSERT INTO subscriptions (restaurant_id, plan_id, status, start_date, due_date, trial_days, monthly_price)
         VALUES (?, 2, 'active', NOW(), DATE_ADD(NOW(), INTERVAL 365 DAY), 0, 99.90)`,
         [restaurantId]
      );

      // Configurações
      await queryTransaction(connection,
        `INSERT INTO restaurant_settings (restaurant_id, delivery_fee, min_order_value, is_open, opening_hours, accept_orders_when_closed)
         VALUES (?, 5.99, 15.00, 1, ?, 1)`,
         [restaurantId, JSON.stringify({
           monday: { open: '18:00', close: '00:00', enabled: true },
           tuesday: { open: '18:00', close: '00:00', enabled: true },
           wednesday: { open: '18:00', close: '00:00', enabled: true },
           thursday: { open: '18:00', close: '00:00', enabled: true },
           friday: { open: '18:00', close: '00:00', enabled: true },
           saturday: { open: '18:00', close: '00:00', enabled: true },
           sunday: { open: '18:00', close: '00:00', enabled: true },
         })]
      );

      // Tema
      await queryTransaction(connection,
        `INSERT INTO restaurant_theme (restaurant_id, primary_color, secondary_color)
         VALUES (?, '#FF6B35', '#1A0533')`,
         [restaurantId]
      );

      // Pagamentos
      await queryTransaction(connection,
        `INSERT INTO payment_settings (restaurant_id, accepts_cash, accepts_credit_card, accepts_debit_card, accepts_pix, pix_key, pix_key_type)
         VALUES (?, 1, 1, 1, 1, 'demo@meudeliveryai.com', 'email')`,
         [restaurantId]
      );

      // 4. Insere Categorias Demo
      console.log('🏷️ Criando Categorias...');
      const categoriesData = [
        { name: 'Hambúrguer Artesanal', desc: 'Artesanais suculentos de 150g', icon: 'Flame', color: '#FF6B35', pos: 1 },
        { name: 'Smash Burgers', desc: 'Burgers prensados na chapa bem quentes', icon: 'CircleDot', color: '#FFA07A', pos: 2 },
        { name: 'Combos', desc: 'Burgers com batata e refrigerante', icon: 'Sparkles', color: '#E91E63', pos: 3 },
        { name: 'Porções', desc: 'Acompanhamentos ideais', icon: 'Scale', color: '#FFEB3B', pos: 4 },
        { name: 'Açaí', desc: 'Cremoso e refrescante', icon: 'TrendingUp', color: '#9C27B0', pos: 5 },
        { name: 'Bebidas', desc: 'Refrigerantes e sucos', icon: 'Coffee', color: '#00BCD4', pos: 6 },
        { name: 'Sobremesas', desc: 'Doces divinos', icon: 'Smile', color: '#4CAF50', pos: 7 },
        { name: 'Milk Shake', desc: 'Shakes batidos na hora', icon: 'IceCream', color: '#2196F3', pos: 8 },
      ];

      const categoryIds = {};
      for (const cat of categoriesData) {
        const catResult = await queryTransaction(connection,
          `INSERT INTO categories (restaurant_id, name, description, icon, color, position, is_active)
           VALUES (?, ?, ?, ?, ?, ?, 1)`,
          [restaurantId, cat.name, cat.desc, cat.icon, cat.color, cat.pos]
        );
        categoryIds[cat.name] = catResult.insertId;
      }

      // 5. Insere Produtos Demo (52 Produtos no total)
      console.log('📦 Criando Produtos...');
      const productsData = [
        // Hambúrguer Artesanal
        { name: 'X-Bacon Supremo', price: 34.90, desc: 'Pão brioche, burger 150g, muito bacon crocante, cheddar duplo e maionese da casa.', cat: 'Hambúrguer Artesanal', is_featured: 1 },
        { name: 'X-Tudo Gourmet', price: 39.90, desc: 'Pão brioche, burger 150g, ovo, bacon, cheddar, alface, tomate e cebola caramelizada.', cat: 'Hambúrguer Artesanal', is_featured: 1 },
        { name: 'BBQ Bacon King', price: 36.90, desc: 'Pão australiano, burger 150g, bacon, cheddar, cebola frita e molho barbecue.', cat: 'Hambúrguer Artesanal', is_featured: 0 },
        { name: 'Cheeseburger clássico', price: 24.90, desc: 'Pão brioche, burger 150g, queijo cheddar derretido e maionese.', cat: 'Hambúrguer Artesanal', is_featured: 0 },
        { name: 'Monster Burger 3 carnes', price: 48.90, desc: 'Para quem tem fome de monstro: 3 carnes de 150g, 6 fatias de cheddar, bacon e barbecue.', cat: 'Hambúrguer Artesanal', is_featured: 0 },
        { name: 'Costela Burger', price: 38.90, desc: 'Burger de costela 150g, queijo coalho grelhado, cebola roxa e maionese verde.', cat: 'Hambúrguer Artesanal', is_featured: 0 },
        { name: 'Cheddar Melted', price: 35.90, desc: 'Burger 150g afogado em queijo cheddar cremoso e farofa de bacon.', cat: 'Hambúrguer Artesanal', is_featured: 0 },
        
        // Smash Burgers
        { name: 'Smash Simples', price: 19.90, desc: 'Pão brioche prensado, carne smash 80g, queijo cheddar e ketchup.', cat: 'Smash Burgers', is_featured: 0 },
        { name: 'Smash Duplo', price: 29.90, desc: 'Pão brioche prensado, 2 carnes smash 80g, queijo cheddar duplo e maionese.', cat: 'Smash Burgers', is_featured: 1 },
        { name: 'Smash Triplo', price: 36.90, desc: 'Pão brioche prensado, 3 carnes smash 80g, queijo cheddar triplo, bacon e barbecue.', cat: 'Smash Burgers', is_featured: 0 },
        { name: 'Smash Bacon', price: 27.90, desc: 'Carne smash 80g, muito bacon picado, queijo cheddar e maionese verde.', cat: 'Smash Burgers', is_featured: 0 },
        { name: 'Smash Salad', price: 24.90, desc: 'Carne smash 80g, alface, tomate, cebola roxa, queijo cheddar e molho especial.', cat: 'Smash Burgers', is_featured: 0 },
        { name: 'Smash Onion', price: 26.90, desc: 'Carne smash 80g prensada com cebola ralada, queijo cheddar e barbecue.', cat: 'Smash Burgers', is_featured: 0 },

        // Combos
        { name: 'Combo Família', price: 89.90, desc: '2 Burgers artesanais à escolha, 1 porção de batata grande e 1 refrigerante de 2 litros.', cat: 'Combos', is_featured: 1 },
        { name: 'Combo Casal', price: 69.90, desc: '2 Smash Duplo, 1 porção de batata média e 2 latas de refrigerante à escolha.', cat: 'Combos', is_featured: 1 },
        { name: 'Combo Individual Supremo', price: 45.90, desc: '1 X-Bacon Supremo, 1 porção de batata individual e 1 refrigerante lata.', cat: 'Combos', is_featured: 0 },
        { name: 'Combo Smash Duplo + Refri', price: 34.90, desc: '1 Smash Duplo + 1 refrigerante lata à escolha.', cat: 'Combos', is_featured: 0 },
        { name: 'Combo Kids', price: 29.90, desc: '1 Cheeseburger pequeno, 1 suco de caixinha e 1 brinde surpresa.', cat: 'Combos', is_featured: 0 },
        { name: 'Mega Combo Galera', price: 139.90, desc: '4 Burgers artesanais clássicos, 2 porções de batata média e 1 refrigerante 2L.', cat: 'Combos', is_featured: 0 },

        // Porções
        { name: 'Batata Frita Simples', price: 14.90, desc: 'Porção individual de batatas fritas palito sequinhas e crocantes.', cat: 'Porções', is_featured: 0 },
        { name: 'Batata Suprema com Cheddar e Bacon', price: 22.90, desc: 'Porção grande de batatas fritas cobertas com creme de cheddar e bacon frito picado.', cat: 'Porções', is_featured: 1 },
        { name: 'Onion Rings', price: 16.90, desc: 'Anéis de cebola empanados e fritos, servidos com molho barbecue.', cat: 'Porções', is_featured: 0 },
        { name: 'Polenta Frita com queijo', price: 18.90, desc: 'Macia por dentro e crocante por fora, salpicada com queijo parmesão ralado.', cat: 'Porções', is_featured: 0 },
        { name: 'Coxinha de Frango porção', price: 19.90, desc: '10 Minicozinhas de frango com requeijão fritas na hora.', cat: 'Porções', is_featured: 0 },
        { name: 'Nuggets crocantes 10 unidades', price: 15.90, desc: 'Empanados de frango crocantes com molho barbecue.', cat: 'Porções', is_featured: 0 },
        { name: 'Mandioca Frita porção', price: 17.90, desc: 'Mandioca frita em cubos dourados e crocantes.', cat: 'Porções', is_featured: 0 },

        // Açaí
        { name: 'Açaí Copo 300ml', price: 12.90, desc: 'Copo de açaí natural batido, escolha seus acompanhamentos.', cat: 'Açaí', is_featured: 0 },
        { name: 'Açaí Copo 500ml', price: 19.90, desc: 'Copo médio de açaí cremoso batido.', cat: 'Açaí', is_featured: 1 },
        { name: 'Açaí Copo 700ml', price: 24.90, desc: 'Copo gigante de açaí cremoso para quem ama açaí.', cat: 'Açaí', is_featured: 0 },
        { name: 'Barca de Açaí Especial', price: 44.90, desc: 'Barca com açaí, banana, morango, leite condensado, leite em pó e granola.', cat: 'Açaí', is_featured: 1 },
        { name: 'Açaí na Tigela Gourmet', price: 22.90, desc: 'Tigela de açaí servida com frutas selecionadas e granola crocante.', cat: 'Açaí', is_featured: 0 },
        { name: 'Açaí Casadinho Cupuaçu 500ml', price: 21.90, desc: 'Metade açaí cremoso, metade cupuaçu natural azedinho.', cat: 'Açaí', is_featured: 0 },

        // Bebidas
        { name: 'Coca-Cola Lata', price: 6.00, desc: 'Lata 350ml bem gelada.', cat: 'Bebidas', is_featured: 0 },
        { name: 'Coca-Cola 2L', price: 14.90, desc: 'Garrafa 2 Litros.', cat: 'Bebidas', is_featured: 0 },
        { name: 'Guaraná Antarctica Lata', price: 6.00, desc: 'Lata 350ml.', cat: 'Bebidas', is_featured: 0 },
        { name: 'Guaraná Antarctica 2L', price: 12.90, desc: 'Garrafa 2 Litros.', cat: 'Bebidas', is_featured: 0 },
        { name: 'Água Mineral sem gás', price: 4.00, desc: 'Garrafa 500ml.', cat: 'Bebidas', is_featured: 0 },
        { name: 'Água Mineral com gás', price: 4.50, desc: 'Garrafa 500ml.', cat: 'Bebidas', is_featured: 0 },
        { name: 'Suco de Laranja Natural 500ml', price: 8.00, desc: 'Espremido na hora puro da fruta.', cat: 'Bebidas', is_featured: 0 },
        { name: 'Cerveja Heineken Long Neck', price: 9.00, desc: 'Garrafa long neck 330ml gelada.', cat: 'Bebidas', is_featured: 0 },

        // Sobremesas
        { name: 'Brownie com Sorvete', price: 18.90, desc: 'Brownie quente de chocolate belga, bola de sorvete de creme e calda de chocolate.', cat: 'Sobremesas', is_featured: 1 },
        { name: 'Petit Gateau de chocolate', price: 21.90, desc: 'Bolinho quente com recheio cremoso, sorvete e calda.', cat: 'Sobremesas', is_featured: 0 },
        { name: 'Pudim de Leite condensado', price: 9.90, desc: 'Fatia de pudim caseiro com calda de caramelo.', cat: 'Sobremesas', is_featured: 0 },
        { name: 'Torta de Limão fatia', price: 11.90, desc: 'Fatia de torta gelada de limão com merengue tostado.', cat: 'Sobremesas', is_featured: 0 },
        { name: 'Brigadeiro Gourmet copinho', price: 5.90, desc: 'Copinho de brigadeiro cremoso de colher salpicado com granulado split.', cat: 'Sobremesas', is_featured: 0 },
        { name: 'Mousse de Maracujá', price: 8.90, desc: 'Mousse aerado de maracujá azedinho com calda de sementes.', cat: 'Sobremesas', is_featured: 0 },

        // Milk Shake
        { name: 'Milk Shake Ovomaltine 400ml', price: 16.90, desc: 'Batido com sorvete de creme, calda de chocolate e flocos crocantes de Ovomaltine.', cat: 'Milk Shake', is_featured: 1 },
        { name: 'Milk Shake Nutella 400ml', price: 18.90, desc: 'Sorvete batido com calda de chocolate e muita Nutella autêntica.', cat: 'Milk Shake', is_featured: 1 },
        { name: 'Milk Shake Morango Silvestre', price: 15.90, desc: 'Batido com polpa de morangos selecionados e sorvete.', cat: 'Milk Shake', is_featured: 0 },
        { name: 'Milk Shake Chocolate Belga', price: 15.90, desc: 'Sorvete cremoso de chocolate e calda trufada.', cat: 'Milk Shake', is_featured: 0 },
        { name: 'Milk Shake Doce de Leite', price: 16.90, desc: 'Sorvete de creme batido com doce de leite argentino.', cat: 'Milk Shake', is_featured: 0 },
        { name: 'Milk Shake Baunilha clássico', price: 14.90, desc: 'Sorvete de baunilha de Madagascar batido bem gelado.', cat: 'Milk Shake', is_featured: 0 }
      ];

      const productsMap = [];

      for (const prod of productsData) {
        const catId = categoryIds[prod.cat] || null;
        const prodResult = await queryTransaction(connection,
          `INSERT INTO products (restaurant_id, category_id, name, description, price, is_available, is_featured, serves_how_many, preparation_time, position, image_url, images)
           VALUES (?, ?, ?, ?, ?, 1, ?, 1, 15, 0, ?, ?)`,
          [
            restaurantId,
            catId,
            prod.name,
            prod.desc,
            prod.price,
            prod.is_featured,
            `/uploads/produtos/demo-${prod.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.webp`,
            JSON.stringify([`/uploads/produtos/demo-${prod.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.webp`])
          ]
        );
        productsMap.push({ id: prodResult.insertId, categoryName: prod.cat, name: prod.name, price: prod.price });
      }

      // 6. Criar Grupos de Complementos Demo
      console.log('🍧 Criando Grupos de Complementos...');
      
      // Grupo 1: Adicionais (linked to burgers)
      const groupAdicionaisResult = await queryTransaction(connection,
        `INSERT INTO complement_groups (restaurant_id, name, description, is_required, min_quantity, max_quantity, is_active, position)
         VALUES (?, 'Adicionais', 'Adicione extras deliciosos ao seu burger', 0, 0, 8, 1, 1)`,
        [restaurantId]
      );
      const groupAdicionaisId = groupAdicionaisResult.insertId;

      const adicionaisItems = [
        { name: 'Bacon extra', price: 5.00, max: 5 },
        { name: 'Queijo Cheddar', price: 4.00, max: 4 },
        { name: 'Ovo frito', price: 3.00, max: 2 },
        { name: 'Cebola caramelizada', price: 3.50, max: 2 },
        { name: 'Hambúrguer extra 150g', price: 9.90, max: 2 }
      ];

      for (const item of adicionaisItems) {
        await queryTransaction(connection,
          `INSERT INTO complement_items (complement_group_id, name, price, max_quantity, is_active, position)
           VALUES (?, ?, ?, ?, 1, 0)`,
          [groupAdicionaisId, item.name, item.price, item.max]
        );
      }

      // Grupo 2: Molhos (linked to burgers and portions)
      const groupMolhosResult = await queryTransaction(connection,
        `INSERT INTO complement_groups (restaurant_id, name, description, is_required, min_quantity, max_quantity, is_active, position)
         VALUES (?, 'Molhos extras', 'Selecione até 4 molhos artesanais', 0, 0, 4, 1, 2)`,
        [restaurantId]
      );
      const groupMolhosId = groupMolhosResult.insertId;

      const molhosItems = [
        { name: 'Barbecue defumado', price: 2.00, max: 2 },
        { name: 'Maionese Verde', price: 1.50, max: 3 },
        { name: 'Molho de Alho suave', price: 2.00, max: 2 },
        { name: 'Molho Especial da Casa', price: 2.50, max: 2 }
      ];

      for (const item of molhosItems) {
        await queryTransaction(connection,
          `INSERT INTO complement_items (complement_group_id, name, price, max_quantity, is_active, position)
           VALUES (?, ?, ?, ?, 1, 0)`,
          [groupMolhosId, item.name, item.price, item.max]
        );
      }

      // Grupo 3: Acompanhamentos do Açaí (linked to Açaí)
      const groupAcaiResult = await queryTransaction(connection,
        `INSERT INTO complement_groups (restaurant_id, name, description, is_required, min_quantity, max_quantity, is_active, position)
         VALUES (?, 'Acompanhamentos do Açaí', 'Escolha até 6 opcionais', 0, 0, 6, 1, 3)`,
        [restaurantId]
      );
      const groupAcaiId = groupAcaiResult.insertId;

      const acaiItems = [
        { name: 'Leite condensado', price: 2.50, max: 2 },
        { name: 'Leite em pó Ninho', price: 3.00, max: 3 },
        { name: 'Granola tradicional', price: 1.50, max: 2 },
        { name: 'Banana fatiada', price: 2.00, max: 1 },
        { name: 'Morango picado', price: 4.00, max: 2 },
        { name: 'Nutella genuína', price: 6.00, max: 2 }
      ];

      for (const item of acaiItems) {
        await queryTransaction(connection,
          `INSERT INTO complement_items (complement_group_id, name, price, max_quantity, is_active, position)
           VALUES (?, ?, ?, ?, 1, 0)`,
          [groupAcaiId, item.name, item.price, item.max]
        );
      }

      // Vincular grupos de complementos aos produtos
      console.log('🔗 Vinculando complementos aos produtos correspondentes...');
      for (const prod of productsMap) {
        if (prod.categoryName === 'Hambúrguer Artesanal' || prod.categoryName === 'Smash Burgers') {
          await queryTransaction(connection,
            'INSERT INTO product_complements (product_id, complement_group_id) VALUES (?, ?), (?, ?)',
            [prod.id, groupAdicionaisId, prod.id, groupMolhosId]
          );
        } else if (prod.categoryName === 'Porções') {
          await queryTransaction(connection,
            'INSERT INTO product_complements (product_id, complement_group_id) VALUES (?, ?)',
            [prod.id, groupMolhosId]
          );
        } else if (prod.categoryName === 'Açaí') {
          await queryTransaction(connection,
            'INSERT INTO product_complements (product_id, complement_group_id) VALUES (?, ?)',
            [prod.id, groupAcaiId]
          );
        }
      }

      // 7. Criar Clientes Fictícios (80 Clientes)
      console.log('👥 Criando 80 Clientes...');
      const customerIds = [];
      for (let i = 0; i < 80; i++) {
        const name = CLIENT_NAMES[i % CLIENT_NAMES.length];
        const firstName = name.split(' ')[0].toLowerCase();
        const email = `${firstName}.${i}@gmail.com`;
        const phone = `(33) 988${Math.floor(10 + Math.random()*90)}${Math.floor(1000 + Math.random()*9000)}`;
        const document = `${Math.floor(100 + Math.random()*900)}${Math.floor(100 + Math.random()*900)}${Math.floor(100 + Math.random()*900)}${Math.floor(10 + Math.random()*90)}`; // CPF fake
        
        const city = CITIES[i % CITIES.length];
        const isVip = i % 10 === 0;
        const isInactive = i % 12 === 0;
        const notes = isVip ? 'Cliente VIP - Prioridade máxima de envio' : (isInactive ? 'Cliente inativo há tempo' : null);

        const custResult = await queryTransaction(connection,
          `INSERT INTO customers (restaurant_id, name, email, phone, document, notes, address, address_number, complement, neighborhood, city, state, zip_code)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            restaurantId,
            name,
            email,
            phone,
            document.slice(0, 11),
            notes,
            `Avenida Principal ${i + 10}`,
            `${i * 12 + 7}`,
            i % 3 === 0 ? 'Ap 302' : null,
            'Centro',
            city,
            'MG',
            '35000-000'
          ]
        );
        customerIds.push(custResult.insertId);

        // Adiciona endereço salvo na tabela customer_addresses
        await queryTransaction(connection,
          `INSERT INTO customer_addresses (customer_id, zip_code, street, number, complement, neighborhood, city, state, is_default)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`,
          [
            custResult.insertId,
            '35000-000',
            `Avenida Principal ${i + 10}`,
            `${i * 12 + 7}`,
            i % 3 === 0 ? 'Ap 302' : null,
            'Centro',
            city,
            'MG'
          ]
        );
      }

      // 8. Criar Entregadores Fictícios (8 Entregadores)
      console.log('🏍️ Criando 8 Entregadores...');
      const vehicles = ['motorcycle', 'car', 'bicycle', 'motorcycle', 'motorcycle', 'car', 'bicycle', 'motorcycle'];
      const driverIds = [];
      for (let i = 0; i < 8; i++) {
        const name = DRIVER_NAMES[i % DRIVER_NAMES.length];
        const phone = `(33) 984${Math.floor(10 + Math.random()*90)}-${Math.floor(1000 + Math.random()*9000)}`;
        const document = `${Math.floor(100 + Math.random()*900)}${Math.floor(100 + Math.random()*900)}${Math.floor(100 + Math.random()*900)}${Math.floor(10 + Math.random()*90)}`.slice(0, 11);
        const vehicle = vehicles[i];
        const model = vehicle === 'motorcycle' ? 'Honda Titan 160' : (vehicle === 'car' ? 'Fiat Uno' : 'Bike Monark');
        const plate = vehicle !== 'bicycle' ? `ABC-5D${i}2` : null;

        const driverResult = await queryTransaction(connection,
          `INSERT INTO delivery_drivers (restaurant_id, name, phone, document, vehicle_type, vehicle_model, license_plate, is_available, is_active)
           VALUES (?, ?, ?, ?, ?, ?, ?, 1, 1)`,
          [restaurantId, name, phone, document, vehicle, model, plate]
        );
        driverIds.push(driverResult.insertId);
      }

      // 9. Criar 200 Pedidos Fictícios Distribuídos em 60 Dias
      console.log('🛒 Criando 200+ Pedidos Fictícios...');
      const statuses = ['delivered', 'delivered', 'delivered', 'delivered', 'cancelled', 'delivered', 'delivered', 'delivered', 'delivered', 'delivered'];
      
      let orderDate = new Date();
      // Afasta a data inicial por 60 dias para preencher o gráfico
      orderDate.setDate(orderDate.getDate() - 60);

      for (let i = 1; i <= 210; i++) {
        // Avance a data progressivamente de modo que tenhamos múltiplos pedidos por dia
        // 60 dias de vendas = cerca de 3 a 4 pedidos por dia
        const hoursToAdd = Math.floor(Math.random() * 8) + 1;
        orderDate.setHours(orderDate.getHours() + hoursToAdd);

        if (orderDate > new Date()) {
          // Não crie no futuro
          orderDate = new Date();
          orderDate.setMinutes(orderDate.getMinutes() - (210 - i) * 15);
        }

        const customerId = customerIds[i % customerIds.length];
        const driverId = driverIds[i % driverIds.length];
        const status = i === 208 ? 'pending' : (i === 209 ? 'preparing' : (i === 210 ? 'ready' : statuses[i % statuses.length]));
        const paymentMethod = ['pix', 'credit_card', 'cash', 'debit_card'][i % 4];
        const type = i % 8 === 0 ? 'pickup' : 'delivery';
        const deliveryFee = type === 'delivery' ? 5.99 : 0.00;

        // Seleciona de 1 a 3 itens aleatórios dos criados
        const numItems = Math.floor(Math.random() * 3) + 1;
        let subtotal = 0;
        const itemsList = [];

        for (let j = 0; j < numItems; j++) {
          const itemIdx = (i + j * 7) % productsMap.length;
          const product = productsMap[itemIdx];
          const qty = Math.floor(Math.random() * 2) + 1;
          const price = parseFloat(product.price);
          
          let optPriceSum = 0;
          const optSelections = [];

          // Adiciona opcionais de mentira
          if (product.categoryName === 'Hambúrguer Artesanal' || product.categoryName === 'Smash Burgers') {
            optSelections.push({ id: 1, name: 'Bacon extra', price: '5.00', quantity: 1 });
            optPriceSum += 5.00;
          }

          const unitPrice = price + optPriceSum;
          const totalPrice = unitPrice * qty;
          subtotal += totalPrice;

          itemsList.push({
            product_id: product.id,
            product_name: product.name,
            quantity: qty,
            unit_price: unitPrice,
            total_price: totalPrice,
            options: optSelections.length > 0 ? JSON.stringify(optSelections) : null
          });
        }

        const total = subtotal + deliveryFee;
        const orderNum = `#${orderDate.getFullYear()}${String(orderDate.getMonth() + 1).padStart(2, '0')}${String(orderDate.getDate()).padStart(2, '0')}-${String(i).padStart(4, '0')}`;

        // Insere pedido
        const orderResult = await queryTransaction(connection,
          `INSERT INTO orders (restaurant_id, customer_id, driver_id, order_number, order_type, source, status, payment_method, payment_status,
            subtotal, delivery_fee, total, created_at, updated_at,
            delivery_address, delivery_number, delivery_complement, delivery_neighborhood, delivery_city, delivery_state, delivery_zip_code)
           VALUES (?, ?, ?, ?, ?, 'site', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            restaurantId,
            customerId,
            type === 'delivery' ? driverId : null,
            orderNum,
            type,
            status,
            paymentMethod,
            status === 'delivered' ? 'paid' : (status === 'cancelled' ? 'refunded' : 'pending'),
            subtotal,
            deliveryFee,
            total,
            orderDate,
            orderDate,
            `Avenida Principal ${i % 30 + 10}`,
            `${i * 4 + 1}`,
            null,
            'Centro',
            'Governador Valadares',
            'MG',
            '35000-000'
          ]
        );
        const orderId = orderResult.insertId;

        // Insere itens do pedido
        for (const item of itemsList) {
          await queryTransaction(connection,
            `INSERT INTO order_items (order_id, restaurant_id, product_id, product_name, quantity, unit_price, total_price, options)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [orderId, restaurantId, item.product_id, item.product_name, item.quantity, item.unit_price, item.total_price, item.options]
          );
        }

        // Insere log de status inicial
        await queryTransaction(connection,
          'INSERT INTO order_status_logs (order_id, restaurant_id, to_status, created_at) VALUES (?, ?, ?, ?)',
          [orderId, restaurantId, 'pending', orderDate]
        );

        if (status === 'delivered') {
          await queryTransaction(connection,
            'INSERT INTO order_status_logs (order_id, restaurant_id, from_status, to_status, created_at) VALUES (?, ?, ?, ?, ?)',
            [orderId, restaurantId, 'pending', 'delivered', orderDate]
          );
        }

        // Se for o entregador do pedido finalizado, incremente suas entregas
        if (status === 'delivered' && type === 'delivery') {
          await queryTransaction(connection,
            'UPDATE delivery_drivers SET total_deliveries = total_deliveries + 1, total_earned = total_earned + 3.00 WHERE id = ?',
            [driverId]
          );
        }

        // Atualiza estatísticas de compra dos clientes
        await queryTransaction(connection,
          'UPDATE customers SET total_orders = total_orders + 1, total_spent = total_spent + ?, last_order_at = ? WHERE id = ?',
          [total, orderDate, customerId]
        );
      }

      // 10. Criar Dados Simulados de Conversa de WhatsApp (WhatsApp logs demo)
      console.log('💬 Criando logs de conversa de WhatsApp de mentira...');
      const chatMessages = [
        { sender: 'customer', msg: 'Olá! Gostaria de saber se a minha entrega já saiu?' },
        { sender: 'system', msg: 'Aviso Automático: O seu pedido #demo-01 está em andamento.' },
        { sender: 'merchant', msg: 'Olá! Sim, o entregador acabou de sair do restaurante. Deve chegar em 10 minutos!' },
        { sender: 'customer', msg: 'Perfeito, muito obrigado!' }
      ];

      // Pegamos o último pedido pendente para simular mensagens
      const lastOrders = await queryTransaction(connection, 'SELECT id FROM orders WHERE restaurant_id = ? ORDER BY id DESC LIMIT 1', [restaurantId]);
      if (lastOrders.length > 0) {
        const oId = lastOrders[0].id;
        for (const msg of chatMessages) {
          await queryTransaction(connection,
            'INSERT INTO order_messages (order_id, restaurant_id, sender_type, message) VALUES (?, ?, ?, ?)',
            [oId, restaurantId, msg.sender, msg.msg]
          );
        }
      }

      await connection.commit();
      connection.release();

      console.log('\n╔══════════════════════════════════════════════════╗');
      console.log('║  🎉  Ambiente de Demonstração Criado com Sucesso!║');
      console.log('╚══════════════════════════════════════════════════╝');
      console.log('  💡 DADOS DE ACESSO:');
      console.log('     E-mail: demo@meudeliveryai.com');
      console.log('     Senha : 123456');
      console.log('     Slug  : demo');
      console.log('');
      
      if (require.main === module) {
        process.exit(0);
      }
      return true;

    } catch (err) {
      await connection.rollback();
      connection.release();
      throw err;
    }
  } catch (error) {
    console.error('\n❌ Erro durante o seeding do ambiente de demonstração:', error.message);
    if (require.main === module) {
      process.exit(1);
    }
    throw error;
  }
}

if (require.main === module) {
  seed();
}

module.exports = { seed };
