/* ========================================
   NOTIFICATIONS PANIER - QUARTIER D'ARÔMES
   Toast animations, calcul dynamique, feedback visuel
   ======================================== */

// ============ SYSTÈME DE NOTIFICATIONS TOAST ============
class CartNotificationSystem {
    constructor() {
        this.container = null;
        this.init();
    }
    
    init() {
        // Créer le conteneur de notifications s'il n'existe pas
        if (!document.getElementById('cart-toast-container')) {
            this.container = document.createElement('div');
            this.container.id = 'cart-toast-container';
            this.container.style.cssText = `
                position: fixed;
                top: 80px;
                right: 20px;
                z-index: 10000;
                width: 380px;
                max-width: calc(100vw - 40px);
            `;
            document.body.appendChild(this.container);
        } else {
            this.container = document.getElementById('cart-toast-container');
        }
    }
    
    show(product, action = 'added', options = {}) {
        const toast = this.createToast(product, action, options);
        this.container.appendChild(toast);
        
        // Animation d'entrée
        setTimeout(() => toast.classList.add('show'), 10);
        
        // Son de notification
        this.playSound(action);
        
        // Animation de sortie et suppression
        const duration = options.duration || 4000;
        setTimeout(() => {
            toast.classList.remove('show');
            toast.classList.add('hide');
            setTimeout(() => toast.remove(), 300);
        }, duration);
        
        return toast;
    }
    
    createToast(product, action, options) {
        const toast = document.createElement('div');
        toast.className = 'cart-toast';
        
        // Déterminer le contenu selon l'action
        let icon, title, message, bgColor;
        
        switch(action) {
            case 'added':
                icon = 'bi-cart-plus-fill';
                title = 'Produit ajouté !';
                message = `<strong>${product.name}</strong> a été ajouté à votre panier`;
                bgColor = '#28a745';
                break;
            case 'removed':
                icon = 'bi-trash-fill';
                title = 'Produit retiré';
                message = `<strong>${product.name}</strong> a été retiré du panier`;
                bgColor = '#dc3545';
                break;
            case 'updated':
                icon = 'bi-arrow-repeat';
                title = 'Quantité mise à jour';
                message = `<strong>${product.name}</strong> : ${product.quantity} unité(s)`;
                bgColor = '#17a2b8';
                break;
            case 'wishlist':
                icon = 'bi-heart-fill';
                title = 'Ajouté aux favoris !';
                message = `<strong>${product.name}</strong> est dans vos favoris`;
                bgColor = '#C4942F';
                break;
            default:
                icon = 'bi-check-circle-fill';
                title = 'Action effectuée';
                message = product.name;
                bgColor = '#28a745';
        }
        
        toast.innerHTML = `
            <div class="cart-toast-content">
                <div class="cart-toast-icon" style="background-color: ${bgColor};">
                    <i class="bi ${icon}"></i>
                </div>
                <div class="cart-toast-image">
                    ${product.image 
                        ? `<img src="${product.image}" alt="${product.name}" onerror="this.onerror=null; this.src='/static/images/product-placeholder.svg';">`
                        : `<div class="placeholder-image"><i class="bi bi-image"></i></div>`
                    }
                </div>
                <div class="cart-toast-body">
                    <div class="cart-toast-title">${title}</div>
                    <div class="cart-toast-message">${message}</div>
                    ${product.price 
                        ? `<div class="cart-toast-price">${product.price}</div>` 
                        : ''
                    }
                </div>
                <button class="cart-toast-close" onclick="this.closest('.cart-toast').remove()">
                    <i class="bi bi-x"></i>
                </button>
            </div>
            <div class="cart-toast-actions">
                <a href="/cart" class="btn-toast btn-toast-primary">
                    <i class="bi bi-cart3"></i> Voir le panier
                </a>
                <a href="/collections" class="btn-toast btn-toast-secondary">
                    Continuer mes achats
                </a>
            </div>
            <div class="cart-toast-progress"></div>
        `;
        
        return toast;
    }
    
