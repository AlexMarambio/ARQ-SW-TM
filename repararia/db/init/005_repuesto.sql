CREATE TABLE IF NOT EXISTS repuesto (
    id_repuesto SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    sku VARCHAR(50) UNIQUE,
    stock INTEGER CHECK (stock >= 0) NOT NULL,
    precio_unitario NUMERIC(10,2) NOT NULL
);
