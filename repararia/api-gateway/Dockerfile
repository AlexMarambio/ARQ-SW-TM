FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

RUN pip install --no-cache-dir fastapi==0.115.6 uvicorn[standard]==0.34.0 PyJWT==2.10.1

COPY repararia/api-gateway/ .
COPY SOA /SOA

ENV PYTHONPATH="/SOA:${PYTHONPATH}"

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
