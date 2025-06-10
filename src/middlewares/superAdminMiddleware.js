export function checkAdminOrSuper(req, res, next) {
  const { role } = req.user;
  return (role === 'admin' || role === 'superadmin')
    ? next()
    : res.status(403).send('Acesso negado');
}