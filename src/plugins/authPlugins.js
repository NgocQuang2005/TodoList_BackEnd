// src/plugins/authPlugins.js
const fp = require("fastify-plugin");
const fastifyJwt = require("@fastify/jwt");

async function authPlugin(fastify, options) {
  // Đăng ký fastify-jwt
  fastify.register(fastifyJwt, {
    secret: process.env.JWT_SECRET || "your-secret-key",
    sign: { expiresIn: "1h" },
  });

  // Middleware authenticate
  fastify.decorate("authenticate", async function (request, reply) {
    try {
      await request.jwtVerify(); // sẽ tự đọc token từ header Authorization: Bearer ...
    } catch (err) {
      return reply.code(401).send({ error: "Unauthorized" });
    }
  });
}

module.exports = fp(authPlugin);
