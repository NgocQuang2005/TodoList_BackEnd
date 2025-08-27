// schemas/userSchemas.js

// Chỉ update username
const updateUserSchema = {
  type: "object",
  properties: {
    username: { type: "string", minLength: 4, maxLength: 100 },
    email: { type: "string", minLength: 4, maxLength: 100 },
  },
  anyOf: [
    { required: ["username"] },
    { required: ["email"] }
  ],
  additionalProperties: false,
  minProperties: 1 
};

// Đổi mật khẩu
const changePasswordSchema = {
  type: "object",
  properties: {
    oldPassword: { type: "string", minLength: 8, maxLength: 100 },
    newPassword: { type: "string", minLength: 8, maxLength: 100 },
  },
  required: ["oldPassword", "newPassword"],
  additionalProperties: false,
};
// Yêu cầu gửi code reset password
const forgotPasswordSchema = {
  type: "object",
  properties: {
    email: { type: "string", minLength: 5, maxLength: 100 },
  },
  required: ["email"],
  additionalProperties: false,
};

// Xác nhận reset password bằng code
const resetPasswordSchema = {
  type: "object",
  properties: {
    email: { type: "string" },
    resetCode: { type: "string" },
    newPassword: { type: "string", minLength: 8, maxLength: 100 },
  },
  required: ["email", "resetCode", "newPassword"],
  additionalProperties: false,
};

module.exports = { updateUserSchema, changePasswordSchema ,forgotPasswordSchema,resetPasswordSchema};
