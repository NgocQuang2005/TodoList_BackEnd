const fastify = require("fastify")({logger: true});
require("dotenv").config();
const path = require('path');
async function startServer() {
  // Đăng ký plugins TRƯỚC khi đăng ký routers
  await fastify.register(require("./src/plugins/authPlugins"));
  // Middleware body parser đã tích hợp sẵn trong Fastify
  await fastify.register(require('@fastify/multipart'), {
    limits: {
      fileSize: 2 * 1024 * 1024, // 2MB - Client đã resize về 1MB, để buffer nhỏ
      files: 1, // Chỉ cho phép 1 file per request
      fieldSize: 1024 * 1024, // 1MB cho text fields
    }
  });
  await fastify.register(require("@fastify/cors"), {
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
  });
  await fastify.register(require('@fastify/static'), {
  root: path.join(__dirname, 'public'),
  prefix: '/', // URL prefix
});
  // routers
  const authRouter = require("./src/routers/authRouter");
  const todoRouter = require("./src/routers/todosRouter");
  const userRouter = require("./src/routers/userRouter");
  const todoHistoryRouter  = require("./src/routers/todoHistoryRouter");
  // Đăng ký router (plugin)
  await fastify.register(authRouter, { prefix: "/api/auth" });
  await fastify.register(todoRouter, { prefix: "/api/todos" });
  await fastify.register(userRouter, { prefix: "/api/user" });
  await fastify.register(todoHistoryRouter, { prefix: "/api/todo-history" });
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
