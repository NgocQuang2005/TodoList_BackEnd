const db = require("../config/db");

async function addTodoHistory(todo) {
  return db("TodoHistory").insert({
    todo_id: todo.id,
    user_id: todo.user_id,
    title: todo.title,
    description: todo.description,
    priority: todo.priority,
    is_completed: todo.is_completed,
    deadline: todo.deadline,
    image_url: todo.image_url,
    created_at: new Date(),
    updated_at: new Date(),
  });
}

async function getTodoHistoryByTodoId(todoId) {
  return db("TodoHistory")
    .where({ todo_id: todoId })
    .orderBy("created_at", "desc");
}

module.exports = {
  addTodoHistory,
  getTodoHistoryByTodoId,
};
