from flask_sqlalchemy import SQLAlchemy
from flask_login import UserMixin
from datetime import datetime

db = SQLAlchemy()

class User(db.Model, UserMixin):
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password = db.Column(db.String(200), nullable=False)
    first_name = db.Column(db.String(100))
    last_name = db.Column(db.String(100))
    phone = db.Column(db.String(20))
    address = db.Column(db.Text)
    is_admin = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relations
    orders = db.relationship('Order', backref='customer', lazy=True)
    
    def __repr__(self):
        return f'<User {self.username}>'

class Category(db.Model):
    __tablename__ = 'categories'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text)
    category_type = db.Column(db.String(50))  # genre, famille, format, occasion, saison
    image_url = db.Column(db.String(200))  # Image personnalisée pour la catégorie
    display_order = db.Column(db.Integer, default=0)
    is_active = db.Column(db.Boolean, default=True)
    show_in_menu = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relations
    products = db.relationship('Product', backref='category', lazy=True)
    
    def __repr__(self):
        return f'<Category {self.name}>'

class Brand(db.Model):
    __tablename__ = 'brands'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), unique=True, nullable=False)
    description = db.Column(db.Text)
    country = db.Column(db.String(100))
    logo_url = db.Column(db.String(255))
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def __repr__(self):
        return f'<Brand {self.name}>'