    playSound(type) {
        // Sons différents selon le type d'action
        const frequencies = {
            added: [659.25, 783.99],    // E5, G5 (joyeux)
            removed: [392.00, 329.63],  // G4, E4 (descendant)
            updated: [523.25, 587.33],  // C5, D5 (neutre)
            wishlist: [698.46, 880.00]  // F5, A5 (doux)
        };
        
        const freq = frequencies[type] || frequencies.added;
        
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.value = freq[0];
            oscillator.type = 'sine';
            
            gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);
            
            oscillator.start(audioContext.currentTime);
            oscillator.frequency.setValueAtTime(freq[1], audioContext.currentTime + 0.08);
            oscillator.stop(audioContext.currentTime + 0.15);
        } catch (e) {
            console.log('Audio non disponible');
        }
    }
}

// ============ CALCUL DYNAMIQUE DU TOTAL ============
class CartCalculator {
    constructor() {
        this.cartItems = [];
        this.shippingCost = 0;
        this.discount = 0;
        this.init();
    }
    
    init() {
        // Charger les éléments du panier
        this.loadCartItems();
        
        // Écouter les changements de quantité
        this.attachQuantityListeners();
        
        // Calculer le total initial
        this.updateTotals();
    }
    
    loadCartItems() {
        const itemRows = document.querySelectorAll('.cart-item-row');
        this.cartItems = [];
        
        itemRows.forEach(row => {
            const item = {
                id: row.dataset.productId,
                name: row.querySelector('.item-name')?.textContent || '',
                price: parseFloat(row.dataset.price) || 0,
                quantity: parseInt(row.querySelector('.quantity-input')?.value) || 1,
                element: row
            };
            this.cartItems.push(item);
        });
    }
    
    attachQuantityListeners() {
        // Boutons + et -
        document.querySelectorAll('.qty-btn-minus').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const input = e.target.closest('.quantity-controls').querySelector('.quantity-input');
                this.changeQuantity(input, -1);
            });
        });
        
        document.querySelectorAll('.qty-btn-plus').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const input = e.target.closest('.quantity-controls').querySelector('.quantity-input');
                this.changeQuantity(input, 1);
            });
        });
        
        // Input direct
        document.querySelectorAll('.quantity-input').forEach(input => {
            input.addEventListener('change', () => {
                this.loadCartItems();
                this.updateTotals();
                this.updateItemTotal(input.closest('.cart-item-row'));
            });
        });
    }
    
    changeQuantity(input, delta) {
        const currentValue = parseInt(input.value) || 1;
        const minValue = parseInt(input.min) || 1;
        const maxValue = parseInt(input.max) || 999;
        const newValue = Math.max(minValue, Math.min(maxValue, currentValue + delta));
        
        if (newValue !== currentValue) {
            input.value = newValue;
            
            // Animation du changement
            input.classList.add('quantity-changed');
            setTimeout(() => input.classList.remove('quantity-changed'), 300);
            
            // Mettre à jour les totaux
            this.loadCartItems();
            this.updateTotals();
            this.updateItemTotal(input.closest('.cart-item-row'));
        }
    }
    
    updateItemTotal(row) {
        const price = parseFloat(row.dataset.price) || 0;
        const quantity = parseInt(row.querySelector('.quantity-input')?.value) || 1;
        const total = price * quantity;
        
        const totalElement = row.querySelector('.item-total');
        if (totalElement) {
            // Animation du changement
            totalElement.classList.add('price-updating');
            setTimeout(() => {
                totalElement.textContent = `${total.toFixed(2)} DH`;
                totalElement.classList.remove('price-updating');
                totalElement.classList.add('price-updated');
                setTimeout(() => totalElement.classList.remove('price-updated'), 500);
            }, 150);
        }
    }
    
    updateTotals() {
        // Calculer le sous-total
        const subtotal = this.cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        
        // Calculer les frais de port (gratuit au-dessus de 500 DH)
        this.shippingCost = subtotal >= 500 ? 0 : 30;
        
        // Calculer le total final
        const total = subtotal + this.shippingCost - this.discount;
        
        // Mettre à jour l'affichage avec animation
        this.animateValue('#cart-subtotal', subtotal);
        this.animateValue('#cart-shipping', this.shippingCost);
        this.animateValue('#cart-discount', this.discount);
        this.animateValue('#cart-total', total);
        
        // Mettre à jour le badge du header
        this.updateCartBadge();
        
        // Afficher le message de livraison gratuite
        this.updateShippingMessage(subtotal);
    }
    
    animateValue(selector, targetValue) {
        const element = document.querySelector(selector);
        if (!element) return;
        
        const currentValue = parseFloat(element.textContent.replace(/[^0-9.]/g, '')) || 0;
        const duration = 500;
        const steps = 30;
        const increment = (targetValue - currentValue) / steps;
        let currentStep = 0;
        
        // Animation fluide
        const timer = setInterval(() => {
            currentStep++;
            const newValue = currentValue + (increment * currentStep);
            
            if (currentStep >= steps) {
                element.textContent = `${targetValue.toFixed(2)} DH`;
                clearInterval(timer);
                
                // Effet de surbrillance
                element.classList.add('value-updated');
                setTimeout(() => element.classList.remove('value-updated'), 600);
            } else {
                element.textContent = `${newValue.toFixed(2)} DH`;
            }
        }, duration / steps);
    }
    
    updateCartBadge() {
        const totalItems = this.cartItems.reduce((sum, item) => sum + item.quantity, 0);
        const badge = document.querySelector('.cart-badge');
        if (badge) {
            badge.textContent = totalItems;
            
            // Animation pulse
            badge.classList.add('badge-pulse');
            setTimeout(() => badge.classList.remove('badge-pulse'), 300);
        }
    }
    
    updateShippingMessage(subtotal) {
        const messageElement = document.querySelector('#shipping-message');
        if (!messageElement) return;
        
        if (subtotal >= 500) {
            messageElement.innerHTML = `
                <div class="alert alert-success">
                    <i class="bi bi-truck"></i> 
                    <strong>Livraison gratuite !</strong> 
                    Votre commande dépasse 500 DH
                </div>
            `;
        } else {
            const remaining = 500 - subtotal;
            const percentage = (subtotal / 500) * 100;
            messageElement.innerHTML = `
                <div class="alert alert-info">
                    <i class="bi bi-info-circle"></i> 
                    Plus que <strong>${remaining.toFixed(2)} DH</strong> pour la livraison gratuite !
                    <div class="progress mt-2" style="height: 6px;">
                        <div class="progress-bar bg-warning" style="width: ${percentage}%"></div>
                    </div>
                </div>
            `;
        }
    }
}

