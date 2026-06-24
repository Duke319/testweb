const sessions = new Map();

function createSession(user) {
  const token = `dev-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  sessions.set(token, {
    token,
    user,
    createdAt: new Date().toISOString(),
  });
  return token;
}

function getSession(token) {
  return sessions.get(token) || null;
}

function deleteSession(token) {
  sessions.delete(token);
}

function getBearerToken(request) {
  const header = request.headers.authorization || "";
  return header.startsWith("Bearer ") ? header.slice(7) : "";
}

function optionalAuth(request, response, next) {
  const token = getBearerToken(request);
  request.session = token ? getSession(token) : null;
  request.user = request.session?.user || null;
  next();
}

function requireAuth(request, response, next) {
  optionalAuth(request, response, () => {
    if (!request.user) {
      response.status(401).json({ error: "Unauthorized" });
      return;
    }
    next();
  });
}

module.exports = {
  createSession,
  deleteSession,
  getBearerToken,
  getSession,
  optionalAuth,
  requireAuth,
};
