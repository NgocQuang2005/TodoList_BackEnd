// src/routers/authRouter.js
const { registerSchema, loginSchema } = require("../schemas/authSchemas");
const authService = require("../services/authService");

async function authRouter(fastify, options) {
  // Đăng ký
  fastify.post("/register", {
    schema: {body : registerSchema},
    handler: async (request, reply) => {
      const user = await authService.register(request.body);
      return reply.send({ message: "User registered", user });
    }
  });

  // Đăng nhập
  fastify.post("/login", {
    schema: {body: loginSchema},
    handler: async (request, reply) => {
      const user = await authService.login(request.body);
      return reply.send({ message: "User login successfully", user });
    }
  });
}

module.exports = authRouter;
