
import jwt from "jsonwebtoken";

// Xac minh JWT truoc khi cho phep truy cap API
export function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization;

  // Yeu cau token theo dinh dang Bearer
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      success: false,
      message: "Access token is required"
    });
  }

  const token = authHeader.slice(7);
  const jwtSecret = process.env.JWT_SECRET;

  // Kiem tra cau hinh khoa bi mat
  if (!jwtSecret) {
    console.error("JWT_SECRET is not configured");

    return res.status(500).json({
      success: false,
      message: "Server configuration error"
    });
  }

  try {
    // Xac minh chu ky va thoi han cua token
    const decoded = jwt.verify(token, jwtSecret);

    // Kiem tra ID nguoi dung trong token
    const uid = Number(decoded.sub);

    if (!Number.isInteger(uid) || uid <= 0) {
      return res.status(401).json({
        success: false,
        message: "Invalid access token"
      });
    }

    // Luu thong tin da xac minh de route su dung
    req.user = {
      uid: uid,
      username: decoded.username,
      role: decoded.role
    };

    return next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Access token has expired"
      });
    }

    return res.status(401).json({
      success: false,
      message: "Invalid access token"
    });
  }
}
