/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable("Todos", function(table){
    table.increments("id").primary();
    table.integer("user_id").unsigned().notNullable().references("id").inTable("Users").onDelete("CASCADE");
    table.string("title").notNullable();
    table.string("description").nullable();
    table.string("priority").notNullable();
    table.boolean("is_completed").notNullable().defaultTo(false);
    table.timestamp("deadline").nullable();
    table.string("image_url", 500);
    table.timestamp("created_at").defaultTo(knex.fn.now());
    table.timestamp("updated_at").defaultTo(knex.fn.now());
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTable("Todos");
};