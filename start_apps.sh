#!/bin/bash

echo "========================================================"
echo "   QUARTIER D'AROMES - Démarrage Applications"
echo "========================================================"
echo ""
echo "Ce script va démarrer 2 applications séparées:"
echo ""
echo "[1] APPLICATION CLIENT (Port 5000)"
echo "    - Site public pour les visiteurs/clients"
echo "    - URL: http://127.0.0.1:5000"
echo ""
echo "[2] APPLICATION ADMIN (Port 5001)"
echo "    - Dashboard d'administration"
echo "    - URL: http://127.0.0.1:5001/admin"
echo "    - Login: admin@quartierdaromes.com / admin123"
echo ""
echo "========================================================"
echo ""

# Activer l'environnement virtuel si il existe
if [ -f "venv/bin/activate" ]; then
    source venv/bin/activate
    echo "Environnement virtuel activé"
    echo ""
fi

echo "[1] Démarrage de l'application CLIENT (Port 5000)..."

# Détection du système d'exploitation
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    osascript -e 'tell app "Terminal" to do script "cd \"'$(pwd)'\" && source venv/bin/activate 2>/dev/null; python app_client.py"'
elif command -v gnome-terminal &> /dev/null; then
    # Linux avec GNOME Terminal
    gnome-terminal --title="CLIENT - Quartier d'Arômes" -- bash -c "cd '$(pwd)' && source venv/bin/activate 2>/dev/null; python app_client.py; exec bash"
elif command -v xterm &> /dev/null; then
    # Linux avec xterm
    xterm -T "CLIENT - Quartier d'Arômes" -hold -e "cd '$(pwd)' && source venv/bin/activate 2>/dev/null; python app_client.py" &
elif command -v konsole &> /dev/null; then
    # Linux avec Konsole (KDE)
    konsole --hold -e bash -c "cd '$(pwd)' && source venv/bin/activate 2>/dev/null; python app_client.py" &
else
    # Fallback: lancer en arrière-plan
    echo "Terminal graphique non détecté, lancement en arrière-plan..."
    python app_client.py > client.log 2>&1 &
    CLIENT_PID=$!
    echo "PID Client: $CLIENT_PID"
fi

sleep 2

echo "[2] Démarrage de l'application ADMIN (Port 5001)..."

if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    osascript -e 'tell app "Terminal" to do script "cd \"'$(pwd)'\" && source venv/bin/activate 2>/dev/null; python app_admin.py"'
elif command -v gnome-terminal &> /dev/null; then
    # Linux avec GNOME Terminal
    gnome-terminal --title="ADMIN - Quartier d'Arômes" -- bash -c "cd '$(pwd)' && source venv/bin/activate 2>/dev/null; python app_admin.py; exec bash"
elif command -v xterm &> /dev/null; then
    # Linux avec xterm
    xterm -T "ADMIN - Quartier d'Arômes" -hold -e "cd '$(pwd)' && source venv/bin/activate 2>/dev/null; python app_admin.py" &
elif command -v konsole &> /dev/null; then
    # Linux avec Konsole (KDE)
    konsole --hold -e bash -c "cd '$(pwd)' && source venv/bin/activate 2>/dev/null; python app_admin.py" &
else
    # Fallback: lancer en arrière-plan
    python app_admin.py > admin.log 2>&1 &
    ADMIN_PID=$!
    echo "PID Admin: $ADMIN_PID"
fi

echo ""
echo "========================================================"
echo "Les 2 applications ont été lancées!"
echo ""
echo "CLIENT: http://127.0.0.1:5000"
echo "ADMIN:  http://127.0.0.1:5001/admin"
echo ""
echo "Fermez les fenêtres des terminaux pour arrêter les applications."
echo ""
echo "Si les applications tournent en arrière-plan:"
echo "  - Logs: client.log et admin.log"
echo "  - Arrêter: kill \$CLIENT_PID \$ADMIN_PID"
echo "========================================================"
echo ""
