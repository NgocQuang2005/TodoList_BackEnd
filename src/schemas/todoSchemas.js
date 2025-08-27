const createTodoSchema = {
  type: "object",
  required: ["title"],
  properties: {
    title: { type: "string", minLength: 3, maxLength: 255 },
    description: { type: "string", minLength: 4, maxLength: 255 },
    priority: { type: "string", enum: ["low", "medium", "high"] },
    deadline: { type: "string", format: "date-time" },
  },
  additionalProperties: false,
};

const updateTodoSchema = {
  type: "object",
  properties: {
    title: { type: "string", minLength: 3, maxLength: 255 },
    description: { type: "string", minLength: 4, maxLength: 255 },
    priority: { type: "string", enum: ["low", "medium", "high"] },
    deadline: { type: "string", format: "date-time" },
    is_completed: { type: "boolean" },
  },
  additionalProperties: false,
  minProperties: 1, // bắt buộc phải có ít nhất 1 field để update
};

module.exports = { createTodoSchema, updateTodoSchema };
