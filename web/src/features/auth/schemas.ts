import { z } from "zod";

export const loginSchema = z.object({
  username: z
    .string()
    .trim()
    .min(1, "Vui lòng nhập tên đăng nhập."),

  password: z
    .string()
    .min(1, "Vui lòng nhập mật khẩu."),
});

export type LoginFormValues = z.infer<typeof loginSchema>;

export const changePasswordSchema = z
  .object({
    old_password: z.string().min(1, "Vui lòng nhập mật khẩu hiện tại."),
    new_password: z.string().min(8, "Mật khẩu mới phải có ít nhất 8 ký tự."),
    confirm_password: z.string().min(1, "Vui lòng nhập lại mật khẩu mới."),
  })
  .refine((data) => data.new_password === data.confirm_password, {
    path: ["confirm_password"],
    message: "Mật khẩu nhập lại không khớp.",
  });

export type ChangePasswordFormValues = z.infer<typeof changePasswordSchema>;