// ============ INTERCEPTER LES AJOUTS AU PANIER ============
function interceptAddToCart() {
    // Intercepter tous les formulaires d'ajout au panier et wishlist
    document.querySelectorAll('form.action-form, form[action*="add_to_cart"], form[action*="add_to_wishlist"]').forEach(form => {
        form.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            // Récupérer les données du produit depuis data-attributes ou DOM
            const productName = form.dataset.productName || form.closest('.card, .product-card, .product-info')?.querySelector('.card-title, .product-title, h1')?.textContent.trim() || 'Produit';
            const productPrice = form.dataset.productPrice || form.closest('.card')?.querySelector('.h4, .text-warning, .product-price')?.textContent.trim() || '';
            const productImagePath = form.dataset.productImage;
            
            // Construire le chemin correct de l'image
            let productImage = '';
            if (productImagePath) {
                // Si le chemin contient déjà /static/, l'utiliser tel quel
                if (productImagePath.startsWith('/static/') || productImagePath.startsWith('http')) {
                    productImage = productImagePath;
                } else if (productImagePath.startsWith('uploads/')) {
                    // Si commence par uploads/, ajouter /static/
                    productImage = `/static/${productImagePath}`;
                } else {
                    // Sinon, ajouter /static/uploads/
                    productImage = `/static/uploads/${productImagePath}`;
                }
            } else {
                // Fallback: chercher l'image dans le DOM
                productImage = form.closest('.card')?.querySelector('img')?.src || '';
            }
            
            const action = form.dataset.action || (form.action.includes('wishlist') ? 'wishlist' : 'cart');
            
            // Envoyer le formulaire via AJAX
            const formData = new FormData(form);
            const url = form.action;
            
            try {
                const response = await fetch(url, {
                    method: 'POST',
                    body: formData,
                    headers: {
                        'X-Requested-With': 'XMLHttpRequest'
                    }
                });
                
                // Vérifier le statut de la réponse
                if (response.status === 401 || response.status === 302) {
                    // Non connecté - Afficher une notification et rediriger après 2 secondes
                    const notificationSystem = new CartNotificationSystem();
                    const toast = notificationSystem.createToast({
                        name: 'Connexion requise',
                        price: ''
                    }, 'warning', {});
                    
                    toast.innerHTML = `
                        <div class="cart-toast-content">
                            <div class="cart-toast-icon" style="background-color: #ffc107;">
                                <i class="bi bi-lock-fill"></i>
                            </div>
                            <div class="cart-toast-body">
                                <div class="cart-toast-title">Connexion requise</div>
                                <div class="cart-toast-message">Veuillez vous connecter pour ${action === 'cart' ? 'ajouter des produits au panier' : 'ajouter aux favoris'}</div>
                            </div>
                        </div>
                        <div class="cart-toast-actions">
                            <a href="/login" class="btn-toast btn-toast-primary">
                                <i class="bi bi-box-arrow-in-right"></i> Se connecter
                            </a>
                            <a href="/register" class="btn-toast btn-toast-secondary">
                                Créer un compte
                            </a>
                        </div>
                        <div class="cart-toast-progress"></div>
                    `;
                    
                    notificationSystem.container.appendChild(toast);
                    setTimeout(() => toast.classList.add('show'), 10);
                    
                    // Auto-suppression après 6 secondes
                    setTimeout(() => {
                        toast.classList.remove('show');
                        toast.classList.add('hide');
                        setTimeout(() => toast.remove(), 300);
                    }, 6000);
                    
                    return;
                }
                
                if (response.ok) {
                    // Afficher la notification de succès
                    const notificationSystem = new CartNotificationSystem();
                    notificationSystem.show({
                        name: productName,
                        price: productPrice,
                        image: productImage
                    }, action === 'wishlist' ? 'wishlist' : 'added');
                    
                    // Mettre à jour le badge du panier
                    if (action === 'cart') {
                        updateCartCount();
                    }
                } else {
                    // Autre erreur
                    const notificationSystem = new CartNotificationSystem();
                    notificationSystem.show({
                        name: 'Erreur',
                        price: ''
                    }, 'error');
                }
            } catch (error) {
                console.error('Erreur:', error);
                const notificationSystem = new CartNotificationSystem();
                const toast = notificationSystem.createToast({
                    name: 'Erreur réseau',
                    price: ''
                }, 'error', {});
                toast.innerHTML = `
                    <div class="cart-toast-content">
                        <div class="cart-toast-icon" style="background-color: #dc3545;">
                            <i class="bi bi-x-circle-fill"></i>
                        </div>
                        <div class="cart-toast-body">
                            <div class="cart-toast-title">Erreur</div>
                            <div class="cart-toast-message">Une erreur est survenue. Veuillez réessayer.</div>
                        </div>
                    </div>
                `;
                notificationSystem.container.appendChild(toast);
                setTimeout(() => toast.classList.add('show'), 10);
                setTimeout(() => toast.remove(), 3000);
            }
        });
    });
}

