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

// Helper function đơn giản hóa - Client đã resize về 1MB
const processClientResizedImage = async (buffer) => {
  const originalSize = buffer.length;
  console.log(`Ảnh từ client: ${(originalSize / 1024 / 1024).toFixed(2)}MB`);
  
  // Client đã resize, chỉ cần convert sang JPEG với quality tốt
  const processedBuffer = await sharp(buffer)
    .jpeg({ quality: 90, progressive: true })
    .toBuffer();
    
  const finalSize = processedBuffer.length;
  console.log(`Ảnh sau xử lý: ${(finalSize / 1024 / 1024).toFixed(2)}MB`);
  
  // Nếu vẫn > 1MB (trường hợp hiếm), áp dụng compression nhẹ
  if (finalSize > 1024 * 1024) {
    const compressedBuffer = await sharp(buffer)
      .jpeg({ quality: 75, progressive: true })
      .toBuffer();
    
    console.log(`Ảnh sau nén: ${(compressedBuffer.length / 1024 / 1024).toFixed(2)}MB`);
    return compressedBuffer;
  }
  
  return processedBuffer;
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

    // Xử lý ảnh đã được client resize
    const processedBuffer = await processClientResizedImage(request.file.buffer);

    await fs.writeFile(uploadPath, processedBuffer);
    request.imageUrl = `/uploads/todos/${fileName}`;
    
    console.log(`✅ Ảnh đã lưu thành công: ${fileName}, size: ${(processedBuffer.length / 1024 / 1024).toFixed(2)}MB`);
  } catch (error) {
    throw new Error("Lỗi xử lý ảnh: " + error.message);
  }
};

module.exports = { upload, processImage };
