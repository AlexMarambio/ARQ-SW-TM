from fastapi import APIRouter, Request, HTTPException, Header
from call_service import call_service

router = APIRouter(prefix="/auth", tags=["Autenticacion"])

@router.post("/login")
async def login(request: Request):
    body = await request.json()
    return call_service("auten", "LOGIN", body)

@router.post("/register")
async def register(request: Request):
    body = await request.json()
    return call_service("auten", "REGISTER", body)

@router.get("/getme")
async def me(authorization: str = Header(None)):
    if not authorization:
        raise HTTPException(401, "Falta token")
    token = authorization.replace("Bearer ", "")
    return call_service("auten", "GET_ME", {}, auth={"token": token})