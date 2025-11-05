from flask import Flask, render_template, redirect, url_for, flash, request, jsonify, abort, send_file, session, make_response
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager, UserMixin, login_user, login_required, logout_user, current_user
from flask_bcrypt import Bcrypt
from flask_mail import Mail, Message as MailMessage
from flask_wtf.csrf import CSRFProtect
from flask_compress import Compress
from flask_caching import Cache
from werkzeug.utils import secure_filename
from datetime import datetime, timedelta
from itsdangerous import URLSafeTimedSerializer
import os
from functools import wraps

# Configuration de l'application
app = Flask(__name__)

# Obtenir le chemin absolu du dossier de l'application
basedir = os.path.abspath(os.path.dirname(__file__))

app.config['SECRET_KEY'] = 'quartier-daromes-secret-key-2024'
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///' + os.path.join(basedir, 'database', 'quartier.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['UPLOAD_FOLDER'] = os.path.join(basedir, 'static', 'uploads')
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max file size

# Configuration Flask-Caching
app.config['CACHE_TYPE'] = 'SimpleCache'  # En production: 'RedisCache'
app.config['CACHE_DEFAULT_TIMEOUT'] = 300  # 5 minutes
app.config['CACHE_KEY_PREFIX'] = 'quartier_'

# Configuration Flask-Mail
app.config['MAIL_SERVER'] = 'smtp.gmail.com'  # ou votre serveur SMTP
app.config['MAIL_PORT'] = 587
app.config['MAIL_USE_TLS'] = True
app.config['MAIL_USERNAME'] = os.environ.get('MAIL_USERNAME') or 'votre-email@gmail.com'
app.config['MAIL_PASSWORD'] = os.environ.get('MAIL_PASSWORD') or 'votre-mot-de-passe-app'
app.config['MAIL_DEFAULT_SENDER'] = ('Quartier d\'Arômes', os.environ.get('MAIL_USERNAME') or 'votre-email@gmail.com')

# Créer les dossiers nécessaires
os.makedirs(os.path.join(basedir, 'database'), exist_ok=True)
os.makedirs(os.path.join(basedir, 'static', 'uploads'), exist_ok=True)
os.makedirs(os.path.join(basedir, 'static', 'css'), exist_ok=True)
os.makedirs(os.path.join(basedir, 'static', 'js'), exist_ok=True)
os.makedirs(os.path.join(basedir, 'static', 'images'), exist_ok=True)

# Import des modèles et initialisation de db
from models import db, User, Product, Order, OrderItem, Category, Message, CartItem, WishlistItem, BlogPost, LoyaltyPoints, LoyaltyTransaction, LoyaltyReward, Review, Notification, LoginAttempt

# Initialiser db avec l'application
db.init_app(app)

# Initialisation des autres extensions
bcrypt = Bcrypt(app)
mail = Mail(app)
csrf = CSRFProtect(app)
compress = Compress(app)
cache = Cache(app)

# Configuration multilingue supprimée

login_manager = LoginManager(app)
login_manager.login_view = 'login'
login_manager.login_message = 'Veuillez vous connecter pour accéder à cette page.'

# Configuration du login manager
@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

# Context processor pour injecter datetime dans les templates
@app.context_processor
def inject_now():
    return {'now': datetime.now()}

# Context processor pour injecter le compteur du panier
@app.context_processor
def inject_cart_count():
    if current_user.is_authenticated:
        # Compter les articles dans le panier DB
        cart_count = CartItem.query.filter_by(user_id=current_user.id).count()
    else:
        # Compter les articles dans le panier session
        cart = session.get('cart', {})
        cart_count = len(cart)
    
    return {'cart_count': cart_count}

# Décorateur pour les routes admin
def admin_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not current_user.is_authenticated:
            # Non connecté → Redirection vers login admin
            flash('Veuillez vous connecter en tant qu\'administrateur.', 'warning')
            return redirect(url_for('admin_login'))
        elif not current_user.is_admin:
            # Connecté mais pas admin → Accès refusé
            flash('Accès refusé. Cette page est réservée aux administrateurs.', 'danger')
            return redirect(url_for('index'))
        return f(*args, **kwargs)
    return decorated_function

# ========== SYSTÈME DE NOTIFICATIONS ==========
def create_notification(notif_type, title, message, link=None, icon='bell', color='info'):
    """Créer une nouvelle notification pour l'admin"""
    notification = Notification(
        type=notif_type,
        title=title,
        message=message,
        link=link,
        icon=icon,
        color=color
    )
    db.session.add(notification)
    db.session.commit()
    return notification

# ========== SYSTÈME D'ENVOI D'EMAILS ==========
def send_email(subject, recipient, html_body, text_body=None):
    """Envoyer un email"""
    try:
        msg = MailMessage(
            subject=subject,
            recipients=[recipient] if isinstance(recipient, str) else recipient,
            html=html_body,
            body=text_body or "Veuillez activer l'affichage HTML pour voir ce message."
        )
        mail.send(msg)
        return True
    except Exception as e:
        print(f"Erreur envoi email: {str(e)}")
        return False

def send_welcome_email(user):
    """Envoyer l'email de bienvenue après inscription"""
    html = render_template('emails/welcome.html', user=user)
    send_email(
        subject=f'Bienvenue chez Quartier d\'Arômes, {user.first_name}!',
        recipient=user.email,
        html_body=html
    )

def send_order_confirmation_email(order):
    """Envoyer l'email de confirmation de commande"""
    html = render_template('emails/order_confirmation.html', order=order)
    send_email(
        subject=f'Confirmation de commande {order.order_number}',
        recipient=order.customer.email,
        html_body=html
    )

def generate_reset_token(user):
    """Générer un token de réinitialisation de mot de passe"""
    serializer = URLSafeTimedSerializer(app.config['SECRET_KEY'])
    return serializer.dumps(user.email, salt='password-reset-salt')

def verify_reset_token(token, expiration=3600):
    """Vérifier un token de réinitialisation (1h d'expiration par défaut)"""
    serializer = URLSafeTimedSerializer(app.config['SECRET_KEY'])
    try:
        email = serializer.loads(token, salt='password-reset-salt', max_age=expiration)
        return email
    except:
        return None

def send_password_reset_email(user, token):
    """Envoyer l'email de réinitialisation de mot de passe"""
    reset_url = url_for('reset_password', token=token, _external=True)
    html = render_template('emails/password_reset.html', user=user, reset_url=reset_url)
    send_email(
        subject='Réinitialisation de votre mot de passe - Quartier d\'Arômes',
        recipient=user.email,
        html_body=html
    )

# Hook after_request pour optimisations de cache
@app.after_request
def add_cache_headers(response):
    """Ajouter des headers de cache pour les fichiers statiques"""
    if request.path.startswith('/static/'):
        # Cache les fichiers statiques pendant 1 an
        response.cache_control.max_age = 31536000
        response.cache_control.public = True
    return response

# Routes principales - Côté Client
@app.route('/')
def index():
    from models import Brand
    from sqlalchemy import func, desc
    
    featured_products = Product.query.filter_by(is_featured=True).limit(8).all()
    
    # Best Sellers - Top 10 produits les plus vendus
    best_sellers = db.session.query(
        Product,
        func.sum(OrderItem.quantity).label('total_sold')
    ).join(OrderItem).group_by(Product.id).order_by(
        desc('total_sold')
    ).limit(10).all()
    best_sellers = [item[0] for item in best_sellers]  # Extraire seulement les produits
    
    # Nouveautés - 10 derniers produits ajoutés
    new_products = Product.query.order_by(Product.created_at.desc()).limit(10).all()
    
    # Récupérer les catégories actives et visibles dans le menu
    categories = Category.query.filter_by(is_active=True, show_in_menu=True).order_by(Category.display_order, Category.name).all()
    # Récupérer les marques actives
    brands = Brand.query.filter_by(is_active=True).order_by(Brand.name).all()
    
    # Récupérer les derniers articles de blog publiés (3 maximum)
    recent_blog_posts = BlogPost.query.filter_by(is_published=True).order_by(BlogPost.created_at.desc()).limit(3).all()
    
    return render_template('index.html', 
                         products=featured_products, 
                         categories=categories, 
                         brands=brands,
                         best_sellers=best_sellers,
                         new_products=new_products,
                         recent_blog_posts=recent_blog_posts)

@app.route('/collections')
def collections():
    # Récupérer les paramètres de filtre
    category_filter = request.args.get('category')
    format_filter = request.args.get('format')  # 'collection', 'complet' ou 'decant'
    brand_filter = request.args.get('brand')  # Filtre par marque
    price_min = request.args.get('price_min', type=float)
    price_max = request.args.get('price_max', type=float)
    size_filter = request.args.get('size')
    sort_by = request.args.get('sort', 'name')
    search = request.args.get('search')  # Paramètre de recherche
    
    # Construire la requête de base
    query = Product.query
    
    # Appliquer le filtre de recherche
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            (Product.name.ilike(search_term)) | 
            (Product.brand.ilike(search_term)) |
            (Product.description.ilike(search_term))
        )
    
    # Appliquer le filtre de catégorie
    if category_filter:
        category = Category.query.filter_by(name=category_filter).first()
        if category:
            query = query.filter_by(category_id=category.id)
    
    # Filtre par format (collection, complet ou décant)
    if format_filter:
        if format_filter == 'collection':
            # Afficher uniquement les créations spéciales (type = collection)
            query = query.filter_by(product_type='collection')
        elif format_filter == 'decant':
            # Afficher uniquement les décants
            query = query.filter_by(product_type='decant')
        elif format_filter == 'complet':
            # Afficher uniquement les parfums complets
            query = query.filter_by(product_type='parfum')
    else:
        # Si aucun format n'est spécifié, afficher tous les types
        pass
    
    # Filtre par marque
    if brand_filter:
        query = query.filter_by(brand=brand_filter)
    
    if price_min is not None:
        query = query.filter(Product.price >= price_min)
    
    if price_max is not None:
        query = query.filter(Product.price <= price_max)
    
    if size_filter:
        query = query.filter_by(size=size_filter)
    
    # Appliquer le tri
    if sort_by == 'price_asc':
        query = query.order_by(Product.price.asc())
    elif sort_by == 'price_desc':
        query = query.order_by(Product.price.desc())
    elif sort_by == 'name':
        query = query.order_by(Product.name.asc())
    elif sort_by == 'newest':
        query = query.order_by(Product.created_at.desc())
    elif sort_by == 'rating':
        # Tri par note moyenne (nécessite une jointure avec reviews)
        from sqlalchemy import func
        query = query.outerjoin(Review).group_by(Product.id).order_by(
            func.avg(Review.rating).desc().nullslast()
        )
    elif sort_by == 'popularity':
        # Tri par nombre d'avis
        query = query.outerjoin(Review).group_by(Product.id).order_by(
            func.count(Review.id).desc()
        )
    
    products = query.all()
    
    # Calculer la note moyenne pour chaque produit
    for product in products:
        product_reviews = Review.query.filter_by(product_id=product.id).all()
        if product_reviews:
            product.avg_rating = sum(r.rating for r in product_reviews) / len(product_reviews)
            product.review_count = len(product_reviews)
        else:
            product.avg_rating = 0
            product.review_count = 0
    # Récupérer seulement les catégories actives et triées par ordre d'affichage
    categories = Category.query.filter_by(is_active=True).order_by(Category.display_order, Category.name).all()
    
    # Obtenir les tailles uniques pour le filtre
    sizes = db.session.query(Product.size).filter(Product.size.isnot(None)).distinct().all()
    sizes = [s[0] for s in sizes if s[0]]
    
    # Obtenir les marques depuis la table Brand (actives uniquement)
    from models import Brand
    brands_objects = Brand.query.filter_by(is_active=True).order_by(Brand.name).all()
    brands = [b.name for b in brands_objects]
    
    return render_template('collections.html', 
                         products=products, 
                         categories=categories,
                         sizes=sizes,
                         brands=brands,
                         now=datetime.now(),
                         current_filters={
                             'category': category_filter,
                             'format': format_filter,
                             'brand': brand_filter,
                             'price_min': price_min,
                             'price_max': price_max,
                             'size': size_filter,
                             'sort': sort_by
                         })

