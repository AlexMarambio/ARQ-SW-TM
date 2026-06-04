CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS usuario (
    id_usuario SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    rol VARCHAR(30) NOT NULL CHECK (rol IN ('administrador', 'mecanico', 'sysadmin')),
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    fecha_creacion TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Usuario inicial MVP:
-- email: admin@repararia.cl
-- password: Admin1234!
-- El password se almacena con bcrypt mediante pgcrypto, nunca en texto plano.
INSERT INTO usuario (nombre, email, password_hash, rol, activo)
VALUES (
    'Administrador RepararIA',
    'admin@repararia.cl',
    crypt('Admin1234!', gen_salt('bf')),
    'administrador',
    TRUE
)
ON CONFLICT (email) DO NOTHING;


select * from usuario;