import { Service } from "encore.dev/service";

// Define the Projects microservice
// Encore uses this to understand service boundaries and enable
// features like distributed tracing, service maps, and independent scaling
export default new Service("projects");