@app.route('/product/<int:product_id>')
def product_detail(product_id):
    from models import Review
    product = Product.query.get_or_404(product_id)
    related_products = Product.query.filter(
        Product.category_id == product.category_id,
        Product.id != product.id
    ).limit(4).all()
    
    # Récupérer les avis du produit
    reviews = Review.query.filter_by(product_id=product_id).order_by(Review.created_at.desc()).all()
    
    # Calculer la note moyenne
    avg_rating = 0
    if reviews:
        avg_rating = sum(r.rating for r in reviews) / len(reviews)
    
    # Vérifier si l'utilisateur a déjà acheté ce produit
    user_purchased = False
    user_reviewed = False
    if current_user.is_authenticated:
        from models import OrderItem
        user_purchased = db.session.query(OrderItem).join(Order).filter(
            Order.user_id == current_user.id,
            OrderItem.product_id == product_id
        ).first() is not None
        
        user_reviewed = Review.query.filter_by(
            product_id=product_id,
            user_id=current_user.id
        ).first() is not None
    
    return render_template('product_detail.html', 
                         product=product, 
                         related_products=related_products,
                         reviews=reviews,
                         avg_rating=avg_rating,
                         user_purchased=user_purchased,
                         user_reviewed=user_reviewed)

@app.route('/product/<int:product_id>/review', methods=['POST'])
@login_required
def add_review(product_id):
    from models import Review, OrderItem
    
    product = Product.query.get_or_404(product_id)
    
    # Vérifier si l'utilisateur a déjà laissé un avis
    existing_review = Review.query.filter_by(
        product_id=product_id,
        user_id=current_user.id
    ).first()
    
    if existing_review:
        flash('Vous avez déjà laissé un avis pour ce produit.', 'warning')
        return redirect(url_for('product_detail', product_id=product_id))
    
    rating = request.form.get('rating', type=int)
    comment = request.form.get('comment', '').strip()
    
    if not rating or rating < 1 or rating > 5:
        flash('Note invalide. Veuillez choisir entre 1 et 5 étoiles.', 'danger')
        return redirect(url_for('product_detail', product_id=product_id))
    
    # Vérifier si achat vérifié
    is_verified = db.session.query(OrderItem).join(Order).filter(
        Order.user_id == current_user.id,
        OrderItem.product_id == product_id
    ).first() is not None
    
    # Créer l'avis
    review = Review(
        product_id=product_id,
        user_id=current_user.id,
        rating=rating,
        comment=comment,
        is_verified=is_verified
    )
    
    db.session.add(review)
    db.session.commit()
    
    flash('Merci pour votre avis !', 'success')
    return redirect(url_for('product_detail', product_id=product_id))

@app.route('/decants')
def decants():
    # Récupérer les paramètres de filtre
    size_filter = request.args.get('size')
    price_min = request.args.get('price_min', type=float)
    price_max = request.args.get('price_max', type=float)
    sort_by = request.args.get('sort', 'name')
    
    # Construire la requête
    query = Product.query.filter_by(product_type='decant')
    
    # Appliquer les filtres
    if size_filter:
        query = query.filter_by(size=size_filter)
    
    if price_min is not None:
        query = query.filter(Product.price >= price_min)
    
    if price_max is not None:
        query = query.filter(Product.price <= price_max)
    
    # Appliquer le tri
    if sort_by == 'price_asc':
        query = query.order_by(Product.price.asc())
    elif sort_by == 'price_desc':
        query = query.order_by(Product.price.desc())
    elif sort_by == 'name':
        query = query.order_by(Product.name.asc())
    elif sort_by == 'newest':
        query = query.order_by(Product.created_at.desc())
    
    decants = query.all()
    
    # Obtenir les tailles uniques pour le filtre
    sizes = db.session.query(Product.size).filter(
        Product.product_type == 'decant',
        Product.size.isnot(None)
    ).distinct().all()
    sizes = [s[0] for s in sizes if s[0]]
    
    return render_template('decants.html', 
                         decants=decants,
                         sizes=sizes,
                         current_filters={
                             'size': size_filter,
                             'price_min': price_min,
                             'price_max': price_max,
                             'sort': sort_by
                         })

@app.route('/contact', methods=['GET', 'POST'])
def contact():
    if request.method == 'POST':
        name = request.form.get('name')
        email = request.form.get('email')
        subject = request.form.get('subject')
        message_content = request.form.get('message')
        
        message = Message(
            name=name,
            email=email,
            subject=subject,
            content=message_content
        )
        db.session.add(message)
        db.session.commit()
        
        # Créer une notification pour l'admin
        create_notification(
            notif_type='message',
            title='Nouveau Message',
            message=f'{name} ({email}) vous a envoyé un message',
            link='/admin/messages',
            icon='envelope',
            color='info'
        )
        
        flash('Votre message a été envoyé avec succès!', 'success')
        return redirect(url_for('contact'))
    
    return render_template('contact.html')

# À propos
@app.route('/about')
def about():
    return render_template('about.html')

# ========== COMPARATEUR DE PRODUITS ==========
@app.route('/compare')
def compare_products():
    """Page de comparaison de produits"""
    # Récupérer les IDs des produits depuis les paramètres
    product_ids = request.args.get('ids', '')
    
    if not product_ids:
        flash('Aucun produit sélectionné pour la comparaison.', 'warning')
        return redirect(url_for('collections'))
    
    # Convertir les IDs en liste
    try:
        ids_list = [int(id) for id in product_ids.split(',') if id]
    except ValueError:
        flash('Paramètres invalides.', 'danger')
        return redirect(url_for('collections'))
    
    # Limiter à 3 produits maximum
    ids_list = ids_list[:3]
    
    if len(ids_list) < 2:
        flash('Veuillez sélectionner au moins 2 produits pour comparer.', 'warning')
        return redirect(url_for('collections'))
    
    # Récupérer les produits
    products = Product.query.filter(Product.id.in_(ids_list)).all()
    
    if len(products) < 2:
        flash('Produits introuvables.', 'danger')
        return redirect(url_for('collections'))
    
    # Calculer les notes moyennes et avis pour chaque produit
    for product in products:
        reviews = Review.query.filter_by(product_id=product.id).all()
        if reviews:
            product.avg_rating = sum(r.rating for r in reviews) / len(reviews)
            product.review_count = len(reviews)
            product.reviews_list = reviews[:3]  # Top 3 avis
        else:
            product.avg_rating = 0
            product.review_count = 0
            product.reviews_list = []
    
    return render_template('compare.html', products=products)

# ========== ROUTES D'AUTHENTIFICATION ==========
@app.route('/register', methods=['GET', 'POST'])
def register():
    if current_user.is_authenticated:
        return redirect(url_for('index'))
    
    if request.method == 'POST':
        username = request.form.get('username')
        email = request.form.get('email')
        password = request.form.get('password')
        confirm_password = request.form.get('confirm_password')
        
        # Validation
        if password != confirm_password:
            flash('Les mots de passe ne correspondent pas.', 'danger')
            return redirect(url_for('register'))
        
        # Vérifier si l'utilisateur existe déjà
        existing_user = User.query.filter((User.email == email) | (User.username == username)).first()
        if existing_user:
            flash('Cet email ou nom d\'utilisateur est déjà utilisé.', 'danger')
            return redirect(url_for('register'))
        
        # Créer le nouvel utilisateur (toujours en tant que client, jamais admin)
        hashed_password = bcrypt.generate_password_hash(password).decode('utf-8')
        user = User(
            username=username,
            email=email,
            password=hashed_password,
            first_name=request.form.get('first_name', username),
            is_admin=False  # Toujours False pour les nouveaux utilisateurs
        )
        db.session.add(user)
        db.session.commit()
        
        # Envoyer l'email de bienvenue
        try:
            send_welcome_email(user)
        except Exception as e:
            print(f"Erreur envoi email bienvenue: {e}")
        
        flash('Votre compte a été créé avec succès! Un email de bienvenue vous a été envoyé.', 'success')
        return redirect(url_for('login'))
    
    return render_template('register.html')

def check_login_attempts(ip_address, max_attempts=5, lockout_minutes=15):
    """Vérifier si l'IP est bloquée pour tentatives de connexion excessives"""
    cutoff_time = datetime.utcnow() - timedelta(minutes=lockout_minutes)
    
    # Compter les tentatives échouées récentes
    recent_attempts = LoginAttempt.query.filter(
        LoginAttempt.ip_address == ip_address,
        LoginAttempt.attempt_time > cutoff_time,
        LoginAttempt.success == False
    ).count()
    
    if recent_attempts >= max_attempts:
        return False, f'Trop de tentatives de connexion. Veuillez réessayer dans {lockout_minutes} minutes.'
    
    return True, None

def record_login_attempt(ip_address, username, success):
    """Enregistrer une tentative de connexion"""
    attempt = LoginAttempt(
        ip_address=ip_address,
        username=username,
        success=success,
        user_agent=request.headers.get('User-Agent', '')[:500]
    )
    db.session.add(attempt)
    db.session.commit()

@app.route('/login', methods=['GET', 'POST'])
def login():
    if current_user.is_authenticated:
        return redirect(url_for('index'))
    
    ip_address = request.remote_addr
    
    if request.method == 'POST':
        # Vérifier les tentatives de connexion
        allowed, error_message = check_login_attempts(ip_address)
        if not allowed:
            flash(error_message, 'danger')
            return render_template('login.html'), 429  # Too Many Requests
        
        email = request.form.get('email')
        password = request.form.get('password')
        remember = request.form.get('remember', False)
        
        user = User.query.filter_by(email=email).first()
        
        if user and bcrypt.check_password_hash(user.password, password):
            # Connexion réussie
            record_login_attempt(ip_address, user.username, True)
            login_user(user, remember=remember)
            
            # Fusionner le panier session avec le panier DB
            cart_session = session.get('cart', {})
            if cart_session:
                for product_id_str, quantity in cart_session.items():
                    product_id = int(product_id_str)
                    
                    # Vérifier si le produit est déjà dans le panier DB
                    cart_item = CartItem.query.filter_by(
                        user_id=user.id,
                        product_id=product_id
                    ).first()
                    
                    if cart_item:
                        # Ajouter la quantité du panier session
                        cart_item.quantity += quantity
                    else:
                        # Créer un nouveau CartItem
                        cart_item = CartItem(
                            user_id=user.id,
                            product_id=product_id,
                            quantity=quantity
                        )
                        db.session.add(cart_item)
                
                # Vider le panier session
                session.pop('cart', None)
            
            # Nettoyer les anciennes tentatives échouées de cet utilisateur
            LoginAttempt.query.filter_by(ip_address=ip_address, success=False).delete()
            db.session.commit()
            
            next_page = request.args.get('next')
            flash(f'Bienvenue {user.username}!', 'success')
            return redirect(next_page) if next_page else redirect(url_for('index'))
        else:
            # Connexion échouée
            record_login_attempt(ip_address, email, False)
            
            # Compter les tentatives restantes
            cutoff_time = datetime.utcnow() - timedelta(minutes=15)
            remaining_attempts = 5 - LoginAttempt.query.filter(
                LoginAttempt.ip_address == ip_address,
                LoginAttempt.attempt_time > cutoff_time,
                LoginAttempt.success == False
            ).count()
            
            if remaining_attempts > 0:
                flash(f'Email ou mot de passe incorrect. Il vous reste {remaining_attempts} tentative(s).', 'danger')
            else:
                flash('Trop de tentatives de connexion. Veuillez réessayer dans 15 minutes.', 'danger')
    
    return render_template('login.html')

@app.route('/logout')
@login_required
def logout():
    logout_user()
    flash('Vous avez été déconnecté avec succès.', 'info')
    return redirect(url_for('index'))

# Routes de réinitialisation de mot de passe
@app.route('/forgot-password', methods=['GET', 'POST'])
def forgot_password():
    if current_user.is_authenticated:
        return redirect(url_for('index'))
    
    if request.method == 'POST':
        email = request.form.get('email')
        user = User.query.filter_by(email=email).first()
        
        if user:
            token = generate_reset_token(user)
            try:
                send_password_reset_email(user, token)
                flash('Un email de réinitialisation a été envoyé à votre adresse.', 'info')
            except Exception as e:
                print(f"Erreur envoi email reset: {e}")
                flash('Erreur lors de l\'envoi de l\'email. Veuillez réessayer.', 'danger')
        else:
            # Pour des raisons de sécurité, on affiche le même message
            flash('Si cet email existe, un lien de réinitialisation a été envoyé.', 'info')
        
        return redirect(url_for('login'))
    
    return render_template('forgot_password.html')

