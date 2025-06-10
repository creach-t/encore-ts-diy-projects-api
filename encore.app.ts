import { api } from "encore.dev/api";

// App-level configuration for the DIY Projects API
export const app = {
  name: "diy-projects-api",
  description: "🔨 A comprehensive DIY Projects Management API built with Encore.ts",
};

// Health check endpoint - always good to have!
export const health = api(
  { expose: true, method: "GET", path: "/health" },
  async (): Promise<{ status: string; timestamp: string; services: string[] }> => {
    return {
      status: "healthy",
      timestamp: new Date().toISOString(),
      services: ["projects", "materials"]
    };
  }
);

// API Info endpoint - showcases automatic API documentation
export const apiInfo = api(
  { expose: true, method: "GET", path: "/" },
  async (): Promise<{
    message: string;
    documentation: string;
    features: string[];
    performance: string;
  }> => {
    return {
      message: "🔨 Welcome to the DIY Projects API built with Encore.ts!",
      documentation: "Visit /docs for interactive API documentation",
      features: [
        "Type-safe APIs with runtime validation",
        "Automatic OpenAPI documentation", 
        "Built-in observability and tracing",
        "9x faster than Express.js",
        "Zero boilerplate microservices"
      ],
      performance: "Powered by Rust runtime for maximum performance"
    };
  }
);