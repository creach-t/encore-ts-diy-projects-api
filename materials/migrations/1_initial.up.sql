-- Materials service database migration
-- This creates the materials database with comprehensive material management

-- Materials table
CREATE TABLE materials (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(50) NOT NULL CHECK (category IN ('wood', 'metal', 'plastic', 'electronics', 'hardware', 'tools', 'fabric', 'glass', 'stone', 'chemicals', 'other')),
    unit VARCHAR(20) NOT NULL CHECK (unit IN ('piece', 'meter', 'liter', 'kilogram', 'gram', 'square_meter', 'cubic_meter', 'foot', 'inch', 'gallon', 'pound')),
    price_per_unit DECIMAL(10,2) NOT NULL CHECK (price_per_unit >= 0),
    stock_quantity INTEGER NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
    min_stock_level INTEGER NOT NULL DEFAULT 0 CHECK (min_stock_level >= 0),
    supplier VARCHAR(255),
    supplier_part_number VARCHAR(255),
    image_url VARCHAR(500),
    specifications JSONB DEFAULT '{}'::jsonb,
    tags JSONB DEFAULT '[]'::jsonb,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Stock adjustment records for audit trail
CREATE TABLE stock_adjustments (
    id SERIAL PRIMARY KEY,
    material_id INTEGER NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
    quantity_before INTEGER NOT NULL,
    quantity_change INTEGER NOT NULL,
    quantity_after INTEGER NOT NULL,
    reason TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for better performance
CREATE INDEX idx_materials_category ON materials(category);
CREATE INDEX idx_materials_name ON materials(name);
CREATE INDEX idx_materials_supplier ON materials(supplier);
CREATE INDEX idx_materials_active ON materials(is_active);
CREATE INDEX idx_materials_stock_level ON materials(stock_quantity);
CREATE INDEX idx_stock_adjustments_material_id ON stock_adjustments(material_id);
CREATE INDEX idx_stock_adjustments_created_at ON stock_adjustments(created_at);

-- Full-text search index
CREATE INDEX idx_materials_search ON materials USING gin(to_tsvector('english', name || ' ' || description));

-- Insert comprehensive sample data for demonstration
INSERT INTO materials (name, description, category, unit, price_per_unit, stock_quantity, min_stock_level, supplier, supplier_part_number, specifications, tags) VALUES
-- Wood materials
('Pine Wood Board 2x4x8', 'Standard pine lumber, kiln-dried, perfect for construction and DIY projects', 'wood', 'piece', 8.99, 50, 10, 'Home Depot', 'HD-PINE-2X4X8', 
 '{"length_ft": 8, "width_in": 3.5, "thickness_in": 1.5, "grade": "construction"}'::jsonb, 
 '["lumber", "construction", "pine", "framing"]'::jsonb),

('Oak Plywood 4x8x0.75', 'Premium oak plywood sheet for furniture and cabinetry', 'wood', 'piece', 89.99, 15, 3, 'Lowes', 'LW-OAK-PLY-48-75', 
 '{"length_ft": 8, "width_ft": 4, "thickness_in": 0.75, "grade": "furniture"}'::jsonb, 
 '["plywood", "oak", "furniture", "cabinetry"]'::jsonb),

-- Hardware
('Wood Screws 3" Galvanized', 'Galvanized wood screws for outdoor projects, 100 count', 'hardware', 'piece', 12.49, 25, 5, 'Lowes', 'LW-SCREW-3IN-GAL', 
 '{"length_in": 3, "thread_type": "wood", "coating": "galvanized", "count": 100}'::jsonb, 
 '["screws", "galvanized", "outdoor", "fasteners"]'::jsonb),

('Hinges Heavy Duty 4"', 'Heavy duty door hinges, stainless steel, set of 2', 'hardware', 'piece', 24.99, 30, 8, 'Home Depot', 'HD-HINGE-4IN-SS', 
 '{"size_in": 4, "material": "stainless_steel", "weight_capacity_lbs": 150, "count": 2}'::jsonb, 
 '["hinges", "stainless-steel", "heavy-duty", "door"]'::jsonb),

-- Electronics
('Arduino Uno R3', 'Official Arduino Uno R3 microcontroller board with USB cable', 'electronics', 'piece', 24.99, 20, 5, 'Arduino Store', 'ARD-UNO-R3', 
 '{"microcontroller": "ATmega328P", "operating_voltage": "5V", "digital_pins": 14, "analog_pins": 6}'::jsonb, 
 '["arduino", "microcontroller", "development", "prototyping"]'::jsonb),

('LED Strip RGB 5m', 'Color-changing LED strip with remote control, 300 LEDs', 'electronics', 'meter', 29.99, 12, 3, 'Amazon', 'AMZ-LED-RGB-5M', 
 '{"length_m": 5, "led_count": 300, "voltage": "12V", "waterproof": "IP65"}'::jsonb, 
 '["led", "rgb", "lighting", "smart-home"]'::jsonb),

('Breadboard 830 Points', 'Solderless breadboard for prototyping electronic circuits', 'electronics', 'piece', 8.99, 35, 10, 'Adafruit', 'ADA-BB-830', 
 '{"tie_points": 830, "size": "full", "color": "white", "material": "ABS"}'::jsonb, 
 '["breadboard", "prototyping", "solderless", "circuits"]'::jsonb),

-- Metal materials
('Aluminum Angle 1x1x8', 'Aluminum angle bar for structural projects', 'metal', 'piece', 15.99, 40, 8, 'Metal Supermarket', 'MS-AL-ANGLE-1X1X8', 
 '{"material": "aluminum", "dimensions": "1x1x8", "alloy": "6061-T6", "finish": "mill"}'::jsonb, 
 '["aluminum", "angle", "structural", "fabrication"]'::jsonb),

-- Tools
('Drill Bit Set 10pc', 'High-speed steel drill bit set, 1/16" to 1/2"', 'tools', 'piece', 19.99, 18, 3, 'DeWalt', 'DW-DRILLBIT-10PC', 
 '{"material": "HSS", "count": 10, "size_range": "1/16 to 1/2 inch", "coating": "black_oxide"}'::jsonb, 
 '["drill-bits", "hss", "set", "precision"]'::jsonb),

-- Finishing materials
('Wood Stain Dark Oak', 'Premium penetrating wood stain for interior projects', 'chemicals', 'liter', 18.99, 22, 4, 'Sherwin Williams', 'SW-STAIN-DARK-OAK', 
 '{"color": "dark_oak", "type": "penetrating", "coverage_sqft": 150, "dry_time_hours": 8}'::jsonb, 
 '["stain", "wood-finish", "dark-oak", "interior"]'::jsonb),

('Polyurethane Clear Satin', 'Clear protective finish for wood projects', 'chemicals', 'liter', 22.99, 18, 3, 'Minwax', 'MW-POLY-CLEAR-SATIN', 
 '{"finish": "satin", "type": "polyurethane", "coverage_sqft": 125, "coats_recommended": 3}'::jsonb, 
 '["polyurethane", "clear", "protective", "satin"]'::jsonb);

-- Create initial stock adjustment records
INSERT INTO stock_adjustments (material_id, quantity_before, quantity_change, quantity_after, reason) 
SELECT id, 0, stock_quantity, stock_quantity, 'Initial inventory setup'
FROM materials;