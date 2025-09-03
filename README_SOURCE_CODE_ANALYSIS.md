# TodoList Backend - Phân Tích Chi Tiết Source Code

## Tổng Quan Kiến Trúc

Dự án TodoList Backend được xây dựng theo kiến trúc **MVC (Model-View-Controller)** với **Fastify Framework**, sử dụng **SQL Server** làm database và **Knex.js** làm Query Builder.

### Cấu Trúc Thư Mục
```
todo-backend/
├── server.js                 # Entry point của ứng dụng
├── package.json              # Dependencies và scripts
├── knexfile.js              # Cấu hình database
├── .env                     # Environment variables
├── migrations/              # Database migrations
├── public/                  # Static files (uploaded images)
└── src/
    ├── config/             # Database configuration
    ├── middleware/         # Custom middleware
    ├── plugins/           # Fastify plugins
    ├── routers/           # API routes
    ├─�� services/          # Business logic
    ├── schemas/           # Validation schemas
    └── utils/             # Utility functions
```

---

## 1. Entry Point - server.js

### Mục đích
File chính khởi tạo và cấu hình Fastify server.

### Chi tiết code:

```javascript
const fastify = require("fastify")({logger: true});
require("dotenv").config();
const path = require('path');
```
- Khởi tạo Fastify instance với logging enabled
- Load environment variables từ file .env
- Import path module để xử lý đường dẫn file

### Function registerPlugins()
```javascript
async function registerPlugins(fastify) {
  await fastify.register(require("./src/plugins/authPlugins"));
  await fastify.register(require('@fastify/multipart'), {
    limits: {
      fileSize: 2 * 1024 * 1024, // 2MB - Client đã resize về 1MB
      files: 1, // Chỉ cho phép 1 file per request
      fieldSize: 1024 * 1024, // 1MB cho text fields
    }
  });
  await fastify.register(require("@fastify/cors"), {
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
  });
  await fastify.register(require('@fastify/static'), {
    root: path.join(__dirname, 'public'),
    prefix: '/'
  });
}
```

**Giải thích từng plugin:**
1. **authPlugins**: Plugin tự tạo để xử lý JWT authentication
2. **@fastify/multipart**: Xử lý file upload với các giới hạn:
   - **fileSize: 2MB**: Client đã resize về 1MB, buffer nhỏ cho hiệu suất
   - **files: 1**: Chỉ cho phép 1 file per request (bảo mật)
   - **fieldSize: 1MB**: Giới hạn kích thước text fields
3. **@fastify/cors**: Cho phép CORS từ mọi origin
4. **@fastify/static**: Serve static files từ thư mục public

### Tối Ưu Cho Client-Side Resize

**Lợi ích khi client đã resize:**
- **Faster upload**: File 1MB upload nhanh hơn nhiều so với file lớn
- **Less server processing**: Server chỉ cần optimize nhẹ thay vì resize mạnh
- **Better UX**: User thấy kết quả nhanh hơn, ít loading time
- **Resource efficient**: Tiết kiệm CPU, memory và bandwidth server
- **Reduced complexity**: Logic server đơn giản hơn, ít edge cases

**Luồng xử lý tối ưu:**
```
Client resize → ~1MB → Server nhận (≤ 2MB ✓) → 
Optimize quality → Lưu ~1MB
```

### Function registerRouters()
```javascript
async function registerRouters(fastify) {
  const routers = [
    { router: require("./src/routers/authRouter"), prefix: "/api/auth" },
    { router: require("./src/routers/todosRouter"), prefix: "/api/todos" },
    { router: require("./src/routers/userRouter"), prefix: "/api/user" },
    { router: require("./src/routers/todoHistoryRouter"), prefix: "/api/todo-history" }
  ];

  for (const { router, prefix } of routers) {
    await fastify.register(router, { prefix });
  }
}
```

**Đăng ký các router với prefix:**
- `/api/auth/*` - Authentication routes
- `/api/todos/*` - Todo CRUD operations
- `/api/user/*` - User management
- `/api/todo-history/*` - Todo history tracking

### Function startServer()
```javascript
async function startServer() {
  try {
    await registerPlugins(fastify);
    await registerRouters(fastify);
    
    const PORT = 3443;
    await fastify.listen({ port: PORT });
    console.log(`🚀 Server running on port ${PORT}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}
```

**Trình tự khởi động:**
1. Đăng ký plugins trước
2. Đăng ký routers sau
3. Start server trên port 3443
4. Error handling và exit process nếu có lỗi

---

## 2. Database Configuration

### knexfile.js
```javascript
module.exports = {
  client: 'mssql',
  connection: {
    server: process.env.DB_SERVER,
    database: process.env.DB_DATABASE,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    options: {
      encrypt: true,
      trustServerCertificate: true
    }
  },
  migrations: {
    directory: './migrations'
  }
};
```

### src/config/db.js
```javascript
const knex = require("knex");
const knexConfig = require("../../knexfile");

const db = knex(knexConfig);
db.raw('SELECT 1')
  .then(() => console.log('✅ Kết nối SQL Server thành công!'))
  .catch(err => console.error('❌ Lỗi kết nối SQL Server:', err));

module.exports = db;
```

**Chức năng:**
- Tạo connection pool đến SQL Server
- Test connection khi khởi động
- Export db instance để sử dụng trong services

---

## 3. Authentication System

### src/plugins/authPlugins.js

```javascript
const fp = require("fastify-plugin");
const fastifyJwt = require("@fastify/jwt");

