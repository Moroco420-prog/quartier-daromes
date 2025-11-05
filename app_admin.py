"""
APPLICATION ADMIN - Quartier d'Arômes
Dashboard d'administration
Port: 5001
"""

# Import de l'application principale
from app import app

# Désactiver toutes les routes publiques sauf admin
def configure_admin_only():
    """Configure l'application pour n'autoriser que les routes admin"""
    import sys
    from flask import abort, redirect, url_for
    from flask_login import current_user
    
    # Liste des routes publiques à garder (nécessaires pour admin)
    keep_routes = [
        '/static/',
        '/login',
        '/logout',
        '/admin'
    ]
    
    # Créer un wrapper pour bloquer les routes non-admin
    original_view_functions = {}
    for rule in app.url_map.iter_rules():
        # Ignorer les routes statiques
        if rule.rule.startswith('/static/'):
            continue
        
        # Garder les routes admin et auth nécessaires
        if any(rule.rule.startswith(prefix) for prefix in keep_routes):
            continue
        
        # Bloquer toutes les autres routes publiques
        endpoint = rule.endpoint
        if endpoint in app.view_functions:
            original_view_functions[endpoint] = app.view_functions[endpoint]
            # Remplacer par une redirection vers admin
            def redirect_to_admin():
                if current_user.is_authenticated and current_user.is_admin:
                    return redirect(url_for('admin_dashboard'))
                return redirect(url_for('login'))
            
            app.view_functions[endpoint] = redirect_to_admin
    
    print(f"✅ Routes publiques désactivées: {len(original_view_functions)} routes bloquées")
    print(f"✅ Seules les routes /admin/* et /login sont accessibles")

# Personnaliser le message de connexion pour admin
@app.before_request
def check_admin_access():
    """Vérifier que seuls les admins accèdent à cette instance"""
    from flask import request, redirect, url_for, flash
    from flask_login import current_user
    
    # Autoriser les routes statiques et de connexion
    if request.endpoint in ['static', 'login', 'logout'] or \
       (request.endpoint and request.endpoint.startswith('admin')):
        return None
    
    # Rediriger tout le reste vers admin dashboard ou login
    if current_user.is_authenticated and current_user.is_admin:
        return redirect(url_for('admin_dashboard'))
    else:
        flash('Cette interface est réservée aux administrateurs.', 'warning')
        return redirect(url_for('login'))

if __name__ == '__main__':
    with app.app_context():
        from models import db
        db.create_all()
        print("=" * 60)
        print("🔐 APPLICATION ADMIN démarrée sur http://127.0.0.1:5001")
        print("=" * 60)
        print("📊 Dashboard: http://127.0.0.1:5001/admin")
        print("🔑 Connexion: admin@quartierdaromes.com / admin123")
        print("🚫 Routes publiques: DÉSACTIVÉES")
        print("=" * 60)
    
    # Configurer mode admin uniquement
    # Note: configure_admin_only() est commenté car il interfère avec le before_request
    # Le before_request handle déjà la logique de redirection
    
    # Lancer l'application sur le port 5001
    # use_reloader=True pour recharger automatiquement lors des modifications
    app.run(debug=True, port=5001, use_reloader=True)
