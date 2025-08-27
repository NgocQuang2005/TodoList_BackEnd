// src/routers/todoRouter.js
const {
  createTodoSchema,
  updateTodoSchema,
} = require("../schemas/todoSchemas");
const todoService = require("../services/todoService");

async function todoRouter(fastify, options) {
  // Lấy tất cả todos của user theo token trả ra từ user đó
  fastify.get("/", {
    preHandler: [fastify.authenticate],
    handler: async (request, reply) => {
      const todos = await todoService.getTodosByUser(request.user.id);
      return todos;
    },
  });

  // Tạo todo mới
  fastify.post("/", {
    preHandler: [fastify.authenticate],
    schema: {body: createTodoSchema},
    handler: async (request, reply) => {
      console.log("DEBUG user id:", request.user.id);//id lấy từ user đăng nhập từ jwt
      const todo = await todoService.createTodo(
        request.user.id,
        request.body.title,
        request.body.description,
        request.body.priority,
        request.body.deadline,
      );
      reply.code(201);
      return todo;
    },
  });

  // Cập nhật todo
  fastify.put("/:id", {
    preHandler: [fastify.authenticate],
    schema: {body: updateTodoSchema},
    handler: async (request, reply) => {
      const { id } = request.params;
      const todo = await todoService.getTodoById(id);

      if (!todo || todo.user_id !== request.user.id) {
        return reply.code(404).send({ error: "Todo not found" });
      }

      const updated = await todoService.updateTodo(id, request.body);
      return updated;
    },
  });

  // Xóa todo
  fastify.delete("/:id", {
    preHandler: [fastify.authenticate],
    handler: async (request, reply) => {
      const { id } = request.params;
      const todo = await todoService.getTodoById(id);
      

      if (!todo || todo.user_id !== request.user.id) {
        return reply.code(404).send({ error: "Todo not found" });
      }

      await todoService.deleteTodo(id);
      return { message: "Todo deleted successfully" };
    },
  });
}

module.exports = todoRouter;
