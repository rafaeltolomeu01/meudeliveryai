const { query } = require('../config/database');
const bcrypt = require('bcryptjs');
const { validationResult } = require('express-validator');

/**
 * GET /api/v1/users
 * Lista todos os colaboradores do restaurante logado
 */
const getAll = async (req, res, next) => {
  try {
    const restaurant_id = req.user.restaurant_id;

    const users = await query(
      `SELECT id, name, email, phone, role, status, created_at, last_login
       FROM users
       WHERE restaurant_id = ?
       ORDER BY created_at DESC`,
      [restaurant_id]
    );

    return res.json({ success: true, data: users });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/users
 * Cria um novo colaborador para o restaurante logado
 */
const create = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ success: false, message: 'Dados inválidos.', errors: errors.array() });
    }

    const restaurant_id = req.user.restaurant_id;
    const { name, email, password, phone, role, status = 'active' } = req.body;

    // 1. Validar perfil permitido
    const allowedRoles = ['gerente', 'atendente', 'cozinha', 'entregador'];
    if (!allowedRoles.includes(role)) {
      return res.status(400).json({ success: false, message: 'Perfil de acesso não permitido.' });
    }

    // 2. Verificar duplicação de email
    const existing = await query('SELECT id FROM users WHERE email = ? LIMIT 1', [email]);
    if (existing.length > 0) {
      return res.status(409).json({ success: false, message: 'Este e-mail já está cadastrado.' });
    }

    // 3. Validar limite de usuários do plano
    const planInfo = await query(
      `SELECT p.max_users
       FROM subscriptions s
       JOIN plans p ON p.id = s.plan_id
       WHERE s.restaurant_id = ? AND s.status IN ('trial', 'active')
       LIMIT 1`,
      [restaurant_id]
    );

    let maxUsers = null;
    if (planInfo.length > 0) {
      maxUsers = planInfo[0].max_users;
    } else {
      // Fallback para plano Starter (id=1) se nenhuma assinatura for encontrada
      maxUsers = 2;
    }

    if (maxUsers !== null) {
      const [{ count }] = await query('SELECT COUNT(*) as count FROM users WHERE restaurant_id = ?', [restaurant_id]);
      if (parseInt(count) >= maxUsers) {
        return res.status(422).json({
          success: false,
          message: `O limite de colaboradores do seu plano (${maxUsers} colaboradores) foi atingido. Faça o upgrade do plano para cadastrar novos membros na equipe.`
        });
      }
    }

    // 4. Hash da senha
    const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12;
    const password_hash = await bcrypt.hash(password, saltRounds);

    // 5. Inserir usuário
    const result = await query(
      `INSERT INTO users (restaurant_id, name, email, password_hash, phone, role, status)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [restaurant_id, name, email, password_hash, phone || null, role, status]
    );

    return res.status(201).json({
      success: true,
      message: 'Colaborador cadastrado com sucesso!',
      data: {
        id: result.insertId,
        name,
        email,
        phone,
        role,
        status,
        created_at: new Date().toISOString()
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/v1/users/:id
 * Atualiza dados de um colaborador existente
 */
const update = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ success: false, message: 'Dados inválidos.', errors: errors.array() });
    }

    const restaurant_id = req.user.restaurant_id;
    const { id } = req.params;
    const { name, email, password, phone, role, status } = req.body;

    // 1. Verificar se o colaborador existe e pertence ao mesmo restaurante
    const userCheck = await query(
      'SELECT id, email, role FROM users WHERE id = ? AND restaurant_id = ? LIMIT 1',
      [id, restaurant_id]
    );
    if (userCheck.length === 0) {
      return res.status(404).json({ success: false, message: 'Colaborador não encontrado.' });
    }

    const targetUser = userCheck[0];

    // 2. Impedir que o proprietário altere seu próprio papel/status e se auto bloqueie
    if (parseInt(id) === req.user.id) {
      if (role && role !== 'dono') {
        return res.status(400).json({ success: false, message: 'Você não pode alterar o seu próprio perfil de Proprietário.' });
      }
      if (status && status !== 'active') {
        return res.status(400).json({ success: false, message: 'Você não pode desativar ou bloquear o seu próprio usuário.' });
      }
    }

    // 3. Validar perfil se fornecido
    if (role && targetUser.role !== 'dono') {
      const allowedRoles = ['gerente', 'atendente', 'cozinha', 'entregador'];
      if (!allowedRoles.includes(role)) {
        return res.status(400).json({ success: false, message: 'Perfil de acesso não permitido.' });
      }
    }

    // 4. Montar a query dinâmica de atualização
    let updateFields = [];
    let params = [];

    if (name) {
      updateFields.push('name = ?');
      params.push(name);
    }
    
    if (phone !== undefined) {
      updateFields.push('phone = ?');
      params.push(phone || null);
    }

    if (role && targetUser.role !== 'dono') {
      updateFields.push('role = ?');
      params.push(role);
    }

    if (status && parseInt(id) !== req.user.id) {
      updateFields.push('status = ?');
      params.push(status);
    }

    if (password) {
      const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12;
      const password_hash = await bcrypt.hash(password, saltRounds);
      updateFields.push('password_hash = ?');
      params.push(password_hash);
    }

    if (email && email !== targetUser.email) {
      // Verificar e-mail duplicado
      const existingEmail = await query('SELECT id FROM users WHERE email = ? AND id != ? LIMIT 1', [email, id]);
      if (existingEmail.length > 0) {
        return res.status(409).json({ success: false, message: 'Este e-mail já está em uso por outro colaborador.' });
      }
      updateFields.push('email = ?');
      params.push(email);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ success: false, message: 'Nenhum campo fornecido para atualização.' });
    }

    params.push(id, restaurant_id);
    await query(
      `UPDATE users SET ${updateFields.join(', ')} WHERE id = ? AND restaurant_id = ?`,
      params
    );

    return res.json({
      success: true,
      message: 'Colaborador atualizado com sucesso!'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/v1/users/:id
 * Remove um colaborador do restaurante (Dono logado não pode se deletar)
 */
const deleteUser = async (req, res, next) => {
  try {
    const restaurant_id = req.user.restaurant_id;
    const { id } = req.params;

    if (parseInt(id) === req.user.id) {
      return res.status(400).json({ success: false, message: 'Você não pode excluir a sua própria conta.' });
    }

    const userCheck = await query(
      'SELECT id, role FROM users WHERE id = ? AND restaurant_id = ? LIMIT 1',
      [id, restaurant_id]
    );

    if (userCheck.length === 0) {
      return res.status(404).json({ success: false, message: 'Colaborador não encontrado.' });
    }

    if (userCheck[0].role === 'dono') {
      return res.status(400).json({ success: false, message: 'Não é permitido excluir a conta de um Proprietário.' });
    }

    await query('DELETE FROM users WHERE id = ? AND restaurant_id = ?', [id, restaurant_id]);

    return res.json({ success: true, message: 'Colaborador excluído com sucesso!' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAll,
  create,
  update,
  deleteUser
};