@app.route('/reset-password/<token>', methods=['GET', 'POST'])
def reset_password(token):
    if current_user.is_authenticated:
        return redirect(url_for('index'))
    
    email = verify_reset_token(token)
    if not email:
        flash('Le lien de réinitialisation est invalide ou a expiré.', 'danger')
        return redirect(url_for('forgot_password'))
    
    user = User.query.filter_by(email=email).first()
    if not user:
        flash('Utilisateur introuvable.', 'danger')
        return redirect(url_for('forgot_password'))
    
    if request.method == 'POST':
        password = request.form.get('password')
        confirm_password = request.form.get('confirm_password')
        
        if password != confirm_password:
            flash('Les mots de passe ne correspondent pas.', 'danger')
            return redirect(url_for('reset_password', token=token))
        
        # Mettre à jour le mot de passe
        hashed_password = bcrypt.generate_password_hash(password).decode('utf-8')
        user.password = hashed_password
        db.session.commit()
        
        flash('Votre mot de passe a été réinitialisé avec succès !', 'success')
        return redirect(url_for('login'))
    
    return render_template('reset_password.html', token=token)

# Routes du profil utilisateur
@app.route('/profile')
@login_required
def profile():
    # Récupérer les points fidélité de l'utilisateur
    loyalty_points = LoyaltyPoints.query.filter_by(user_id=current_user.id).first()
    if not loyalty_points:
        # Créer un compte fidélité s'il n'existe pas
        loyalty_points = LoyaltyPoints(user_id=current_user.id)
        db.session.add(loyalty_points)
        db.session.commit()
    
    return render_template('profile.html', loyalty_points=loyalty_points)

@app.route('/my_orders')
@login_required
def my_orders():
    orders = Order.query.filter_by(user_id=current_user.id).order_by(Order.created_at.desc()).all()
    return render_template('my_orders.html', orders=orders)

@app.route('/update_profile', methods=['POST'])
@login_required
def update_profile():
    user = current_user
    
    # Mise à jour des informations
    phone = request.form.get('phone')
    address = request.form.get('address')
    new_password = request.form.get('new_password')
    confirm_password = request.form.get('confirm_password')
    
    if phone:
        user.phone = phone
    if address:
        user.address = address
    
    # Changement de mot de passe
    if new_password:
        if new_password == confirm_password:
            user.password = bcrypt.generate_password_hash(new_password).decode('utf-8')
            flash('Mot de passe mis à jour avec succès.', 'success')
        else:
            flash('Les mots de passe ne correspondent pas.', 'danger')
            return redirect(url_for('profile'))
    
    db.session.commit()
    flash('Profil mis à jour avec succès.', 'success')
    return redirect(url_for('profile'))

@app.route('/orders')
@login_required
def orders():
    user_orders = Order.query.filter_by(user_id=current_user.id).order_by(Order.created_at.desc()).all()
    return render_template('orders.html', orders=user_orders)

@app.route('/order/<int:order_id>')
@login_required
def order_detail(order_id):
    order = Order.query.get_or_404(order_id)
    if order.user_id != current_user.id and not current_user.is_admin:
        flash('Accès refusé.', 'danger')
        return redirect(url_for('orders'))
    return render_template('order_detail.html', order=order)

# Routes du panier
@app.route('/cart')
def cart():
    if current_user.is_authenticated:
        # Panier DB pour utilisateurs connectés
        cart_items = CartItem.query.filter_by(user_id=current_user.id).all()
        total = sum(item.product.price * item.quantity for item in cart_items)
    else:
        # Panier session pour visiteurs
        cart_data = session.get('cart', {})
        cart_items = []
        total = 0
        
        for product_id, quantity in cart_data.items():
            product = Product.query.get(int(product_id))
            if product:
                # Créer un objet similaire à CartItem pour le template
                class SessionCartItem:
                    def __init__(self, product, quantity):
                        self.product = product
                        self.quantity = quantity
                        self.id = f"session_{product.id}"
                
                cart_items.append(SessionCartItem(product, quantity))
                total += product.price * quantity
    
    return render_template('cart.html', cart_items=cart_items, total=total)

@app.route('/add_to_cart/<int:product_id>', methods=['POST'])
def add_to_cart(product_id):
    product = Product.query.get_or_404(product_id)
    quantity = int(request.form.get('quantity', 1))
    
    if current_user.is_authenticated:
        # Panier DB pour utilisateurs connectés
        cart_item = CartItem.query.filter_by(
            user_id=current_user.id,
            product_id=product_id
        ).first()
        
        if cart_item:
            cart_item.quantity += quantity
        else:
            cart_item = CartItem(
                user_id=current_user.id,
                product_id=product_id,
                quantity=quantity
            )
            db.session.add(cart_item)
        
        db.session.commit()
    else:
        # Panier session pour visiteurs
        cart = session.get('cart', {})
        product_id_str = str(product_id)
        
        if product_id_str in cart:
            cart[product_id_str] += quantity
        else:
            cart[product_id_str] = quantity
        
        session['cart'] = cart
        session.modified = True
    
    flash(f'{product.name} a été ajouté au panier!', 'success')
    return redirect(request.referrer or url_for('index'))

@app.route('/remove_from_cart/<item_id>')
def remove_from_cart(item_id):
    if current_user.is_authenticated:
        # Panier DB
        cart_item = CartItem.query.get_or_404(int(item_id))
        if cart_item.user_id == current_user.id:
            db.session.delete(cart_item)
            db.session.commit()
            flash('Produit retiré du panier.', 'info')
    else:
        # Panier session
        if item_id.startswith('session_'):
            product_id = item_id.replace('session_', '')
            cart = session.get('cart', {})
            if product_id in cart:
                del cart[product_id]
                session['cart'] = cart
                session.modified = True
                flash('Produit retiré du panier.', 'info')
    
    return redirect(url_for('cart'))

# Routes de la liste de souhaits (Wishlist)
@app.route('/wishlist')
@login_required
def wishlist():
    wishlist_items = WishlistItem.query.filter_by(user_id=current_user.id).all()
    return render_template('wishlist.html', wishlist_items=wishlist_items)

@app.route('/add_to_wishlist/<int:product_id>', methods=['POST'])
@login_required
def add_to_wishlist(product_id):
    product = Product.query.get_or_404(product_id)
    
    # Vérifier si le produit est déjà dans la wishlist
    existing_item = WishlistItem.query.filter_by(
        user_id=current_user.id,
        product_id=product_id
    ).first()
    
    if existing_item:
        flash(f'{product.name} est déjà dans vos favoris!', 'info')
    else:
        wishlist_item = WishlistItem(
            user_id=current_user.id,
            product_id=product_id
        )
        db.session.add(wishlist_item)
        db.session.commit()
        flash(f'{product.name} ajouté aux favoris!', 'success')
    
    return redirect(request.referrer or url_for('index'))

@app.route('/remove_from_wishlist/<int:item_id>', methods=['POST'])
@login_required
def remove_from_wishlist(item_id):
    wishlist_item = WishlistItem.query.get_or_404(item_id)
    if wishlist_item.user_id != current_user.id:
        abort(403)
    
    db.session.delete(wishlist_item)
    db.session.commit()
    flash('Produit retiré des favoris.', 'info')
    return redirect(url_for('wishlist'))

@app.route('/checkout', methods=['GET', 'POST'])
@login_required
def checkout():
    from models import Coupon
    cart_items = CartItem.query.filter_by(user_id=current_user.id).all()
    
    if not cart_items:
        flash('Votre panier est vide.', 'warning')
        return redirect(url_for('cart'))
    
    # Calculer le total
    subtotal = sum(item.product.price * item.quantity for item in cart_items)
    discount = 0
    coupon = None
    coupon_code = request.form.get('coupon_code', '').strip().upper() if request.method == 'POST' else ''
    
    # Appliquer le coupon si fourni
    if coupon_code:
        coupon = Coupon.query.filter_by(code=coupon_code).first()
        if coupon and coupon.is_valid():
            if subtotal >= coupon.min_purchase:
                discount = coupon.calculate_discount(subtotal)
            else:
                flash(f'Achat minimum de {coupon.min_purchase} DH requis pour ce code promo.', 'warning')
                coupon = None
        elif coupon:
            flash('Ce code promo n\'est plus valide.', 'warning')
            coupon = None
        else:
            flash('Code promo invalide.', 'warning')
    
    total = subtotal - discount
    
    # Calculer les frais de livraison
    shipping_fee = 30 if total < 200 else 0
    final_total = total + shipping_fee
    
    if request.method == 'POST':
        action = request.form.get('action')
        payment_method = request.form.get('payment_method', 'whatsapp')
        whatsapp_number = request.form.get('whatsapp', request.form.get('phone'))
        
        # Créer la commande
        order = Order(
            user_id=current_user.id,
            shipping_address=request.form.get('shipping_address'),
            phone=request.form.get('phone'),
            total_amount=final_total,
            payment_method=payment_method,
            notes=request.form.get('notes', '')
        )
        db.session.add(order)
        db.session.flush()  # Récupérer l'ID de la commande
        
        # Incrémenter l'utilisation du coupon
        if coupon:
            coupon.used_count += 1
        
        # Générer le numéro de commande unique avec l'ID maintenant disponible
        order.order_number = f"ORD-{datetime.now().strftime('%Y%m%d')}-{order.id:04d}"
        
        # Ajouter les items de la commande
        for cart_item in cart_items:
            order_item = OrderItem(
                order_id=order.id,
                product_id=cart_item.product_id,
                quantity=cart_item.quantity,
                price=cart_item.product.price
            )
            db.session.add(order_item)
            
            # Mettre à jour le stock
            cart_item.product.stock -= cart_item.quantity
            
            # Supprimer du panier
            db.session.delete(cart_item)
        
        # PROGRAMME FIDÉLITÉ: Ajouter des points (1 DH = 1 point)
        loyalty_account = LoyaltyPoints.query.filter_by(user_id=current_user.id).first()
        if not loyalty_account:
            loyalty_account = LoyaltyPoints(user_id=current_user.id)
            db.session.add(loyalty_account)
            db.session.flush()
        
        # Calculer les points gagnés (arrondi à l'entier le plus proche)
        points_earned = int(round(total))
        loyalty_account.points += points_earned
        loyalty_account.total_earned += points_earned
        
        # Créer une transaction de fidélité
        loyalty_transaction = LoyaltyTransaction(
            loyalty_id=loyalty_account.id,
            points=points_earned,
            transaction_type='purchase',
            description=f'Achat - Commande {order.order_number}',
            order_id=order.id
        )
        db.session.add(loyalty_transaction)
        
        db.session.commit()
        
        # Créer une notification pour l'admin
        create_notification(
            notif_type='order',
            title='Nouvelle Commande',
            message=f'{current_user.username} a passé une commande de {total:.2f} DH (N°{order.id})',
            link='/admin/orders',
            icon='cart-check',
            color='success'
        )
        
        # Envoyer l'email de confirmation de commande
        try:
            send_order_confirmation_email(order)
        except Exception as e:
            print(f"Erreur envoi email confirmation commande: {e}")
        
        # Si le client a cliqué sur "Envoyer sur WhatsApp"
        if action == 'whatsapp':
            # Créer le message WhatsApp détaillé
            message = f"🛍️ *Nouvelle Commande - {order.order_number}*\n\n"
            message += f"*INFORMATIONS CLIENT*\n"
            message += f"👤 Nom: {request.form.get('first_name')} {request.form.get('last_name')}\n"
            message += f"📧 Email: {current_user.email}\n"
            message += f"📞 Téléphone: {request.form.get('phone')}\n"
            message += f"💬 WhatsApp: {whatsapp_number}\n"
            message += f"📍 Adresse: {request.form.get('shipping_address')}\n\n"
            
            message += "*MÉTHODE DE PAIEMENT*\n"
            payment_labels = {
                'whatsapp': '📱 Confirmation via WhatsApp',
                'delivery': '🚚 Paiement à la livraison',
                'transfer': '🏦 Virement Bancaire',
                'cash': '💵 Paiement en Espèces'
            }
            message += f"{payment_labels.get(payment_method, payment_method)}\n\n"
            
            message += "📦 *PRODUITS COMMANDÉS*\n"
            products_total = 0
            for item in order.order_items:
                message += f"• {item.product.name}\n"
                message += f"  Quantité: {item.quantity} × {item.price:.2f} DH\n"
                item_total = item.price * item.quantity
                products_total += item_total
                message += f"  Sous-total: {item_total:.2f} DH\n\n"
            
            if order.notes:
                message += f"📝 *Note:* {order.notes}\n\n"
            
            message += "💵 *RÉCAPITULATIF*\n"
            message += f"Sous-total produits: {products_total:.2f} DH\n"
            message += f"Livraison: {shipping_fee:.2f} DH {'(Gratuite ✓)' if shipping_fee == 0 else ''}\n"
            message += f"💰 *TOTAL: {order.total_amount:.2f} DH*\n"
            message += f"📅 Date: {order.created_at.strftime('%d/%m/%Y %H:%M')}"
            
            # Numéro WhatsApp du magasin (à personnaliser)
            store_whatsapp = "212708505157"  # Format: pays + numéro sans le +
            
            import urllib.parse
            whatsapp_url = f"https://wa.me/{store_whatsapp}?text={urllib.parse.quote(message)}"
            
            # Ouvrir WhatsApp directement
            return redirect(whatsapp_url)
        
        # Sinon, rediriger vers la page de confirmation normale
        flash('🎉 Merci pour votre commande! Votre commande a été enregistrée avec succès et vous avez gagné {} points de fidélité!'.format(points_earned), 'success')
        return redirect(url_for('order_detail', order_id=order.id))
    
    # Récupérer les points fidélité
    loyalty_points = None
    if current_user.is_authenticated:
        loyalty_points = LoyaltyPoints.query.filter_by(user_id=current_user.id).first()
    
    return render_template('checkout.html', 
                         cart_items=cart_items, 
                         subtotal=subtotal,
                         discount=discount,
                         total=total,
                         shipping_fee=shipping_fee,
                         final_total=final_total,
                         coupon=coupon,
                         loyalty_points=loyalty_points)

