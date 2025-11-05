# 🌸 Quartier d'Arômes - E-Commerce de Parfumerie Premium

Site e-commerce professionnel complet pour parfumerie de luxe, développé avec Flask, SQLAlchemy et Bootstrap 5.

## ✨ Fonctionnalités Complètes

### 🛍️ Côté Client - Expérience d'Achat Premium

#### Navigation & Découverte
- **Catalogue dynamique** : Collections, parfums complets et décants
- **Recherche intelligente** : Filtrage par nom, marque et description
- **Filtres avancés** : Catégorie, type, marque, prix, taille
- **Tri flexible** : Par nom, prix croissant/décroissant, nouveautés
- **Détails produits** : Images, description, caractéristiques

#### Shopping & Commande
- **Panier intelligent** : Ajout/modification/suppression en temps réel
- **Codes promo** 💰 : Réductions pourcentage ou montant fixe
- **Checkout sécurisé** : Formulaire complet avec validation
- **Intégration WhatsApp** : Finalisation commande via WhatsApp
- **Numéros uniques** : Format ORD-20251101-0001
- **Historique complet** : Page "Mes Commandes" détaillée

#### Interactions Sociales
- **Système d'avis** ⭐ : Notes 1-5 étoiles et commentaires
- **Achat vérifié** : Badge pour les avis d'acheteurs confirmés
- **Wishlist** : Liste de favoris personnalisée
- **Recommandations** : Produits similaires suggérés

#### Gestion du Compte
- **Profil utilisateur** : Informations modifiables
- **Mes Commandes** : Suivi détaillé avec statuts
- **Wishlist** : Gestion des favoris
- **Notifications** : Messages flash pour les actions

### 🛠️ Côté Admin - Gestion Professionnelle

#### Dashboard & Statistiques
- **Vue d'ensemble** : Cartes de statistiques en temps réel
- **Design moderne** : Interface cohérente avec couleur #C4942F
- **Navigation intuitive** : Sidebar avec accès rapides

#### Gestion des Produits
- **CRUD complet** : Créer, Lire, Modifier, Supprimer
- **Upload sécurisé** : Images avec validation format/taille
- **Filtrage** : Par marque avec indicateur visuel
- **Recherche** : Instantanée dans la liste
- **Suppression POST** : Protection contre suppressions accidentelles

#### Gestion des Marques 🏆
- **Table dédiée** : Marques indépendantes avec logos
- **CRUD complet** : Toutes opérations disponibles
- **Upload logos** : Aperçu immédiat
- **Affichage dynamique** : Sur site et admin
- **Protection** : Impossible de supprimer si produits liés

#### Gestion des Codes Promo 🎟️
- **Types** : Pourcentage (%) ou montant fixe (DH)
- **Conditions** : Achat minimum requis
- **Limites** : Nombre d'utilisations maximum
- **Validité** : Dates de début et fin
- **Statuts** : Actif/Inactif avec toggle
- **Statistiques** : Nombre d'utilisations par code

#### Gestion des Commandes
- **Liste complète** : Toutes les commandes
- **Détails** : Produits, client, montants
- **Statuts** : En attente, en cours, expédiée, livrée
- **Numéros uniques** : Traçabilité garantie

#### Gestion des Utilisateurs
- **Liste clients** : Tous les utilisateurs
- **Rôles** : Admin (unique) et Clients
- **Sécurité** : Un seul compte admin possible

#### Messages & Contact
- **Formulaire contact** : Stockage en base
- **Consultation** : Liste des messages reçus

## 📋 Prérequis

- Python 3.8+
- pip (gestionnaire de paquets Python)

## 🛠️ Installation Rapide

### 1️⃣ Prérequis
```bash
# Vérifier Python
python --version  # 3.8+ requis
```

### 2️⃣ Installation des Dépendances
```bash
cd "c:\Program Files (x86)\EasyPHP-Devserver-17\eds-www\Proj3\quartier_daromes"
pip install -r requirements.txt
```

### 3️⃣ Initialisation de la Base de Données
```bash
# Créer les tables de base
python create_database.py

# Créer les tables avancées (avis, codes promo)
python create_advanced_features.py

# Créer le compte admin UNIQUE
python create_admin.py
```

### 4️⃣ Lancement du Serveur
```bash
python app.py
```

### 5️⃣ Accès au Site
- **Site client** : http://127.0.0.1:5000
- **Panel admin** : http://127.0.0.1:5000/admin

## 🔐 Identifiants par Défaut

### Compte Administrateur (UNIQUE)
- **Email** : `admin@quartierdaromes.com`
- **Mot de passe** : `admin123`
- **⚠️ À CHANGER immédiatement après la première connexion !**

### Codes Promo de Démonstration
- **BIENVENUE10** : 10% de réduction (min 100 DH)
- **PROMO20** : 20% de réduction (min 200 DH)
- **CADEAU50** : 50 DH de réduction (min 300 DH)

## 🎨 Design & UX