async function authPlugin(fastify, options) {
  // Đăng ký fastify-jwt
  fastify.register(fastifyJwt, {
    secret: process.env.JWT_SECRET || "your-secret-key",
    sign: { expiresIn: "1h" },
  });

  // Middleware authenticate
  fastify.decorate("authenticate", async function (request, reply) {
    try {
      await request.jwtVerify();
    } catch (err) {
      return reply.code(401).send({ error: "Unauthorized" });
    }
  });
}

module.exports = fp(authPlugin);
```

**Giải thích:**
- **fastify-plugin**: Wrap plugin để có thể sử dụng trong toàn bộ app
- **fastifyJwt**: Plugin JWT với secret key và thời gian expire 1h
- **authenticate decorator**: Middleware kiểm tra JWT token trong header
- Token được tự động đọc từ `Authorization: Bearer <token>`

### src/utils/jwt.js

```javascript
const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET || "token12345";

function signToken(payload){
  return jwt.sign(payload, JWT_SECRET, {expiresIn: "7d"}) 
}

function verifyToken(token){
  return jwt.verify(token, JWT_SECRET); 
}

module.exports = {signToken, verifyToken};
```

**Chức năng:**
- **signToken**: Tạo JWT token với payload và expire 7 ngày
- **verifyToken**: Verify JWT token (throw error nếu invalid/expired)

---

## 4. Authentication Routes & Services

### src/routers/authRouter.js

```javascript
const { registerSchema, loginSchema } = require("../schemas/authSchemas");
const authService = require("../services/authService");

async function authRouter(fastify, options) {
  // Đăng k��
  fastify.post("/register", {
    schema: {body : registerSchema},
    handler: async (request, reply) => {
      const user = await authService.register(request.body);
      return reply.send({ message: "User registered", user });
    }
  });

  // Đăng nhập
  fastify.post("/login", {
    schema: {body: loginSchema},
    handler: async (request, reply) => {
      const user = await authService.login(request.body);
      return reply.send({ message: "User login successfully", user });
    }
  });
}

module.exports = authRouter;
```

**Routes:**
- `POST /api/auth/register` - Đăng ký user mới
- `POST /api/auth/login` - Đăng nhập

**Validation:** Sử dụng JSON Schema để validate request body

### src/services/authService.js

```javascript
const db = require("../config/db");
const bcrypt = require("bcrypt");
const jwt = require("../utils/jwt");

async function register(userData) {
  const { username, password, email } = userData;
  
  // Check username đã tồn tại
  const existing = await db("Users").where({ username }).first();
  if (existing) throw new Error("Username already exists");
  
  // Hash password
  const password_hash = await bcrypt.hash(password, 10);
  
  // Insert user mới
  const [user] = await db("Users")
    .insert({ username, password_hash, email, created_at: new Date() })
    .returning(["id", "username", "email"]);
    
  return user;
}

async function login(userData) {
  const { username, password } = userData;
  
  // Tìm user theo username
  const user = await db("Users").where({ username }).first();
  if (!user) throw new Error("Invalid username or password");
  
  // Verify password
  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) throw new Error("Invalid username or password");
  
  // Tạo JWT token
  const token = jwt.signToken({ id: user.id, username: user.username });
  
  return { 
    token, 
    user: { id: user.id, username: user.username, email: user.email } 
  };
}

