"""
Script pour créer ou vérifier le compte admin
Email: admin@quartierdaromes.com
Mot de passe: admin123
"""
import os
from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_bcrypt import Bcrypt

# Configuration Flask simple
app = Flask(__name__)
basedir = os.path.abspath(os.path.dirname(__file__))
app.config['SQLALCHEMY_DATABASE_URI'] = f'sqlite:///{os.path.join(basedir, "database", "quartier.db")}'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Initialiser la base de données et bcrypt
db = SQLAlchemy(app)
bcrypt = Bcrypt(app)

# Modèle User simplifié
class User(db.Model):
    __tablename__ = 'users'
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password = db.Column(db.String(200), nullable=False)
    is_admin = db.Column(db.Boolean, default=False)

def create_or_update_admin():
    """Créer ou mettre à jour le compte admin"""
    with app.app_context():
        admin_email = 'admin@quartierdaromes.com'
        admin_password = 'admin123'
        
        # Chercher l'admin
        admin = User.query.filter_by(email=admin_email).first()
        
        if admin:
            print(f"✅ Compte admin trouvé: {admin.email}")
            print(f"   Username: {admin.username}")
            print(f"   Est admin: {admin.is_admin}")
            
            # Mettre à jour le mot de passe avec bcrypt
            admin.password = bcrypt.generate_password_hash(admin_password).decode('utf-8')
            admin.is_admin = True
            db.session.commit()
            print(f"   ✅ Mot de passe mis à jour avec bcrypt: admin123")
        else:
            print("⚠️  Aucun compte admin trouvé. Création...")
            
            # Créer le compte admin avec bcrypt
            admin = User(
                username='admin',
                email=admin_email,
                password=bcrypt.generate_password_hash(admin_password).decode('utf-8'),
                is_admin=True
            )
            db.session.add(admin)
            db.session.commit()
            print(f"✅ Compte admin créé avec succès avec bcrypt!")
        
        print("\n" + "="*60)
        print("INFORMATIONS DE CONNEXION ADMIN")
        print("="*60)
        print(f"📧 Email: {admin_email}")
        print(f"🔑 Mot de passe: {admin_password}")
        print(f"🌐 URL Admin Login: http://127.0.0.1:5000/admin/login")
        print(f"🌐 URL Dashboard: http://127.0.0.1:5000/admin")
        print("="*60)

if __name__ == '__main__':
    print("="*60)
    print("CRÉATION/VÉRIFICATION DU COMPTE ADMIN")
    print("="*60)
    create_or_update_admin()