@app.route('/order/<int:order_id>')
@login_required
def order_confirmation(order_id):
    order = Order.query.get_or_404(order_id)
    if order.user_id != current_user.id and not current_user.is_admin:
        flash('Accès refusé.', 'danger')
        return redirect(url_for('index'))
    return render_template('order_confirmation.html', order=order)

# Route Programme Fidélité
@app.route('/rewards')
def rewards():
    """Page du programme fidélité"""
    loyalty_points = None
    transactions = []
    current_lang = get_locale()
    
    if current_user.is_authenticated:
        # Récupérer ou créer le compte fidélité de l'utilisateur
        loyalty_points = LoyaltyPoints.query.filter_by(user_id=current_user.id).first()
        if not loyalty_points:
            loyalty_points = LoyaltyPoints(user_id=current_user.id)
            db.session.add(loyalty_points)
            db.session.commit()
        
        # Récupérer l'historique des transactions
        transactions = LoyaltyTransaction.query.filter_by(
            loyalty_id=loyalty_points.id
        ).order_by(LoyaltyTransaction.created_at.desc()).all()
    
    # Récupérer les récompenses disponibles
    rewards = LoyaltyReward.query.filter_by(is_active=True).order_by(LoyaltyReward.points_required).all()
    
    # Préparer les récompenses avec traductions
    for reward in rewards:
        if current_lang == 'en' and reward.name_en:
            reward.display_name = reward.name_en
            reward.display_description = reward.description_en or reward.description
        else:
            reward.display_name = reward.name
            reward.display_description = reward.description
    
    return render_template('rewards.html',
                         loyalty_points=loyalty_points,
                         transactions=transactions,
                         rewards=rewards,
                         current_lang=current_lang)

@app.route('/rewards/redeem/<int:reward_id>', methods=['POST'])
@login_required
def redeem_reward(reward_id):
    """Échanger des points contre une récompense"""
    reward = LoyaltyReward.query.get_or_404(reward_id)
    loyalty_points = LoyaltyPoints.query.filter_by(user_id=current_user.id).first()
    
    if not loyalty_points:
        flash('Vous n\'avez pas encore de compte fidélité.', 'warning')
        return redirect(url_for('rewards'))
    
    # Vérifier si l'utilisateur a assez de points
    if loyalty_points.points < reward.points_required:
        flash('Points insuffisants pour cette récompense.', 'warning')
        return redirect(url_for('rewards'))
    
    # Déduire les points
    loyalty_points.points -= reward.points_required
    loyalty_points.total_spent += reward.points_required
    
    # Créer une transaction
    transaction = LoyaltyTransaction(
        loyalty_id=loyalty_points.id,
        points=-reward.points_required,
        balance_after=loyalty_points.points,
        transaction_type='redemption',
        description=f'Échange - {reward.name}',
        reward_id=reward_id
    )
    db.session.add(transaction)
    
    # Incrémenter le compteur d'utilisation de la récompense
    reward.times_redeemed += 1
    
    db.session.commit()
    
    flash(f'Récompense "{reward.name}" échangée avec succès!', 'success')
    return redirect(url_for('rewards'))

# ========== ROUTE DE CONNEXION ADMIN SÉPARÉE ==========
@app.route('/admin/login', methods=['GET', 'POST'])
def admin_login():
    """Page de connexion dédiée pour les administrateurs"""
    if current_user.is_authenticated:
        if current_user.is_admin:
            return redirect(url_for('admin_dashboard'))
        else:
            flash('Cette page est réservée aux administrateurs.', 'danger')
            return redirect(url_for('index'))
    
    ip_address = request.remote_addr
    
    if request.method == 'POST':
        # Vérifier les tentatives de connexion
        allowed, error_message = check_login_attempts(ip_address)
        if not allowed:
            flash(error_message, 'danger')
            return render_template('/admin/admin_login.html'), 429  # Too Many Requests
        
        email = request.form.get('email')
        password = request.form.get('password')
        
        user = User.query.filter_by(email=email).first()
        
        # Vérifier que l'utilisateur existe ET qu'il est admin
        if user and user.is_admin and bcrypt.check_password_hash(user.password, password):
            # Connexion admin réussie
            record_login_attempt(ip_address, user.username, True)
            login_user(user, remember=True)
            
            # Nettoyer les anciennes tentatives échouées
            LoginAttempt.query.filter_by(ip_address=ip_address, success=False).delete()
            db.session.commit()
            
            flash(f'Bienvenue Administrateur {user.username}!', 'success')
            return redirect(url_for('admin_dashboard'))
        else:
            # Connexion échouée
            record_login_attempt(ip_address, email, False)
            
            # Compter les tentatives restantes
            cutoff_time = datetime.utcnow() - timedelta(minutes=15)
            remaining_attempts = 5 - LoginAttempt.query.filter(
                LoginAttempt.ip_address == ip_address,
                LoginAttempt.attempt_time > cutoff_time,
                LoginAttempt.success == False
            ).count()
            
            if remaining_attempts > 0:
                flash(f'Identifiants admin incorrects. Il vous reste {remaining_attempts} tentative(s).', 'danger')
            else:
                flash('Trop de tentatives de connexion. Veuillez réessayer dans 15 minutes.', 'danger')
    
    return render_template('admin_login.html')

# Routes Admin
@app.route('/admin')
@admin_required
def admin_dashboard():
    from datetime import datetime, timedelta
    from sqlalchemy import func
    from models import Review, Coupon
    
    # Filtre temporel (par défaut: 30 jours)
    period = request.args.get('period', '30')
    
    # Calculer la date de début selon le filtre
    if period == '7':
        start_date = datetime.now() - timedelta(days=7)
        period_label = "7 derniers jours"
    elif period == '30':
        start_date = datetime.now() - timedelta(days=30)
        period_label = "30 derniers jours"
    elif period == '90':
        start_date = datetime.now() - timedelta(days=90)
        period_label = "3 derniers mois"
    elif period == '365':
        start_date = datetime.now() - timedelta(days=365)
        period_label = "Cette année"
    else:
        start_date = datetime.now() - timedelta(days=30)
        period_label = "30 derniers jours"
    
    # === STATISTIQUES PRINCIPALES ===
    
    # Produits
    total_products = Product.query.count()
    active_products = Product.query.filter(Product.stock > 0).count()
    
    # Commandes
    total_orders = Order.query.count()
    period_orders = Order.query.filter(Order.created_at >= start_date).count()
    pending_orders = Order.query.filter_by(status='pending').count()
    
    # Clients
    total_users = User.query.filter_by(is_admin=False).count()
    new_users = User.query.filter(User.created_at >= start_date, User.is_admin == False).count()
    
    # Ventes
    total_revenue = db.session.query(func.sum(Order.total_amount)).filter(
        Order.created_at >= start_date
    ).scalar() or 0
    
    avg_order_value = total_revenue / period_orders if period_orders > 0 else 0
    
    # Avis
    try:
        total_reviews = Review.query.count()
        avg_rating = db.session.query(func.avg(Review.rating)).scalar() or 0
    except:
        total_reviews = 0
        avg_rating = 0
    
    # Codes promo
    try:
        active_coupons = Coupon.query.filter_by(is_active=True).count()
        coupon_usage = db.session.query(func.sum(Coupon.used_count)).scalar() or 0
    except:
        active_coupons = 0
        coupon_usage = 0
    
    # === PRODUITS LES PLUS VENDUS ===
    top_products = db.session.query(
        Product,
        func.count(OrderItem.id).label('sales_count'),
        func.sum(OrderItem.quantity).label('total_quantity')
    ).join(OrderItem).join(Order).filter(
        Order.created_at >= start_date
    ).group_by(Product.id).order_by(
        func.count(OrderItem.id).desc()
    ).limit(5).all()
    
    # === COMMANDES RÉCENTES ===
    recent_orders = Order.query.order_by(Order.created_at.desc()).limit(10).all()
    
    # === PRODUITS EN RUPTURE/FAIBLE STOCK ===
    out_of_stock = Product.query.filter(Product.stock == 0).count()
    low_stock_products = Product.query.filter(Product.stock > 0, Product.stock < 10).limit(5).all()
    
    # === DONNÉES POUR GRAPHIQUES ===
    
    # Ventes par jour (7 derniers jours)
    sales_by_day = []
    for i in range(7):
        day = datetime.now() - timedelta(days=6-i)
        day_start = day.replace(hour=0, minute=0, second=0)
        day_end = day.replace(hour=23, minute=59, second=59)
        
        day_orders = Order.query.filter(
            Order.created_at >= day_start,
            Order.created_at <= day_end
        ).count()
        
        day_revenue = db.session.query(func.sum(Order.total_amount)).filter(
            Order.created_at >= day_start,
            Order.created_at <= day_end
        ).scalar() or 0
        
        sales_by_day.append({
            'date': day.strftime('%d/%m'),
            'orders': day_orders,
            'revenue': float(day_revenue)
        })
    
    # Top catégories
    try:
        from models import Category
        top_categories_raw = db.session.query(
            Category.name,
            func.count(OrderItem.id).label('sales')
        ).join(Product).join(OrderItem).join(Order).filter(
            Order.created_at >= start_date
        ).group_by(Category.name).order_by(func.count(OrderItem.id).desc()).limit(5).all()
        # Convert Row objects to dictionaries for JSON serialization
        top_categories = [{'name': row.name, 'sales': row.sales} for row in top_categories_raw]
    except:
        top_categories = []
    
    # Messages non lus
    try:
        unread_messages = Message.query.filter_by(is_read=False).count()
    except:
        unread_messages = 0
    
    # === CLIENTS LES PLUS ACTIFS ===
    top_customers = db.session.query(
        User,
        func.count(Order.id).label('order_count'),
        func.sum(Order.total_amount).label('total_spent')
    ).join(Order).filter(
        Order.created_at >= start_date,
        User.is_admin == False
    ).group_by(User.id).order_by(func.sum(Order.total_amount).desc()).limit(5).all()
    
    # === TOP MARQUES ===
    try:
        top_brands_raw = db.session.query(
            Product.brand.label('name'),
            func.count(OrderItem.id).label('sales')
        ).join(OrderItem, OrderItem.product_id == Product.id
        ).join(Order, Order.id == OrderItem.order_id
        ).filter(
            Order.created_at >= start_date,
            Product.brand.isnot(None)
        ).group_by(Product.brand).order_by(
            func.count(OrderItem.id).desc()
        ).limit(5).all()
        # Convert Row objects to dictionaries for JSON serialization
        top_brands = [{'name': row.name, 'sales': row.sales} for row in top_brands_raw]
    except Exception as e:
        print(f"Erreur top_brands: {e}")
        top_brands = []
    
    # === COMMANDES PAR STATUT ===
    orders_by_status_raw = db.session.query(
        Order.status,
        func.count(Order.id).label('count')
    ).filter(Order.created_at >= start_date).group_by(Order.status).all()
    
    # Convert Row objects to dictionaries for JSON serialization
    orders_by_status = [{'status': row.status, 'count': row.count} for row in orders_by_status_raw]
    
    # === ALERTES STOCK ===
    stock_alerts = Product.query.filter(Product.stock > 0, Product.stock < 10).limit(10).all()
    alerts_count = len(stock_alerts) + (pending_orders if pending_orders > 5 else 0)
    
    # Taux de conversion (simplifié)
    conversion_rate = (period_orders / total_users * 100) if total_users > 0 else 0
    
    stats = {
        # Principales
        'total_products': total_products,
        'active_products': active_products,
        'total_orders': total_orders,
        'period_orders': period_orders,
        'pending_orders': pending_orders,
        'total_users': total_users,
        'new_users': new_users,
        'total_revenue': total_revenue,
        'avg_order_value': avg_order_value,
        'total_reviews': total_reviews,
        'avg_rating': round(avg_rating, 1),
        'active_coupons': active_coupons,
        'coupon_usage': coupon_usage,
        'out_of_stock': out_of_stock,
        'conversion_rate': conversion_rate
    }
    
    return render_template('admin/dashboard.html',
        stats=stats,
        period_label=period_label,
        top_products=top_products,
        top_customers=top_customers,
        recent_orders=recent_orders,
        stock_alerts=stock_alerts,
        alerts_count=alerts_count,
        sales_by_day=sales_by_day,
        top_categories=top_categories,
        top_brands=top_brands,
        orders_by_status=orders_by_status,
        pending_orders=pending_orders
    )

