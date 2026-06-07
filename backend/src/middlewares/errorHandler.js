/**
 * Global Error Handler Middleware
 * Deve ser o último middleware registrado no Express
 */
const errorHandler = (err, req, res, next) => {
  const isProduction = process.env.NODE_ENV === 'production';

  // Log do erro (sempre, independente do ambiente)
  console.error('─────────────────────────────────────────');
  console.error(`[ERROR] ${new Date().toISOString()}`);
  console.error(`Route: ${req.method} ${req.originalUrl}`);
  console.error(`Message: ${err.message}`);
  if (!isProduction) {
    console.error('Stack:', err.stack);
  }
  console.error('─────────────────────────────────────────');

  // ─── Erros de Validação (express-validator) ───────────────────────────────
  if (err.type === 'validation' || err.array) {
    return res.status(422).json({
      success: false,
      message: 'Dados inválidos.',
      errors: err.errors || [],
    });
  }

  // ─── Erros de JWT ─────────────────────────────────────────────────────────
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Token inválido ou expirado.',
    });
  }

  // ─── Erros de MySQL ───────────────────────────────────────────────────────
  if (err.code === 'ER_DUP_ENTRY') {
    const field = err.message.match(/for key '(.+?)'/)?.[1] || 'campo';
    return res.status(409).json({
      success: false,
      message: `Registro duplicado: ${field}. Este valor já está em uso.`,
    });
  }

  if (err.code === 'ER_NO_REFERENCED_ROW_2') {
    return res.status(400).json({
      success: false,
      message: 'Referência inválida. O registro relacionado não existe.',
    });
  }

  if (err.code === 'ECONNREFUSED' || err.code === 'ER_ACCESS_DENIED_ERROR') {
    return res.status(503).json({
      success: false,
      message: 'Serviço temporariamente indisponível. Tente novamente em instantes.',
    });
  }

  // ─── Erros Customizados da Aplicação ─────────────────────────────────────
  if (err.statusCode) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      ...(err.errors && { errors: err.errors }),
    });
  }

  // ─── Erro 404 ─────────────────────────────────────────────────────────────
  if (err.status === 404) {
    return res.status(404).json({
      success: false,
      message: err.message || 'Recurso não encontrado.',
    });
  }

  // ─── Erro genérico do servidor ────────────────────────────────────────────
  return res.status(500).json({
    success: false,
    message: isProduction
      ? 'Erro interno do servidor. Nossa equipe foi notificada.'
      : err.message || 'Erro interno do servidor.',
    ...(isProduction ? {} : { stack: err.stack }),
  });
};

/**
 * Helper para criar erros com status code customizado
 */
const createError = (message, statusCode = 500, errors = null) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  if (errors) error.errors = errors;
  return error;
};

module.exports = errorHandler;
module.exports.createError = createError;
