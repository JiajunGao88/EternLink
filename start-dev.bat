@echo off
echo ========================================
echo EternLink Development Environment Setup
echo ========================================
echo.

echo [1/4] Starting Docker Database...
docker-compose up -d
if %errorlevel% neq 0 (
    echo ERROR: Failed to start Docker. Please make sure Docker Desktop is running.
    echo Press any key to exit...
    pause >nul
    exit /b 1
)
echo Database started successfully!
echo.

echo [2/4] Waiting for database to be ready...
timeout /t 5 /nobreak >nul
echo.

echo [3/4] Running Prisma migrations...
cd backend
call npm run prisma:migrate
if %errorlevel% neq 0 (
    echo ERROR: Prisma migration failed
    cd ..
    pause
    exit /b 1
)
cd ..
echo Migrations completed!
echo.

echo [4/4] Database setup complete!
echo.
echo ========================================
echo Next Steps:
echo ========================================
echo 1. Start backend: cd backend && npm run dev
echo 2. Frontend is already running on http://localhost:5173
echo 3. Backend will run on http://localhost:3001
echo.
echo To view database: cd backend && npm run prisma:studio
echo ========================================
pause
