// src/plugins/authPlugins.js
const fp = require("fastify-plugin");
const jwt = require("../utils/jwt");

async function authenticate(request, reply) {
  const authHeader = request.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return reply.code(401).send({ error: "No token provided" });
  }

  try {
    const decoded = jwt.verifyToken(token);
    request.user = decoded; // gắn user vào request
  } catch (err) {
    return reply.code(401).send({ error: "Invalid token" });
  }
}

async function authPlugin(fastify, options) {
  fastify.decorate("authenticate", authenticate);
}

module.exports = fp(authPlugin);