### Palette de Couleurs
- **Doré principal** : #C4942F (couleur signature)
- **Doré clair** : #a67c26
- **Blanc** : #FFFFFF
- **Noir** : #000000
- **Gris clair** : #f8f9fa

### Caractéristiques Design
- ✅ **Bootstrap 5** : Framework CSS moderne
- ✅ **Bootstrap Icons** : Bibliothèque d'icônes complète
- ✅ **Responsive** : Mobile, Tablet, Desktop
- ✅ **Cartes uniformes** : Toutes les cartes produits même taille
- ✅ **Animations hover** : Effets subtils au survol
- ✅ **Gradients** : Headers admin stylisés
- ✅ **Shadows** : Ombres sur cartes pour profondeur

## 📁 Structure du Projet

```
quartier_daromes/
│
├── 📄 app.py                          # Application Flask principale (1311 lignes)
├── 📄 models.py                       # Modèles SQLAlchemy (User, Product, Order, Review, Coupon, Brand...)
├── 📄 requirements.txt                # Dépendances Python
├── 📄 README.md                       # Documentation complète
├── 📄 SECURITE.md                     # Document de sécurité
├── 📄 DEPLOIEMENT_SECURISE.md         # Guide de déploiement
│
├── 🔧 Scripts de Setup
│   ├── create_database.py            # Création tables de base
│   ├── create_advanced_features.py   # Tables reviews et coupons
│   ├── create_brands_table.py        # Table brands
│   └── create_admin.py                # Compte admin UNIQUE
│
├── 📂 static/                         # Fichiers statiques
│   ├── css/
│   │   └── style.css
│   ├── js/
│   │   └── main.js
│   ├── images/                        # Images du site
│   └── uploads/                       # Images uploadées (produits, logos)
│
├── 📂 templates/                      # Templates Jinja2
│   ├── base.html                     # Template de base
│   │
│   ├── 🛍️ Pages Client
│   ├── index.html                    # Page d'accueil
│   ├── collections.html              # Catalogue avec filtres
│   ├── decants.html                  # Page décants
│   ├── product_detail.html           # Détails produit + avis
│   ├── cart.html                     # Panier
│   ├── checkout.html                 # Checkout avec codes promo
│   ├── wishlist.html                 # Liste de favoris
│   ├── profile.html                  # Profil utilisateur
│   ├── my_orders.html                # Mes commandes
│   ├── order_confirmation.html       # Confirmation commande
│   ├── login.html                    # Connexion
│   ├── register.html                 # Inscription
│   └── contact.html                  # Contact
│   │
│   └── 🛠️ admin/                     # Panel administrateur
│       ├── dashboard.html            # Dashboard avec stats
│       ├── manage_products.html      # Gestion produits
│       ├── add_product.html          # Ajout produit
│       ├── edit_product.html         # Modification produit
│       ├── brands.html               # Gestion marques
│       ├── edit_brand.html           # Modification marque
│       ├── coupons.html              # Gestion codes promo
│       ├── manage_orders.html        # Gestion commandes
│       ├── manage_users.html         # Gestion utilisateurs
│       └── manage_messages.html      # Messages contact
│
└── 💾 quartier_daromes.db            # Base de données SQLite
```

## 🔧 Configuration

### Variables d'environnement (optionnel)
Créez un fichier `.env` à la racine du projet :

```env
SECRET_KEY=votre-clé-secrète-très-sécurisée
DATABASE_URL=sqlite:///database/quartier.db
FLASK_ENV=development
```

### Configuration de la base de données
La base de données SQLite est créée automatiquement au premier lancement.
Pour réinitialiser la base de données, supprimez le fichier `database/quartier.db` et relancez l'application.

## 🎨 Personnalisation

### Modifier les styles
- Les styles CSS se trouvent dans `/static/css/style.css`
- Bootstrap 5 est utilisé comme framework CSS principal

### Ajouter des produits
1. Connectez-vous en tant qu'admin
2. Accédez au dashboard admin
3. Cliquez sur "Produits" puis "Ajouter un produit"

### Modifier les templates
- Les templates utilisent Jinja2
- Le template de base `base.html` contient la structure commune

## 📦 Déploiement

### Sur PythonAnywhere
1. Créez un compte sur [PythonAnywhere](https://www.pythonanywhere.com)
2. Uploadez les fichiers du projet
3. Créez un environnement virtuel
4. Installez les dépendances
5. Configurez l'application web avec Flask

### Sur Render
1. Créez un compte sur [Render](https://render.com)
2. Connectez votre repository GitHub
3. Configurez les variables d'environnement
4. Déployez automatiquement

## 🐛 Dépannage

### Erreur "Module not found"
```bash
pip install -r requirements.txt
```

### Erreur de base de données
Supprimez le fichier `database/quartier.db` et relancez l'application

### Port déjà utilisé
Changez le port dans `app.py` :
```python
app.run(debug=True, port=5001)  # Changez 5000 en 5001
```

## 📝 Licence

Ce projet est à des fins éducatives et de démonstration.

## 📧 Contact

Pour toute question : contact@quartierdaromes.com

---

Développé avec ❤️ par Quartier d'Arômes
