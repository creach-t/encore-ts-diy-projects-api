-- Projects service database migration
-- Simplified to work with separate Materials service

-- Projects table
CREATE TABLE projects (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    difficulty VARCHAR(20) NOT NULL CHECK (difficulty IN ('beginner', 'intermediate', 'advanced', 'expert')),
    category VARCHAR(30) NOT NULL CHECK (category IN ('woodworking', 'electronics', 'gardening', 'home_improvement', 'crafts', 'automotive', 'other')),
    estimated_hours INTEGER NOT NULL CHECK (estimated_hours > 0),
    estimated_cost DECIMAL(10,2) NOT NULL DEFAULT 0,
    actual_cost DECIMAL(10,2),
    status VARCHAR(20) NOT NULL DEFAULT 'planning' CHECK (status IN ('planning', 'in_progress', 'completed', 'paused', 'cancelled')),
    instructions JSONB DEFAULT '[]'::jsonb,
    image_urls JSONB DEFAULT '[]'::jsonb,
    tags JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Project materials junction table
-- Note: material_id references the materials service database
CREATE TABLE project_materials (
    id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    material_id INTEGER NOT NULL, -- References materials.materials(id) from Materials service
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price DECIMAL(10,2) NOT NULL,
    total_price DECIMAL(10,2) NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for better performance
CREATE INDEX idx_projects_difficulty ON projects(difficulty);
CREATE INDEX idx_projects_category ON projects(category);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_created_at ON projects(created_at);
CREATE INDEX idx_project_materials_project_id ON project_materials(project_id);
CREATE INDEX idx_project_materials_material_id ON project_materials(material_id);

-- Full-text search index for projects
CREATE INDEX idx_projects_search ON projects USING gin(to_tsvector('english', title || ' ' || description));

-- Insert sample data for demonstration
INSERT INTO projects (title, description, difficulty, category, estimated_hours, estimated_cost, status, instructions, tags) VALUES
('Beginner Birdhouse', 'A simple birdhouse perfect for first-time woodworkers', 'beginner', 'woodworking', 4, 25.99, 'completed', 
 '["Cut wood pieces to size", "Sand all surfaces", "Assemble with wood glue and screws", "Add roof and entrance hole", "Apply wood stain"]'::jsonb,
 '["beginner-friendly", "outdoor", "wildlife", "weekend-project"]'::jsonb),

('Smart Home LED Controller', 'Arduino-based controller for RGB LED strips with mobile app', 'intermediate', 'electronics', 12, 89.99, 'in_progress',
 '["Set up Arduino development environment", "Connect RGB LED strip to Arduino", "Program color control logic", "Create mobile app interface", "Test and debug"]'::jsonb,
 '["smart-home", "arduino", "led", "mobile-app", "automation"]'::jsonb),

('Garden Raised Bed', 'Custom raised bed for vegetable gardening', 'beginner', 'gardening', 6, 75.50, 'planning',
 '["Measure garden space", "Cut lumber to size", "Assemble frame with corner brackets", "Add hardware cloth bottom", "Fill with soil mix"]'::jsonb,
 '["gardening", "vegetables", "outdoor", "sustainable"]'::jsonb),

('Wooden Coffee Table', 'Modern minimalist coffee table with storage', 'intermediate', 'woodworking', 16, 150.00, 'planning',
 '["Design table dimensions", "Cut wood pieces", "Create storage compartment", "Sand and finish", "Assemble with joinery"]'::jsonb,
 '["furniture", "modern", "storage", "living-room"]'::jsonb),

('IoT Weather Station', 'WiFi-enabled weather monitoring station with web dashboard', 'advanced', 'electronics', 20, 120.00, 'planning',
 '["Design sensor layout", "Set up microcontroller", "Program sensor readings", "Create web dashboard", "Install weatherproof housing"]'::jsonb,
 '["iot", "weather", "sensors", "web-dashboard", "outdoor"]'::jsonb);

-- Link some materials to projects (these will reference materials from the Materials service)
-- Note: These material_ids should match the ones created in the Materials service migration
INSERT INTO project_materials (project_id, material_id, quantity, unit_price, total_price, notes) VALUES
-- Birdhouse project
(1, 1, 2, 8.99, 17.98, 'Pine boards for main structure'),
(1, 3, 1, 12.49, 12.49, 'Wood screws for assembly'),

-- Smart LED Controller project  
(2, 5, 1, 24.99, 24.99, 'Arduino Uno R3 - main controller'),
(2, 6, 1, 29.99, 29.99, 'RGB LED strip - 5 meters'),
(2, 7, 2, 8.99, 17.98, 'Breadboards for prototyping'),

-- Garden Raised Bed project
(3, 1, 4, 8.99, 35.96, 'Pine lumber for frame construction'),
(3, 3, 2, 12.49, 24.98, 'Screws and hardware'),

-- Coffee Table project
(4, 2, 2, 89.99, 179.98, 'Oak plywood for tabletop and storage'),
(4, 11, 1, 22.99, 22.99, 'Polyurethane finish'),

-- Weather Station project
(5, 5, 1, 24.99, 24.99, 'Arduino for sensor control'),
(5, 7, 1, 8.99, 8.99, 'Breadboard for connections');