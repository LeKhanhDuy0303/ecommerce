import { Router } from "express";
import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma.js";
import jwt from "jsonwebtoken";

const router = Router();

// POST /auth/register - Đăng ký tài khoản
router.post("/register", async (req, res) => {
  try {
    const { username, fullname, password } = req.body ?? {};

    // Kiểm tra username
    if (
      typeof username !== "string" ||
      !username.trim() ||
      username.trim().length > 50
    ) {
      return res.status(400).json({
        success: false,
        message: "Username is required and must not exceed 50 characters"
      });
    }

    // Kiểm tra họ tên
    if (
      typeof fullname !== "string" ||
      !fullname.trim() ||
      fullname.trim().length > 100
    ) {
      return res.status(400).json({
        success: false,
        message: "Full name is required and must not exceed 100 characters"
      });
    }

    // Kiểm tra mật khẩu
    if (typeof password !== "string" || password.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must contain at least 8 characters"
      });
    }

    const normalizedUsername = username.trim();

    // Kiểm tra username đã tồn tại chưa
    const existingUser = await prisma.user.findUnique({
      where: { username: normalizedUsername },
      select: { uid: true }
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "Username already exists"
      });
    }

    // Lấy vai trò và hạng thành viên mặc định
    const role = await prisma.role.findFirst({
  where: { rolename: "normal" }
  });

    const membership = await prisma.membership.findFirst({
      where: { mname: "Basic" }
    });

    if (!role || !membership) {
      console.error("Default USER role or Basic membership is missing");

      return res.status(500).json({
        success: false,
        message: "Account configuration is incomplete"
      });
    }

    // Băm mật khẩu trước khi lưu
    const hashedPassword = await bcrypt.hash(password, 12);

    // Tạo tài khoản và chỉ trả về dữ liệu công khai
    const user = await prisma.user.create({
      data: {
        username: normalizedUsername,
        fullname: fullname.trim(),
        password: hashedPassword,
        role: {
          connect: { roleid: role.roleid }
        },
        membership: {
          connect: { mid: membership.mid }
        }
      },
      select: {
        uid: true,
        username: true,
        fullname: true,
        role: {
          select: {
            rolename: true
          }
        },
        membership: {
          select: {
            mname: true,
            score: true
          }
        }
      }
    });

    return res.status(201).json({
      success: true,
      message: "Registration successful",
      data: user
    });
  } catch (error) {
    console.error("Registration error:", error.message);

    // Xử lý trường hợp username bị trùng do request đồng thời
    if (error.code === "P2002") {
      return res.status(409).json({
        success: false,
        message: "Username already exists"
      });
    }

    return res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
});


/* POST /auth/login - Dang nhap va tao JWT */
router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body ?? {};

    // Kiem tra du lieu dau vao
    if (
      typeof username !== "string" ||
      !username.trim() ||
      typeof password !== "string" ||
      !password
    ) {
      return res.status(400).json({
        success: false,
        message: "Username and password are required"
      });
    }

    // Kiem tra JWT_SECRET
    const jwtSecret = process.env.JWT_SECRET;

    if (!jwtSecret) {
      console.error("JWT_SECRET is not configured");

      return res.status(500).json({
        success: false,
        message: "Server configuration error"
      });
    }

    // Tim tai khoan trong database
    const user = await prisma.user.findUnique({
      where: {
        username: username.trim()
      },
      select: {
        uid: true,
        username: true,
        fullname: true,
        password: true,
        role: {
          select: {
            rolename: true
          }
        },
        membership: {
          select: {
            mname: true,
            score: true
          }
        }
      }
    });

    // Neu tai khoan khong ton tai
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid username or password"
      });
    }

    // So sanh mat khau voi mat khau da bam trong database
    const passwordMatched = await bcrypt.compare(
      password,
      user.password
    );

    if (!passwordMatched) {
      return res.status(401).json({
        success: false,
        message: "Invalid username or password"
      });
    }

    // Tao JWT sau khi dang nhap thanh cong
    const expiresIn = process.env.JWT_EXPIRES_IN || "1d";

    const token = jwt.sign(
      {
        username: user.username,
        role: user.role.rolename
      },
      jwtSecret,
      {
        subject: String(user.uid),
        expiresIn: expiresIn
      }
    );

    // Chi tra ve thong tin cong khai, khong tra password
    return res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
        token: token,
        tokenType: "Bearer",
        expiresIn: expiresIn,
        user: {
          uid: user.uid,
          username: user.username,
          fullname: user.fullname,
          role: user.role,
          membership: user.membership
        }
      }
    });
  } catch (error) {
    console.error("Login error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
});


export default router;
