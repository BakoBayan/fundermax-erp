export type EntityType = 'supplier' | 'client' | 'internal';
export type InventoryAction = 'IN' | 'OUT' | 'ADJUST';

export interface Entity {
  id: string;
  name: string;
  type: EntityType;
  contact_info?: string | null;
  created_at?: string;
}

export interface InventoryLog {
  id: string;
  inventory_id: string;
  entity_id: string;
  action: InventoryAction;
  quantity: number;
  created_at?: string;
}

export interface DebtTracker {
  id: string;
  entity_id: string;
  amount: number;
  is_receivable: boolean;
  status: 'pending' | 'cleared';
  is_deleted: boolean;
  created_at?: string;
}