class Review(db.Model):
    __tablename__ = 'reviews'
    
    id = db.Column(db.Integer, primary_key=True)
    product_id = db.Column(db.Integer, db.ForeignKey('products.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    rating = db.Column(db.Integer, nullable=False)  # 1-5 étoiles
    comment = db.Column(db.Text)
    is_verified = db.Column(db.Boolean, default=False)  # Achat vérifié
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relations
    product = db.relationship('Product', backref=db.backref('reviews', lazy=True))
    user = db.relationship('User', backref=db.backref('reviews', lazy=True))
    
    def __repr__(self):
        return f'<Review Product:{self.product_id} User:{self.user_id} Rating:{self.rating}>'

class Coupon(db.Model):
    __tablename__ = 'coupons'
    
    id = db.Column(db.Integer, primary_key=True)
    code = db.Column(db.String(50), unique=True, nullable=False)
    discount_type = db.Column(db.String(20), nullable=False)  # 'percentage' ou 'fixed'
    discount_value = db.Column(db.Float, nullable=False)
    min_purchase = db.Column(db.Float, default=0)
    max_uses = db.Column(db.Integer)
    used_count = db.Column(db.Integer, default=0)
    is_active = db.Column(db.Boolean, default=True)
    valid_from = db.Column(db.DateTime, default=datetime.utcnow)
    valid_until = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def __repr__(self):
        return f'<Coupon {self.code}>'
    
    def is_valid(self):
        """Vérifier si le coupon est valide"""
        if not self.is_active:
            return False
        if self.max_uses and self.used_count >= self.max_uses:
            return False
        now = datetime.utcnow()
        if self.valid_from and now < self.valid_from:
            return False
        if self.valid_until and now > self.valid_until:
            return False
        return True
    
    def calculate_discount(self, total):
        """Calculer la réduction"""
        if self.discount_type == 'percentage':
            return total * (self.discount_value / 100)
        else:  # fixed
            return min(self.discount_value, total)

class Product(db.Model):
    __tablename__ = 'products'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    price = db.Column(db.Float, nullable=False)
    stock = db.Column(db.Integer, default=0)
    category_id = db.Column(db.Integer, db.ForeignKey('categories.id'))
    product_type = db.Column(db.String(50), default='parfum')  # 'parfum' ou 'decant'
    is_decant = db.Column(db.Boolean, default=False)  # True si c'est un décant, False si complet
    size = db.Column(db.String(50))  # Ex: '50ml', '100ml', '2ml', '5ml'
    brand = db.Column(db.String(100))
    image_url = db.Column(db.String(500))
    is_featured = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relations
    order_items = db.relationship('OrderItem', backref='product', lazy=True)
    
    def __repr__(self):
        return f'<Product {self.name}>'

class Order(db.Model):
    __tablename__ = 'orders'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    order_number = db.Column(db.String(50), unique=True)
    status = db.Column(db.String(50), default='pending')  # pending, processing, shipped, delivered, cancelled
    total_amount = db.Column(db.Float, nullable=False)
    shipping_address = db.Column(db.Text)
    phone = db.Column(db.String(20))
    payment_method = db.Column(db.String(50))
    payment_status = db.Column(db.String(50), default='pending')
    tracking_number = db.Column(db.String(100))
    notes = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relations
    order_items = db.relationship('OrderItem', backref='order', lazy=True, cascade='all, delete-orphan')
    
    def __repr__(self):
        return f'<Order {self.order_number}>'

class OrderItem(db.Model):
    __tablename__ = 'order_items'
    
    id = db.Column(db.Integer, primary_key=True)
    order_id = db.Column(db.Integer, db.ForeignKey('orders.id'), nullable=False)
    product_id = db.Column(db.Integer, db.ForeignKey('products.id'), nullable=False)
    quantity = db.Column(db.Integer, nullable=False)
    price = db.Column(db.Float, nullable=False)  # Prix au moment de l'achat
    
    def __repr__(self):
        return f'<OrderItem Order:{self.order_id} Product:{self.product_id}>'

class CartItem(db.Model):
    __tablename__ = 'cart_items'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    product_id = db.Column(db.Integer, db.ForeignKey('products.id'), nullable=False)
    quantity = db.Column(db.Integer, default=1)
    added_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relations
    user = db.relationship('User', backref='cart_items')
    product = db.relationship('Product', backref='cart_items_rel')
    
    def __repr__(self):
        return f'<CartItem User:{self.user_id} Product:{self.product_id}>'

class WishlistItem(db.Model):
    __tablename__ = 'wishlist'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    product_id = db.Column(db.Integer, db.ForeignKey('products.id'), nullable=False)
    added_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relations
    product = db.relationship('Product', backref='wishlist_items')
    user = db.relationship('User', backref='wishlist_items')
    
    def __repr__(self):
        return f'<WishlistItem User:{self.user_id} Product:{self.product_id}>'

class Message(db.Model):
    __tablename__ = 'messages'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(120), nullable=False)
    subject = db.Column(db.String(200))
    content = db.Column(db.Text, nullable=False)
    is_read = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def __repr__(self):
        return f'<Message from {self.email}>'

class BlogPost(db.Model):
    __tablename__ = 'blog_posts'
    
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    title_en = db.Column(db.String(200))  # Titre en anglais
    slug = db.Column(db.String(250), unique=True, nullable=False)
    content = db.Column(db.Text, nullable=False)
    content_en = db.Column(db.Text)  # Contenu en anglais
    excerpt = db.Column(db.String(500))  # Court résumé
    excerpt_en = db.Column(db.String(500))  # Résumé en anglais
    image_url = db.Column(db.String(500))
    author = db.Column(db.String(100), default='Admin')
    blog_category = db.Column(db.String(100))  # nouveautés, conseils, tendances
    is_published = db.Column(db.Boolean, default=False)
    views = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def __repr__(self):
        return f'<BlogPost {self.title}>'

class LoyaltyPoints(db.Model):
    __tablename__ = 'loyalty_points'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    points = db.Column(db.Integer, default=0)
    total_earned = db.Column(db.Integer, default=0)  # Total des points gagnés
    total_spent = db.Column(db.Integer, default=0)  # Total des points dépensés
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relations
    user = db.relationship('User', backref=db.backref('loyalty_points', uselist=False))
    transactions = db.relationship('LoyaltyTransaction', backref='loyalty_account', lazy=True)
    
    @property
    def tier(self):
        """Calculer le tier basé sur le total des points gagnés"""
        if self.total_earned >= 2000:
            return 'platinum'
        elif self.total_earned >= 1000:
            return 'gold'
        elif self.total_earned >= 500:
            return 'silver'
        else:
            return 'bronze'
    
    def __repr__(self):
        return f'<LoyaltyPoints User:{self.user_id} Points:{self.points}>'

class LoyaltyTransaction(db.Model):
    __tablename__ = 'loyalty_transactions'
    
    id = db.Column(db.Integer, primary_key=True)
    loyalty_id = db.Column(db.Integer, db.ForeignKey('loyalty_points.id'))
    points = db.Column(db.Integer, nullable=False)  # Positif = gagné, Négatif = dépensé
    # balance_after et reward_id supprimés car colonnes n'existent pas dans la table
    transaction_type = db.Column(db.String(50))  # 'purchase', 'reward', 'refund', 'redemption', 'earn', 'redeem'
    description = db.Column(db.String(200))
    reason = db.Column(db.String(200))  # Pour compatibilité avec LoyaltyProgram
    order_id = db.Column(db.Integer, db.ForeignKey('orders.id'))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relations
    order = db.relationship('Order', backref='loyalty_transactions')
    
    def __repr__(self):
        return f'<LoyaltyTransaction {self.transaction_type} Points:{self.points}>'

class LoyaltyReward(db.Model):
    __tablename__ = 'loyalty_rewards'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False)
    name_en = db.Column(db.String(200))
    description = db.Column(db.Text)
    description_en = db.Column(db.Text)
    points_required = db.Column(db.Integer, nullable=False)  # Points nécessaires pour échanger
    points_cost = db.Column(db.Integer)  # Alias pour compatibilité
    reward_type = db.Column(db.String(50))  # 'discount', 'product', 'free_shipping'
    reward_value = db.Column(db.Float)  # Valeur de la récompense (% ou montant fixe)
    product_id = db.Column(db.Integer, db.ForeignKey('products.id'))  # Si c'est un produit gratuit
    times_redeemed = db.Column(db.Integer, default=0)  # Nombre de fois échangé
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relations
    product = db.relationship('Product', backref='loyalty_rewards')
    
    def __init__(self, **kwargs):
        super(LoyaltyReward, self).__init__(**kwargs)
        # Si points_cost est fourni mais pas points_required, copier la valeur
        if self.points_cost and not self.points_required:
            self.points_required = self.points_cost
        elif self.points_required and not self.points_cost:
            self.points_cost = self.points_required
    
    def __repr__(self):
        return f'<LoyaltyReward {self.name} Cost:{self.points_required}>'

