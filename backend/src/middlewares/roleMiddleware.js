/**
 * Middleware de Autorização por Perfil (roleMiddleware)
 * Protege rotas verificando se o perfil (role) do usuário é permitido.
 * 
 * @param {...string} allowedRoles - Perfis autorizados (ex: 'dono', 'gerente')
 */
const roleMiddleware = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Não autenticado.',
      });
    }

    // Administrador geral tem acesso irrestrito a todas as rotas
    if (req.user.role === 'admin_geral') {
      return next();
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Acesso negado. Seu perfil de usuário não tem permissão para esta ação.',
        required_roles: allowedRoles,
        your_role: req.user.role,
      });
    }

    next();
  };
};

roleMiddleware.roleMiddleware = roleMiddleware;
module.exports = roleMiddleware;
