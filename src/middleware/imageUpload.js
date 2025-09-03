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

// Helper function để đảm bảo ảnh luôn dưới 1MB
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

    // Đảm bảo ảnh luôn dưới 1MB với thuật toán tối ưu
    const resizedBuffer = await ensureImageUnder1MB(request.file.buffer);
    
    // Kiểm tra kết quả cuối cùng
    const finalSize = resizedBuffer.length;
    const maxSize = 1024 * 1024; // 1MB
    
    if (finalSize > maxSize) {
      console.warn(`Cảnh báo: Ảnh vẫn lớn hơn 1MB: ${(finalSize / 1024 / 1024).toFixed(2)}MB`);
    }

    await fs.writeFile(uploadPath, resizedBuffer);
    request.imageUrl = `/uploads/todos/${fileName}`;
    
    console.log(`✅ Ảnh đã lưu thành công: ${fileName}, size: ${(finalSize / 1024 / 1024).toFixed(2)}MB`);
  } catch (error) {
    throw new Error("Lỗi xử lý ảnh: " + error.message);
  }
};

module.exports = { upload, processImage };