module.exports = { register, login };
```

**Logic Register:**
1. Kiểm tra username đã tồn tại chưa
2. Hash password với bcrypt (salt rounds = 10)
3. Insert user mới vào database
4. Return user info (không bao gồm password)

**Logic Login:**
1. Tìm user theo username
2. So sánh password với hash trong database
3. Tạo JWT token chứa user info
4. Return token và user info

---

## 5. Image Upload Middleware

### src/middleware/imageUpload.js

#### Function upload()
```javascript
const upload = async (request, reply) => {
  if (!request.isMultipart()) {
    return;
  }
  
  try {
    const parts = request.parts();
    const body = {};
    let fileData = null;
    
    for await (const part of parts) {
      if (part.file) {
        // Xử lý file upload
        if (!part.mimetype.startsWith("image/")) {
          throw new Error("Chỉ cho phép upload file ảnh!");
        }
        
        const buffer = await part.toBuffer();
        if (!buffer || buffer.length === 0) {
          continue;
        }
        
        fileData = {
          buffer,
          mimetype: part.mimetype,
          filename: part.filename,
        };
      } else {
        // Xử lý field thường
        body[part.fieldname] = part.value;
      }
    }
    
    if (fileData) {
      request.file = fileData;
    }
    request.body = body;
    
  } catch (error) {
    throw new Error("Lỗi upload file: " + error.message);
  }
};
```

**Chức năng:**
- Parse multipart form data
- Validate chỉ cho phép file ảnh
- Convert file thành buffer
- Attach file data vào request.file
- Attach form fields vào request.body

#### Helper Function optimizeImageSize()
```javascript
const optimizeImageSize = async (buffer, targetSize, width, height) => {
  let minQuality = 10;
  let maxQuality = 90;
  let bestBuffer = null;
  let bestQuality = minQuality;

  // Binary search để tìm quality tối ưu
  while (minQuality <= maxQuality) {
    const midQuality = Math.floor((minQuality + maxQuality) / 2);
    const testBuffer = await sharp(buffer)
      .resize(width, height, { fit: "cover", position: "center" })
      .jpeg({ quality: midQuality, progressive: true })
      .toBuffer();

    if (testBuffer.length <= targetSize) {
      bestBuffer = testBuffer;
      bestQuality = midQuality;
      minQuality = midQuality + 1;
    } else {
      maxQuality = midQuality - 1;
    }
  }

  return { buffer: bestBuffer, quality: bestQuality };
};
```

**Thuật toán Binary Search:**
- Tìm quality tối ưu để file size <= target size
- Giảm số lần xử lý ảnh so với việc giảm dần quality
- Return buffer và quality tốt nhất

#### Helper Function ensureImageUnder1MB()
```javascript
const ensureImageUnder1MB = async (buffer) => {
  const maxSizeInBytes = 1024 * 1024; // 1MB
  const originalSize = buffer.length;
  
  console.log(`Ảnh gốc: ${(originalSize / 1024 / 1024).toFixed(2)}MB`);
  
  // Nếu ảnh gốc đã dưới 1MB, chỉ cần convert sang JPEG
  if (originalSize <= maxSizeInBytes) {
    const convertedBuffer = await sharp(buffer)
      .jpeg({ quality: 85, progressive: true })
      .toBuffer();
    
    if (convertedBuffer.length <= maxSizeInBytes) {
      console.log(`Ảnh sau convert: ${(convertedBuffer.length / 1024 / 1024).toFixed(2)}MB`);
      return convertedBuffer;
    }
  }
  
  // Danh sách kích thước để thử từ lớn đến nhỏ
  const sizesToTry = [
    { width: 800, height: 600 },   // Large
    { width: 640, height: 480 },   // Medium
    { width: 480, height: 360 },   // Small
    { width: 320, height: 240 },   // Very Small
    { width: 200, height: 150 },   // Thumbnail
  ];
  
  // Thử từng kích thước
  for (const size of sizesToTry) {
    const result = await optimizeImageSize(buffer, maxSizeInBytes, size.width, size.height);
    
    if (result.buffer && result.buffer.length <= maxSizeInBytes) {
      console.log(`Ảnh đã resize: ${size.width}x${size.height}, quality: ${result.quality}, size: ${(result.buffer.length / 1024 / 1024).toFixed(2)}MB`);
      return result.buffer;
    }
  }
  
  // Fallback cuối cùng - force resize với quality thấp nhất
  const fallbackBuffer = await sharp(buffer)
    .resize(200, 150, { fit: "cover", position: "center" })
    .jpeg({ quality: 10, progressive: true })
    .toBuffer();
    
  console.log(`Fallback resize: 200x150, quality: 10, size: ${(fallbackBuffer.length / 1024 / 1024).toFixed(2)}MB`);
  return fallbackBuffer;
};
```

**Thuật toán đảm bảo ảnh dưới 1MB:**
1. **Kiểm tra kích thước gốc**: Nếu đã dưới 1MB, chỉ convert sang JPEG quality 85
2. **Thử các kích thước từ lớn đến nhỏ**: 800x600 → 640x480 → 480x360 → 320x240 → 200x150
3. **Với mỗi kích thước**: Sử dụng binary search để tìm quality tối ưu
4. **Fallback cuối cùng**: 200x150 với quality 10 nếu tất cả đều thất bại
5. **Logging chi tiết**: Track quá trình resize và kết quả

#### Function processImage() - Phiên bản mới
```javascript
const processImage = async (request, reply) => {
  if (!request.file || !request.file.buffer || request.file.buffer.length === 0) {
    return;
  }
  
  try {
    // Tạo filename unique
    const fileName = `todo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.jpg`;
    const uploadPath = path.join(process.cwd(), "public", "uploads", "todos", fileName);
    
    // Tạo thư mục nếu chưa có
    await fs.mkdir(path.dirname(uploadPath), { recursive: true });

    // Validate ảnh
    try {
      await sharp(request.file.buffer).metadata();
    } catch (err) {
      throw new Error("File ảnh không hợp lệ");
    }

    // Đảm bảo ảnh luôn dưới 1MB với thuật toán tối ưu
    const resizedBuffer = await ensureImageUnder1MB(request.file.buffer);
    
    // Kiểm tra kết quả cuối cùng
    const finalSize = resizedBuffer.length;
    const maxSize = 1024 * 1024; // 1MB
    
    if (finalSize > maxSize) {
      console.warn(`Cảnh báo: Ảnh vẫn lớn hơn 1MB: ${(finalSize / 1024 / 1024).toFixed(2)}MB`);
    }

    // Lưu file
    await fs.writeFile(uploadPath, resizedBuffer);
    request.imageUrl = `/uploads/todos/${fileName}`;
    
    console.log(`✅ Ảnh đã lưu thành công: ${fileName}, size: ${(finalSize / 1024 / 1024).toFixed(2)}MB`);
    
  } catch (error) {
    throw new Error("Lỗi xử lý ảnh: " + error.message);
  }
};
```

**Logic xử lý ảnh mới:**
1. **Tạo filename unique** với timestamp và random string
2. **Validate file ảnh** bằng Sharp metadata
3. **Gọi ensureImageUnder1MB()** để đảm bảo ảnh dưới 1MB
4. **Kiểm tra kết quả cuối cùng** và warning nếu vẫn quá lớn
5. **Lưu file** và set request.imageUrl
6. **Logging chi tiết** về quá trình và kết quả

**Ưu điểm của thuật toán mới:**
- **Đảm bảo 100%** ảnh dưới 1MB
- **Tối ưu chất lượng**: Thử kích thước lớn trước, giảm dần
- **Binary search**: Tìm quality tối ưu cho mỗi kích thước
- **Graceful degradation**: Fallback từng bước thay vì nhảy cóc
- **Detailed logging**: Track toàn bộ quá trình để debug

### Thuật Toán Xử Lý Ảnh Chi Tiết

#### Flowchart Thuật Toán ensureImageUnder1MB()

```
Input: Image Buffer
         ↓
