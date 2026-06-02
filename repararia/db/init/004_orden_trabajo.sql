CREATE TABLE IF NOT EXISTS orden_trabajo (
    id_orden SERIAL PRIMARY KEY,
    id_cliente INTEGER NOT NULL REFERENCES cliente(id_cliente),
    id_vehiculo INTEGER NOT NULL REFERENCES vehiculo(id_vehiculo),
    id_mecanico INTEGER REFERENCES usuario(id_usuario),  -- mecánico es un usuario con rol 'mecanico'
    fecha_ingreso TIMESTAMP DEFAULT NOW() NOT NULL,
    fecha_estimada DATE,
    fecha_entrega TIMESTAMP,
    descripcion_problema TEXT NOT NULL,
    diagnostico TEXT,
    trabajos_realizados TEXT,
    estado VARCHAR(20) CHECK (estado IN ('pendiente', 'en_reparacion', 'listo', 'entregado')) NOT NULL,
    costo_total NUMERIC(10,2) CHECK (costo_total >= 0) NOT NULL,
    observaciones TEXT
);