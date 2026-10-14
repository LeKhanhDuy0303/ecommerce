import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import { prisma } from "./lib/prisma.js";
import productRoutes from "./routes/products.js";
import authRoutes from "./routes/auth.js";
import orderRoutes from "./routes/orders.js";

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(helmet());
app.use(cors());
app.use(express.json());

// Health check: kiểm tra Express và PostgreSQL
app.get("/health", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;

    return res.status(200).json({
      status: "ok",
      service: "ecommerce-api",
      database: "connected",
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("Health check database error:", error.message);

    return res.status(503).json({
      status: "error",
      service: "ecommerce-api",
      database: "disconnected",
      timestamp: new Date().toISOString()
    });
  }
});
app.use("/products", productRoutes);
app.use("/auth", authRoutes);
app.use("/orders", orderRoutes);
// Trả về 404 cho endpoint không tồn tại
app.use((_req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found"
  });
});

const server = app.listen(PORT, () => {
  console.log(`E-commerce API running on port ${PORT}`);
});

// Đóng kết nối database khi dừng server
async function shutdown() {
  console.log("Shutting down E-commerce API...");

  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);