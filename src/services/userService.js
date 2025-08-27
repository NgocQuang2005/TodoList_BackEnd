const db = require("../config/db");
const bcrypt = require("bcrypt");
const { sendEmail } = require("../utils/email");

async function getUserLoginService(userId) {
  return db("Users")
    .select("id", "username", "created_at", "updated_at")
    .where({ id: userId })
    .first();
}
async function updateUserService(userId, data) {
  const updateData = {
    updated_at: new Date(),
  };
  if (data.username) {
    updateData.username = data.username;
  }
  if (data.email) {
    updateData.email = data.email;
  }
  const [user] = await db("Users")
    .where({ id: userId })
    .update(updateData)
    .returning(["id", "username", "email", "created_at", "updated_at"]);

  return user;
}

async function changePasswordService(userId, oldPassword, newPassword) {
  const user = await db("Users").where({ id: userId }).first();
  if (!user) return null;

  const isMatch = await bcrypt.compare(oldPassword, user.password_hash);
  if (!isMatch) {
    throw new Error("Mật khẩu cũ không chính xác");
  }

  const salt = await bcrypt.genSalt(10);
  const newHash = await bcrypt.hash(newPassword, salt);

  const [updatedUser] = await db("Users")
    .where({ id: userId })
    .update({ password_hash: newHash, updated_at: new Date() })
    .returning(["id", "username", "email", "created_at", "updated_at"]);

  return updatedUser;
}

// Gửi mã reset về email
async function forgotPasswordService(email) {
  const user = await db("Users").where({ email }).first();
  if (!user) return null;

  // tạo mã reset ngẫu nhiên (6 số)
  const resetCode = Math.floor(100000 + Math.random() * 900000).toString();

  await db("Users")
    .where({ id: user.id })
    .update({ reset_code: resetCode, updated_at: new Date() });

  await sendEmail(
    email,
    "Password Reset Code",
    `Mã đặt lại mật khẩu của bạn là: ${resetCode}`
  );

  return true;
}

// Đổi mật khẩu bằng mã reset
async function resetPasswordService(email, resetCode, newPassword) {
  const user = await db("Users").where({ email, reset_code: resetCode }).first();
  if (!user) return null;

  const salt = await bcrypt.genSalt(10);
  const newHash = await bcrypt.hash(newPassword, salt);

  await db("Users")
    .where({ id: user.id })
    .update({ password_hash: newHash, reset_code: null, updated_at: new Date() });

  return true;
} 
module.exports = {
  getUserLoginService,
  updateUserService,
  changePasswordService,
  forgotPasswordService,
  resetPasswordService,
};
