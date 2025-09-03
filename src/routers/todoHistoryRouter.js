const todoHistoryService = require("../services/todoHistoryService");

async function todoHistoryRouter(fastify, options) {
  // Lấy toàn bộ lịch sử chỉnh sửa của 1 todo
  fastify.get("/:todoId", {
    preHandler: [fastify.authenticate],
    handler: async (request, reply) => {
      try {
        const { todoId } = request.params;
        const history = await todoHistoryService.getTodoHistoryByTodoId(todoId);

        if (!history || history.length === 0) {
          return reply.code(404).send({ error: "Không có lịch sử cho todo này" });
        }

        return history;
      } catch (err) {
        fastify.log.error(err);
        reply.code(500).send({ error: "Something went wrong" });
      }
    },
  });
}

module.exports = todoHistoryRouter;
