// src/routers/todoRouter.js
const {
  createTodoSchema,
  updateTodoSchema,
} = require("../schemas/todoSchemas");
const addFormats = require("ajv-formats");
const todoService = require("../services/todoService");
const { upload, processImage } = require("../middleware/imageUpload");
async function todoRouter(fastify, options) {
  // Lấy tất cả todos của user theo token trả ra từ user đó
  fastify.get("/", {
    preHandler: [fastify.authenticate],
    handler: async (request, reply) => {
      const {
        page = 1,
        pageSize = 10,
        title,
        status,
        priority,
      } = request.query;
      const filters = {};
      if (title && typeof title === "string" && title.trim()) {
        filters.title = title.trim();
      }

      if (
        status !== null &&
        status !== undefined &&
        status !== "" &&
        status !== "all"
      ) {
        filters.status = status;
      }

      if (
        priority !== null &&
        priority !== undefined &&
        priority !== "" &&
        priority !== "all"
      ) {
        filters.priority = priority;
      }
      const result = await todoService.getTodosByUserWithPagination(
        request.user.id,
        Number(page),
        Number(pageSize),
        filters
      );
      return result;
    },
  });

  // Tạo todo mới
  fastify.post("/", {
    preHandler: [fastify.authenticate, upload, processImage],
    handler: async (request, reply) => {
      try {
        let todoData = {};
        console.log("Request body:", request.body);
        console.log("Request file:", request.file ? "File present" : "No file");
        if (request.body) {
          if (request.body.todoData) {
            try {
              todoData = JSON.parse(request.body.todoData);
              console.log("Parsed todoData:", todoData);
            } catch (err) {
              return reply
                .code(400)
                .send({ error: "Invalid JSON in todoData" });
            }
          } else {
            todoData = request.body;
            console.log("Direct todoData:", todoData);
          }
        } else {
          return reply.code(400).send({ error: "Missing todo data" });
        }
        //validate create
        const ajv = require("ajv");
        const ajvInstance = new ajv();
        addFormats(ajvInstance);
        const validate = ajvInstance.compile(createTodoSchema);

        if (!validate(todoData)) {
          return reply.code(400).send({
            error: "Validation failed",
            details: validate.errors,
          });
        }
        const todo = await todoService.createTodo(
          request.user.id,
          todoData.title,
          todoData.description,
          todoData.priority,
          todoData.deadline,
          request.imageUrl
        );
        reply.code(201);
        return todo;
      } catch (error) {
        return reply.code(400).send({ error: error.message });
      }
    },
  });

  fastify.put("/:id", {
    preHandler: [fastify.authenticate, upload, processImage],
    handler: async (request, reply) => {
      try {
        const { id } = request.params;
        const todo = await todoService.getTodoById(id);

        if (!todo || todo.user_id !== request.user.id) {
          return reply.code(404).send({ error: "Todo not found" });
        }

        let updateData = {};

        console.log("PUT Request body:", request.body);
        console.log(
          "PUT Request file:",
          request.file ? "File present" : "No file"
        );

        if (request.body) {
          if (request.body.todoData) {
            try {
              updateData = JSON.parse(request.body.todoData);
              console.log("PUT Parsed todoData:", updateData);
            } catch (err) {
              return reply.code(400).send({ error: "Invalid JSON in todoData" });
            }
          } else {
            updateData = request.body;
            console.log("PUT Direct todoData:", updateData);
          }
        } else {
          return reply.code(400).send({ error: "Missing update data" });
        }

        // Validate updateData
        const ajv = require("ajv");
        const ajvInstance = new ajv();
        addFormats(ajvInstance);
        const validate = ajvInstance.compile(updateTodoSchema);

        if (!validate(updateData)) {
          console.error("PUT Validation errors:", validate.errors);
          return reply.code(400).send({
            error: "Validation failed",
            details: validate.errors,
          });
        }

        // Nếu có ảnh mới, thêm vào updateData
        if (request.imageUrl) {
          updateData.image_url = request.imageUrl;
        }

        const updated = await todoService.updateTodo(id, updateData);
        return updated;
      } catch (error) {
        console.error("PUT Error:", error);
        return reply.code(400).send({ error: error.message });
      }
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
