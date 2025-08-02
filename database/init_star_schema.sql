-- Drop existing tables if they exist to ensure a clean start
DROP TABLE IF EXISTS FactInventoryTransactions;
DROP TABLE IF EXISTS DimMaterial;
DROP TABLE IF EXISTS DimTool;
DROP TABLE IF EXISTS DimDiscipline; -- Added new drop for DimDiscipline
DROP TABLE IF EXISTS DimDate;

-- Dimension Table: DimDate
-- Stores date-related attributes for tracking when transactions occur.
CREATE TABLE DimDate (
    date_id INT PRIMARY KEY, -- Unique identifier for each date (e.g., YYYYMMDD)
    full_date DATE NOT NULL, -- Full date (e.g., '2025-07-26')
    year INT NOT NULL,
    month_number INT NOT NULL, -- Month as a number (1-12)
    month_name VARCHAR(20) NOT NULL, -- Full month name (e.g., 'July')
    day_of_month INT NOT NULL, -- Day of the month (1-31)
    weekday_number INT NOT NULL, -- Day of the week (e.g., 1 for Sunday, 7 for Saturday)
    weekday_name VARCHAR(20) NOT NULL, -- Full weekday name (e.g., 'Friday')
    quarter_number INT, -- Quarter of the year (1-4)
    quarter_name VARCHAR(20) -- Quarter name (e.g., 'Q3')
);

-- NEW Dimension Table: DimDiscipline
-- Stores categories like Plumbing, Electrical, Carpentry, etc.
CREATE TABLE DimDiscipline (
    discipline_id SERIAL PRIMARY KEY, -- Unique identifier for each discipline
    discipline_name VARCHAR(50) NOT NULL UNIQUE, -- Name of the discipline (e.g., 'Plumbing', 'Electrical')
    discipline_description TEXT -- Optional: A longer description of the discipline
);

-- Dimension Table: DimMaterial
-- Stores descriptive information about different construction materials.
CREATE TABLE DimMaterial (
    material_id SERIAL PRIMARY KEY, -- Unique identifier for each material
    material_name VARCHAR(100) NOT NULL, -- Name of the material (e.g., '2x4 Lumber', 'Wood Screws', 'White Paint')
    material_type VARCHAR(50), -- Category (e.g., 'Lumber', 'Fastener', 'Finishing')
    unit_of_measure VARCHAR(20) NOT NULL, -- How the material is measured (e.g., 'feet', 'each', 'gallon', 'box')
    brand VARCHAR(50), -- Brand of the material
    color VARCHAR(50), -- Color for paint, etc.
    size VARCHAR(50), -- Size for lumber, screws, etc. (e.g., '8ft', '#8 x 2"')
    discipline_id INT, -- NEW: Foreign Key to DimDiscipline
    CONSTRAINT fk_discipline_material FOREIGN KEY (discipline_id) REFERENCES DimDiscipline (discipline_id)
);

-- Dimension Table: DimTool
-- Stores descriptive information about different tools.
CREATE TABLE DimTool (
    tool_id SERIAL PRIMARY KEY, -- Unique identifier for each tool
    tool_name VARCHAR(100) NOT NULL, -- Name of the tool (e.g., 'Cordless Drill', 'Circular Saw', 'Tape Measure')
    tool_type VARCHAR(50), -- Category (e.g., 'Power Tool', 'Hand Tool', 'Measuring Tool')
    brand VARCHAR(50), -- Brand of the tool
    model VARCHAR(50), -- Model number of the tool
    current_location VARCHAR(100), -- Where the tool is currently stored (e.g., 'Toolbox A', 'Wall Rack')
    purchase_date DATE, -- Date the tool was acquired
    last_maintenance_date DATE, -- Date of last maintenance
    is_calibrated BOOLEAN DEFAULT FALSE, -- True if calibration is required and up-to-date
    discipline_id INT, -- NEW: Foreign Key to DimDiscipline
    CONSTRAINT fk_discipline_tool FOREIGN KEY (discipline_id) REFERENCES DimDiscipline (discipline_id)
);

-- Fact Table: FactInventoryTransactions
-- Records every movement (addition or removal) of materials and tools.
CREATE TABLE FactInventoryTransactions (
    transaction_id SERIAL PRIMARY KEY, -- Unique identifier for each transaction
    date_id INT NOT NULL, -- Foreign Key to DimDate
    material_id INT, -- Foreign Key to DimMaterial (NULL if transaction is for a tool)
    tool_id INT,     -- Foreign Key to DimTool (NULL if transaction is for a material)
    quantity_change NUMERIC(10, 2) NOT NULL, -- Positive for added, negative for removed
    cost_per_unit NUMERIC(10, 2), -- Cost of the item per unit at time of transaction
    total_cost NUMERIC(10, 2), -- Calculated cost for this transaction (quantity_change * cost_per_unit)
    transaction_type VARCHAR(50) NOT NULL, -- e.g., 'Purchase', 'Usage', 'Return', 'Disposal'
    notes TEXT, -- Any additional notes about the transaction

    -- Foreign Key Constraints
    CONSTRAINT fk_date FOREIGN KEY (date_id) REFERENCES DimDate (date_id),
    CONSTRAINT fk_material FOREIGN KEY (material_id) REFERENCES DimMaterial (material_id),
    CONSTRAINT fk_tool FOREIGN KEY (tool_id) REFERENCES DimTool (tool_id),

    -- Ensure that either material_id or tool_id is present, but not both
    CONSTRAINT chk_material_or_tool CHECK (
        (material_id IS NOT NULL AND tool_id IS NULL) OR
        (material_id IS NULL AND tool_id IS NOT NULL)
    )
);