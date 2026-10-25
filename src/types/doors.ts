// ============================================================================
// Sulaymaniyah Custom Door Manufacturing Schema & Types
// کۆمپانیای شاسوار ئەحمەد شاسوار - سلێمانی
// ============================================================================

export type DoorOpeningDirection = 'right' | 'left'; // دەستە ڕاست | دەستە چەپ
export type DoorTypeCategory = 'interior' | 'waterproof_wc' | 'entrance'; // ژوور | دژە ئاو (گەرماو) | سەرەکی

export interface DoorOrderSpec {
  doorHeight: number;                     // mm (e.g. 2100) or cm
  doorWidth: number;                      // mm (e.g. 900) or cm
  frameDepth: number;                     // قووڵی چوارچێوە / دیوار (e.g. 100, 150, 200 mm)
  openingDirection: DoorOpeningDirection; // 'right' (دەستە ڕاست) | 'left' (دەستە چەپ)
  doorModel: string;                      // ناوی مۆدێل / دیزاین (e.g. FunderMax Oak, CNC Pattern A-12)
  doorType: DoorTypeCategory;             // 'interior' | 'waterproof_wc' | 'entrance'
  casingIncluded: boolean;                // تاج و پەردە / کەتیبە (Architrave / Casing)
  hardwareIncluded: boolean;              // قوفڵ و دەسک (Lock & Handles)
  unit?: 'mm' | 'cm';                     // Default mm
  colorFinish?: string;                   // ڕەنگ و ڕووکەش
  notes?: string;                         // تێبینی وەستاکار
}

export const DOOR_TYPE_LABELS_KU: Record<DoorTypeCategory, string> = {
  interior: 'ژوور (Interior)',
  waterproof_wc: 'گەرماو / دژە ئاو (Waterproof WC)',
  entrance: 'دەرگای سەرەکی (Main Entrance)',
};

export const DOOR_DIRECTION_LABELS_KU: Record<DoorOpeningDirection, string> = {
  right: 'دەستە ڕاست (Right)',
  left: 'دەستە چەپ (Left)',
};
