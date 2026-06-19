CREATE TABLE IF NOT EXISTS repuesto (
    id_repuesto SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    sku VARCHAR(50) UNIQUE,
    stock_actual INTEGER CHECK (stock_actual >= 0) NOT NULL,
    stock_minimo INTEGER CHECK (stock_minimo >= 0) NOT NULL,
    precio_unitario NUMERIC(10, 2) NOT NULL,
    proveedor VARCHAR(100)
);
-- 1. Renombrar la columna 'stock' a 'stock_actual'
ALTER TABLE repuesto
    RENAME COLUMN stock TO stock_actual;
-- 2. Agregar las columnas que faltan
ALTER TABLE repuesto
ADD COLUMN IF NOT EXISTS stock_minimo INTEGER DEFAULT 5;
ALTER TABLE repuesto
ADD COLUMN IF NOT EXISTS proveedor VARCHAR(100);
-- 3. Ajustar el constraint de chequeo (si es necesario)
ALTER TABLE repuesto DROP CONSTRAINT repuesto_stock_check;
ALTER TABLE repuesto
ADD CONSTRAINT repuesto_stock_check CHECK (stock_actual >= 0);