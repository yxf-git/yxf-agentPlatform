# 启动后端（Windows PowerShell）
# 用法：在 backend 目录下执行  .\run.ps1
$ErrorActionPreference = "Stop"

if (-not (Test-Path ".\.venv")) {
    Write-Host "首次运行：创建虚拟环境并安装依赖..." -ForegroundColor Cyan
    python -m venv .venv
    .\.venv\Scripts\python.exe -m pip install -r requirements.txt
}

if (-not (Test-Path ".\.env")) {
    Copy-Item ".env.example" ".env"
    Write-Host "已从 .env.example 生成 .env，请填入你的 OPENAI_API_KEY 后重新运行。" -ForegroundColor Yellow
    exit
}

.\.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
