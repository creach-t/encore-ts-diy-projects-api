// TypeScript types for the Projects service
// Encore.ts uses these for automatic request validation and API documentation

export type ProjectDifficulty = "beginner" | "intermediate" | "advanced" | "expert";
export type ProjectStatus = "planning" | "in_progress" | "completed" | "paused" | "cancelled";
export type ProjectCategory = "woodworking" | "electronics" | "gardening" | "home_improvement" | "crafts" | "automotive" | "other";

// Main Project interface
export interface Project {
  id: number;
  title: string;
  description: string;
  difficulty: ProjectDifficulty;
  category: ProjectCategory;
  estimatedHours: number;
  estimatedCost: number;
  actualCost?: number;
  status: ProjectStatus;
  materials: ProjectMaterial[];
  instructions: string[];
  imageUrls: string[];
  tags: string[];
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

// Request types for API endpoints
export interface CreateProjectRequest {
  title: string;
  description: string;
  difficulty: ProjectDifficulty;
  category: ProjectCategory;
  estimatedHours: number;
  materials: CreateProjectMaterialRequest[];
  instructions: string[];
  imageUrls?: string[];
  tags?: string[];
}

export interface UpdateProjectRequest {
  title?: string;
  description?: string;
  difficulty?: ProjectDifficulty;
  category?: ProjectCategory;
  estimatedHours?: number;
  status?: ProjectStatus;
  actualCost?: number;
  materials?: CreateProjectMaterialRequest[];
  instructions?: string[];
  imageUrls?: string[];
  tags?: string[];
}

// Project materials
export interface ProjectMaterial {
  id: number;
  materialId: number;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  notes?: string;
}

export interface CreateProjectMaterialRequest {
  materialId: number;
  quantity: number;
  notes?: string;
}

// Search and filter types
export interface ProjectSearchParams {
  query?: string;
  difficulty?: ProjectDifficulty;
  category?: ProjectCategory;
  status?: ProjectStatus;
  minHours?: number;
  maxHours?: number;
  minCost?: number;
  maxCost?: number;
  tags?: string[];
  limit?: number;
  offset?: number;
}

// Response types
export interface ProjectListResponse {
  projects: Project[];
  total: number;
  limit: number;
  offset: number;
}

export interface ProjectStatsResponse {
  totalProjects: number;
  projectsByDifficulty: Record<ProjectDifficulty, number>;
  projectsByStatus: Record<ProjectStatus, number>;
  projectsByCategory: Record<ProjectCategory, number>;
  averageCompletionTime: number;
  totalEstimatedCost: number;
  totalActualCost: number;
}