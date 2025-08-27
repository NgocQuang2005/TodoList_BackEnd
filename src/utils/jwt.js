//Dùng để tạo & verify token.
const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET || "token12345";
// Tạo token
function signToken(payload){
  return jwt.sign(payload, JWT_SECRET, {expiresIn: "7d"}) 
}
// Xác thực token
function verifyToken(token){
  // jwt.verify sẽ tự throw lỗi nếu expired hoặc invalid
  return jwt.verify(token, JWT_SECRET); 
}
module.exports = {signToken, verifyToken}  