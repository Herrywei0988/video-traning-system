@echo off
echo ======================================
echo   培訓知識整理系統 v3 - 啟動中
echo ======================================

where python >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: 找不到 Python，請先安裝 Python 3.10+
    pause & exit /b 1
)

where node >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: 找不到 Node.js，請先安裝 Node.js 18+
    echo 前往 https://nodejs.org 下載
    pause & exit /b 1
)

if not exist "backend\.env" (
    copy backend\.env.example backend\.env
    echo 已建立 backend\.env，請填入 OPENAI_API_KEY 後重新執行
    pause & exit /b 0
)

echo 安裝前端套件並建置 React...
cd frontend
call npm install --silent
call npm run build
cd ..
echo 前端建置完成

echo 安裝後端套件...
cd backend
if not exist "venv" python -m venv venv
call venv\Scripts\activate.bat
pip install -q -r requirements.txt
if not exist "uploads" mkdir uploads

echo.
echo ======================================
echo  啟動成功！
echo  請開啟瀏覽器：http://localhost:8000
echo ======================================
echo.

python app.py
pause
