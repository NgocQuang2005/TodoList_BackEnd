// src/middleware/imageUpload.js - Auto resize to 1MB max
const sharp = require("sharp");
const path = require("path");
const fs = require("fs").promises;

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
        // Đây là file upload
        if (!part.mimetype.startsWith("image/")) {
          throw new Error("Chỉ cho phép upload file ảnh!");
        }
        const buffer = await part.toBuffer();
        if (!buffer || buffer.length === 0) {
          continue;
        }
        console.log(
          `File gốc nhận được: ${(buffer.length / 1024 / 1024).toFixed(2)}MB`
        );
        fileData = {
          buffer,
          mimetype: part.mimetype,
          filename: part.filename,
        };
      } else {
        // Đây là field thường
        body[part.fieldname] = part.value;
      }
    }
    if (fileData) {
      request.file = fileData;
    }
    request.body = body;
    console.log(
      "Upload parsed successfully:",
      request.file ? "Có file" : "Không có file",
      "Body fields:",
      request.body
    );
  } catch (error) {
    throw new Error("Lỗi upload file: " + error.message);
  }
};

// Helper function để tối ưu ảnh với binary search cho quality
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

const processImage = async (request, reply) => {
  if (
    !request.file ||
    !request.file.buffer ||
    request.file.buffer.length === 0
  ) {
    return;
  }
  try {
    const fileName = `todo_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}.jpg`;
    const uploadPath = path.join(
      process.cwd(),
      "public",
      "uploads",
      "todos",
      fileName
    );
    await fs.mkdir(path.dirname(uploadPath), { recursive: true });

    // Validate image
    try {
      await sharp(request.file.buffer).metadata();
    } catch (err) {
      throw new Error("File ảnh không hợp lệ");
    }

    const maxSizeInBytes = 1024 * 1024; // 1MB
    let resizedBuffer;
    
    // Thử với kích thước ban đầu
    let result = await optimizeImageSize(request.file.buffer, maxSizeInBytes, 200, 200);
    
    if (result.buffer && result.buffer.length <= maxSizeInBytes) {
      resizedBuffer = result.buffer;
    } else {
      // Nếu vẫn quá lớn, giảm kích thước và thử lại
      const sizes = [
        { width: 160, height: 160 },
        { width: 120, height: 120 },
        { width: 100, height: 100 }
      ];
      
      for (const size of sizes) {
        result = await optimizeImageSize(request.file.buffer, maxSizeInBytes, size.width, size.height);
        if (result.buffer && result.buffer.length <= maxSizeInBytes) {
          resizedBuffer = result.buffer;
          break;
        }
      }
      
      // Fallback cuối cùng
      if (!resizedBuffer) {
        resizedBuffer = await sharp(request.file.buffer)
          .resize(100, 100, { fit: "cover", position: "center" })
          .jpeg({ quality: 10, progressive: true })
          .toBuffer();
      }
    }

    await fs.writeFile(uploadPath, resizedBuffer);
    request.imageUrl = `/uploads/todos/${fileName}`;
  } catch (error) {
    throw new Error("Lỗi xử lý ảnh: " + error.message);
  }
};

module.exports = { upload, processImage };
