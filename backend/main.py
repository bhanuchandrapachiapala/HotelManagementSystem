import traceback
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import uvicorn

from config import settings
from routers import tasks, orders
from routers.housekeeping import router as housekeeping_router

app = FastAPI(title="CascoBay HMS API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(Exception)
async def unhandled_exception_handler(_request: Request, exc: Exception) -> JSONResponse:
    traceback.print_exc()
    return JSONResponse(status_code=500, content={"detail": str(exc)})

app.include_router(tasks.router, prefix="/api/tasks")
app.include_router(orders.router, prefix="/api/orders")
app.include_router(housekeeping_router, prefix="/api/housekeeping")


@app.get("/")
def root():
    return {"status": "ok", "app": "CascoBay HMS"}


@app.get("/health")
def health():
    return {"status": "healthy"}


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