class Notification(db.Model):
    __tablename__ = 'notifications'
    
    id = db.Column(db.Integer, primary_key=True)
    type = db.Column(db.String(50), nullable=False)  # 'order', 'message', 'review', 'stock'
    title = db.Column(db.String(200), nullable=False)
    message = db.Column(db.Text, nullable=False)
    link = db.Column(db.String(200))  # URL pour accéder à la ressource
    is_read = db.Column(db.Boolean, default=False)
    icon = db.Column(db.String(50))  # Icône Bootstrap Icons
    color = db.Column(db.String(20))  # Couleur du badge (success, warning, info, danger)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def __repr__(self):
        return f'<Notification {self.type}: {self.title}>'

class LoginAttempt(db.Model):
    """Modèle pour tracker les tentatives de connexion échouées"""
    __tablename__ = 'login_attempts'
    
    id = db.Column(db.Integer, primary_key=True)
    ip_address = db.Column(db.String(45), nullable=False)  # Support IPv4 et IPv6
    username = db.Column(db.String(80))  # Optionnel
    attempt_time = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    success = db.Column(db.Boolean, default=False)
    user_agent = db.Column(db.String(500))
    
    def __repr__(self):
        return f'<LoginAttempt {self.ip_address} at {self.attempt_time}>'

class ContactMessage(db.Model):
    """Modèle pour les messages de contact"""
    __tablename__ = 'contact_messages'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(120), nullable=False)
    subject = db.Column(db.String(200), nullable=False)
    message = db.Column(db.Text, nullable=False)
    is_read = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def __repr__(self):
        return f'<ContactMessage from {self.email}>'

class Promotion(db.Model):
    """Modèle pour les codes promo et réductions"""
    __tablename__ = 'promotions'
    
    id = db.Column(db.Integer, primary_key=True)
    code = db.Column(db.String(50), unique=True, nullable=False)
    description = db.Column(db.Text)
    discount_type = db.Column(db.String(20), nullable=False)  # 'percentage' ou 'fixed'
    discount_value = db.Column(db.Float, nullable=False)  # Ex: 20 pour 20% ou 50 pour 50 DH
    min_purchase = db.Column(db.Float, default=0)  # Montant minimum d'achat
    max_uses = db.Column(db.Integer)  # Nombre max d'utilisations (null = illimité)
    current_uses = db.Column(db.Integer, default=0)
    start_date = db.Column(db.DateTime, default=datetime.utcnow)
    end_date = db.Column(db.DateTime)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def is_valid(self):
        """Vérifie si la promotion est valide"""
        now = datetime.utcnow()
        if not self.is_active:
            return False
        if self.start_date and now < self.start_date:
            return False
        if self.end_date and now > self.end_date:
            return False
        if self.max_uses and self.current_uses >= self.max_uses:
            return False
        return True
    
    def calculate_discount(self, amount):
        """Calcule le montant de la réduction"""
        if not self.is_valid() or amount < self.min_purchase:
            return 0
        
        if self.discount_type == 'percentage':
            return amount * (self.discount_value / 100)
        else:  # fixed
            return min(self.discount_value, amount)
    
    def __repr__(self):
        return f'<Promotion {self.code}>'

