"""
APPLICATION CLIENT - Quartier d'Arômes
Site public pour visiteurs et clients
Port: 5000
"""

# Import de l'application principale
from app import app

# Désactiver toutes les routes admin pour cette instance
def disable_admin_routes():
    """Désactive les routes admin dans l'application client"""
    import sys
    from flask import abort
    
    # Liste des préfixes de routes à désactiver
    admin_prefixes = ['/admin']
    
    # Créer un wrapper pour bloquer les routes admin
    original_view_functions = {}
    for rule in app.url_map.iter_rules():
        if any(rule.rule.startswith(prefix) for prefix in admin_prefixes):
            endpoint = rule.endpoint
            if endpoint in app.view_functions:
                original_view_functions[endpoint] = app.view_functions[endpoint]
                # Remplacer par une fonction qui renvoie 404
                app.view_functions[endpoint] = lambda: abort(404)
    
    print(f"✅ Routes admin désactivées: {len(original_view_functions)} routes bloquées")

if __name__ == '__main__':
    with app.app_context():
        from models import db
        db.create_all()
        print("🛍️  APPLICATION CLIENT démarrée sur http://127.0.0.1:5000")
        print("📋 Routes disponibles: Accueil, Collections, Panier, Profil, Contact...")
        print("🚫 Routes admin: DÉSACTIVÉES (404)")
    
    # Désactiver les routes admin
    disable_admin_routes()
    
    # Lancer l'application sur le port 5000
    # use_reloader=True pour recharger automatiquement lors des modifications
    app.run(debug=True, port=5000, use_reloader=True)
