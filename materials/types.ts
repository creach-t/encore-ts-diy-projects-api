// TypeScript types for the Materials service
// Encore.ts uses these for automatic request validation and API documentation

export type MaterialCategory = "wood" | "metal" | "plastic" | "electronics" | "hardware" | "tools" | "fabric" | "glass" | "stone" | "chemicals" | "other";
export type MaterialUnit = "piece" | "meter" | "liter" | "kilogram" | "gram" | "square_meter" | "cubic_meter" | "foot" | "inch" | "gallon" | "pound";

// Main Material interface
export interface Material {
  id: number;
  name: string;
  description: string;
  category: MaterialCategory;
  unit: MaterialUnit;
  pricePerUnit: number;
  stockQuantity: number;
  minStockLevel: number;
  supplier?: string;
  supplierPartNumber?: string;
  imageUrl?: string;
  specifications: Record<string, any>;
  tags: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Request types for API endpoints
export interface CreateMaterialRequest {
  name: string;
  description: string;
  category: MaterialCategory;
  unit: MaterialUnit;
  pricePerUnit: number;
  stockQuantity: number;
  minStockLevel?: number;
  supplier?: string;
  supplierPartNumber?: string;
  imageUrl?: string;
  specifications?: Record<string, any>;
  tags?: string[];
}

export interface UpdateMaterialRequest {
  name?: string;
  description?: string;
  category?: MaterialCategory;
  unit?: MaterialUnit;
  pricePerUnit?: number;
  stockQuantity?: number;
  minStockLevel?: number;
  supplier?: string;
  supplierPartNumber?: string;
  imageUrl?: string;
  specifications?: Record<string, any>;
  tags?: string[];
  isActive?: boolean;
}

// Stock management
export interface UpdateStockRequest {
  materialId: number;
  quantityChange: number; // Positive for adding stock, negative for using stock
  reason: string;
}

export interface StockAdjustmentRecord {
  id: number;
  materialId: number;
  quantityBefore: number;
  quantityChange: number;
  quantityAfter: number;
  reason: string;
  createdAt: string;
}

// Search and filter types
export interface MaterialSearchParams {
  query?: string;
  category?: MaterialCategory;
  unit?: MaterialUnit;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean; // Only materials with stock > 0
  lowStock?: boolean; // Only materials below min stock level
  tags?: string[];
  supplier?: string;
  isActive?: boolean;
  limit?: number;
  offset?: number;
}

// Response types
export interface MaterialListResponse {
  materials: Material[];
  total: number;
  limit: number;
  offset: number;
}

export interface MaterialStatsResponse {
  totalMaterials: number;
  materialsByCategory: Record<MaterialCategory, number>;
  totalValue: number; // Total value of all stock
  lowStockCount: number;
  outOfStockCount: number;
  totalStockItems: number;
}

// Pricing and cost calculation
export interface MaterialCostCalculation {
  materialId: number;
  quantity: number;
  unitPrice: number;
  totalCost: number;
  inStock: boolean;
  availableQuantity: number;
}

export interface ProjectCostRequest {
  materials: Array<{
    materialId: number;
    quantity: number;
  }>;
}

export interface ProjectCostResponse {
  materials: MaterialCostCalculation[];
  totalCost: number;
  allMaterialsAvailable: boolean;
}