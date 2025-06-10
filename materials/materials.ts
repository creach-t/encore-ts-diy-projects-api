import { api } from "encore.dev/api";
import { SQLDatabase } from "encore.dev/storage/sqldb";
import {
  Material,
  CreateMaterialRequest,
  UpdateMaterialRequest,
  UpdateStockRequest,
  StockAdjustmentRecord,
  MaterialSearchParams,
  MaterialListResponse,
  MaterialStatsResponse,
  ProjectCostRequest,
  ProjectCostResponse,
  MaterialCostCalculation
} from "./types";

// Database connection
// Encore automatically sets up PostgreSQL and handles migrations
const db = new SQLDatabase("materials", {
  migrations: "./migrations",
});

// ============================================================================
// MATERIAL CRUD OPERATIONS
// ============================================================================

// Create a new material
export const createMaterial = api(
  { expose: true, method: "POST", path: "/materials" },
  async (req: CreateMaterialRequest): Promise<Material> => {
    const materialId = await db.exec`
      INSERT INTO materials (
        name, description, category, unit, price_per_unit, stock_quantity, 
        min_stock_level, supplier, supplier_part_number, image_url, 
        specifications, tags
      ) VALUES (
        ${req.name}, ${req.description}, ${req.category}, ${req.unit},
        ${req.pricePerUnit}, ${req.stockQuantity}, ${req.minStockLevel || 0},
        ${req.supplier || null}, ${req.supplierPartNumber || null}, ${req.imageUrl || null},
        ${JSON.stringify(req.specifications || {})}, ${JSON.stringify(req.tags || [])}
      ) RETURNING id
    `.then(result => result[0].id);

    // Record initial stock
    if (req.stockQuantity > 0) {
      await db.exec`
        INSERT INTO stock_adjustments (material_id, quantity_before, quantity_change, quantity_after, reason)
        VALUES (${materialId}, 0, ${req.stockQuantity}, ${req.stockQuantity}, 'Initial stock setup')
      `;
    }

    return await getMaterialById({ id: materialId });
  }
);

// Get a material by ID
export const getMaterial = api(
  { expose: true, method: "GET", path: "/materials/:id" },
  async ({ id }: { id: number }): Promise<Material> => {
    return await getMaterialById({ id });
  }
);

// Helper function to get material by ID
async function getMaterialById({ id }: { id: number }): Promise<Material> {
  const materials = await db.exec`
    SELECT * FROM materials WHERE id = ${id} AND is_active = true
  `;

  if (materials.length === 0) {
    throw new Error(`Material with id ${id} not found`);
  }

  const material = materials[0];
  return {
    id: material.id,
    name: material.name,
    description: material.description,
    category: material.category,
    unit: material.unit,
    pricePerUnit: parseFloat(material.price_per_unit),
    stockQuantity: material.stock_quantity,
    minStockLevel: material.min_stock_level,
    supplier: material.supplier,
    supplierPartNumber: material.supplier_part_number,
    imageUrl: material.image_url,
    specifications: JSON.parse(material.specifications || '{}'),
    tags: JSON.parse(material.tags || '[]'),
    isActive: material.is_active,
    createdAt: material.created_at,
    updatedAt: material.updated_at
  };
}

