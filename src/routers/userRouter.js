const {
  updateUserSchema,
  changePasswordSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} = require("../schemas/userSchemas");
const userService = require("../services/userService");

async function userRouter(fastify, options) {
  fastify.get("/user-detail", {
    preHandler: [fastify.authenticate],
    handler: async (request, reply) => {
      const user = await userService.getUserLoginService(request.user.id);
      return user;
    },
  });
  fastify.put("/edit-user", {
    preHandler: [fastify.authenticate],
    schema: { body: updateUserSchema },
    handler: async (request, reply) => {
      try {
        const updatedUser = await userService.updateUserService(
          request.user.id, 
          request.body 
        );

        if (!updatedUser) {
          return reply.code(404).send({ message: "User not found" });
        }

        return updatedUser;
      } catch (err) {
        request.log.error(err);
        return reply.code(500).send({ message: "Update user failed" });
      }
    },
  });

  // Change password
  fastify.put("/change-password", {
    preHandler: [fastify.authenticate],
    schema: { body: changePasswordSchema },
    handler: async (request, reply) => {
      const { oldPassword, newPassword } = request.body;
      try {
        await userService.changePasswordService(
          request.user.id,
          oldPassword,
          newPassword
        );
        return { message: "Password changed successfully" };
      } catch (err) {
        return reply.code(400).send({ message: err.message });
      }
    },
  });
  // Gửi code reset password
  fastify.post("/forgot-password", {
    schema: { body: forgotPasswordSchema },
    handler: async (request, reply) => {
      const { email } = request.body;
      const success = await userService.forgotPasswordService(email);
      if (!success) {
        return reply.code(404).send({ message: "Email không tồn tại" });
      }
      return { message: "Reset code đã được gửi về email" };
    },
  });

  // Đặt lại mật khẩu bằng reset code
  fastify.post("/reset-password", {
    schema: { body: resetPasswordSchema },
    handler: async (request, reply) => {
      const { email, resetCode, newPassword } = request.body;
      const success = await userService.resetPasswordService(email, resetCode, newPassword);
      if (!success) {
        return reply.code(400).send({ message: "Reset code không hợp lệ" });
      }
      return { message: "Password đã được đổi thành công" };
    },
  });
}
module.exports = userRouter;
