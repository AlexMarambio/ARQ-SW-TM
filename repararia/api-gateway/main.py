from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers.auth import router as auth_router
from routers.cliente import router as cliente_router
from routers.vehiculo import router as vehiculo_router
from routers.repuesto import router as repuesto_router
from routers.ordenes import router as ordenes_router
from routers.facturacion import router as facturacion_router
from routers.auditoria import router as auditoria_router

app = FastAPI(title="RepararIA-API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Incluir routers
app.include_router(auth_router)
app.include_router(cliente_router)
app.include_router(vehiculo_router)
app.include_router(repuesto_router)
app.include_router(facturacion_router)
app.include_router(ordenes_router)
app.include_router(auditoria_router)

@app.get("/health")
def health():
    return {"status": "ok"}