@app.route('/admin/brands')
@admin_required
def admin_brands():
    """Page de gestion des marques"""
    from models import Brand
    
    # Récupérer toutes les marques depuis la table Brand
    brands = Brand.query.order_by(Brand.name).all()
    
    # Ajouter le nombre de produits pour chaque marque
    for brand in brands:
        brand.products = Product.query.filter_by(brand=brand.name).all()
    
    total_products = Product.query.count()
    
    return render_template('admin/brands.html', 
        brands=brands, 
        total_products=total_products,
        active_page='brands'
    )

@app.route('/admin/brands/add', methods=['POST'])
@admin_required
def admin_add_brand():
    """Ajouter une nouvelle marque"""
    from models import Brand
    
    brand_name = request.form.get('name')
    country = request.form.get('country')
    description = request.form.get('description')
    is_active = request.form.get('is_active') == 'on'
    
    if brand_name:
        # Vérifier si la marque existe déjà
        existing_brand = Brand.query.filter_by(name=brand_name).first()
        if existing_brand:
            flash(f'La marque "{brand_name}" existe déjà !', 'warning')
            return redirect(url_for('admin_brands'))
        
        # Créer la nouvelle marque
        new_brand = Brand(
            name=brand_name,
            country=country,
            description=description,
            is_active=is_active
        )
        db.session.add(new_brand)
        db.session.flush()  # Pour obtenir l'ID
        
        # Gérer l'upload du logo
        logo_url = None
        if 'logo' in request.files:
            file = request.files['logo']
            if file and file.filename:
                # Vérifier l'extension du fichier
                allowed_extensions = {'png', 'jpg', 'jpeg', 'gif', 'svg', 'webp'}
                if '.' in file.filename and file.filename.rsplit('.', 1)[1].lower() in allowed_extensions:
                    filename = secure_filename(file.filename)
                    filename = f"brand_{new_brand.id}_{datetime.now().strftime('%Y%m%d%H%M%S')}_{filename}"
                    filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
                    file.save(filepath)
                    logo_url = f"uploads/{filename}"
                    new_brand.logo_url = logo_url
                else:
                    flash('Format d\'image non supporté. Utilisez PNG, JPG, JPEG, GIF, SVG ou WEBP.', 'warning')
        
        db.session.commit()
        
        flash(f'Marque "{brand_name}" créée avec succès !', 'success')
        return redirect(url_for('admin_brands'))
    
    flash('Nom de marque requis.', 'danger')
    return redirect(url_for('admin_brands'))

@app.route('/admin/brands/edit/<int:brand_id>', methods=['GET', 'POST'])
@admin_required
def admin_edit_brand(brand_id):
    """Modifier une marque"""
    from models import Brand
    
    brand = Brand.query.get_or_404(brand_id)
    
    if request.method == 'POST':
        brand.name = request.form.get('name')
        brand.country = request.form.get('country')
        brand.description = request.form.get('description')
        brand.is_active = request.form.get('is_active') == 'on'
        
        # Gérer l'upload du logo
        if 'logo' in request.files:
            file = request.files['logo']
            if file and file.filename:
                # Vérifier l'extension du fichier
                allowed_extensions = {'png', 'jpg', 'jpeg', 'gif', 'svg', 'webp'}
                if '.' in file.filename and file.filename.rsplit('.', 1)[1].lower() in allowed_extensions:
                    filename = secure_filename(file.filename)
                    filename = f"brand_{brand.id}_{datetime.now().strftime('%Y%m%d%H%M%S')}_{filename}"
                    filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
                    file.save(filepath)
                    brand.logo_url = f"uploads/{filename}"
                else:
                    flash('Format d\'image non supporté. Utilisez PNG, JPG, JPEG, GIF, SVG ou WEBP.', 'warning')
        
        db.session.commit()
        flash(f'Marque "{brand.name}" modifiée avec succès !', 'success')
        return redirect(url_for('admin_brands'))
    
    # GET - Afficher le formulaire de modification
    total_products = Product.query.count()
    brand.products = Product.query.filter_by(brand=brand.name).all()
    
    return render_template('admin/edit_brand.html', brand=brand, total_products=total_products)

@app.route('/admin/brands/delete/<int:brand_id>', methods=['POST', 'DELETE'])
@admin_required
def admin_delete_brand(brand_id):
    """Supprimer une marque"""
    from models import Brand
    
    brand = Brand.query.get_or_404(brand_id)
    brand_name = brand.name
    
    # Vérifier s'il y a des produits associés
    products_count = Product.query.filter_by(brand=brand_name).count()
    if products_count > 0:
        flash(f'Impossible de supprimer la marque "{brand_name}" car elle contient {products_count} produits !', 'danger')
    else:
        db.session.delete(brand)
        db.session.commit()
        flash(f'Marque "{brand_name}" supprimée avec succès !', 'success')
    
    return redirect(url_for('admin_brands'))

# Routes Admin - Gestion des Coupons
@app.route('/admin/coupons')
@admin_required
def admin_coupons():
    from models import Coupon
    coupons = Coupon.query.order_by(Coupon.created_at.desc()).all()
    return render_template('admin/coupons.html', coupons=coupons)

@app.route('/admin/coupons/add', methods=['POST'])
@admin_required
def admin_add_coupon():
    from models import Coupon
    
    code = request.form.get('code', '').strip().upper()
    discount_type = request.form.get('discount_type')
    discount_value = request.form.get('discount_value', type=float)
    min_purchase = request.form.get('min_purchase', type=float, default=0)
    max_uses = request.form.get('max_uses', type=int)
    valid_until = request.form.get('valid_until')
    
    if not code or not discount_type or not discount_value:
        flash('Veuillez remplir tous les champs requis.', 'danger')
        return redirect(url_for('admin_coupons'))
    
    # Vérifier si le code existe déjà
    existing = Coupon.query.filter_by(code=code).first()
    if existing:
        flash(f'Le code "{code}" existe déjà !', 'warning')
        return redirect(url_for('admin_coupons'))
    
    # Convertir la date si fournie
    valid_until_date = None
    if valid_until:
        from datetime import datetime as dt
        try:
            valid_until_date = dt.strptime(valid_until, '%Y-%m-%d')
        except:
            pass
    
    coupon = Coupon(
        code=code,
        discount_type=discount_type,
        discount_value=discount_value,
        min_purchase=min_purchase,
        max_uses=max_uses,
        valid_until=valid_until_date,
        is_active=True
    )
    
    db.session.add(coupon)
    db.session.commit()
    
    flash(f'Code promo "{code}" créé avec succès !', 'success')
    return redirect(url_for('admin_coupons'))

@app.route('/admin/coupons/toggle/<int:coupon_id>', methods=['POST'])
@admin_required
def admin_toggle_coupon(coupon_id):
    from models import Coupon
    coupon = Coupon.query.get_or_404(coupon_id)
    coupon.is_active = not coupon.is_active
    db.session.commit()
    
    status = "activé" if coupon.is_active else "désactivé"
    flash(f'Code promo "{coupon.code}" {status} avec succès !', 'success')
    return redirect(url_for('admin_coupons'))

@app.route('/admin/coupons/delete/<int:coupon_id>', methods=['POST'])
@admin_required
def admin_delete_coupon(coupon_id):
    from models import Coupon
    coupon = Coupon.query.get_or_404(coupon_id)
    code = coupon.code
    db.session.delete(coupon)
    db.session.commit()
    flash(f'Code promo "{code}" supprimé avec succès !', 'success')
    return redirect(url_for('admin_coupons'))

@app.route('/admin/products')
@admin_required
def admin_products():
    # Récupérer le filtre par marque si présent
    brand_filter = request.args.get('brand')
    
    if brand_filter:
        products = Product.query.filter_by(brand=brand_filter).all()
    else:
        products = Product.query.all()
    
    return render_template('admin/manage_products.html', products=products, current_brand=brand_filter)

@app.route('/admin/products/add', methods=['GET', 'POST'])
@admin_required
def admin_add_product():
    if request.method == 'POST':
        # Gérer la marque (existante ou nouvelle)
        brand = request.form.get('brand')
        if brand == '__new__':
            brand = request.form.get('new_brand')
            if not brand:
                flash('Veuillez entrer le nom de la nouvelle marque.', 'danger')
                categories = Category.query.all()
                brands = db.session.query(Product.brand).filter(Product.brand.isnot(None)).distinct().order_by(Product.brand).all()
                brands = [b[0] for b in brands if b[0]]
                return render_template('admin/add_product.html', categories=categories, brands=brands)
        
        # Gérer l'upload de l'image
        image_url = None
        if 'image' in request.files:
            file = request.files['image']
            if file and file.filename:
                # Vérifier l'extension du fichier
                allowed_extensions = {'png', 'jpg', 'jpeg', 'gif', 'webp'}
                if '.' in file.filename and file.filename.rsplit('.', 1)[1].lower() in allowed_extensions:
                    filename = secure_filename(file.filename)
                    filename = f"{datetime.now().strftime('%Y%m%d%H%M%S')}_{filename}"
                    filepath = os.path.join('static', 'uploads', filename)
                    file.save(filepath)
                    image_url = filename
                else:
                    flash('Format d\'image non supporté. Utilisez PNG, JPG, JPEG, GIF ou WEBP.', 'warning')
        
        product = Product(
            name=request.form.get('name'),
            description=request.form.get('description'),
            price=float(request.form.get('price')),
            stock=int(request.form.get('stock')),
            category_id=int(request.form.get('category_id')),
            is_decant=request.form.get('is_decant') == '1',
            size=request.form.get('size'),
            brand=brand,
            image_url=image_url,
            is_featured=request.form.get('is_featured') == '1'
        )
        db.session.add(product)
        db.session.commit()
        
        flash('Produit ajouté avec succès!', 'success')
        return redirect(url_for('admin_products'))
    
    # GET request - afficher le formulaire
    from models import Brand
    
    categories = Category.query.all()
    # Récupérer toutes les marques depuis la table Brand
    brands_objects = Brand.query.filter_by(is_active=True).order_by(Brand.name).all()
    brands = [brand.name for brand in brands_objects]
    
    return render_template('admin/add_product.html', categories=categories, brands=brands)

@app.route('/admin/products/edit/<int:product_id>', methods=['GET', 'POST'])
@admin_required
def admin_edit_product(product_id):
    product = Product.query.get_or_404(product_id)
    
    if request.method == 'POST':
        product.name = request.form.get('name')
        product.description = request.form.get('description')
        product.price = float(request.form.get('price'))
        product.stock = int(request.form.get('stock'))
        product.category_id = int(request.form.get('category_id'))
        product.is_decant = request.form.get('is_decant') == '1'
        product.size = request.form.get('size')
        product.brand = request.form.get('brand')
        product.is_featured = request.form.get('is_featured') == 'on'
        
        # Gérer l'upload de la nouvelle image
        if 'image' in request.files:
            file = request.files['image']
            if file and file.filename:
                # Vérifier l'extension du fichier
                allowed_extensions = {'png', 'jpg', 'jpeg', 'gif', 'webp'}
                if '.' in file.filename and file.filename.rsplit('.', 1)[1].lower() in allowed_extensions:
                    # Supprimer l'ancienne image si elle existe
                    if product.image_url:
                        old_image_path = os.path.join('static', 'uploads', product.image_url)
                        if os.path.exists(old_image_path):
                            os.remove(old_image_path)
                    
                    filename = secure_filename(file.filename)
                    filename = f"{datetime.now().strftime('%Y%m%d%H%M%S')}_{filename}"
                    filepath = os.path.join('static', 'uploads', filename)
                    file.save(filepath)
                    product.image_url = filename
                else:
                    flash('Format d\'image non supporté.', 'warning')
        
        db.session.commit()
        flash('Produit modifié avec succès!', 'success')
        return redirect(url_for('admin_products'))
    
    categories = Category.query.all()
    return render_template('admin/edit_product.html', product=product, categories=categories)

