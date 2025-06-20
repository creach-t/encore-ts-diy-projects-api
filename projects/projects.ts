import { api } from "encore.dev/api";
import { SQLDatabase } from "encore.dev/storage/sqldb";
// Import inter-service communication
import * as materials from "../materials/materials";
import {
  Project,
  CreateProjectRequest,
  UpdateProjectRequest,
  ProjectSearchParams,
  ProjectListResponse,
  ProjectStatsResponse,
  ProjectStatus
} from "./types";

// Database connection
// Encore automatically sets up PostgreSQL and handles migrations
const db = new SQLDatabase("projects", {
  migrations: "./migrations",
});

// ============================================================================
// PROJECT CRUD OPERATIONS
// ============================================================================

// Create a new DIY project
export const createProject = api(
  { expose: true, method: "POST", path: "/projects" },
  async (req: CreateProjectRequest): Promise<Project> => {
    // Get real material pricing from materials service
    const materialIds = req.materials.map(m => m.materialId);
    const materialPricing = await materials.getMaterialPricing(materialIds);

    // Calculate real estimated cost
    let estimatedCost = 0;
    for (const material of req.materials) {
      const pricing = materialPricing[material.materialId];
      if (!pricing) {
        throw new Error(`Material with id ${material.materialId} not found`);
      }
      estimatedCost += material.quantity * pricing.price;
    }

    // Insert project into database
    const projectId = await db.exec`
      INSERT INTO projects (
        title, description, difficulty, category, estimated_hours, 
        estimated_cost, status, instructions, image_urls, tags
      ) VALUES (
        ${req.title}, ${req.description}, ${req.difficulty}, ${req.category},
        ${req.estimatedHours}, ${estimatedCost}, 'planning', 
        ${JSON.stringify(req.instructions)}, ${JSON.stringify(req.imageUrls || [])}, 
        ${JSON.stringify(req.tags || [])}
      ) RETURNING id
    `.then(result => result[0].id);

    // Insert project materials with real pricing
    for (const material of req.materials) {
      const pricing = materialPricing[material.materialId];
      const totalPrice = material.quantity * pricing.price;
      
      await db.exec`
        INSERT INTO project_materials (project_id, material_id, quantity, unit_price, total_price, notes)
        VALUES (
          ${projectId}, ${material.materialId}, ${material.quantity}, 
          ${pricing.price}, ${totalPrice}, ${material.notes || ''}
        )
      `;
    }

    // Return the created project
    return await getProjectById({ id: projectId });
  }
);

// Get a project by ID
export const getProject = api(
  { expose: true, method: "GET", path: "/projects/:id" },
  async ({ id }: { id: number }): Promise<Project> => {
    return await getProjectById({ id });
  }
);

// Helper function to get project by ID with materials
async function getProjectById({ id }: { id: number }): Promise<Project> {
  const projects = await db.exec`
    SELECT 
      p.*,
      COALESCE(
        json_agg(
          json_build_object(
            'id', pm.id,
            'materialId', pm.material_id,
            'quantity', pm.quantity,
            'unitPrice', pm.unit_price,
            'totalPrice', pm.total_price,
            'notes', pm.notes
          )
        ) FILTER (WHERE pm.id IS NOT NULL), 
        '[]'::json
      ) as materials
    FROM projects p
    LEFT JOIN project_materials pm ON p.id = pm.project_id
    WHERE p.id = ${id}
    GROUP BY p.id
  `;

  if (projects.length === 0) {
    throw new Error(`Project with id ${id} not found`);
  }

  const project = projects[0];
  return {
    id: project.id,
    title: project.title,
    description: project.description,
    difficulty: project.difficulty,
    category: project.category,
    estimatedHours: project.estimated_hours,
    estimatedCost: parseFloat(project.estimated_cost),
    actualCost: project.actual_cost ? parseFloat(project.actual_cost) : undefined,
    status: project.status,
    materials: project.materials,
    instructions: JSON.parse(project.instructions || '[]'),
    imageUrls: JSON.parse(project.image_urls || '[]'),
    tags: JSON.parse(project.tags || '[]'),
    createdAt: project.created_at,
    updatedAt: project.updated_at,
    completedAt: project.completed_at
  };
}

