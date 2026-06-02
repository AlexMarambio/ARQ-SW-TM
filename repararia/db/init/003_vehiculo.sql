CREATE TABLE IF NOT EXISTS vehiculo (
    id_vehiculo SERIAL PRIMARY KEY,
    id_cliente INT NOT NULL,
    marca VARCHAR(50) NOT NULL,
    modelo VARCHAR(50) NOT NULL,
    anio INT NOT NULL,
    patente VARCHAR(20) UNIQUE NOT NULL,
    kilometraje INT NOT NULL,
    color VARCHAR(30),
    fecha_registro TIMESTAMP NOT NULL DEFAULT NOW(),
    FOREIGN KEY (id_cliente) REFERENCES cliente(id_cliente) ON DELETE CASCADE
);

-- Se agregan más atributos de ser necesario