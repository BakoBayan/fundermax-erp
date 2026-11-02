"use server";

import { getDB } from "@/lib/db";
import { randomUUID } from "crypto";

export async function processOutboundShipment(
  entityId: string,
  inventoryId: string,
  quantity: number,
  debtAmountTotal: number
) {
  const db = getDB();
  const tx = await db.transaction("write");

  try {
    await tx.execute({
      sql: `INSERT INTO InventoryLogs (id, inventory_id, entity_id, action, quantity) VALUES (?, ?, ?, ?, ?)`,
      args: [randomUUID(), inventoryId, entityId, "OUT", quantity],
    });

    const updateRes = await tx.execute({
      sql: `UPDATE products SET current_stock = current_stock - ? WHERE id = ? AND current_stock >= ? RETURNING current_stock`,
      args: [quantity, inventoryId, quantity],
    });

    if (updateRes.rows.length === 0) {
      throw new Error("Insufficient stock or invalid inventory ID");
    }

    await tx.execute({
      sql: `INSERT INTO DebtTracker (id, entity_id, amount, is_receivable, status, is_deleted) VALUES (?, ?, ?, ?, ?, ?)`,
      args: [randomUUID(), entityId, debtAmountTotal, 1, "pending", 0],
    });

    await tx.commit();
    return { success: true };
  } catch (e: any) {
    await tx.rollback();
    return { success: false, error: e.message };
  } finally {
    tx.close();
  }
}

