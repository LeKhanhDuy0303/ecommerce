import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { authenticateToken } from "../middleware/auth.js";

const router = Router();

// POST /products - Thêm sản phẩm
router.post("/", authenticateToken, async (req, res) => {
  try {
    const { pname, price, quantity } = req.body ?? {};

    if (typeof pname !== "string" || !pname.trim()) {
      return res.status(400).json({
        success: false,
        message: "Product name is required"
      });
    }

    if (
      price === undefined ||
      price === null ||
      price === "" ||
      !Number.isFinite(Number(price)) ||
      Number(price) < 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Price must be a valid non-negative number"
      });
    }

    if (
      quantity === undefined ||
      quantity === null ||
      !Number.isInteger(Number(quantity)) ||
      Number(quantity) < 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Quantity must be a non-negative integer"
      });
    }

    const product = await prisma.product.create({
      data: {
        pname: pname.trim(),
        price: Number(price),
        quantity: Number(quantity)
      }
    });

    return res.status(201).json({
      success: true,
      data: product
    });
  } catch (error) {
    console.error("Create product error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
});

// GET /products - Xem danh sách sản phẩm
router.get("/", async (_req, res) => {
  try {
    const products = await prisma.product.findMany({
      orderBy: { pid: "asc" }
    });

    return res.status(200).json({
      success: true,
      data: products
    });
  } catch (error) {
    console.error("Get products error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
});

// GET /products/:pid - Xem chi tiết sản phẩm
router.get("/:pid", async (req, res) => {
  try {
    const pid = Number(req.params.pid);

    if (!Number.isSafeInteger(pid) || pid <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID"
      });
    }

    const product = await prisma.product.findUnique({
      where: { pid }
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found"
      });
    }

    return res.status(200).json({
      success: true,
      data: product
    });
  } catch (error) {
    console.error("Get product error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
});

// PUT /products/:pid - Cập nhật sản phẩm
router.put("/:pid", authenticateToken, async (req, res) => {
  try {
    const pid = Number(req.params.pid);

    if (!Number.isSafeInteger(pid) || pid <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID"
      });
    }

    const existingProduct = await prisma.product.findUnique({
      where: { pid }
    });

    if (!existingProduct) {
      return res.status(404).json({
        success: false,
        message: "Product not found"
      });
    }

    const { pname, price, quantity } = req.body ?? {};
    const data = {};

    if (pname !== undefined) {
      if (typeof pname !== "string" || !pname.trim()) {
        return res.status(400).json({
          success: false,
          message: "Product name must not be empty"
        });
      }

      data.pname = pname.trim();
    }

    if (price !== undefined) {
      if (
        price === null ||
        price === "" ||
        !Number.isFinite(Number(price)) ||
        Number(price) < 0
      ) {
        return res.status(400).json({
          success: false,
          message: "Price must be a valid non-negative number"
        });
      }

      data.price = Number(price);
    }

    if (quantity !== undefined) {
      if (
        quantity === null ||
        !Number.isInteger(Number(quantity)) ||
        Number(quantity) < 0
      ) {
        return res.status(400).json({
          success: false,
          message: "Quantity must be a non-negative integer"
        });
      }

      data.quantity = Number(quantity);
    }

    if (Object.keys(data).length === 0) {
      return res.status(400).json({
        success: false,
        message: "Provide at least one field to update"
      });
    }

    const updatedProduct = await prisma.product.update({
      where: { pid },
      data
    });

    return res.status(200).json({
      success: true,
      data: updatedProduct
    });
  } catch (error) {
    console.error("Update product error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
});

// DELETE /products/:pid - Xóa sản phẩm
router.delete("/:pid", authenticateToken, async (req, res) => {
  try {
    const pid = Number(req.params.pid);

    if (!Number.isSafeInteger(pid) || pid <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID"
      });
    }

    const existingProduct = await prisma.product.findUnique({
      where: { pid }
    });

    if (!existingProduct) {
      return res.status(404).json({
        success: false,
        message: "Product not found"
      });
    }

    await prisma.product.delete({
      where: { pid }
    });

    return res.status(200).json({
      success: true,
      message: "Product deleted successfully"
    });
  } catch (error) {
    console.error("Delete product error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
});

export default router;
