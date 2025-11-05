/**
 * Animations Avancées pour Panier et Wishlist
 * Feedback visuel instantané et micro-interactions
 */

class CartWishlistAnimations {
    constructor() {
        this.init();
    }

    init() {
        this.setupCartButtons();
        this.setupWishlistButtons();
        this.setupQuantityControls();
        this.updateCartBadge();
        this.updateWishlistBadge();
    }

    setupCartButtons() {
        document.addEventListener('click', (e) => {
            const addToCartBtn = e.target.closest('[data-add-to-cart]');
            if (addToCartBtn) {
                e.preventDefault();
                const productId = addToCartBtn.dataset.addToCart;
                const productName = addToCartBtn.dataset.productName || 'Produit';
                this.addToCart(productId, productName, addToCartBtn);
            }
        });
    }

    async addToCart(productId, productName, button) {
        // Animation du bouton
        button.classList.add('loading');
        button.disabled = true;

        // Créer particules
        this.createParticles(button);

        try {
            const response = await fetch('/cart/add', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    product_id: productId,
                    quantity: 1
                })
            });

            if (!response.ok) throw new Error('Failed to add to cart');

            const data = await response.json();

            // Animation de succès
            button.classList.remove('loading');
            button.classList.add('success');

            // Icône de succès temporaire
            const originalHTML = button.innerHTML;
            button.innerHTML = '<i class="bi bi-check-lg"></i> Ajouté !';

            setTimeout(() => {
                button.innerHTML = originalHTML;
                button.classList.remove('success');
                button.disabled = false;
            }, 2000);

            // Animation du badge panier
            this.animateCartBadge();
            this.updateCartBadge();

            // Afficher toast avec action
            if (window.toast) {
                toast.cartAdded(productName);
            }

            // Animation de l'image vers le panier
            this.flyToCart(button);

        } catch (error) {
            console.error('Error adding to cart:', error);
            button.classList.remove('loading');
            button.disabled = false;

            if (window.toast) {
                toast.error('Erreur lors de l\'ajout au panier');
            }
        }
    }

    setupWishlistButtons() {
        document.addEventListener('click', (e) => {
            const wishlistBtn = e.target.closest('[data-toggle-wishlist]');
            if (wishlistBtn) {
                e.preventDefault();
                const productId = wishlistBtn.dataset.toggleWishlist;
                const productName = wishlistBtn.dataset.productName || 'Produit';
                this.toggleWishlist(productId, productName, wishlistBtn);
            }
        });
    }

    async toggleWishlist(productId, productName, button) {
        const isActive = button.classList.contains('active');

        // Animation immédiate
        button.classList.add('animating');

        try {
            const url = isActive ? '/wishlist/remove' : '/wishlist/add';
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ product_id: productId })
            });

            if (!response.ok) throw new Error('Failed to toggle wishlist');

            // Toggle l'état
            button.classList.toggle('active');
            // Animation désactivée - button.classList.add('heart-animation');

            // Créer des coeurs qui s'envolent si ajout - DÉSACTIVÉ
            // if (!isActive) {
            //     this.createHearts(button);
            // }

            setTimeout(() => {
                button.classList.remove('animating');
                // Pas de heart-animation à retirer
            }, 800);

            // Toast notification
            if (window.toast) {
                if (isActive) {
                    toast.wishlistRemoved(productName);
                } else {
                    toast.wishlistAdded(productName);
                }
            }

            this.updateWishlistBadge();

        } catch (error) {
            console.error('Error toggling wishlist:', error);
            button.classList.remove('animating');

            if (window.toast) {
                toast.error('Erreur lors de la modification des favoris');
            }
        }
    }

    setupQuantityControls() {
        document.addEventListener('click', (e) => {
            // Bouton +
            if (e.target.closest('.qty-increase')) {
                const input = e.target.closest('.quantity-control').querySelector('input');
                this.changeQuantity(input, 1);
            }

            // Bouton -
            if (e.target.closest('.qty-decrease')) {
                const input = e.target.closest('.quantity-control').querySelector('input');
                this.changeQuantity(input, -1);
            }
        });

        // Input direct
        document.addEventListener('change', (e) => {
            if (e.target.classList.contains('qty-input')) {
                this.updateCartQuantity(e.target);
            }
        });
    }

    changeQuantity(input, delta) {
        const currentValue = parseInt(input.value) || 1;
        const min = parseInt(input.min) || 1;
        const max = parseInt(input.max) || 99;
        
        let newValue = currentValue + delta;
        newValue = Math.max(min, Math.min(max, newValue));

        if (newValue !== currentValue) {
            input.value = newValue;

            // Animation du nombre
            input.classList.add('quantity-pulse');
            setTimeout(() => input.classList.remove('quantity-pulse'), 300);

            // Mettre à jour le panier
            this.updateCartQuantity(input);
        }
    }

    async updateCartQuantity(input) {
        const productId = input.dataset.productId;
        const quantity = parseInt(input.value) || 1;

        try {
            const response = await fetch('/cart/update', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    product_id: productId,
                    quantity: quantity
                })
            });

            if (!response.ok) throw new Error('Failed to update cart');

            const data = await response.json();

            // Mettre à jour le total si présent
            const totalElement = document.querySelector(`[data-product-total="${productId}"]`);
            if (totalElement && data.item_total) {
                totalElement.textContent = data.item_total + ' DH';
                totalElement.classList.add('highlight-change');
                setTimeout(() => totalElement.classList.remove('highlight-change'), 600);
            }

            // Mettre à jour le total global
            const grandTotalElement = document.getElementById('cartGrandTotal');
            if (grandTotalElement && data.cart_total) {
                grandTotalElement.textContent = data.cart_total + ' DH';
                grandTotalElement.classList.add('highlight-change');
                setTimeout(() => grandTotalElement.classList.remove('highlight-change'), 600);
            }

            this.updateCartBadge();

        } catch (error) {
            console.error('Error updating cart:', error);
            if (window.toast) {
                toast.error('Erreur lors de la mise à jour');
            }
        }
    }

    updateCartBadge() {
        fetch('/api/cart/count')
            .then(res => res.json())
            .then(data => {
                const badges = document.querySelectorAll('.cart-badge');
                badges.forEach(badge => {
                    badge.textContent = data.count || 0;
                    if (data.count > 0) {
                        badge.style.display = 'flex';
                    } else {
                        badge.style.display = 'none';
                    }
                });
            })
            .catch(err => console.error('Error updating cart badge:', err));
    }

    updateWishlistBadge() {
        fetch('/api/wishlist/count')
            .then(res => res.json())
            .then(data => {
                const badges = document.querySelectorAll('.wishlist-badge');
                badges.forEach(badge => {
                    badge.textContent = data.count || 0;
                    if (data.count > 0) {
                        badge.style.display = 'flex';
                    } else {
                        badge.style.display = 'none';
                    }
                });
            })
            .catch(err => console.error('Error updating wishlist badge:', err));
    }

    animateCartBadge() {
        const badges = document.querySelectorAll('.cart-badge');
        badges.forEach(badge => {
            badge.classList.add('badge-pulse');
            setTimeout(() => badge.classList.remove('badge-pulse'), 1000);
        });
    }

    createParticles(button) {
        const rect = button.getBoundingClientRect();
        const colors = ['#C4942F', '#A67D26', '#FFD700'];

        for (let i = 0; i < 8; i++) {
            const particle = document.createElement('div');
            particle.className = 'cart-particle';
            particle.style.cssText = `
                position: fixed;
                width: 8px;
                height: 8px;
                background: ${colors[Math.floor(Math.random() * colors.length)]};
                border-radius: 50%;
                pointer-events: none;
                z-index: 9999;
                left: ${rect.left + rect.width / 2}px;
                top: ${rect.top + rect.height / 2}px;
            `;

            document.body.appendChild(particle);

            const angle = (Math.PI * 2 * i) / 8;
            const velocity = 50 + Math.random() * 50;
            const tx = Math.cos(angle) * velocity;
            const ty = Math.sin(angle) * velocity;

            particle.animate([
                { transform: 'translate(0, 0) scale(1)', opacity: 1 },
                { transform: `translate(${tx}px, ${ty}px) scale(0)`, opacity: 0 }
            ], {
                duration: 800,
                easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)'
            }).onfinish = () => particle.remove();
        }
    }

    createHearts(button) {
        const rect = button.getBoundingClientRect();

        for (let i = 0; i < 5; i++) {
            const heart = document.createElement('div');
            heart.textContent = '❤️';
            heart.style.cssText = `
                position: fixed;
                font-size: 20px;
                pointer-events: none;
                z-index: 9999;
                left: ${rect.left + rect.width / 2}px;
                top: ${rect.top}px;
            `;

            document.body.appendChild(heart);

            const tx = (Math.random() - 0.5) * 100;
            const ty = -100 - Math.random() * 100;

            heart.animate([
                { transform: 'translate(0, 0) scale(0) rotate(0deg)', opacity: 1 },
                { transform: `translate(${tx}px, ${ty}px) scale(1.5) rotate(${Math.random() * 360}deg)`, opacity: 0 }
            ], {
                duration: 1500,
                easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)'
            }).onfinish = () => heart.remove();
        }
    }

    flyToCart(button) {
        const productImage = button.closest('.product-card')?.querySelector('img');
        if (!productImage) return;

        const cartIcon = document.querySelector('.cart-icon, .bi-cart3, .bi-cart-fill');
        if (!cartIcon) return;

        const clone = productImage.cloneNode(true);
        const imageRect = productImage.getBoundingClientRect();
        const cartRect = cartIcon.getBoundingClientRect();

        clone.style.cssText = `
            position: fixed;
            width: ${imageRect.width}px;
            height: ${imageRect.height}px;
            left: ${imageRect.left}px;
            top: ${imageRect.top}px;
            z-index: 9999;
            pointer-events: none;
            border-radius: 8px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        `;

        document.body.appendChild(clone);

        clone.animate([
            {
                left: `${imageRect.left}px`,
                top: `${imageRect.top}px`,
                width: `${imageRect.width}px`,
                height: `${imageRect.height}px`,
                opacity: 1
            },
            {
                left: `${cartRect.left}px`,
                top: `${cartRect.top}px`,
                width: '30px',
                height: '30px',
                opacity: 0
            }
        ], {
            duration: 800,
            easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)'
        }).onfinish = () => clone.remove();
    }
}