// List projects with search and filtering
export const listProjects = api(
  { expose: true, method: "GET", path: "/projects" },
  async (params: ProjectSearchParams): Promise<ProjectListResponse> => {
    const { limit = 10, offset = 0 } = params;
    
    let whereClause = "WHERE 1=1";
    const queryParams: any[] = [];
    let paramCount = 0;

    // Build dynamic WHERE clause based on search parameters
    if (params.query) {
      whereClause += ` AND (title ILIKE $${++paramCount} OR description ILIKE $${paramCount})`;
      queryParams.push(`%${params.query}%`);
    }
    
    if (params.difficulty) {
      whereClause += ` AND difficulty = $${++paramCount}`;
      queryParams.push(params.difficulty);
    }
    
    if (params.category) {
      whereClause += ` AND category = $${++paramCount}`;
      queryParams.push(params.category);
    }
    
    if (params.status) {
      whereClause += ` AND status = $${++paramCount}`;
      queryParams.push(params.status);
    }

    if (params.minHours) {
      whereClause += ` AND estimated_hours >= $${++paramCount}`;
      queryParams.push(params.minHours);
    }

    if (params.maxHours) {
      whereClause += ` AND estimated_hours <= $${++paramCount}`;
      queryParams.push(params.maxHours);
    }

    if (params.minCost) {
      whereClause += ` AND estimated_cost >= $${++paramCount}`;
      queryParams.push(params.minCost);
    }

    if (params.maxCost) {
      whereClause += ` AND estimated_cost <= $${++paramCount}`;
      queryParams.push(params.maxCost);
    }

    // Execute query with pagination
    const projects = await db.exec`
      SELECT * FROM projects 
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    const totalResult = await db.exec`
      SELECT COUNT(*) as count FROM projects ${whereClause}
    `;

    return {
      projects: projects.map(p => ({
        id: p.id,
        title: p.title,
        description: p.description,
        difficulty: p.difficulty,
        category: p.category,
        estimatedHours: p.estimated_hours,
        estimatedCost: parseFloat(p.estimated_cost),
        actualCost: p.actual_cost ? parseFloat(p.actual_cost) : undefined,
        status: p.status,
        materials: [], // Not loaded in list view for performance
        instructions: JSON.parse(p.instructions || '[]'),
        imageUrls: JSON.parse(p.image_urls || '[]'),
        tags: JSON.parse(p.tags || '[]'),
        createdAt: p.created_at,
        updatedAt: p.updated_at,
        completedAt: p.completed_at
      })),
      total: parseInt(totalResult[0].count),
      limit,
      offset
    };
  }
);

// Update a project
export const updateProject = api(
  { expose: true, method: "PUT", path: "/projects/:id" },
  async ({ id, ...updates }: { id: number } & UpdateProjectRequest): Promise<Project> => {
    // If materials are being updated, recalculate cost
    if (updates.materials && updates.materials.length > 0) {
      const materialIds = updates.materials.map(m => m.materialId);
      const materialPricing = await materials.getMaterialPricing(materialIds);
      
      let newEstimatedCost = 0;
      for (const material of updates.materials) {
        const pricing = materialPricing[material.materialId];
        if (!pricing) {
          throw new Error(`Material with id ${material.materialId} not found`);
        }
        newEstimatedCost += material.quantity * pricing.price;
      }

      // Update estimated cost
      updates.estimatedCost = newEstimatedCost;

      // Delete existing materials and insert new ones
      await db.exec`DELETE FROM project_materials WHERE project_id = ${id}`;
      
      for (const material of updates.materials) {
        const pricing = materialPricing[material.materialId];
        const totalPrice = material.quantity * pricing.price;
        
        await db.exec`
          INSERT INTO project_materials (project_id, material_id, quantity, unit_price, total_price, notes)
          VALUES (
            ${id}, ${material.materialId}, ${material.quantity}, 
            ${pricing.price}, ${totalPrice}, ${material.notes || ''}
          )
        `;
      }

      // Remove materials from updates object as it's handled separately
      delete updates.materials;
    }

    // Build dynamic UPDATE query
    const updateFields: string[] = [];
    const updateValues: any[] = [];
    let paramCount = 0;

    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined) {
        paramCount++;
        if (key === 'instructions' || key === 'imageUrls' || key === 'tags') {
          updateFields.push(`${key.replace(/([A-Z])/g, '_$1').toLowerCase()} = $${paramCount}`);
          updateValues.push(JSON.stringify(value));
        } else if (key === 'estimatedHours') {
          updateFields.push(`estimated_hours = $${paramCount}`);
          updateValues.push(value);
        } else if (key === 'estimatedCost') {
          updateFields.push(`estimated_cost = $${paramCount}`);
          updateValues.push(value);
        } else if (key === 'actualCost') {
          updateFields.push(`actual_cost = $${paramCount}`);
          updateValues.push(value);
        } else {
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

    // If status is being set to completed, set completed_at
    if (updates.status === 'completed') {
      updateFields.push(`completed_at = $${++paramCount}`);
      updateValues.push(new Date().toISOString());
    }

    await db.exec`
      UPDATE projects 
      SET ${updateFields.join(', ')}
      WHERE id = ${id}
    `;

    return await getProjectById({ id });
  }
);

// Delete a project
export const deleteProject = api(
  { expose: true, method: "DELETE", path: "/projects/:id" },
  async ({ id }: { id: number }): Promise<{ success: boolean; message: string }> => {
    // Delete project materials first (foreign key constraint)
    await db.exec`DELETE FROM project_materials WHERE project_id = ${id}`;
    
    // Delete the project
    const result = await db.exec`DELETE FROM projects WHERE id = ${id}`;
    
    if (result.length === 0) {
      throw new Error(`Project with id ${id} not found`);
    }

    return {
      success: true,
      message: `Project ${id} deleted successfully`
    };
  }
);

// Get project statistics
export const getProjectStats = api(
  { expose: true, method: "GET", path: "/projects/stats" },
  async (): Promise<ProjectStatsResponse> => {
    const stats = await db.exec`
      SELECT 
        COUNT(*) as total_projects,
        AVG(EXTRACT(EPOCH FROM (completed_at - created_at))/3600) as avg_completion_hours,
        SUM(estimated_cost) as total_estimated_cost,
        SUM(actual_cost) as total_actual_cost
      FROM projects
    `;

    const difficultyStats = await db.exec`
      SELECT difficulty, COUNT(*) as count
      FROM projects
      GROUP BY difficulty
    `;

    const statusStats = await db.exec`
      SELECT status, COUNT(*) as count  
      FROM projects
      GROUP BY status
    `;

    const categoryStats = await db.exec`
      SELECT category, COUNT(*) as count
      FROM projects 
      GROUP BY category
    `;

    return {
      totalProjects: parseInt(stats[0].total_projects),
      projectsByDifficulty: difficultyStats.reduce((acc, row) => {
        acc[row.difficulty] = parseInt(row.count);
        return acc;
      }, {} as any),
      projectsByStatus: statusStats.reduce((acc, row) => {
        acc[row.status] = parseInt(row.count);
        return acc;
      }, {} as any),
      projectsByCategory: categoryStats.reduce((acc, row) => {
        acc[row.category] = parseInt(row.count);
        return acc;
      }, {} as any),
      averageCompletionTime: parseFloat(stats[0].avg_completion_hours) || 0,
      totalEstimatedCost: parseFloat(stats[0].total_estimated_cost) || 0,
      totalActualCost: parseFloat(stats[0].total_actual_cost) || 0
    };
  }
);

// ============================================================================
// PROJECT MATERIAL MANAGEMENT
// ============================================================================

// Start a project (reserve materials)
export const startProject = api(
  { expose: true, method: "POST", path: "/projects/:id/start" },
  async ({ id }: { id: number }): Promise<Project> => {
    // Get project materials
    const projectMaterials = await db.exec`
      SELECT material_id, quantity FROM project_materials WHERE project_id = ${id}
    `;

    if (projectMaterials.length === 0) {
      throw new Error("Project has no materials to reserve");
    }

    // Reserve materials in the materials service
    const reservations = projectMaterials.map(pm => ({
      materialId: pm.material_id,
      quantity: pm.quantity,
      reason: `Reserved for project ${id} - started`
    }));

    await materials.reserveMaterials(reservations);

    // Update project status
    await db.exec`
      UPDATE projects 
      SET status = 'in_progress', updated_at = NOW()
      WHERE id = ${id}
    `;

    return await getProjectById({ id });
  }
);

// Calculate current project cost with updated material prices
export const recalculateProjectCost = api(
  { expose: true, method: "POST", path: "/projects/:id/recalculate-cost" },
  async ({ id }: { id: number }): Promise<Project> => {
    // Get current project materials
    const projectMaterials = await db.exec`
      SELECT material_id, quantity FROM project_materials WHERE project_id = ${id}
    `;

    if (projectMaterials.length === 0) {
      throw new Error("Project has no materials");
    }

    // Get current material pricing
    const materialIds = projectMaterials.map(pm => pm.material_id);
    const materialPricing = await materials.getMaterialPricing(materialIds);

    let newEstimatedCost = 0;

    // Update each material with current pricing
    for (const pm of projectMaterials) {
      const pricing = materialPricing[pm.material_id];
      if (!pricing) {
        throw new Error(`Material with id ${pm.material_id} not found`);
      }

      const newTotalPrice = pm.quantity * pricing.price;
      newEstimatedCost += newTotalPrice;

      await db.exec`
        UPDATE project_materials 
        SET unit_price = ${pricing.price}, total_price = ${newTotalPrice}
        WHERE project_id = ${id} AND material_id = ${pm.material_id}
      `;
    }

    // Update project estimated cost
    await db.exec`
      UPDATE projects 
      SET estimated_cost = ${newEstimatedCost}, updated_at = NOW()
      WHERE id = ${id}
    `;

    return await getProjectById({ id });
  }
);

// Get projects that can be started (all materials available)
export const getStartableProjects = api(
  { expose: true, method: "GET", path: "/projects/startable" },
  async (): Promise<Project[]> => {
    // Get all planning projects
    const planningProjects = await db.exec`
      SELECT DISTINCT p.id 
      FROM projects p
      WHERE p.status = 'planning'
    `;

    const startableProjects: Project[] = [];

    for (const project of planningProjects) {
      // Get project materials
      const projectMaterials = await db.exec`
        SELECT material_id, quantity FROM project_materials WHERE project_id = ${project.id}
      `;

      if (projectMaterials.length === 0) continue;

      // Check if all materials are available
      const materialIds = projectMaterials.map(pm => pm.material_id);
      const materialPricing = await materials.getMaterialPricing(materialIds);

      let allAvailable = true;
      for (const pm of projectMaterials) {
        const pricing = materialPricing[pm.material_id];
        if (!pricing || !pricing.inStock || pricing.available < pm.quantity) {
          allAvailable = false;
          break;
        }
      }

      if (allAvailable) {
        const fullProject = await getProjectById({ id: project.id });
        startableProjects.push(fullProject);
      }
    }

    return startableProjects;
  }
);