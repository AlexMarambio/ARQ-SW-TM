# auditoria_utils.py
import os
import psycopg

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://repararia:repararia_dev@postgres:5432/repararia")

def registrar_auditoria(id_usuario, accion, entidad, entidad_id=None, detalle=None, ip_origen=None):
    conn = psycopg.connect(DATABASE_URL)
    cur = conn.cursor()
    try:
        cur.execute(
            "INSERT INTO auditoria (id_usuario, accion, entidad, entidad_id, detalle, ip_origen) VALUES (%s, %s, %s, %s, %s, %s)",
            (id_usuario, accion, entidad, entidad_id, detalle, ip_origen)
        )
        conn.commit()
    except Exception as e:
        print(f"Error en auditoría: {e}")
    finally:
        cur.close()
        conn.close()