// Styles CSS
const cartWishlistStyles = `
<style>
/* Boutons de panier */
[data-add-to-cart] {
    position: relative;
    overflow: hidden;
    transition: all 0.3s ease;
}

[data-add-to-cart].loading {
    pointer-events: none;
}

[data-add-to-cart].loading::after {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
    animation: shimmerButton 1s infinite;
}

@keyframes shimmerButton {
    0% { left: -100%; }
    100% { left: 100%; }
}

[data-add-to-cart].success {
    background: #10b981 !important;
    border-color: #10b981 !important;
    transform: scale(1.05);
}

/* Boutons wishlist */
[data-toggle-wishlist] {
    position: relative;
    transition: all 0.3s ease;
}

[data-toggle-wishlist].active {
    color: #ec4899 !important;
}

[data-toggle-wishlist].animating {
    transform: scale(1.2);
}

/* Contrôles de quantité */
.quantity-control {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    background: white;
    border: 1px solid #ddd;
    border-radius: 8px;
    padding: 4px;
}

body.dark-mode .quantity-control {
    background: var(--bg-tertiary);
    border-color: var(--border-color);
}

.qty-decrease,
.qty-increase {
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--logo-light);
    border: none;
    border-radius: 6px;
    color: var(--logo-color);
    cursor: pointer;
    transition: all 0.2s;
    font-weight: bold;
}

.qty-decrease:hover,
.qty-increase:hover {
    background: var(--logo-color);
    color: white;
    transform: scale(1.1);
}

.qty-decrease:active,
.qty-increase:active {
    transform: scale(0.95);
}

.qty-input {
    width: 50px;
    text-align: center;
    border: none;
    background: transparent;
    font-weight: 600;
    color: var(--logo-color);
    font-size: 16px;
}

body.dark-mode .qty-input {
    color: var(--text-primary);
}

.qty-input:focus {
    outline: none;
}

.qty-input.quantity-pulse {
    animation: quantityPulse 0.3s ease;
}

@keyframes quantityPulse {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.3); }
}

/* Badge animations */
.cart-badge,
.wishlist-badge {
    position: absolute;
    top: -8px;
    right: -8px;
    background: #ef4444;
    color: white;
    font-size: 11px;
    font-weight: bold;
    padding: 2px 6px;
    border-radius: 10px;
    min-width: 18px;
    height: 18px;
    display: none;
    align-items: center;
    justify-content: center;
    animation: badgePop 0.3s ease;
}

@keyframes badgePop {
    0% { transform: scale(0); }
    50% { transform: scale(1.2); }
    100% { transform: scale(1); }
}

.badge-pulse {
    animation: badgePulse 1s ease;
}

@keyframes badgePulse {
    0%, 100% { transform: scale(1); }
    25% { transform: scale(1.3); }
    50% { transform: scale(1.1); }
    75% { transform: scale(1.2); }
}

/* Highlight changes */
.highlight-change {
    animation: highlightFlash 0.6s ease;
}

@keyframes highlightFlash {
    0%, 100% { background: transparent; }
    50% { background: rgba(196, 148, 47, 0.2); }
}

/* Particules */
.cart-particle {
    animation: particleFloat 0.8s ease-out forwards;
}

/* Quick view sur produits */
.product-card {
    position: relative;
}

.product-quick-actions {
    position: absolute;
    top: 10px;
    right: 10px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    opacity: 0;
    transform: translateX(20px);
    transition: all 0.3s ease;
}

.product-card:hover .product-quick-actions {
    opacity: 1;
    transform: translateX(0);
}

.quick-action-btn {
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: white;
    border: none;
    border-radius: 50%;
    box-shadow: 0 2px 8px rgba(0,0,0,0.15);
    cursor: pointer;
    transition: all 0.3s ease;
}

.quick-action-btn:hover {
    background: var(--logo-color);
    color: white;
    transform: scale(1.1);
}

body.dark-mode .quick-action-btn {
    background: var(--bg-secondary);
}

/* Responsive */
@media (max-width: 768px) {
    .product-quick-actions {
        opacity: 1;
        transform: translateX(0);
    }

    .qty-input {
        width: 40px;
    }
}
</style>
`;

// Injecter les styles
document.head.insertAdjacentHTML('beforeend', cartWishlistStyles);

// Initialiser
window.cartWishlistAnimations = new CartWishlistAnimations();
