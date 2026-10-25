# Bako's Panel Manager (v1.5)

A high-performance, real-time wood panel inventory and customer order management system crafted specifically for warehouse floor operations.

## Features in v1.5

- **Wood Panel Inventory**: Complete physical metrics tracking (Dimensions in mm, Thickness, Type, and Auto-generated 3-digit Code).
- **Real-Time Stock Allocations**: Instant mathematical balance calculation between Total Stock, Reserved (active client orders), and Available Stock.
- **Customer Order Dispatch**: Full order management workflow with client reservations, blueprint attachments, and status tracking (Reserved / Finalized).
- **Smart Multi-Slip Batch Printing**:
  - Automatically fits multiple slips on the same physical sheet of paper whenever space allows without splitting cards.
  - Strict preservation of the user-selected print sequence.
  - High-contrast visual distinction between **Panel Specification Slips** (emerald theme) and **Customer Order Dispatch Slips** (sky blue theme).
  - 100% ink-friendly borders and complete word-wrapped notes.
- **SQLite with WAL Resilience**: Instant ACID transactions using Node 24 SQLite with Write-Ahead Logging (WAL) and automatic 90-day snapshot backups.
- **Authentication & Roles**: Admin, Manager, and Staff roles with audit trail logging for all actions.
- **Cross-Device Ready**: Dual optimized layouts (Excel Spreadsheet Grid for PC/tablets, Card Stack for mobile) with Wi-Fi network sharing.

## Starting the Application

Double-click `START_BAKO_SERVER.bat` or run:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.
