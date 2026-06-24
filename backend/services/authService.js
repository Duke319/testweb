const { readAppDb } = require("../repositories/fileRepository");
const { sanitizeUserScope } = require("./userScopeService");

function sanitizeUser(user) {
  return {
    id: user.id,
    username: user.username,
    displayName: user.username,
    role: user.role || "viewer",
    ...sanitizeUserScope(user),
  };
}

async function authenticate(username, password) {
  const db = await readAppDb();
  const user = (db.users || []).find((item) => item.username === username && item.password === password);
  return user ? sanitizeUser(user) : null;
}

module.exports = { authenticate, sanitizeUser };