class LoyaltyProgram(db.Model):
    """Modèle pour le programme de fidélité"""
    __tablename__ = 'loyalty_programs'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, unique=True)
    points = db.Column(db.Integer, default=0)
    total_points_earned = db.Column(db.Integer, default=0)
    level = db.Column(db.String(20), default='Bronze')  # Bronze, Silver, Gold, Platinum
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relations
    user = db.relationship('User', backref=db.backref('loyalty', uselist=False))
    
    def add_points(self, points, reason):
        """Ajouter des points"""
        self.points += points
        self.total_points_earned += points
        self.update_level()
        self.updated_at = datetime.utcnow()
    
    def redeem_points(self, points, reason):
        """Utiliser des points"""
        if self.points >= points:
            self.points -= points
            self.updated_at = datetime.utcnow()
            return True
        return False
    
    def update_level(self):
        """Mettre à jour le niveau en fonction des points totaux"""
        if self.total_points_earned >= 10000:
            self.level = 'Platinum'
        elif self.total_points_earned >= 5000:
            self.level = 'Gold'
        elif self.total_points_earned >= 2000:
            self.level = 'Silver'
        else:
            self.level = 'Bronze'
    
    def __repr__(self):
        return f'<LoyaltyProgram User {self.user_id}: {self.points} pts>'

class ProductComparison(db.Model):
    """Modèle pour le comparateur de produits"""
    __tablename__ = 'product_comparisons'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'))
    product_ids = db.Column(db.Text)  # JSON array des IDs de produits
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def __repr__(self):
        return f'<ProductComparison {self.id}>'

class OrderTracking(db.Model):
    """Modèle pour le suivi de colis"""
    __tablename__ = 'order_tracking'
    
    id = db.Column(db.Integer, primary_key=True)
    order_id = db.Column(db.Integer, db.ForeignKey('orders.id'), nullable=False, unique=True)
    tracking_number = db.Column(db.String(100), unique=True)
    carrier = db.Column(db.String(50))  # DHL, UPS, Aramex, etc.
    status = db.Column(db.String(50), default='pending')  # pending, shipped, in_transit, delivered
    estimated_delivery = db.Column(db.DateTime)
    actual_delivery = db.Column(db.DateTime)
    current_location = db.Column(db.String(200))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relations
    order = db.relationship('Order', backref=db.backref('tracking', uselist=False))
    events = db.relationship('TrackingEvent', backref='tracking', lazy='dynamic', order_by='TrackingEvent.created_at.desc()')
    
    def __repr__(self):
        return f'<OrderTracking {self.tracking_number}>'

class TrackingEvent(db.Model):
    """Événements de suivi de colis"""
    __tablename__ = 'tracking_events'
    
    id = db.Column(db.Integer, primary_key=True)
    tracking_id = db.Column(db.Integer, db.ForeignKey('order_tracking.id'), nullable=False)
    status = db.Column(db.String(50), nullable=False)
    location = db.Column(db.String(200))
    description = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def __repr__(self):
        return f'<TrackingEvent {self.status}>'

class ChatMessage(db.Model):
    """Modèle pour le chat en direct"""
    __tablename__ = 'chat_messages'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'))
    session_id = db.Column(db.String(100), nullable=False)
    sender_type = db.Column(db.String(20), nullable=False)  # user, admin, bot
    message = db.Column(db.Text, nullable=False)
    is_read = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relations
    user = db.relationship('User', backref='chat_messages')
    
    def __repr__(self):
        return f'<ChatMessage {self.session_id}>'
