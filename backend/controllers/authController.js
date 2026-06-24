const { authenticate } = require("../services/authService");
const { createSession, deleteSession, getBearerToken, getSession } = require("../middleware/auth");

async function login(request, response, next) {
  try {
    const { username, password } = request.body || {};
    const user = await authenticate(username, password);
    if (!user) {
      response.status(401).json({ error: "账号或密码不正确" });
      return;
    }
    const token = createSession(user);
    response.json({ token, user });
  } catch (error) {
    next(error);
  }
}

function logout(request, response) {
  const token = getBearerToken(request);
  if (token) {
    deleteSession(token);
  }
  response.json({ ok: true });
}

function me(request, response) {
  const token = getBearerToken(request);
  const session = token ? getSession(token) : null;
  if (!session) {
    response.status(401).json({ error: "Unauthorized" });
    return;
  }
  response.json({ user: session.user });
}

module.exports = { login, logout, me };
