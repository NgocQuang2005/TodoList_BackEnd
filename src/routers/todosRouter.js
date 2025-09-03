// src/routers/todoRouter.js
const {
  createTodoSchema,
  updateTodoSchema,
} = require("../schemas/todoSchemas");
const addFormats = require("ajv-formats");
const todoService = require("../services/todoService");
const { upload, processImage } = require("../middleware/imageUpload");

// Tạo validator instances một lần để tái sử dụng
const ajv = require("ajv");
const ajvInstance = new ajv();
addFormats(ajvInstance);
const createValidator = ajvInstance.compile(createTodoSchema);
const updateValidator = ajvInstance.compile(updateTodoSchema);

// Helper function để parse request data
const parseRequestData = (request) => {
  if (!request.body) {
    throw new Error("Missing data");
  }

  if (request.body.todoData) {
    try {
      return JSON.parse(request.body.todoData);
    } catch (err) {
      throw new Error("Invalid JSON in todoData");
    }
  }

  return request.body;
};
// Helper function để validate data
const validateData = (data, validator, validationType) => {
  if (!validator(data)) {
    throw new Error(
      `${validationType} validation failed: ${JSON.stringify(validator.errors)}`
    );
  }
};
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
        console.log("Request body:", request.body);
        console.log("Request file:", request.file ? "File present" : "No file");

        const todoData = parseRequestData(request);
        console.log("Parsed todoData:", todoData);

        validateData(todoData, createValidator, "Create");

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

        console.log("PUT Request body:", request.body);
        console.log(
          "PUT Request file:",
          request.file ? "File present" : "No file"
        );

        const updateData = parseRequestData(request);
        console.log("PUT Parsed todoData:", updateData);

        validateData(updateData, updateValidator, "Update");

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