// ============ METTRE À JOUR LE COMPTEUR DU PANIER ============
async function updateCartCount() {
    try {
        const response = await fetch('/api/cart/count');
        const data = await response.json();
        
        const badge = document.querySelector('.cart-badge');
        if (badge && data.count !== undefined) {
            badge.textContent = data.count;
            badge.classList.add('badge-pulse');
            setTimeout(() => badge.classList.remove('badge-pulse'), 300);
        }
    } catch (error) {
        console.log('Erreur lors de la mise à jour du compteur');
    }
}

// ============ STYLES CSS ============
const styles = document.createElement('style');
styles.textContent = `
/* Toast Notifications */
.cart-toast {
    background: white;
    border-radius: 12px;
    box-shadow: 0 8px 32px rgba(0,0,0,0.15);
    margin-bottom: 15px;
    overflow: hidden;
    transform: translateX(420px);
    opacity: 0;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.cart-toast.show {
    transform: translateX(0);
    opacity: 1;
}

.cart-toast.hide {
    transform: translateX(420px);
    opacity: 0;
}

.cart-toast-content {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 15px;
}

.cart-toast-icon {
    width: 48px;
    height: 48px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-size: 24px;
    flex-shrink: 0;
}

.cart-toast-image {
    width: 60px;
    height: 60px;
    border-radius: 8px;
    overflow: hidden;
    flex-shrink: 0;
}

.cart-toast-image img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.placeholder-image {
    width: 100%;
    height: 100%;
    background: #f0f0f0;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #999;
    font-size: 24px;
}

.cart-toast-body {
    flex: 1;
    min-width: 0;
}

.cart-toast-title {
    font-weight: 700;
    color: #2d2d2d;
    font-size: 14px;
    margin-bottom: 4px;
}

.cart-toast-message {
    font-size: 13px;
    color: #666;
    line-height: 1.4;
}

.cart-toast-message strong {
    color: #2d2d2d;
}

.cart-toast-price {
    font-size: 16px;
    font-weight: 700;
    color: #C4942F;
    margin-top: 4px;
}

.cart-toast-close {
    background: none;
    border: none;
    font-size: 20px;
    color: #999;
    cursor: pointer;
    padding: 4px 8px;
    transition: color 0.2s;
}

.cart-toast-close:hover {
    color: #333;
}

.cart-toast-actions {
    display: flex;
    gap: 8px;
    padding: 0 15px 15px;
}

.btn-toast {
    flex: 1;
    padding: 10px 16px;
    border-radius: 8px;
    text-decoration: none;
    text-align: center;
    font-size: 13px;
    font-weight: 600;
    transition: all 0.2s;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
}

.btn-toast-primary {
    background: #C4942F;
    color: white;
}

.btn-toast-primary:hover {
    background: #a67c26;
    color: white;
    transform: translateY(-1px);
}

.btn-toast-secondary {
    background: #f8f9fa;
    color: #666;
    border: 1px solid #dee2e6;
}

.btn-toast-secondary:hover {
    background: #e9ecef;
    color: #333;
}

.cart-toast-progress {
    height: 3px;
    background: linear-gradient(90deg, #C4942F 0%, #a67c26 100%);
    animation: progressBar 4s linear;
}

@keyframes progressBar {
    from { width: 100%; }
    to { width: 0%; }
}

/* Animations pour les quantités */
.quantity-changed {
    animation: quantityPulse 0.3s ease;
}

@keyframes quantityPulse {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.1); background-color: #fff3cd; }
}

.price-updating {
    opacity: 0.5;
    transform: scale(0.95);
}

.price-updated {
    animation: priceHighlight 0.5s ease;
}

@keyframes priceHighlight {
    0% { background-color: transparent; }
    50% { background-color: #fff3cd; }
    100% { background-color: transparent; }
}

.value-updated {
    animation: valueGlow 0.6s ease;
}

@keyframes valueGlow {
    0%, 100% { color: inherit; }
    50% { color: #C4942F; transform: scale(1.05); }
}

.badge-pulse {
    animation: badgePulse 0.3s ease;
}

@keyframes badgePulse {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.3); }
}

/* Responsive */
@media (max-width: 576px) {
    #cart-toast-container {
        right: 10px;
        left: 10px;
        width: auto;
    }
    
    .cart-toast-actions {
        flex-direction: column;
    }
}
`;
document.head.appendChild(styles);

// ============ INITIALISATION ============
document.addEventListener('DOMContentLoaded', () => {
    // Intercepter les ajouts au panier
    interceptAddToCart();
    
    // Initialiser le calculateur de panier si on est sur la page panier
    if (document.querySelector('.cart-item-row')) {
        window.cartCalculator = new CartCalculator();
    }
    
    console.log('✨ Cart notifications & calculator loaded');
});

// Exposer globalement
window.CartNotificationSystem = CartNotificationSystem;
window.showCartNotification = (product, action) => {
    const system = new CartNotificationSystem();
    return system.show(product, action);
};
