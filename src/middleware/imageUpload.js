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
    let metadata;
    try {
      metadata = await sharp(request.file.buffer).metadata();
    } catch (err) {
      throw new Error("File ảnh không hợp lệ");
    }

    let resizedBuffer;
    let currentQuality = 90;
    let currentWidth = 200;
    let currentHeight = 200;
    const maxSizeInBytes = 1024 * 1024; // 1MB

    resizedBuffer = await sharp(request.file.buffer)
      .resize(currentWidth, currentHeight, { fit: "cover", position: "center" })
      .jpeg({ quality: currentQuality, progressive: true })
      .toBuffer();

    while (resizedBuffer.length > maxSizeInBytes && currentQuality > 10) {
      currentQuality -= 10;
      resizedBuffer = await sharp(request.file.buffer)
        .resize(currentWidth, currentHeight, {
          fit: "cover",
          position: "center",
        })
        .jpeg({ quality: currentQuality, progressive: true })
        .toBuffer();
    }

    while (resizedBuffer.length > maxSizeInBytes && currentWidth > 100) {
      currentWidth = Math.floor(currentWidth * 0.8);
      currentHeight = Math.floor(currentHeight * 0.8);
      currentQuality = 70;

      resizedBuffer = await sharp(request.file.buffer)
        .resize(currentWidth, currentHeight, {
          fit: "cover",
          position: "center",
        })
        .jpeg({ quality: currentQuality, progressive: true })
        .toBuffer();

      while (resizedBuffer.length > maxSizeInBytes && currentQuality > 10) {
        currentQuality -= 10;
        resizedBuffer = await sharp(request.file.buffer)
          .resize(currentWidth, currentHeight, {
            fit: "cover",
            position: "center",
          })
          .jpeg({ quality: currentQuality, progressive: true })
          .toBuffer();
      }
    }

    if (resizedBuffer.length > maxSizeInBytes) {
      resizedBuffer = await sharp(request.file.buffer)
        .resize(Math.max(currentWidth, 100), Math.max(currentHeight, 100), {
          fit: "cover",
          position: "center",
        })
        .jpeg({ quality: 10, progressive: true })
        .toBuffer();
    }

    await fs.writeFile(uploadPath, resizedBuffer);

    request.imageUrl = `/uploads/todos/${fileName}`;
  } catch (error) {
    throw new Error("Lỗi xử lý ảnh: " + error.message);
  }
};

module.exports = { upload, processImage };
