const fastify = require("fastify")({logger: true});
require("dotenv").config();

async function startServer() {
  // Đăng ký plugins TRƯỚC khi đăng ký routers
  await fastify.register(require("./src/plugins/authPlugins"));
  // Middleware body parser đã tích hợp sẵn trong Fastify
  await fastify.register(require("@fastify/cors"), {
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
  });
  // routers
  const authRouter = require("./src/routers/authRouter");
  const todoRouter = require("./src/routers/todosRouter");
  const userRouter = require("./src/routers/userRouter");
  // Đăng ký router (plugin)
  await fastify.register(authRouter, { prefix: "/api/auth" });
  await fastify.register(todoRouter, { prefix: "/api/todos" });
  await fastify.register(userRouter, { prefix: "/api/user" });
  const PORT = 3443;
  try {
    await fastify.listen({ port: PORT });
    console.log(`🚀 Server running on port ${PORT}`);
  } catch (err) {
    fastify.log.error(err)
    process.exit(1);
  }
}

startServer();
