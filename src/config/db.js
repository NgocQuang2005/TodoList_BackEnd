const knex = require("knex");
const knexConfig = require("../../knexfile");

const db = knex(knexConfig);
db.raw('SELECT 1')
  .then(() => console.log('✅ Kết nối SQL Server thành công!'))
  .catch(err => console.error('❌ Lỗi kết nối SQL Server:', err));
module.exports = db