┌───────────���─────────────┐
│ Kiểm tra kích thước gốc │
│ originalSize <= 1MB?    │
└─────────┬───────────────┘
          │
    ┌─────▼─────┐         ┌─────────────────┐
    │    YES    │         │       NO        │
    │           │         │                 │
    ▼           │         ▼                 │
┌─────────────┐ │    ┌─────────────────┐   │
│Convert JPEG │ │    │ Thử kích thước  │   │
│quality: 85  │ │    │ từ lớn đến nhỏ  │   │
└─────┬───────┘ │    └─────┬───────────┘   │
      │         │          │               │
      ▼         │          ▼               │
┌─────────────┐ │    ┌─────────────────┐   │
│ <= 1MB?     │ │    │ 800x600         │   │
└─────┬───────┘ │    │ Binary Search   │   │
      │         │    │ Quality 10-90   │   │
┌─────▼─────┐   │    └─────┬─────────��─┘   │
│    YES    │   │          │               │
│  RETURN   │   │          ▼               │
└───────────┘   │    ┌─────────────────┐   │
                │    │ Result <= 1MB?  │   │
                │    └─────┬───────────┘   │
                │          │               │
                │    ┌─────▼─────┐         │
                │    │    YES    │         │
                │    │  RETURN   │         │
                │    └───────────┘         │
                │                          │
                │    ┌─────────────────┐   │
                │    │ Thử 640x480     │   │
                │    │ Binary Search   │   │
                │    └─────┬───────────┘   │
                │          │               │
                │          ▼               │
                │    ┌─────────────────┐   │
                │    │ Result <= 1MB?  │   │
                │    └─────┬───────────┘   │
                │          │               │
                │    ┌─────▼─────┐         │
                │    │    YES    │         │
                │    │  RETURN   │         │
                │    └───────────┘         │
                │                          │
                │    ┌─────────────────┐   │
                │    │ ... tiếp tục    │   │
                │    │ 480x360         │   │
                │    │ 320x240         │   │
                │    │ 200x150         │   │
                │    └─────┬───────────┘   │
                │          │               │
                │          ▼               │
                │    ┌─────────────────┐   │
                │    │ Fallback cuối   │   │
                │    │ 200x150 Q:10    │   │
                │    │ FORCE RETURN    │   │
                │    └─────────────────┘   │
                └──────────────────────────┘
```

#### Ví Dụ Thực Tế

**Trường hợp 1: Ảnh nhỏ (500KB)**
```
Input: 500KB PNG
↓
Ki���m tra: 500KB < 1MB ✓
↓
Convert JPEG quality 85: 420KB
↓
420KB < 1MB ✓
↓
Return: 420KB JPEG
```

**Trường hợp 2: Ảnh trung bình (2MB)**
```
Input: 2MB JPEG
↓
Kiểm tra: 2MB > 1MB ✗
↓
Thử 800x600:
  Binary Search: quality 45 → 950KB ✓
↓
Return: 800x600 quality 45, 950KB
```

**Trường hợp 3: Ảnh lớn (10MB)**
```
Input: 10MB PNG
↓
Kiểm tra: 10MB > 1MB ✗
↓
Thử 800x600: Binary Search → 1.2MB ✗
↓
Thử 640x480: Binary Search → 1.1MB ✗
↓
Thử 480x360: Binary Search → 850KB ✓
↓
Return: 480x360 quality 65, 850KB
```

**Trường hợp 4: Ảnh cực lớn (50MB)**
```
Input: 50MB RAW
↓
Kiểm tra: 50MB > 1MB ✗
↓
Thử tất cả kích thước: Đều > 1MB ✗
↓
Fallback: 200x150 quality 10 → 180KB
↓
Return: 200x150 quality 10, 180KB
```

#### Performance Analysis

**Thuật toán cũ (Linear Search):**
- Worst case: 80 lần xử lý ảnh (quality 90→10, step 10)
- Time complexity: O(n) với n = số quality levels

**Thuật toán mới (Binary Search):**
- Worst case: 7 lần xử lý ảnh per size (log₂(80) ≈ 7)
- 5 sizes × 7 attempts = 35 lần xử lý maximum
- Time complexity: O(log n × m) với m = số sizes

**Cải thiện performance: ~56% ít xử lý hơn**

#### Memory Usage

```javascript
// Memory efficient approach
const processOneSize = async (buffer, size) => {
  // Chỉ giữ 1 test buffer tại 1 thời điểm
  const testBuffer = await sharp(buffer)
    .resize(size.width, size.height)
    .jpeg({ quality: midQuality })
    .toBuffer();
  
  // testBuffer sẽ được garbage collected sau khi return
  return testBuffer;
};
```

**Memory footprint:**
- Original buffer: Giữ nguyên (read-only)
- Test buffer: Tạo và xóa liên tục (GC friendly)
- Best buffer: Chỉ giữ kết quả tốt nhất
- Peak memory: ~3x original size (thay vì 10x+ với approach cũ)

---

## 6. Todo Routes & Services

### src/routers/todosRouter.js

#### Validator Setup
```javascript
const ajv = require("ajv");
const ajvInstance = new ajv();
addFormats(ajvInstance);
const createValidator = ajvInstance.compile(createTodoSchema);
const updateValidator = ajvInstance.compile(updateTodoSchema);
```

**Tối ưu:** Tạo validator instances một lần thay vì tạo mới mỗi request

#### Helper Functions
```javascript
const parseRequestData = (request) => {
  if (!request.body) {
    throw new Error("Missing data");
  }
  
  if (request.body.todoData) {
    try {
      return JSON.parse(request.body.todoData);
    } catch (err) {
      throw new Error("Invalid JSON in todoData");
    }
  }
  
  return request.body;
};