// List materials with search and filtering
export const listMaterials = api(
  { expose: true, method: "GET", path: "/materials" },
  async (params: MaterialSearchParams): Promise<MaterialListResponse> => {
    const { limit = 20, offset = 0 } = params;
    
    let whereClause = "WHERE is_active = true";
    const queryParams: any[] = [];
    let paramCount = 0;

    // Build dynamic WHERE clause
    if (params.query) {
      whereClause += ` AND (name ILIKE $${++paramCount} OR description ILIKE $${paramCount})`;
      queryParams.push(`%${params.query}%`);
    }
    
    if (params.category) {
      whereClause += ` AND category = $${++paramCount}`;
      queryParams.push(params.category);
    }
    
    if (params.unit) {
      whereClause += ` AND unit = $${++paramCount}`;
      queryParams.push(params.unit);
    }

    if (params.minPrice) {
      whereClause += ` AND price_per_unit >= $${++paramCount}`;
      queryParams.push(params.minPrice);
    }

    if (params.maxPrice) {
      whereClause += ` AND price_per_unit <= $${++paramCount}`;
      queryParams.push(params.maxPrice);
    }

    if (params.inStock) {
      whereClause += ` AND stock_quantity > 0`;
    }

    if (params.lowStock) {
      whereClause += ` AND stock_quantity <= min_stock_level AND stock_quantity > 0`;
    }

    if (params.supplier) {
      whereClause += ` AND supplier ILIKE $${++paramCount}`;
      queryParams.push(`%${params.supplier}%`);
    }

    // Execute query with pagination
    const materials = await db.exec`
      SELECT * FROM materials 
      ${whereClause}
      ORDER BY name ASC
      LIMIT ${limit} OFFSET ${offset}
    `;

    const totalResult = await db.exec`
      SELECT COUNT(*) as count FROM materials ${whereClause}
    `;

    return {
      materials: materials.map(m => ({
        id: m.id,
        name: m.name,
        description: m.description,
        category: m.category,
        unit: m.unit,
        pricePerUnit: parseFloat(m.price_per_unit),
        stockQuantity: m.stock_quantity,
        minStockLevel: m.min_stock_level,
        supplier: m.supplier,
        supplierPartNumber: m.supplier_part_number,
        imageUrl: m.image_url,
        specifications: JSON.parse(m.specifications || '{}'),
        tags: JSON.parse(m.tags || '[]'),
        isActive: m.is_active,
        createdAt: m.created_at,
        updatedAt: m.updated_at
      })),
      total: parseInt(totalResult[0].count),
      limit,
      offset
    };
  }
);

// Update a material
export const updateMaterial = api(
  { expose: true, method: "PUT", path: "/materials/:id" },
  async ({ id, ...updates }: { id: number } & UpdateMaterialRequest): Promise<Material> => {
    // Build dynamic UPDATE query
    const updateFields: string[] = [];
    const updateValues: any[] = [];
    let paramCount = 0;

    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined) {
        paramCount++;
        switch (key) {
          case 'pricePerUnit':
            updateFields.push(`price_per_unit = $${paramCount}`);
            updateValues.push(value);
            break;
          case 'stockQuantity':
            updateFields.push(`stock_quantity = $${paramCount}`);
            updateValues.push(value);
            break;
          case 'minStockLevel':
            updateFields.push(`min_stock_level = $${paramCount}`);
            updateValues.push(value);
            break;
          case 'supplierPartNumber':
            updateFields.push(`supplier_part_number = $${paramCount}`);
            updateValues.push(value);
            break;
          case 'imageUrl':
            updateFields.push(`image_url = $${paramCount}`);
            updateValues.push(value);
            break;
          case 'isActive':
            updateFields.push(`is_active = $${paramCount}`);
            updateValues.push(value);
            break;
          case 'specifications':
            updateFields.push(`specifications = $${paramCount}`);
            updateValues.push(JSON.stringify(value));
            break;
          case 'tags':
            updateFields.push(`tags = $${paramCount}`);
            updateValues.push(JSON.stringify(value));
            break;
          default:
            updateFields.push(`${key} = $${paramCount}`);
            updateValues.push(value);
        }
      }
    });

    if (updateFields.length === 0) {
      throw new Error("No fields to update");
    }

    // Add updated_at timestamp
    updateFields.push(`updated_at = $${++paramCount}`);
    updateValues.push(new Date().toISOString());

    await db.exec`
      UPDATE materials 
      SET ${updateFields.join(', ')}
      WHERE id = ${id}
    `;

    return await getMaterialById({ id });
  }
);

// Get materials by category
export const getMaterialsByCategory = api(
  { expose: true, method: "GET", path: "/materials/category/:category" },
  async ({ category }: { category: string }): Promise<Material[]> => {
    const materials = await db.exec`
      SELECT * FROM materials 
      WHERE category = ${category} AND is_active = true
      ORDER BY name ASC
    `;

    return materials.map(m => ({
      id: m.id,
      name: m.name,
      description: m.description,
      category: m.category,
      unit: m.unit,
      pricePerUnit: parseFloat(m.price_per_unit),
      stockQuantity: m.stock_quantity,
      minStockLevel: m.min_stock_level,
      supplier: m.supplier,
      supplierPartNumber: m.supplier_part_number,
      imageUrl: m.image_url,
      specifications: JSON.parse(m.specifications || '{}'),
      tags: JSON.parse(m.tags || '[]'),
      isActive: m.is_active,
      createdAt: m.created_at,
      updatedAt: m.updated_at
    }));
  }
);

