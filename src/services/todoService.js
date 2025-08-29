const db = require("../config/db");

async function getTodosByUser(userId) {
  return db("Todos").where({ user_id: userId });
}

async function getTodoById(id) {
  return db("Todos").where({ id }).first();
}

async function createTodo(userId, title, description, priority, deadline) {
  if (deadline) {
    const selectedDate = new Date(deadline);
    if (isNaN(selectedDate.getTime())) {
      throw new Error("Deadline không hợp lệ");
    }
    if (selectedDate < new Date()) {
      throw new Error("Deadline không được chọn ngày quá khứ");
    }
  }
  const [todo] = await db("Todos")
    .insert({
      user_id: userId,
      title,
      description,
      priority,
      deadline: deadline || null,
      is_completed: false,
      created_at: new Date(),
      updated_at: new Date(),
    })
    .returning("*");
  return todo;
}

async function updateTodo(id, updates) {
  if (updates.deadline) {
    const selectedDate = new Date(updates.deadline);
    if (isNaN(selectedDate.getTime())) {
      throw new Error("Deadline không hợp lệ");
    }
    if (selectedDate < new Date()) {
      throw new Error("Deadline không được chọn ngày quá khứ");
    }
  }
  const [todo] = await db("Todos")
    .where({ id })
    .update({
      ...updates,
      deadline: updates.deadline || null,
      updated_at: new Date(),
    })
    .returning("*");
  return todo;
}

async function deleteTodo(id) {
  return db("Todos").where({ id }).del();
}

module.exports = {
  getTodosByUser,
  getTodoById,
  createTodo,
  updateTodo,
  deleteTodo,
};
