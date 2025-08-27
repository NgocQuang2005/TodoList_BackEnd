const registerSchema = {
  type: "object",
  required: ["username", "password"],
  properties: {
    username: { type: "string", minLength: 3, maxLength: 50 },
    password: { type: "string", minLength: 6, maxLength: 255 },
    email: { type: "string", minLength: 6, maxLength: 255 },
  },
  additionalProperties: false, //không cho phép field ngoài
};
const loginSchema = {
  type: "object",
  required: ["username", "password"],
  properties: {
    username: {type: "string", minLength: 3, maxLength: 50},
    password: { type: "string", minLength: 6, maxLength: 255 },
    email: { type: "string", minLength: 6, maxLength: 255 },
  },
  additionalProperties: false, //không cho phép field ngoài
}
module.exports = { registerSchema, loginSchema };
