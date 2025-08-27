//db
const db = require("../config/db");
//mã hóa mật khẩu
const bcrypt = require("bcrypt");
//jwt
const jwt = require("../utils/jwt");
async function register(userData) {
  const { username, password, email } = userData;
  const existing = await db("Users").where({ username }).first();//check username không được trùng
  if (existing) throw new Error("Username already exists");
  const password_hash = await bcrypt.hash(password, 10);
  const [user] = await db("Users")
    .insert({ username, password_hash,email, created_at: new Date() })
    .returning(["id", "username","email"]);
  return user;
}
async function login(userData) {
    const { username, password } = userData;
    const user = await db("Users").where({ username }).first();
    if (!user) throw new Error("Invalid username or password");
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) throw new Error("Invalid username or password");
    const token = jwt.signToken({ id: user.id, username: user.username });
    return { token, user: { id: user.id, username: user.username , email: user.email} };
}
module.exports = {
  register,
  login,
};
