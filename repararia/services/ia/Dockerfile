FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copiar todos los archivos necesarios
COPY soa_lib.py .
COPY rag.py .
COPY main.py .

# Si tienes otros archivos como ingest.py, no los necesitas en producción
# Pero asegúrate de tener los modelos descargados (se descargan al primer uso)

CMD ["python", "main.py"]