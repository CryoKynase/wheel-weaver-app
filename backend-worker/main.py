from workers import WorkerEntrypoint
from fastapi import FastAPI
import asgi
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://wheelweaver.com",
        "https://www.wheelweaver.com",
        "https://wheel-weaver-app.pages.dev",
        "https://wheel-weaver-app.pages.dev",  # harmless duplicate
    ],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/health")
async def health():
    return {"ok": True}

class Default(WorkerEntrypoint):
    async def fetch(self, request):
        return await asgi.fetch(app, request, self.env)
