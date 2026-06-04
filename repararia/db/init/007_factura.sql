CREATE TABLE IF NOT EXISTS factura (
    id_factura SERIAL PRIMARY KEY,
    id_orden INTEGER UNIQUE NOT NULL REFERENCES orden_trabajo(id_orden) ON DELETE CASCADE,
    fecha_emision TIMESTAMP DEFAULT NOW() NOT NULL,
    monto_total NUMERIC(12,2) CHECK (monto_total >= 0) NOT NULL,
    estado_pago VARCHAR(20) CHECK (estado_pago IN ('pendiente', 'pagado', 'anulado')) NOT NULL,
    metodo_pago VARCHAR(30)
);

-- Acá deberían ir más atributos relacionados a la factura, como detalles de pago, impuestos, etc. dependiendo de los requerimientos específicos del sistema.