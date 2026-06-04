from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers.auth import router as auth_router
from routers.cliente import router as cliente_router
from routers.vehiculo import router as vehiculo_router

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

@app.get("/health")
def health():
    return {"status": "ok"}