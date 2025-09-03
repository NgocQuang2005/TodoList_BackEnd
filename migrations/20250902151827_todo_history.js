/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable("TodoHistory", function (table) {
    table.increments("id").primary();
    table.integer("todo_id").notNullable();
    table.integer("user_id").notNullable();
    table.string("title").notNullable();
    table.string("description").nullable();
    table.string("priority").notNullable();
    table.boolean("is_completed").notNullable();
    table.timestamp("deadline").nullable();
    table.string("image_url", 500);
    table.timestamp("created_at").defaultTo(knex.fn.now());
    table.timestamp("updated_at").defaultTo(knex.fn.now());
    
    // Thêm foreign key constraints
    table.foreign("todo_id").references("id").inTable("Todos").onDelete("CASCADE");
    table.foreign("user_id").references("id").inTable("Users").onDelete("CASCADE");
    
    // Tạo index cho performance
    table.index("todo_id");
    table.index("user_id");
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTable("TodoHistory");
};