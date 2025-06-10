-- Initial migration for DIY Projects database
-- This showcases Encore's automatic database management

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

-- Materials table (for the materials service)
CREATE TABLE materials (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(50) NOT NULL,
    unit VARCHAR(20) NOT NULL DEFAULT 'piece',
    price_per_unit DECIMAL(10,2) NOT NULL,
    supplier VARCHAR(255),
    sku VARCHAR(100),
    in_stock BOOLEAN DEFAULT true,
    stock_quantity INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Project materials junction table
CREATE TABLE project_materials (
    id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    material_id INTEGER NOT NULL REFERENCES materials(id),
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
CREATE INDEX idx_materials_category ON materials(category);
CREATE INDEX idx_project_materials_project_id ON project_materials(project_id);
CREATE INDEX idx_project_materials_material_id ON project_materials(material_id);

-- Insert some sample data for demonstration
INSERT INTO materials (name, description, category, unit, price_per_unit, supplier, sku) VALUES
('Pine Wood Board 2x4x8', 'Standard pine lumber for construction', 'lumber', 'piece', 8.99, 'Home Depot', 'HD-PINE-2X4X8'),
('Wood Screws 3"', 'Galvanized wood screws for outdoor projects', 'hardware', 'box', 12.49, 'Lowes', 'LW-SCREW-3IN'),
('Arduino Uno R3', 'Microcontroller board for electronics projects', 'electronics', 'piece', 24.99, 'Arduino Store', 'ARD-UNO-R3'),
('LED Strip RGB 5m', 'Color-changing LED strip for lighting projects', 'electronics', 'roll', 29.99, 'Amazon', 'AMZ-LED-RGB-5M'),
('Wood Stain Dark Oak', 'Premium wood stain for finishing', 'finishing', 'quart', 18.99, 'Sherwin Williams', 'SW-STAIN-DARK-OAK');

INSERT INTO projects (title, description, difficulty, category, estimated_hours, estimated_cost, status, instructions, tags) VALUES
('Beginner Birdhouse', 'A simple birdhouse perfect for first-time woodworkers', 'beginner', 'woodworking', 4, 25.99, 'completed', 
 '["Cut wood pieces to size", "Sand all surfaces", "Assemble with wood glue and screws", "Add roof and entrance hole", "Apply wood stain"]'::jsonb,
 '["beginner-friendly", "outdoor", "wildlife", "weekend-project"]'::jsonb),

('Smart Home LED Controller', 'Arduino-based controller for RGB LED strips with mobile app', 'intermediate', 'electronics', 12, 89.99, 'in_progress',
 '["Set up Arduino development environment", "Connect RGB LED strip to Arduino", "Program color control logic", "Create mobile app interface", "Test and debug"]'::jsonb,
 '["smart-home", "arduino", "led", "mobile-app", "automation"]'::jsonb),

('Garden Raised Bed', 'Custom raised bed for vegetable gardening', 'beginner', 'gardening', 6, 75.50, 'planning',
 '["Measure garden space", "Cut lumber to size", "Assemble frame with corner brackets", "Add hardware cloth bottom", "Fill with soil mix"]'::jsonb,
 '["gardening", "vegetables", "outdoor", "sustainable"]'::jsonb);

-- Link some materials to projects
INSERT INTO project_materials (project_id, material_id, quantity, unit_price, total_price, notes) VALUES
(1, 1, 2, 8.99, 17.98, 'For main structure'),
(1, 2, 1, 12.49, 12.49, 'Assembly screws'),
(2, 3, 1, 24.99, 24.99, 'Main controller'),
(2, 4, 1, 29.99, 29.99, 'RGB lighting');