@app.route('/admin/products/delete/<int:product_id>', methods=['POST'])
@admin_required
def admin_delete_product(product_id):
    product = Product.query.get_or_404(product_id)
    
    # Delete related records first to maintain foreign key constraints
    CartItem.query.filter_by(product_id=product_id).delete()
    WishlistItem.query.filter_by(product_id=product_id).delete()
    Review.query.filter_by(product_id=product_id).delete()
    OrderItem.query.filter_by(product_id=product_id).delete()
    
    # Now delete the product
    db.session.delete(product)
    db.session.commit()
    flash('Produit supprimé avec succès!', 'success')
    return redirect(url_for('admin_products'))

@app.route('/admin/orders')
@admin_required
def admin_orders():
    orders = Order.query.order_by(Order.created_at.desc()).all()
    return render_template('admin/manage_orders.html', orders=orders)

@app.route('/admin/order/<int:order_id>')
@admin_required
def admin_order_detail(order_id):
    """Route admin pour voir les détails de n'importe quelle commande"""
    order = Order.query.get_or_404(order_id)
    return render_template('admin/order_detail.html', order=order)

@app.route('/admin/orders/export')
@admin_required
def export_orders_excel():
    """Exporter toutes les commandes en fichier Excel (CSV)"""
    orders = Order.query.order_by(Order.created_at.desc()).all()
    
    # Créer un fichier CSV
    import csv
    from io import StringIO, BytesIO
    
    output = StringIO()
    writer = csv.writer(output)
    
    # En-têtes améliorés
    writer.writerow([
        'N° Commande', 
        'Date', 
        'Client', 
        'Email', 
        'Téléphone', 
        'WhatsApp',
        'Adresse', 
        'Méthode Paiement',
        'Produit', 
        'Quantité', 
        'Prix unitaire', 
        'Sous-total', 
        'Total commande', 
        'Statut',
        'Notes'
    ])
    
    # Données détaillées
    for order in orders:
        # Récupérer la méthode de paiement
        payment_method_labels = {
            'whatsapp': 'WhatsApp',
            'delivery': 'Paiement à la livraison',
            'transfer': 'Virement Bancaire',
            'cash': 'Espèces',
            'card': 'Carte Bancaire',
            'paypal': 'PayPal'
        }
        payment_label = payment_method_labels.get(
            order.payment_method if hasattr(order, 'payment_method') else 'N/A', 
            order.payment_method if hasattr(order, 'payment_method') else 'N/A'
        )
        
        for item in order.order_items:
            writer.writerow([
                order.order_number if hasattr(order, 'order_number') else f'ORD-{order.id}',
                order.created_at.strftime('%d/%m/%Y %H:%M'),
                order.user.username if order.user else 'N/A',
                order.user.email if order.user else 'N/A',
                order.phone or 'N/A',
                order.phone or 'N/A',  # WhatsApp (même numéro pour l'instant)
                order.shipping_address or 'N/A',
                payment_label,
                item.product.name if item.product else 'Produit supprimé',
                item.quantity,
                f'{item.price:.2f}',
                f'{item.price * item.quantity:.2f}',
                f'{order.total_amount:.2f}',
                order.status,
                order.notes if hasattr(order, 'notes') else ''
            ])
    
    output.seek(0)
    
    # Convertir en bytes pour l'envoi
    from flask import make_response
    response = make_response(output.getvalue())
    response.headers["Content-Disposition"] = f"attachment; filename=commandes_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
    response.headers["Content-type"] = "text/csv; charset=utf-8"
    
    return response

@app.route('/admin/orders/update/<int:order_id>', methods=['POST'])
@admin_required
def admin_update_order(order_id):
    order = Order.query.get_or_404(order_id)
    order.status = request.form.get('status')
    db.session.commit()
    flash('Statut de la commande mis à jour!', 'success')
    return redirect(url_for('admin_orders'))

@app.route('/admin/orders/accept/<int:order_id>', methods=['POST'])
@admin_required
def admin_accept_order(order_id):
    order = Order.query.get_or_404(order_id)
    order.status = 'processing'  # Passer au statut "En cours"
    db.session.commit()
    flash(f'Commande {order.order_number} acceptée et en cours de traitement!', 'success')
    return redirect(url_for('admin_orders'))

@app.route('/admin/orders/delete/<int:order_id>', methods=['POST'])
@admin_required
def admin_delete_order(order_id):
    order = Order.query.get_or_404(order_id)
    order_number = order.order_number
    
    # Supprimer les items de la commande d'abord
    OrderItem.query.filter_by(order_id=order_id).delete()
    
    # Puis supprimer la commande
    db.session.delete(order)
    db.session.commit()
    
    flash(f'Commande {order_number} supprimée avec succès!', 'success')
    return redirect(url_for('admin_orders'))

@app.route('/admin/users')
@admin_required
def admin_users():
    users = User.query.all()
    return render_template('admin/manage_users.html', users=users)

@app.route('/admin/messages')
@admin_required
def admin_messages():
    messages = Message.query.order_by(Message.created_at.desc()).all()
    return render_template('admin/manage_messages.html', messages=messages)

# Route désactivée - Catégories fixes (Homme, Femme, Unisexe)
# @app.route('/admin/categories', methods=['GET', 'POST'])
# @admin_required
def admin_categories_disabled():
    if request.method == 'POST':
        name = request.form.get('name')
        description = request.form.get('description')
        category_type = request.form.get('category_type')
        display_order = request.form.get('display_order', 0)
        is_active = request.form.get('is_active') == 'on'
        show_in_menu = request.form.get('show_in_menu') == 'on'
        
        # Gérer l'upload d'image
        image_url = None
        if 'image' in request.files:
            file = request.files['image']
            if file and file.filename:
                filename = secure_filename(file.filename)
                # Ajouter un timestamp pour éviter les doublons
                timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
                filename = f"{timestamp}_{filename}"
                filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
                file.save(filepath)
                image_url = f'uploads/{filename}'
        
        category = Category(
            name=name, 
            description=description,
            category_type=category_type,
            image_url=image_url,
            display_order=int(display_order) if display_order else 0,
            is_active=is_active,
            show_in_menu=show_in_menu
        )
        db.session.add(category)
        db.session.commit()
        
        flash(f'Catégorie "{name}" ajoutée avec succès!', 'success')
        return redirect(url_for('admin_categories'))
    
    categories = Category.query.order_by(Category.display_order, Category.name).all()
    return render_template('admin/manage_categories.html', categories=categories)

# Route désactivée - Catégories fixes
# @app.route('/admin/categories/edit/<int:category_id>', methods=['GET', 'POST'])
# @admin_required
def admin_edit_category_disabled(category_id):
    category = Category.query.get_or_404(category_id)
    
    if request.method == 'POST':
        category.name = request.form.get('name')
        category.description = request.form.get('description')
        category.category_type = request.form.get('category_type')
        category.display_order = int(request.form.get('display_order', 0))
        category.is_active = request.form.get('is_active') == 'on'
        category.show_in_menu = request.form.get('show_in_menu') == 'on'
        
        # Gérer la suppression de l'image
        if request.form.get('remove_image') == 'on':
            category.image_url = None
        
        # Gérer l'upload d'une nouvelle image
        if 'image' in request.files:
            file = request.files['image']
            if file and file.filename:
                filename = secure_filename(file.filename)
                timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
                filename = f"{timestamp}_{filename}"
                filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
                file.save(filepath)
                category.image_url = f'uploads/{filename}'
        
        db.session.commit()
        flash(f'Catégorie "{category.name}" modifiée avec succès!', 'success')
        return redirect(url_for('admin_categories'))
    
    return render_template('admin/edit_category.html', category=category)

# Route désactivée - Catégories fixes
# @app.route('/admin/categories/delete/<int:category_id>', methods=['POST'])
# @admin_required
def admin_delete_category_disabled(category_id):
    category = Category.query.get_or_404(category_id)
    category_name = category.name
    
    # Vérifier s'il y a des produits associés
    if category.products:
        flash(f'Impossible de supprimer la catégorie "{category_name}" car elle contient {len(category.products)} produits!', 'danger')
    else:
        db.session.delete(category)
        db.session.commit()
        flash(f'Catégorie "{category_name}" supprimée avec succès!', 'success')
    
    return redirect(url_for('admin_categories'))

# API Routes pour AJAX
@app.route('/api/cart/update', methods=['POST'])
def update_cart_quantity():
    """Mettre à jour la quantité d'un article du panier (fonctionne avec et sans connexion)"""
    data = request.get_json()
    item_id = data.get('item_id')
    quantity = int(data.get('quantity', 1))
    
    if current_user.is_authenticated:
        # Panier DB pour utilisateurs connectés
        cart_item = CartItem.query.get_or_404(int(item_id))
        
        if cart_item.user_id == current_user.id:
            cart_item.quantity = quantity
            db.session.commit()
            return jsonify({'success': True, 'message': 'Quantité mise à jour'})
        
        return jsonify({'success': False, 'message': 'Accès refusé'}), 403
    else:
        # Panier session pour visiteurs
        if str(item_id).startswith('session_'):
            product_id = item_id.replace('session_', '')
            cart = session.get('cart', {})
            
            if product_id in cart:
                cart[product_id] = quantity
                session['cart'] = cart
                session.modified = True
                return jsonify({'success': True, 'message': 'Quantité mise à jour'})
        
        return jsonify({'success': False, 'message': 'Article non trouvé'}), 404

@app.route('/api/search')
def search_products():
    query = request.args.get('q', '')
    products = Product.query.filter(Product.name.contains(query)).limit(10).all()
    results = [{
        'id': p.id,
        'name': p.name,
        'price': p.price,
        'image_url': p.image_url
    } for p in products]
    return jsonify(results)

@app.route('/api/products/filter', methods=['POST'])
def filter_products_ajax():
    """Filtrage dynamique AJAX des produits"""
    data = request.get_json()
    
    # Construire la requête de base
    query = Product.query
    
    # Appliquer les filtres
    if data.get('category'):
        category = Category.query.filter_by(name=data['category']).first()
        if category:
            query = query.filter_by(category_id=category.id)
    
    if data.get('brand'):
        query = query.filter_by(brand=data['brand'])
    
    if data.get('price_min'):
        query = query.filter(Product.price >= float(data['price_min']))
    
    if data.get('price_max'):
        query = query.filter(Product.price <= float(data['price_max']))
    
    if data.get('size'):
        query = query.filter_by(size=data['size'])
    
    if data.get('product_type'):
        query = query.filter_by(product_type=data['product_type'])
    
    # Appliquer le tri
    sort_by = data.get('sort', 'name')
    if sort_by == 'price_asc':
        query = query.order_by(Product.price.asc())
    elif sort_by == 'price_desc':
        query = query.order_by(Product.price.desc())
    elif sort_by == 'name':
        query = query.order_by(Product.name.asc())
    elif sort_by == 'newest':
        query = query.order_by(Product.created_at.desc())
    
    products = query.all()
    
    # Convertir en JSON
    results = [{
        'id': p.id,
        'name': p.name,
        'brand': p.brand,
        'price': p.price,
        'size': p.size,
        'image_url': p.image_url,
        'product_type': p.product_type,
        'stock': p.stock
    } for p in products]
    
    return jsonify({
        'success': True,
        'products': results,
        'count': len(results)
    })

# ===== ROUTES BLOG =====
@app.route('/blog')
def blog():
    """Liste des articles de blog avec pagination"""
    page = request.args.get('page', 1, type=int)
    category = request.args.get('category')
    search = request.args.get('search', '')
    
    query = BlogPost.query.filter_by(is_published=True)
    
    # Filtre par catégorie
    if category:
        query = query.filter_by(blog_category=category)
    
    # Recherche
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            (BlogPost.title.ilike(search_term)) | 
            (BlogPost.excerpt.ilike(search_term))
        )
    
    # Pagination (6 articles par page)
    pagination = query.order_by(BlogPost.created_at.desc()).paginate(
        page=page, per_page=6, error_out=False
    )
    
    posts = pagination.items
    
    # Catégories de blog disponibles
    blog_categories = db.session.query(BlogPost.blog_category).filter(
        BlogPost.is_published == True,
        BlogPost.blog_category.isnot(None)
    ).distinct().all()
    blog_categories = [cat[0] for cat in blog_categories if cat[0]]
    
    return render_template('blog.html', 
                         posts=posts, 
                         pagination=pagination,
                         blog_categories=blog_categories,
                         current_category=category,
                         search=search)

