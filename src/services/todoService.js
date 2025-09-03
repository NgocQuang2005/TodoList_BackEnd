const db = require("../config/db");
const fs = require("fs").promises;
const path = require("path");
const todoHistoryService = require("../services/todoHistoryService");
async function getTodoById(id) {
  return db("Todos").where({ id }).first();
}
// Helper function để áp dụng filters
const applyFilters = (query, filters) => {
  // Filter theo title
  if (
    filters.title &&
    typeof filters.title === "string" &&
    filters.title.trim()
  ) {
    const searchTerm = filters.title.trim();
    query = query.whereRaw("LOWER(title) LIKE LOWER(?)", [`%${searchTerm}%`]);
  }

  // Filter theo status
  if (
    filters.status !== null &&
    filters.status !== undefined &&
    filters.status !== "" &&
    filters.status !== "all"
  ) {
    const statusValue =
      filters.status === "true" || filters.status === true
        ? true
        : filters.status === "false" || filters.status === false
        ? false
        : undefined;

    if (statusValue !== undefined) {
      query = query.where("is_completed", statusValue);
      console.log("Applied status filter:", statusValue);
    }
  }

  // Filter theo priority
  if (
    filters.priority !== null &&
    filters.priority !== undefined &&
    filters.priority !== "" &&
    filters.priority !== "all"
  ) {
    query = query.where("priority", filters.priority);
    console.log("Applied priority filter:", filters.priority);
  }

  return query;
};

async function getTodosByUserWithPagination(
  userId,
  page = 1,
  pageSize = 10,
  filters = {}
) {
  const offset = (page - 1) * pageSize;
  let query = db("Todos").where({ user_id: userId });

  // Áp dụng filters
  query = applyFilters(query, filters);

  // Lấy dữ liệu theo trang và sắp xếp theo deadline tăng dần
  const todos = await query
    .clone()
    .orderByRaw("CASE WHEN deadline IS NULL THEN 1 ELSE 0 END")
    .orderBy("deadline", "asc")
    .offset(offset)
    .limit(pageSize);

  // Đếm tổng số todos
  const [{ count }] = await query.clone().count("id as count");

  return {
    todos,
    pagination: {
      page,
      pageSize,
      total: Number(count),
      totalPages: Math.ceil(count / pageSize),
    },
  };
}
async function createTodo(
  userId,
  title,
  description,
  priority,
  deadline,
  imageUrl
) {
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
      image_url: imageUrl || null,
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

  // Lấy thông tin todo cũ trước khi update
  const oldTodo = await getTodoById(id);
  if (!oldTodo) {
    throw new Error("Todo không tồn tại");
  }
  await todoHistoryService.addTodoHistory(oldTodo);
  // Nếu có ảnh mới, xóa ảnh cũ
  if (
    updates.image_url &&
    oldTodo.image_url &&
    updates.image_url !== oldTodo.image_url
  ) {
    await deleteImageFile(oldTodo.image_url);
    console.log("Đã xóa ảnh cũ:", oldTodo.image_url);
  }

  const updateData = {
    ...updates,
    updated_at: new Date(),
  };

  // Chỉ cập nhật deadline nếu có trong updates
  if (updates.hasOwnProperty("deadline")) {
    updateData.deadline = updates.deadline || null;
  }

  // Chỉ cập nhật image_url nếu có trong updates
  if (updates.hasOwnProperty("image_url")) {
    updateData.image_url = updates.image_url || null;
  }

  const [todo] = await db("Todos")
    .where({ id })
    .update(updateData)
    .returning("*");

  return todo;
}

async function deleteTodo(id) {
  const todo = await getTodoById(id);
  if (!todo) {
    throw new Error("Todo không tồn tại");
  }
  // Sử dụng transaction để đảm bảo tính nhất quán
  const result = await db.transaction(async (trx) => {
    // Xóa các bản ghi liên quan trong TodoHistory trước
    await trx("TodoHistory").where({ todo_id: id }).del();
    // Sau đó xóa todo
    const deleteResult = await trx("Todos").where({ id }).del();
    return deleteResult;
  });
  // Xóa ảnh sau khi transaction thành công
  if (todo.image_url) {
    await deleteImageFile(todo.image_url);
  }
  return result;
}
async function deleteImageFile(imageUrl) {
  try {
    if (imageUrl && imageUrl.startsWith("/uploads/")) {
      const filePath = path.join(process.cwd(), "public", imageUrl);
      // Kiểm tra file có tồn tại không trước khi xóa
      try {
        await fs.access(filePath);
        await fs.unlink(filePath);
        console.log("Đã xóa ảnh:", filePath);
      } catch (accessError) {
        // File không tồn tại, không cần xóa
        console.log("File ảnh không tồn tại hoặc đã bị xóa:", filePath);
      }
    }
  } catch (error) {
    console.error("Lỗi khi xóa ảnh:", error);
    // Không throw error để không ảnh hưởng đến quá trình update/delete todo
  }
}
module.exports = {
  getTodoById,
  createTodo,
  updateTodo,
  deleteTodo,
  getTodosByUserWithPagination,
};