// ============================================================================
// STOCK MANAGEMENT
// ============================================================================

// Update stock quantity
export const updateStock = api(
  { expose: true, method: "POST", path: "/materials/:id/stock" },
  async ({ id, ...req }: { id: number } & Omit<UpdateStockRequest, 'materialId'>): Promise<Material> => {
    // Get current stock
    const currentMaterial = await db.exec`
      SELECT stock_quantity FROM materials WHERE id = ${id}
    `;

    if (currentMaterial.length === 0) {
      throw new Error(`Material with id ${id} not found`);
    }

    const currentStock = currentMaterial[0].stock_quantity;
    const newStock = currentStock + req.quantityChange;

    if (newStock < 0) {
      throw new Error(`Insufficient stock. Current: ${currentStock}, Requested change: ${req.quantityChange}`);
    }

    // Update stock
    await db.exec`
      UPDATE materials 
      SET stock_quantity = ${newStock}, updated_at = NOW()
      WHERE id = ${id}
    `;

    // Record stock adjustment
    await db.exec`
      INSERT INTO stock_adjustments (material_id, quantity_before, quantity_change, quantity_after, reason)
      VALUES (${id}, ${currentStock}, ${req.quantityChange}, ${newStock}, ${req.reason})
    `;

    return await getMaterialById({ id });
  }
);

// Get stock adjustment history
export const getStockHistory = api(
  { expose: true, method: "GET", path: "/materials/:id/stock/history" },
  async ({ id }: { id: number }): Promise<StockAdjustmentRecord[]> => {
    const adjustments = await db.exec`
      SELECT * FROM stock_adjustments 
      WHERE material_id = ${id}
      ORDER BY created_at DESC
      LIMIT 50
    `;

    return adjustments.map(adj => ({
      id: adj.id,
      materialId: adj.material_id,
      quantityBefore: adj.quantity_before,
      quantityChange: adj.quantity_change,
      quantityAfter: adj.quantity_after,
      reason: adj.reason,
      createdAt: adj.created_at
    }));
  }
);

// ============================================================================
// PROJECT COST CALCULATION
// ============================================================================

// Calculate project cost from materials list
export const calculateProjectCost = api(
  { expose: true, method: "POST", path: "/materials/calculate-cost" },
  async (req: ProjectCostRequest): Promise<ProjectCostResponse> => {
    const materialCalculations: MaterialCostCalculation[] = [];
    let totalCost = 0;
    let allMaterialsAvailable = true;

    for (const item of req.materials) {
      const materials = await db.exec`
        SELECT id, price_per_unit, stock_quantity FROM materials 
        WHERE id = ${item.materialId} AND is_active = true
      `;

      if (materials.length === 0) {
        throw new Error(`Material with id ${item.materialId} not found`);
      }

      const material = materials[0];
      const unitPrice = parseFloat(material.price_per_unit);
      const totalPrice = unitPrice * item.quantity;
      const inStock = material.stock_quantity >= item.quantity;
      
      if (!inStock) {
        allMaterialsAvailable = false;
      }

      materialCalculations.push({
        materialId: item.materialId,
        quantity: item.quantity,
        unitPrice,
        totalCost: totalPrice,
        inStock,
        availableQuantity: material.stock_quantity
      });

      totalCost += totalPrice;
    }

    return {
      materials: materialCalculations,
      totalCost,
      allMaterialsAvailable
    };
  }
);

// ============================================================================
// STATISTICS AND REPORTING
// ============================================================================