@app.route('/blog/<slug>')
def blog_post(slug):
    """Afficher un article de blog"""
    post = BlogPost.query.filter_by(slug=slug, is_published=True).first_or_404()
    
    # Incrémenter les vues
    post.views += 1
    db.session.commit()
    
    # Articles similaires (même catégorie)
    related_posts = BlogPost.query.filter(
        BlogPost.blog_category == post.blog_category,
        BlogPost.id != post.id,
        BlogPost.is_published == True
    ).limit(3).all()
    
    return render_template('blog_post.html', post=post, related_posts=related_posts)

# ===== ROUTES PROGRAMME FIDELITÉ =====
@app.route('/loyalty')
@login_required
def loyalty_program():
    """Page du programme de fidélité"""
    # Récupérer ou créer le compte de fidélité
    loyalty_account = LoyaltyPoints.query.filter_by(user_id=current_user.id).first()
    if not loyalty_account:
        loyalty_account = LoyaltyPoints(user_id=current_user.id)
        db.session.add(loyalty_account)
        db.session.commit()
    
    # Récupérer les transactions récentes
    transactions = LoyaltyTransaction.query.filter_by(
        loyalty_id=loyalty_account.id
    ).order_by(LoyaltyTransaction.created_at.desc()).limit(20).all()
    
    # Récupérer les récompenses disponibles
    rewards = LoyaltyReward.query.filter_by(is_active=True).order_by(LoyaltyReward.points_cost).all()
    
    return render_template('loyalty.html', 
                         loyalty_account=loyalty_account,
                         transactions=transactions,
                         rewards=rewards)

@app.route('/loyalty/redeem/<int:reward_id>', methods=['POST'])
@login_required
def redeem_loyalty_reward(reward_id):
    """Utiliser des points pour une récompense"""
    reward = LoyaltyReward.query.get_or_404(reward_id)
    loyalty_account = LoyaltyPoints.query.filter_by(user_id=current_user.id).first()
    
    if not loyalty_account:
        flash('Compte de fidélité introuvable.', 'danger')
        return redirect(url_for('loyalty_program'))
    
    # Vérifier si l'utilisateur a assez de points
    if loyalty_account.points < reward.points_cost:
        flash(f'Points insuffisants. Il vous manque {reward.points_cost - loyalty_account.points} points.', 'warning')
        return redirect(url_for('loyalty_program'))
    
    # Déduire les points
    loyalty_account.points -= reward.points_cost
    loyalty_account.total_spent += reward.points_cost
    
    # Créer une transaction
    transaction = LoyaltyTransaction(
        loyalty_id=loyalty_account.id,
        points=-reward.points_cost,
        transaction_type='reward',
        description=f'Récompense : {reward.name}'
    )
    db.session.add(transaction)
    
    # Si la récompense est une réduction, créer un coupon
    if reward.reward_type == 'discount':
        from models import Coupon
        from datetime import timedelta
        
        # Générer un code unique
        import random
        import string
        code = 'FIDELITE' + ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
        
        coupon = Coupon(
            code=code,
            discount_type='percentage' if reward.reward_value <= 100 else 'fixed',
            discount_value=reward.reward_value,
            max_uses=1,
            valid_until=datetime.utcnow() + timedelta(days=30),
            is_active=True
        )
        db.session.add(coupon)
        db.session.commit()
        
        flash(f'Félicitations ! Votre code promo : {code} (valide 30 jours)', 'success')
    else:
        flash(f'Récompense "{reward.name}" échangée avec succès !', 'success')
    
    db.session.commit()
    return redirect(url_for('loyalty_program'))

# ===== ROUTES ADMIN - BLOG =====
@app.route('/admin/blog')
@admin_required
def admin_blog_posts():
    """Gestion des articles de blog"""
    # Filtres
    category = request.args.get('category')
    status = request.args.get('status')
    search = request.args.get('search', '')
    
    query = BlogPost.query
    
    if category:
        query = query.filter_by(blog_category=category)
    
    if status == 'published':
        query = query.filter_by(is_published=True)
    elif status == 'draft':
        query = query.filter_by(is_published=False)
    
    if search:
        search_term = f"%{search}%"
        query = query.filter(BlogPost.title.ilike(search_term))
    
    posts = query.order_by(BlogPost.created_at.desc()).all()
    return render_template('admin/blog_posts.html', posts=posts)

@app.route('/admin/blog/add', methods=['GET', 'POST'])
@admin_required
def admin_add_blog_post():
    """Ajouter un article de blog"""
    if request.method == 'POST':
        title = request.form.get('title')
        title_en = request.form.get('title_en')
        content = request.form.get('content')
        content_en = request.form.get('content_en')
        excerpt = request.form.get('excerpt')
        excerpt_en = request.form.get('excerpt_en')
        blog_category = request.form.get('blog_category')
        is_published = request.form.get('is_published') == 'on'
        
        # Générer le slug depuis le titre
        import re
        slug = re.sub(r'[^\w\s-]', '', title.lower())
        slug = re.sub(r'[-\s]+', '-', slug)
        
        # Vérifier l'unicité du slug
        counter = 1
        original_slug = slug
        while BlogPost.query.filter_by(slug=slug).first():
            slug = f"{original_slug}-{counter}"
            counter += 1
        
        # Gérer l'upload de l'image
        image_url = None
        if 'image' in request.files:
            file = request.files['image']
            if file and file.filename:
                allowed_extensions = {'png', 'jpg', 'jpeg', 'gif', 'webp'}
                if '.' in file.filename and file.filename.rsplit('.', 1)[1].lower() in allowed_extensions:
                    filename = secure_filename(file.filename)
                    filename = f"blog_{datetime.now().strftime('%Y%m%d%H%M%S')}_{filename}"
                    filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
                    file.save(filepath)
                    image_url = f"uploads/{filename}"
        
        # Récupérer slug ou générer
        slug = request.form.get('slug', '')
        if not slug:
            import re
            import unicodedata
            slug = title.lower()
            # Normaliser les accents
            slug = unicodedata.normalize('NFKD', slug).encode('ascii', 'ignore').decode('utf-8')
            # Remplacer espaces et caractères spéciaux par des tirets
            slug = re.sub(r'[^\w\s-]', '', slug)
            slug = re.sub(r'[-\s]+', '-', slug).strip('-')
        
        # Vérifier l'unicité du slug
        counter = 1
        original_slug = slug
        while BlogPost.query.filter_by(slug=slug).first():
            slug = f"{original_slug}-{counter}"
            counter += 1
        
        # Récupérer l'auteur
        author = request.form.get('author', 'Admin')
        is_published = request.form.get('is_published') == '1'
        
        post = BlogPost(
            title=title,
            title_en=title_en,
            slug=slug,
            content=content,
            content_en=content_en,
            excerpt=excerpt,
            excerpt_en=excerpt_en,
            blog_category=blog_category,
            author=author,
            image_url=image_url,
            is_published=is_published
        )
        db.session.add(post)
        db.session.commit()
        
        flash('Article de blog ajouté avec succès !', 'success')
        return redirect(url_for('admin_blog_posts'))
    
    return render_template('admin/edit_blog_post.html', post=None)

@app.route('/admin/blog/edit/<int:post_id>', methods=['GET', 'POST'])
@admin_required
def admin_edit_blog_post(post_id):
    """Modifier un article de blog"""
    post = BlogPost.query.get_or_404(post_id)
    
    if request.method == 'POST':
        post.title = request.form.get('title')
        post.title_en = request.form.get('title_en')
        post.content = request.form.get('content')
        post.content_en = request.form.get('content_en')
        post.excerpt = request.form.get('excerpt')
        post.excerpt_en = request.form.get('excerpt_en')
        post.blog_category = request.form.get('blog_category')
        post.author = request.form.get('author', 'Admin')
        post.is_published = request.form.get('is_published') == '1'
        
        # Supprimer l'image si demandé
        if request.form.get('remove_image'):
            post.image_url = None
        
        # Gérer l'upload de l'image
        if 'image' in request.files:
            file = request.files['image']
            if file and file.filename:
                allowed_extensions = {'png', 'jpg', 'jpeg', 'gif', 'webp'}
                if '.' in file.filename and file.filename.rsplit('.', 1)[1].lower() in allowed_extensions:
                    filename = secure_filename(file.filename)
                    filename = f"blog_{datetime.now().strftime('%Y%m%d%H%M%S')}_{filename}"
                    filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
                    file.save(filepath)
                    post.image_url = f"uploads/{filename}"
        
        post.updated_at = datetime.utcnow()
        db.session.commit()
        flash('Article modifié avec succès !', 'success')
        return redirect(url_for('admin_blog_posts'))
    
    return render_template('admin/edit_blog_post.html', post=post)

@app.route('/admin/blog/delete/<int:post_id>', methods=['POST'])
@admin_required
def admin_delete_blog_post(post_id):
    """Supprimer un article de blog"""
    post = BlogPost.query.get_or_404(post_id)
    db.session.delete(post)
    db.session.commit()
    flash('Article supprimé avec succès !', 'success')
    return redirect(url_for('admin_blog'))

# ===== ROUTES ADMIN - PROGRAMME FIDELITÉ =====
@app.route('/admin/loyalty')
@admin_required
def admin_loyalty():
    """Gestion du programme de fidélité"""
    rewards = LoyaltyReward.query.order_by(LoyaltyReward.points_cost).all()
    
    # Statistiques
    total_points_distributed = db.session.query(func.sum(LoyaltyPoints.total_earned)).scalar() or 0
    total_points_redeemed = db.session.query(func.sum(LoyaltyPoints.total_spent)).scalar() or 0
    active_members = LoyaltyPoints.query.filter(LoyaltyPoints.points > 0).count()
    
    from sqlalchemy import func
    stats = {
        'total_distributed': total_points_distributed,
        'total_redeemed': total_points_redeemed,
        'active_members': active_members
    }
    
    return render_template('admin/loyalty.html', rewards=rewards, stats=stats)

@app.route('/admin/loyalty/add_reward', methods=['POST'])
@admin_required
def admin_add_loyalty_reward():
    """Ajouter une récompense fidélité"""
    name = request.form.get('name')
    name_en = request.form.get('name_en')
    description = request.form.get('description')
    description_en = request.form.get('description_en')
    points_cost = request.form.get('points_cost', type=int)
    reward_type = request.form.get('reward_type')
    reward_value = request.form.get('reward_value', type=float)
    
    reward = LoyaltyReward(
        name=name,
        name_en=name_en,
        description=description,
        description_en=description_en,
        points_cost=points_cost,
        reward_type=reward_type,
        reward_value=reward_value
    )
    db.session.add(reward)
    db.session.commit()
    
    flash('Récompense ajoutée avec succès !', 'success')
    return redirect(url_for('admin_loyalty'))

@app.route('/admin/loyalty/delete_reward/<int:reward_id>', methods=['POST'])
@admin_required
def admin_delete_loyalty_reward(reward_id):
    """Supprimer une récompense"""
    reward = LoyaltyReward.query.get_or_404(reward_id)
    db.session.delete(reward)
    db.session.commit()
    flash('Récompense supprimée avec succès !', 'success')
    return redirect(url_for('admin_loyalty'))

# Gestion des erreurs
@app.errorhandler(404)
def page_not_found(e):
    return render_template('errors/404.html'), 404

@app.errorhandler(500)
def internal_server_error(e):
    return render_template('errors/500.html'), 500

# Routes Actions Rapides Dashboard
@app.route('/admin/create-promo', methods=['POST'])
@admin_required
def admin_create_promo():
    """Créer une nouvelle promotion"""
    try:
        from models import Coupon
        from datetime import datetime
        
        code = request.form.get('code')
        discount = float(request.form.get('discount', 0))
        expiry_date_str = request.form.get('expiry_date')
        
        # Convertir la date si fournie
        expiry_date = None
        if expiry_date_str:
            expiry_date = datetime.strptime(expiry_date_str, '%Y-%m-%d')
        
        # Créer le coupon
        new_coupon = Coupon(
            code=code.upper(),
            discount_percent=discount,
            expiry_date=expiry_date,
            is_active=True,
            used_count=0
        )
        
        db.session.add(new_coupon)
        db.session.commit()
        
        flash(f'Promotion {code} créée avec succès!', 'success')
    except Exception as e:
        flash(f'Erreur lors de la création de la promotion: {str(e)}', 'error')
    
    return redirect(url_for('admin_dashboard'))

