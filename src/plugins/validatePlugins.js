// src/plugins/validatePlugins.js
const fp = require("fastify-plugin");

function validate(schema, source = "body") {
  return async function (request, reply) {
    const { error, value } = schema.validate(request[source]);
    if (error) {
      return reply.code(400).send({ error: error.details[0].message });
    }
    request[source] = value; // gắn dữ liệu đã validate vào request
  };
}

async function validatePlugin(fastify, options) {
  fastify.decorate("validate", validate);
}

module.exports = fp(validatePlugin);