// Get material statistics
export const getMaterialStats = api(
  { expose: true, method: "GET", path: "/materials/stats" },
  async (): Promise<MaterialStatsResponse> => {
    const stats = await db.exec`
      SELECT 
        COUNT(*) as total_materials,
        SUM(price_per_unit * stock_quantity) as total_value,
        COUNT(CASE WHEN stock_quantity <= min_stock_level AND stock_quantity > 0 THEN 1 END) as low_stock_count,
        COUNT(CASE WHEN stock_quantity = 0 THEN 1 END) as out_of_stock_count,
        SUM(stock_quantity) as total_stock_items
      FROM materials
      WHERE is_active = true
    `;

    const categoryStats = await db.exec`
      SELECT category, COUNT(*) as count
      FROM materials
      WHERE is_active = true
      GROUP BY category
    `;

    return {
      totalMaterials: parseInt(stats[0].total_materials),
      materialsByCategory: categoryStats.reduce((acc, row) => {
        acc[row.category] = parseInt(row.count);
        return acc;
      }, {} as any),
      totalValue: parseFloat(stats[0].total_value) || 0,
      lowStockCount: parseInt(stats[0].low_stock_count),
      outOfStockCount: parseInt(stats[0].out_of_stock_count),
      totalStockItems: parseInt(stats[0].total_stock_items)
    };
  }
);

// Get low stock materials
export const getLowStockMaterials = api(
  { expose: true, method: "GET", path: "/materials/low-stock" },
  async (): Promise<Material[]> => {
    const materials = await db.exec`
      SELECT * FROM materials 
      WHERE stock_quantity <= min_stock_level 
        AND stock_quantity > 0 
        AND is_active = true
      ORDER BY (stock_quantity::float / NULLIF(min_stock_level, 0)) ASC, name ASC
    `;

    return materials.map(m => ({
      id: m.id,
      name: m.name,
      description: m.description,
      category: m.category,
      unit: m.unit,
      pricePerUnit: parseFloat(m.price_per_unit),
      stockQuantity: m.stock_quantity,
      minStockLevel: m.min_stock_level,
      supplier: m.supplier,
      supplierPartNumber: m.supplier_part_number,
      imageUrl: m.image_url,
      specifications: JSON.parse(m.specifications || '{}'),
      tags: JSON.parse(m.tags || '[]'),
      isActive: m.is_active,
      createdAt: m.created_at,
      updatedAt: m.updated_at
    }));
  }
);

// ============================================================================
// INTER-SERVICE COMMUNICATION
// ============================================================================

// Internal API for other services to get material pricing
export const getMaterialPricing = api(
  { expose: false }, // Internal API, not exposed externally
  async (materialIds: number[]): Promise<Record<number, { price: number; inStock: boolean; available: number }>> => {
    const materials = await db.exec`
      SELECT id, price_per_unit, stock_quantity 
      FROM materials 
      WHERE id = ANY(${materialIds}) AND is_active = true
    `;

    const result: Record<number, { price: number; inStock: boolean; available: number }> = {};
    
    materials.forEach(m => {
      result[m.id] = {
        price: parseFloat(m.price_per_unit),
        inStock: m.stock_quantity > 0,
        available: m.stock_quantity
      };
    });

    return result;
  }
);

// Reserve materials for a project (reduce stock temporarily)
export const reserveMaterials = api(
  { expose: false }, // Internal API
  async (reservations: Array<{ materialId: number; quantity: number; reason: string }>): Promise<boolean> => {
    // Start a transaction to ensure atomicity
    for (const reservation of reservations) {
      const currentMaterial = await db.exec`
        SELECT stock_quantity FROM materials WHERE id = ${reservation.materialId}
      `;

      if (currentMaterial.length === 0) {
        throw new Error(`Material ${reservation.materialId} not found`);
      }

      const currentStock = currentMaterial[0].stock_quantity;
      
      if (currentStock < reservation.quantity) {
        throw new Error(`Insufficient stock for material ${reservation.materialId}. Available: ${currentStock}, Requested: ${reservation.quantity}`);
      }

      const newStock = currentStock - reservation.quantity;

      // Update stock
      await db.exec`
        UPDATE materials 
        SET stock_quantity = ${newStock}, updated_at = NOW()
        WHERE id = ${reservation.materialId}
      `;

      // Record adjustment
      await db.exec`
        INSERT INTO stock_adjustments (material_id, quantity_before, quantity_change, quantity_after, reason)
        VALUES (${reservation.materialId}, ${currentStock}, ${-reservation.quantity}, ${newStock}, ${reservation.reason})
      `;
    }

    return true;
  }
);