@app.route('/admin/newsletter', methods=['GET'])
@admin_required
def admin_newsletter():
    """Page de gestion de la newsletter"""
    # Compter les utilisateurs
    total_users = User.query.filter_by(is_admin=False).count()
    
    # Compter les clients actifs (avec au moins une commande)
    total_customers = db.session.query(User).join(Order).filter(
        User.is_admin == False
    ).distinct().count()
    
    return render_template('admin/newsletter.html',
                         total_users=total_users,
                         total_customers=total_customers)

@app.route('/admin/security')
@admin_required
def admin_security_dashboard():
    """Dashboard de sécurité - Monitoring des tentatives de connexion"""
    from datetime import datetime, timedelta
    
    # Statistiques des tentatives de connexion
    total_attempts = LoginAttempt.query.count()
    
    # Tentatives échouées
    failed_attempts = LoginAttempt.query.filter_by(success=False).count()
    
    # Tentatives réussies
    successful_attempts = LoginAttempt.query.filter_by(success=True).count()
    
    # Tentatives aujourd'hui
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    today_attempts = LoginAttempt.query.filter(
        LoginAttempt.attempt_time >= today_start
    ).count()
    
    # Dernières tentatives (50 dernières)
    recent_attempts = LoginAttempt.query.order_by(
        LoginAttempt.attempt_time.desc()
    ).limit(50).all()
    
    # Top IPs avec le plus de tentatives échouées
    from sqlalchemy import func
    top_ips = db.session.query(
        LoginAttempt.ip_address,
        func.count(LoginAttempt.id).label('count')
    ).filter(
        LoginAttempt.success == False
    ).group_by(LoginAttempt.ip_address).order_by(
        func.count(LoginAttempt.id).desc()
    ).limit(10).all()
    
    return render_template('admin/security.html',
                         total_attempts=total_attempts,
                         failed_attempts=failed_attempts,
                         successful_attempts=successful_attempts,
                         today_attempts=today_attempts,
                         recent_attempts=recent_attempts,
                         top_ips=top_ips)

@app.route('/admin/security/clear-old-attempts/<int:days>', methods=['POST'])
@admin_required
def clear_old_attempts(days):
    """Supprimer les tentatives de connexion de plus de X jours"""
    from datetime import datetime, timedelta
    try:
        cutoff_date = datetime.utcnow() - timedelta(days=days)
        old_attempts = LoginAttempt.query.filter(
            LoginAttempt.attempt_time < cutoff_date
        ).delete()
        db.session.commit()
        flash(f'{old_attempts} tentatives de plus de {days} jours supprimées.', 'success')
    except Exception as e:
        db.session.rollback()
        flash(f'Erreur lors du nettoyage: {str(e)}', 'error')
    
    return redirect(url_for('admin_security_dashboard'))

@app.route('/admin/send-newsletter', methods=['POST'])
@admin_required
def admin_send_newsletter():
    """Envoyer une newsletter aux clients"""
    try:
        recipients_type = request.form.get('recipients', 'all')
        subject = request.form.get('subject')
        message = request.form.get('message')
        
        # Sélectionner les destinataires
        if recipients_type == 'active':
            # Clients avec au moins une commande
            users = User.query.join(Order).filter(User.is_admin == False).distinct().all()
        elif recipients_type == 'vip':
            # Clients VIP (total dépensé > 5000 DH)
            from sqlalchemy import func
            vip_users = db.session.query(User).join(Order).filter(
                User.is_admin == False
            ).group_by(User.id).having(
                func.sum(Order.total_amount) > 5000
            ).all()
            users = vip_users
        else:  # all
            users = User.query.filter_by(is_admin=False).all()
        
        # Simuler l'envoi (à remplacer par vrai système d'email)
        email_count = len(users)
        
        # TODO: Implémenter l'envoi réel d'emails ici
        # for user in users:
        #     send_email(user.email, subject, message)
        
        flash(f'Newsletter envoyée à {email_count} clients!', 'success')
    except Exception as e:
        flash(f'Erreur lors de l\'envoi de la newsletter: {str(e)}', 'error')
    
    return redirect(url_for('admin_newsletter'))

# ========== ROUTES API NOTIFICATIONS ==========
@app.route('/api/notifications')
@admin_required
def get_notifications():
    """Récupérer les notifications non lues"""
    notifications = Notification.query.filter_by(is_read=False).order_by(Notification.created_at.desc()).limit(10).all()
    return jsonify([{
        'id': n.id,
        'type': n.type,
        'title': n.title,
        'message': n.message,
        'link': n.link,
        'icon': n.icon,
        'color': n.color,
        'created_at': n.created_at.strftime('%d/%m/%Y %H:%M')
    } for n in notifications])

@app.route('/api/notifications/count')
@admin_required
def get_notifications_count():
    """Récupérer le nombre de notifications non lues"""
    count = Notification.query.filter_by(is_read=False).count()
    return jsonify({'count': count})

@app.route('/api/notifications/<int:notif_id>/read', methods=['POST'])
@admin_required
def mark_notification_read(notif_id):
    """Marquer une notification comme lue"""
    notification = Notification.query.get_or_404(notif_id)
    notification.is_read = True
    db.session.commit()
    return jsonify({'success': True})

@app.route('/api/notifications/mark-all-read', methods=['POST'])
@admin_required
def mark_all_notifications_read():
    """Marquer toutes les notifications comme lues"""
    Notification.query.filter_by(is_read=False).update({'is_read': True})
    db.session.commit()
    return jsonify({'success': True})

# ========== API RECHERCHE INTELLIGENTE ==========
@app.route('/api/search/suggestions')
def search_suggestions():
    """API pour les suggestions de recherche en temps réel"""
    query = request.args.get('q', '').strip()
    
    if len(query) < 2:
        return jsonify([])
    
    # Recherche dans les produits
    search_term = f"%{query}%"
    products = Product.query.filter(
        (Product.name.ilike(search_term)) | 
        (Product.brand.ilike(search_term))
    ).limit(8).all()
    
    suggestions = []
    
    # Ajouter les produits trouvés
    for product in products:
        suggestions.append({
            'type': 'product',
            'id': product.id,
            'name': product.name,
            'brand': product.brand,
            'price': product.price,
            'image': product.image_url,
            'url': url_for('product_detail', product_id=product.id)
        })
    
    # Ajouter les marques correspondantes
    brands = db.session.query(Product.brand).filter(
        Product.brand.ilike(search_term)
    ).distinct().limit(3).all()
    
    for brand in brands:
        if brand[0] and brand[0] not in [p.brand for p in products]:
            suggestions.append({
                'type': 'brand',
                'name': brand[0],
                'url': url_for('collections', brand=brand[0])
            })
    
    return jsonify(suggestions)

@app.route('/api/search/quick')
def quick_search():
    """Recherche rapide pour affichage en temps réel"""
    query = request.args.get('q', '').strip()
    category = request.args.get('category')
    brand = request.args.get('brand')
    
    if len(query) < 2:
        return jsonify({'products': [], 'total': 0})
    
    # Construction de la requête
    search_term = f"%{query}%"
    q = Product.query.filter(
        (Product.name.ilike(search_term)) | 
        (Product.brand.ilike(search_term)) |
        (Product.description.ilike(search_term))
    )
    
    # Filtres additionnels
    if category:
        cat = Category.query.filter_by(name=category).first()
        if cat:
            q = q.filter_by(category_id=cat.id)
    
    if brand:
        q = q.filter_by(brand=brand)
    
    total = q.count()
    products = q.limit(12).all()
    
    # Calculer les notes moyennes
    result_products = []
    for product in products:
        reviews = Review.query.filter_by(product_id=product.id).all()
        avg_rating = sum(r.rating for r in reviews) / len(reviews) if reviews else 0
        
        result_products.append({
            'id': product.id,
            'name': product.name,
            'brand': product.brand,
            'price': product.price,
            'image': product.image_url,
            'rating': round(avg_rating, 1),
            'review_count': len(reviews),
            'url': url_for('product_detail', product_id=product.id)
        })
    
    return jsonify({
        'products': result_products,
        'total': total
    })

# ========== HEADERS DE SÉCURITÉ HTTP ==========
@app.after_request
def set_security_headers(response):
    """Ajouter les headers de sécurité à chaque réponse HTTP"""
    # Empêcher le MIME sniffing
    response.headers['X-Content-Type-Options'] = 'nosniff'
    
    # Protection contre le clickjacking
    response.headers['X-Frame-Options'] = 'SAMEORIGIN'
    
    # Protection XSS du navigateur
    response.headers['X-XSS-Protection'] = '1; mode=block'
    
    # Force HTTPS (à activer en production uniquement)
    # response.headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains'
    
    # Content Security Policy (CSP)
    response.headers['Content-Security-Policy'] = (
        "default-src 'self'; "
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net; "
        "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; "
        "img-src 'self' data: https:; "
        "font-src 'self' https://cdn.jsdelivr.net; "
        "connect-src 'self';"
    )
    
    # Politique de referrer
    response.headers['Referrer-Policy'] = 'strict-origin-when-cross-origin'
    
    # Permissions Policy
    response.headers['Permissions-Policy'] = 'geolocation=(), microphone=(), camera=()'
    
    return response

# Création des tables et initialisation
if __name__ == '__main__':
    # Créer le dossier database s'il n'existe pas
    os.makedirs(os.path.join(basedir, 'database'), exist_ok=True)
    
    with app.app_context():
        db.create_all()
        
        # Créer un admin par défaut si aucun n'existe
        admin = User.query.filter_by(email='admin@quartierdaromes.com').first()
        if not admin:
            admin = User(
                username='admin',
                email='admin@quartierdaromes.com',
                password=bcrypt.generate_password_hash('admin123').decode('utf-8'),
                is_admin=True
            )
            db.session.add(admin)
            
            # Créer quelques catégories par défaut
            categories = [
                Category(name='Homme', description='Parfums pour homme'),
                Category(name='Femme', description='Parfums pour femme'),
                Category(name='Unisexe', description='Parfums unisexes'),
                Category(name='Niche', description='Parfums de niche')
            ]
            for cat in categories:
                existing_cat = Category.query.filter_by(name=cat.name).first()
                if not existing_cat:
                    db.session.add(cat)
            
            # Créer quelques produits de démonstration
            demo_products = [
                Product(
                    name='Aventus Creed',
                    description='Un parfum emblématique avec des notes de bergamote, cassis et ananas.',
                    price=350.00,
                    stock=10,
                    category_id=1,  # Homme
                    product_type='parfum',
                    size='100ml',
                    brand='Creed',
                    is_featured=True
                ),
                Product(
                    name='Baccarat Rouge 540',
                    description='Un parfum oriental floral avec des notes de jasmin et safran.',
                    price=420.00,
                    stock=8,
                    category_id=3,  # Unisexe
                    product_type='parfum',
                    size='70ml',
                    brand='Maison Francis Kurkdjian',
                    is_featured=True
                ),
                Product(
                    name='La Vie Est Belle',
                    description='Un parfum gourmand avec des notes d\'iris, patchouli et praline.',
                    price=120.00,
                    stock=15,
                    category_id=2,  # Femme
                    product_type='parfum',
                    size='75ml',
                    brand='Lancôme',
                    is_featured=True
                ),
                Product(
                    name='Aventus Creed - Décant',
                    description='Échantillon du célèbre Aventus Creed.',
                    price=15.00,
                    stock=50,
                    category_id=1,
                    product_type='decant',
                    size='5ml',
                    brand='Creed'
                ),
                Product(
                    name='Baccarat Rouge 540 - Décant',
                    description='Échantillon de Baccarat Rouge 540.',
                    price=20.00,
                    stock=40,
                    category_id=3,
                    product_type='decant',
                    size='5ml',
                    brand='Maison Francis Kurkdjian'
                )
            ]
            
            for product in demo_products:
                existing_product = Product.query.filter_by(name=product.name).first()
                if not existing_product:
                    db.session.add(product)
            
            db.session.commit()
            print("Admin créé: admin@quartierdaromes.com / admin123")
            print("Catégories et produits de démonstration créés.")
    
    app.run(debug=True, port=5000)