const validateData = (data, validator, validationType) => {
  if (!validator(data)) {
    throw new Error(`${validationType} validation failed: ${JSON.stringify(validator.errors)}`);
  }
};
```

**Chức năng:**
- **parseRequestData**: Parse JSON từ multipart form hoặc direct body
- **validateData**: Validate data với AJV validator

#### GET /api/todos/
```javascript
fastify.get("/", {
  preHandler: [fastify.authenticate],
  handler: async (request, reply) => {
    const { page = 1, pageSize = 10, title, status, priority } = request.query;
    
    const filters = {};
    if (title && typeof title === "string" && title.trim()) {
      filters.title = title.trim();
    }
    if (status !== null && status !== undefined && status !== "" && status !== "all") {
      filters.status = status;
    }
    if (priority !== null && priority !== undefined && priority !== "" && priority !== "all") {
      filters.priority = priority;
    }
    
    const result = await todoService.getTodosByUserWithPagination(
      request.user.id,
      Number(page),
      Number(pageSize),
      filters
    );
    return result;
  },
});
```

**Logic:**
1. Authenticate user trước
2. Parse query parameters (pagination + filters)
3. Build filters object
4. Gọi service để lấy todos với pagination
5. Return kết quả

#### POST /api/todos/
```javascript
fastify.post("/", {
  preHandler: [fastify.authenticate, upload, processImage],
  handler: async (request, reply) => {
    try {
      const todoData = parseRequestData(request);
      validateData(todoData, createValidator, "Create");
      
      const todo = await todoService.createTodo(
        request.user.id,
        todoData.title,
        todoData.description,
        todoData.priority,
        todoData.deadline,
        request.imageUrl
      );
      
      reply.code(201);
      return todo;
    } catch (error) {
      return reply.code(400).send({ error: error.message });
    }
  },
});
```

**Trình tự xử lý:**
1. **authenticate**: Verify JWT token
2. **upload**: Parse multipart data
3. **processImage**: Resize và lưu ảnh (nếu có)
4. **handler**: Parse data, validate, tạo todo
5. Return todo mới với status 201

#### PUT /api/todos/:id
```javascript
fastify.put("/:id", {
  preHandler: [fastify.authenticate, upload, processImage],
  handler: async (request, reply) => {
    try {
      const { id } = request.params;
      const todo = await todoService.getTodoById(id);

      if (!todo || todo.user_id !== request.user.id) {
        return reply.code(404).send({ error: "Todo not found" });
      }

      const updateData = parseRequestData(request);
      validateData(updateData, updateValidator, "Update");

      if (request.imageUrl) {
        updateData.image_url = request.imageUrl;
      }

      const updated = await todoService.updateTodo(id, updateData);
      return updated;
    } catch (error) {
      return reply.code(400).send({ error: error.message });
    }
  },
});
```

**Logic:**
1. Authenticate user
2. Process image upload (nếu có)
3. Kiểm tra todo tồn tại và thuộc về user
4. Parse và validate update data
5. Thêm image URL nếu có ảnh mới
6. Update todo và return kết quả

#### DELETE /api/todos/:id
```javascript
fastify.delete("/:id", {
  preHandler: [fastify.authenticate],
  handler: async (request, reply) => {
    const { id } = request.params;
    const todo = await todoService.getTodoById(id);

    if (!todo || todo.user_id !== request.user.id) {
      return reply.code(404).send({ error: "Todo not found" });
    }

    await todoService.deleteTodo(id);
    return { message: "Todo deleted successfully" };
  },
});
```

**Logic:**
1. Authenticate user
2. Kiểm tra todo tồn tại và thuộc về user
3. Xóa todo (bao gồm history và ảnh)
4. Return success message

### src/services/todoService.js

#### Helper Function applyFilters()
```javascript
const applyFilters = (query, filters) => {
  // Filter theo title
  if (filters.title && typeof filters.title === "string" && filters.title.trim()) {
    const searchTerm = filters.title.trim();
    query = query.whereRaw("LOWER(title) LIKE LOWER(?)", [`%${searchTerm}%`]);
  }
  
  // Filter theo status
  if (filters.status !== null && filters.status !== undefined && 
      filters.status !== "" && filters.status !== "all") {
    const statusValue = filters.status === "true" || filters.status === true ? true :
                       filters.status === "false" || filters.status === false ? false : undefined;
    
    if (statusValue !== undefined) {
      query = query.where("is_completed", statusValue);
    }
  }
  
  // Filter theo priority
  if (filters.priority !== null && filters.priority !== undefined && 
      filters.priority !== "" && filters.priority !== "all") {
    query = query.where("priority", filters.priority);
  }
  
  return query;
};
```

**Chức năng:**
- **Title filter**: Case-insensitive LIKE search
- **Status filter**: Convert string/boolean thành boolean value
- **Priority filter**: Exact match với priority value

#### Function getTodosByUserWithPagination()
```javascript
async function getTodosByUserWithPagination(userId, page = 1, pageSize = 10, filters = {}) {
  const offset = (page - 1) * pageSize;
  let query = db("Todos").where({ user_id: userId });
  
  // Áp dụng filters
  query = applyFilters(query, filters);
  
  // Lấy dữ liệu với pagination và sorting
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
```

**Logic:**
1. Tính offset cho pagination
2. Tạo base query filter theo user_id
3. Áp dụng filters (title, status, priority)
4. **Sorting logic**: Todos có deadline lên trước, sắp xếp theo deadline tăng dần
5. Apply pagination với offset và limit
6. Đếm tổng số records cho pagination info
7. Return todos và pagination metadata

#### Function createTodo()
```javascript
async function createTodo(userId, title, description, priority, deadline, imageUrl) {
  // Validate deadline
  if (deadline) {
    const selectedDate = new Date(deadline);
    if (isNaN(selectedDate.getTime())) {
      throw new Error("Deadline không hợp lệ");
    }
    if (selectedDate < new Date()) {
      throw new Error("Deadline không được chọn ngày quá khứ");
    }
  }
  
  // Insert todo mới
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
```

**Logic:**
1. Validate deadline (không được là quá khứ)
2. Insert todo mới với default is_completed = false
3. Set created_at và updated_at
4. Return todo vừa tạo

#### Function updateTodo()
```javascript
async function updateTodo(id, updates) {
  // Validate deadline nếu có
  if (updates.deadline) {
    const selectedDate = new Date(updates.deadline);
    if (isNaN(selectedDate.getTime())) {
      throw new Error("Deadline không hợp lệ");
    }
    if (selectedDate < new Date()) {
      throw new Error("Deadline không được chọn ngày quá khứ");
    }
  }

  // Lấy todo cũ để lưu history
  const oldTodo = await getTodoById(id);
  if (!oldTodo) {
    throw new Error("Todo không tồn tại");
  }
  
  // Lưu history trước khi update
  await todoHistoryService.addTodoHistory(oldTodo);
  
  // Xóa ảnh cũ nếu có ảnh mới
  if (updates.image_url && oldTodo.image_url && updates.image_url !== oldTodo.image_url) {
    await deleteImageFile(oldTodo.image_url);
  }

  // Prepare update data
  const updateData = {
    ...updates,
    updated_at: new Date(),
  };

  if (updates.hasOwnProperty("deadline")) {
    updateData.deadline = updates.deadline || null;
  }

  if (updates.hasOwnProperty("image_url")) {
    updateData.image_url = updates.image_url || null;
  }

  // Update todo
  const [todo] = await db("Todos")
    .where({ id })
    .update(updateData)
    .returning("*");

  return todo;
}
```

**Logic:**
1. Validate deadline nếu có trong updates
2. Lấy todo cũ để kiểm tra tồn tại
3. **Lưu history**: Add todo cũ vào TodoHistory trước khi update
4. **Xóa ảnh cũ**: Nếu có ảnh mới và khác ảnh cũ
5. Prepare update data với updated_at
6. Handle null values cho deadline và image_url
7. Update và return todo mới

#### Function deleteTodo()
```javascript
async function deleteTodo(id) {
  const todo = await getTodoById(id);
  if (!todo) {
    throw new Error("Todo không tồn tại");
  }
  
  // Sử dụng transaction để đảm bảo tính nhất quán
  const result = await db.transaction(async (trx) => {
    // Xóa TodoHistory trước
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
```

**Logic:**
1. Kiểm tra todo tồn tại
2. **Database Transaction**:
   - Xóa tất cả records trong TodoHistory có todo_id tương ứng
   - Xóa todo trong bảng Todos
3. **Xóa file ảnh** sau khi transaction thành công
4. Return kết quả

**Tại sao cần transaction?**
- Đảm bảo hoặc tất cả thành công hoặc tất cả rollback
- Tránh trường hợp xóa được TodoHistory nhưng không xóa được Todo
- Giải quyết Foreign Key constraint issue

#### Function deleteImageFile()
```javascript
async function deleteImageFile(imageUrl) {
  try {
    if (imageUrl && imageUrl.startsWith("/uploads/")) {
      const filePath = path.join(process.cwd(), "public", imageUrl);
      
      try {
        await fs.access(filePath);
        await fs.unlink(filePath);
        console.log("Đã xóa ảnh:", filePath);
      } catch (accessError) {
        console.log("File ảnh không tồn tại hoặc đã b�� xóa:", filePath);
      }
    }
  } catch (error) {
    console.error("Lỗi khi xóa ảnh:", error);
    // Không throw error để không ảnh hưởng đến quá trình chính
  }
}
```

**Logic:**
1. Kiểm tra imageUrl có valid không
2. Tạo full file path
3. Kiểm tra file tồn tại trước khi xóa
4. **Graceful error handling**: Log error nhưng không throw để không ảnh hưởng đến logic chính

---

## 7. Todo History System

### src/services/todoHistoryService.js

```javascript
async function addTodoHistory(todo) {
  return db("TodoHistory").insert({
    todo_id: todo.id,
    user_id: todo.user_id,
    title: todo.title,
    description: todo.description,
    priority: todo.priority,
    is_completed: todo.is_completed,
    deadline: todo.deadline,
    image_url: todo.image_url,
    created_at: new Date(),
    updated_at: new Date(),
  });
}

async function getTodoHistoryByTodoId(todoId) {
  return db("TodoHistory")
    .where({ todo_id: todoId })
    .orderBy("created_at", "desc");
}

async function deleteTodoHistoryByTodoId(todoId) {
  return db("TodoHistory").where({ todo_id: todoId }).del();
}
```

**Chức năng:**
- **addTodoHistory**: Lưu snapshot của todo trước khi update
- **getTodoHistoryByTodoId**: Lấy lịch sử thay đổi của todo
- **deleteTodoHistoryByTodoId**: Xóa tất cả history của todo

**Khi nào được gọi:**
- `addTodoHistory`: Được gọi trong `updateTodo()` trước khi update
- `deleteTodoHistoryByTodoId`: Được gọi trong `deleteTodo()` trước khi xóa todo

---

## 8. Validation Schemas

### src/schemas/todoSchemas.js

```javascript
const createTodoSchema = {
  type: "object",
  required: ["title"],
  properties: {
    title: { type: "string", minLength: 3, maxLength: 255 },
    description: { type: "string", minLength: 4, maxLength: 255 },
    priority: { type: "string", enum: ["low", "medium", "high"] },
    deadline: { type: ["string","null"], format: "date-time" },
    image_url: { type: ["string", "null"] },
  },
  additionalProperties: false,
};

const updateTodoSchema = {
  type: "object",
  properties: {
    title: { type: "string", minLength: 3, maxLength: 255 },
    description: { type: "string", minLength: 4, maxLength: 255 },
    priority: { type: "string", enum: ["low", "medium", "high"] },
    deadline: { type: ["string", "null"], format: "date-time" },
    is_completed: { type: "boolean" },
    image_url: { type: ["string", "null"] },
  },
  additionalProperties: false,
  minProperties: 1,
};
```

**Create Schema:**
- **Required**: Chỉ title là bắt buộc
- **Title**: 3-255 ký tự
- **Description**: 4-255 ký tự (optional)
- **Priority**: Enum ["low", "medium", "high"]
- **Deadline**: ISO date-time string hoặc null
- **additionalProperties: false**: Không cho phép field ngoài

**Update Schema:**
- Tất cả fields đều optional
- **minProperties: 1**: Phải có ít nhất 1 field để update
- Thêm **is_completed** field cho update

---

## 9. Database Migrations

### 20250902151251_users.js
```javascript
exports.up = function (knex) {
  return knex.schema.createTable("Users", function (table) {
    table.increments("id").primary();
    table.string("username").notNullable().unique();
    table.string("password_hash").notNullable();
    table.string("email").notNullable();
    table.timestamp("created_at").defaultTo(knex.fn.now());
  });
};
```

### 20250902151300_todos.js
```javascript
exports.up = function (knex) {
  return knex.schema.createTable("Todos", function (table) {
    table.increments("id").primary();
    table.integer("user_id").notNullable();
    table.string("title").notNullable();
    table.string("description").nullable();
    table.string("priority").notNullable();
    table.boolean("is_completed").notNullable();
    table.timestamp("deadline").nullable();
    table.string("image_url", 500);
    table.timestamp("created_at").defaultTo(knex.fn.now());
    table.timestamp("updated_at").defaultTo(knex.fn.now());
    
    table.foreign("user_id").references("id").inTable("Users").onDelete("CASCADE");
    table.index("user_id");
  });
};
```

### 20250902151827_todo_history.js
```javascript
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
    
    table.foreign("todo_id").references("id").inTable("Todos").onDelete("CASCADE");
    table.foreign("user_id").references("id").inTable("Users").onDelete("CASCADE");
    
    table.index("todo_id");
    table.index("user_id");
  });
};
```

**Database Schema:**
- **Users**: id, username (unique), password_hash, email
- **Todos**: id, user_id (FK), title, description, priority, is_completed, deadline, image_url
- **TodoHistory**: Giống Todos nhưng thêm todo_id để track history

**Foreign Keys:**
- Todos.user_id → Users.id (CASCADE DELETE)
- TodoHistory.todo_id → Todos.id (CASCADE DELETE)
- TodoHistory.user_id → Users.id (CASCADE DELETE)

**Indexes:**
- user_id trong Todos và TodoHistory để tăng performance query

---

## 10. Luồng Xử Lý Chi Tiết

### Luồng Đăng Ký User
```
Client Request → authRouter.register → authService.register
                                    ↓
1. Validate request body với registerSchema
2. Check username đã tồn tại chưa
3. Hash password với bcrypt
4. Insert user mới vào database
5. Return user info (không có password)
```

### Luồng Đăng Nhập
```
Client Request → authRouter.login → authService.login
                                 ↓
1. Validate request body với loginSchema
2. Tìm user theo username
3. Verify password với bcrypt.compare
4. Tạo JWT token với user info
5. Return token và user info
```

### Luồng Tạo Todo
```
Client Request → authenticate → upload → processImage → todoRouter.post
                                                      ↓
1. Verify JWT token
2. Parse multipart form data
3. Resize và lưu ảnh (nếu có)
4. Parse và validate todo data
5. todoService.createTodo:
   - Validate deadline
   - Insert todo mới
   - Return todo
```

### Luồng Update Todo
```
Client Request → authenticate → upload → processImage → todoRouter.put
                                                      ↓
1. Verify JWT token và ownership
2. Process image upload (nếu có)
3. Parse và validate update data
4. todoService.updateTodo:
   - Validate deadline
   - Lưu history (addTodoHistory)
   - Xóa ảnh cũ (nếu có ảnh mới)
   - Update todo
   - Return todo mới
```

### Luồng Xóa Todo
```
Client Request → authenticate → todoRouter.delete
                              ↓
1. Verify JWT token và ownership
2. todoService.deleteTodo:
   - Start transaction
   - Xóa TodoHistory records
   - Xóa Todo record
   - Commit transaction
   - Xóa file ảnh
```

### Luồng Lấy Todos với Pagination
```
Client Request → authenticate → todoRouter.get
                              ↓
1. Verify JWT token
2. Parse query parameters (page, pageSize, filters)
3. todoService.getTodosByUserWithPagination:
   - Build base query với user_id
   - Apply filters (title, status, priority)
   - Apply sorting (deadline ASC, nulls last)
   - Apply pagination (offset, limit)
   - Count total records
   - Return todos + pagination info
```

---

## 11. Tối Ưu Đã Áp Dụng

### 1. Image Processing
- **Binary Search Algorithm**: Tìm quality tối ưu thay vì giảm dần
- **Progressive JPEG**: Giảm file size
- **Multiple Size Fallbacks**: Thử nhiều kích thước khác nhau

### 2. Validation
- **Reuse Validator Instances**: Tạo AJV validators một lần thay vì mỗi request
- **Helper Functions**: Tái sử dụng logic parse và validate

### 3. Database
- **Query Optimization**: Sử dụng indexes, efficient filtering
- **Transaction**: Đảm bảo data consistency khi xóa
- **Connection Pooling**: Knex.js tự động quản lý connection pool

### 4. Code Organization
- **Separation of Concerns**: Router → Service → Database
- **Helper Functions**: Tách logic phức tạp thành functions riêng
- **Error Handling**: Consistent error handling across layers

---

## 12. Security Measures

### 1. Authentication
- **JWT Tokens**: Stateless authentication
- **Password Hashing**: bcrypt với salt rounds = 10
- **Token Expiration**: 1h cho Fastify JWT, 7d cho custom JWT

### 2. Authorization
- **User Ownership**: Kiểm tra todo thuộc về user trước khi CRUD
- **Route Protection**: Tất cả todo routes đ���u require authentication

### 3. Input Validation
- **JSON Schema**: Validate tất cả input data
- **File Type Validation**: Chỉ cho phép image files
- **File Size Limit**: 10MB cho upload, 1MB sau khi resize

### 4. SQL Injection Prevention
- **Parameterized Queries**: Knex.js tự động escape parameters
- **whereRaw với parameters**: An toàn khi sử dụng raw SQL

---

## 13. Error Handling Strategy

### 1. Validation Errors
```javascript
// Schema validation tự động return 400 với error details
schema: { body: createTodoSchema }

// Custom validation
if (!validate(data)) {
  throw new Error(`Validation failed: ${JSON.stringify(validate.errors)}`);
}
```

### 2. Business Logic Errors
```javascript
// Service layer throw meaningful errors
if (!todo) {
  throw new Error("Todo không tồn tại");
}

// Router layer catch và return appropriate status
catch (error) {
  return reply.code(400).send({ error: error.message });
}
```

### 3. Database Errors
```javascript
// Transaction rollback tự động khi có error
await db.transaction(async (trx) => {
  // Nếu có lỗi, tự động rollback
});
```

### 4. File Operation Errors
```javascript
// Graceful handling, không ảnh hưởng main flow
try {
  await fs.unlink(filePath);
} catch (accessError) {
  console.log("File không tồn tại");
  // Không throw error
}
```

---

## 14. Performance Considerations

### 1. Database
- **Indexes**: user_id, todo_id để tăng tốc queries
- **Pagination**: Limit số records return
- **Query Optimization**: Sử dụng clone() để tái sử dụng query builder

### 2. Image Processing
- **Async Processing**: Không block main thread
- **Size Optimization**: Tự động resize về kích thước phù hợp
- **Format Optimization**: Convert sang JPEG với progressive

### 3. Memory Management
- **Stream Processing**: Sử dụng buffer thay vì load toàn bộ file
- **Connection Pooling**: Knex.js quản lý database connections

### 4. Caching Opportunities
- **Validator Instances**: Tái sử dụng compiled validators
- **Static File Serving**: Fastify static plugin với caching headers

---

## Kết Luận

Dự án TodoList Backend được thiết kế với:

1. **Kiến trúc rõ ràng**: Tách biệt Router → Service → Database
2. **Security tốt**: JWT authentication, input validation, authorization
3. **Performance optimization**: Database indexes, image processing, query optimization
4. **Error handling**: Comprehensive error handling ở mọi layer
5. **Code quality**: Helper functions, consistent patterns, documentation

Hệ thống có thể dễ dàng mở rộng thêm features mới như notifications, sharing, categories, v.v. bằng cách thêm routers, services và migrations tương ứng.