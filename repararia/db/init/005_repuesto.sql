CREATE TABLE IF NOT EXISTS repuesto (
    id_repuesto SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    sku VARCHAR(50) UNIQUE,
    stock_actual INTEGER CHECK (stock_actual >= 0) NOT NULL,
    stock minimo INTEGER CHECK (stock_minimo >= 0) NOT NULL,
    precio_unitario NUMERIC(10,2) NOT NULL,
    proveedor VARCHAR(100)
);
