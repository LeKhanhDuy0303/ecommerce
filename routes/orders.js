import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { authenticateToken } from "../middleware/auth.js";

const router = Router();

function createHttpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

// POST /orders - Tạo đơn hàng, yêu cầu JWT
router.post("/", authenticateToken, async (req, res) => {
  const items = req.body?.items;

  // Kiểm tra danh sách sản phẩm
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({
      success: false,
      message: "Order items are required"
    });
  }

  // pid và qty phải là số nguyên dương
  const invalidItems = items.some(
    (item) =>
      !item ||
      !Number.isInteger(item.pid) ||
      item.pid <= 0 ||
      !Number.isInteger(item.qty) ||
      item.qty <= 0
  );

  if (invalidItems) {
    return res.status(400).json({
      success: false,
      message: "Each item must have a valid pid and positive qty"
    });
  }

  const productIds = items.map((item) => item.pid);

  // ERD sử dụng khóa chính ghép (oid, pid).
  // Không cho một sản phẩm xuất hiện nhiều lần trong cùng đơn hàng.
  if (new Set(productIds).size !== productIds.length) {
    return res.status(400).json({
      success: false,
      message: "Duplicate products are not allowed in one order"
    });
  }

  try {
    const order = await prisma.$transaction(async (tx) => {
      // Đảm bảo tài khoản từ JWT vẫn tồn tại
      const user = await tx.user.findUnique({
        where: { uid: req.user.uid },
        select: { uid: true }
      });

      if (!user) {
        throw createHttpError(401, "User account no longer exists");
      }

      // Đọc thông tin và tồn kho các sản phẩm
      const products = await tx.product.findMany({
        where: {
          pid: { in: productIds }
        },
        select: {
          pid: true,
          pname: true,
          price: true,
          quantity: true
        }
      });

      if (products.length !== items.length) {
        throw createHttpError(
          404,
          "One or more products were not found"
        );
      }

      const productMap = new Map(
        products.map((product) => [product.pid, product])
      );

      // Kiểm tra tồn kho trước khi tạo đơn hàng
      for (const item of items) {
        const product = productMap.get(item.pid);

        if (product.quantity < item.qty) {
          throw createHttpError(
            409,
            `Insufficient stock for product ${product.pname}`
          );
        }
      }

      // Trừ tồn kho có điều kiện để tránh số lượng âm
      for (const item of items) {
        const updated = await tx.product.updateMany({
          where: {
            pid: item.pid,
            quantity: { gte: item.qty }
          },
          data: {
            quantity: { decrement: item.qty }
          }
        });

        if (updated.count !== 1) {
          throw createHttpError(
            409,
            `Insufficient stock for product ${item.pid}`
          );
        }
      }

      // Tạo Order: createat được database tự động thiết lập
      const newOrder = await tx.order.create({
        data: {
          uid: user.uid
        }
      });

      // Tạo OrderDetail với giá tại thời điểm đặt hàng
      await tx.orderDetail.createMany({
        data: items.map((item) => ({
          oid: newOrder.oid,
          pid: item.pid,
          qty: item.qty,
          unit_price: productMap.get(item.pid).price
        }))
      });

      // Tạo Shipment sau khi tạo đơn và chi tiết đơn
      await tx.shipment.create({
        data: {
          oid: newOrder.oid,
          status: "Pending"
        }
      });

      // Trả về đơn hàng kèm chi tiết và Shipment
      return tx.order.findUnique({
        where: { oid: newOrder.oid },
        include: {
          orderDetails: {
            include: {
              product: {
                select: {
                  pid: true,
                  pname: true,
                  price: true
                }
              }
            }
          },
          shipments: true
        }
      });
    });

    return res.status(201).json({
      success: true,
      message: "Order placed successfully",
      data: order
    });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({
        success: false,
        message: error.message
      });
    }

    console.error("Create order error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
});

export default router;