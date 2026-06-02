CREATE TABLE IF NOT EXISTS orden_repuesto (
    id_orden INTEGER REFERENCES orden_trabajo(id_orden) ON DELETE CASCADE,
    id_repuesto INTEGER REFERENCES repuesto(id_repuesto),
    cantidad INTEGER CHECK (cantidad > 0) NOT NULL,
    precio_unitario_momento NUMERIC(10,2) CHECK (precio_unitario_momento >= 0) NOT NULL,
    PRIMARY KEY (id_orden, id_repuesto)
);