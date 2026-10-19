
import express from "express";
import { prisma } from "../lib/prisma.js";
import { authenticateToken } from "../middleware/auth.js";

const router = express.Router();

// GET /shipments/:id - Xem thông tin giao hàng
router.get("/:id", authenticateToken, async (req, res) => {
  var shipid = Number(req.params.id);

  if (!Number.isInteger(shipid) || shipid <= 0) {
    return res.status(400).json({
      success: false,
      message: "Invalid shipment ID"
    });
  }

  try {
    var shipment = await prisma.shipment.findUnique({
      where: { shipid: shipid }
    });

    if (!shipment) {
      return res.status(404).json({
        success: false,
        message: "Shipment not found"
      });
    }

    var order = await prisma.order.findUnique({
      where: { oid: shipment.oid },
      select: { uid: true }
    });

    if (!order || order.uid !== req.user.uid) {
      return res.status(403).json({
        success: false,
        message: "You are not allowed to view this shipment"
      });
    }

    return res.status(200).json({
      success: true,
      message: "Shipment retrieved successfully",
      data: shipment
    });
  } catch (error) {
    console.error("Get shipment error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
});

/* PUT /shipments/:id/status - Cập nhật trạng thái giao hàng */
router.put("/:id/status", authenticateToken, async (req, res) => {
  var shipid = Number(req.params.id);
  var status = req.body.status;

  if (!Number.isInteger(shipid) || shipid <= 0) {
    return res.status(400).json({
      success: false,
      message: "Invalid shipment ID"
    });
  }

  var allowedStatuses = ["Pending", "Shipped", "Delivered"];

  if (!allowedStatuses.includes(status)) {
    return res.status(400).json({
      success: false,
      message: "Status must be Pending, Shipped, or Delivered"
    });
  }

  try {
    var shipment = await prisma.shipment.findUnique({
      where: { shipid: shipid }
    });

    if (!shipment) {
      return res.status(404).json({
        success: false,
        message: "Shipment not found"
      });
    }

    var order = await prisma.order.findUnique({
      where: { oid: shipment.oid },
      select: { uid: true }
    });

    if (!order || order.uid !== req.user.uid) {
      return res.status(403).json({
        success: false,
        message: "You are not allowed to update this shipment"
      });
    }

    var updatedShipment = await prisma.shipment.update({
      where: { shipid: shipid },
      data: { status: status }
    });

    return res.status(200).json({
      success: true,
      message: "Shipment status updated successfully",
      data: updatedShipment
    });
  } catch (error) {
    console.error("Update shipment error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
});

export default router;
