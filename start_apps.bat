@echo off
chcp 65001 > nul
echo ========================================================
echo    QUARTIER D'AROMES - Demarrage Applications
echo ========================================================
echo.
echo Ce script va demarrer 2 applications separees:
echo.
echo [1] APPLICATION CLIENT (Port 5000)
echo     - Site public pour les visiteurs/clients
echo     - URL: http://127.0.0.1:5000
echo.
echo [2] APPLICATION ADMIN (Port 5001)
echo     - Dashboard d'administration
echo     - URL: http://127.0.0.1:5001/admin
echo     - Login: admin@quartierdaromes.com / admin123
echo.
echo ========================================================
echo.

REM Activer l'environnement virtuel si il existe
if exist venv\Scripts\activate.bat (
    call venv\Scripts\activate.bat
    echo Environnement virtuel active
    echo.
)

echo [1] Demarrage de l'application CLIENT (Port 5000)...
start "CLIENT - Quartier d'Aromes" cmd /k "python app_client.py"

timeout /t 2 /nobreak > nul

echo [2] Demarrage de l'application ADMIN (Port 5001)...
start "ADMIN - Quartier d'Aromes" cmd /k "python app_admin.py"

echo.
echo ========================================================
echo Les 2 applications ont ete lancees!
echo.
echo CLIENT: http://127.0.0.1:5000
echo ADMIN:  http://127.0.0.1:5001/admin
echo.
echo Fermez les fenetres des applications pour les arreter.
echo ========================================================
echo.

pause
