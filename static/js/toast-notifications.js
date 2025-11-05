/**
 * QUARTIER D'ARÔMES - TOAST NOTIFICATIONS
 * Système de notifications avec couleurs cohérentes
 */

class ToastNotification {
    constructor() {
        this.container = null;
        this.createContainer();
        this.toasts = [];
    }

    /**
     * Créer le container des toasts
     */
    createContainer() {
        if (!document.querySelector('.toast-container')) {
            this.container = document.createElement('div');
            this.container.className = 'toast-container';
            document.body.appendChild(this.container);
        } else {
            this.container = document.querySelector('.toast-container');
        }
    }

    /**
     * Afficher un toast
     * @param {string} type - success, error, warning, info
     * @param {string} title - Titre du toast
     * @param {string} message - Message du toast
     * @param {number} duration - Durée d'affichage (ms), 0 = infini
     */
    show(type = 'info', title = '', message = '', duration = 5000) {
        const toast = this.createToast(type, title, message);
        this.container.appendChild(toast);
        this.toasts.push(toast);

        // Trigger reflow pour animation
        toast.offsetHeight;

        // Auto-hide après duration
        if (duration > 0) {
            setTimeout(() => {
                this.hide(toast);
            }, duration);
        }

        return toast;
    }

    /**
     * Créer un élément toast
     */
    createToast(type, title, message) {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;

        // Icône selon le type
        const icons = {
            success: 'bi-check-circle-fill',
            error: 'bi-x-circle-fill',
            warning: 'bi-exclamation-triangle-fill',
            info: 'bi-info-circle-fill'
        };

        toast.innerHTML = `
            <div class="toast-icon">
                <i class="bi ${icons[type] || icons.info}"></i>
            </div>
            <div class="toast-content">
                ${title ? `<div class="toast-title">${title}</div>` : ''}
                ${message ? `<div class="toast-message">${message}</div>` : ''}
            </div>
            <button class="toast-close" aria-label="Fermer">
                <i class="bi bi-x"></i>
            </button>
            <div class="toast-progress"></div>
        `;

        // Event listener pour fermer
        const closeBtn = toast.querySelector('.toast-close');
        closeBtn.addEventListener('click', () => this.hide(toast));

        return toast;
    }

    /**
     * Masquer un toast
     */
    hide(toast) {
        toast.classList.add('removing');
        
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
            
            const index = this.toasts.indexOf(toast);
            if (index > -1) {
                this.toasts.splice(index, 1);
            }
        }, 300);
    }

    /**
     * Masquer tous les toasts
     */
    hideAll() {
        this.toasts.forEach(toast => this.hide(toast));
    }

    // Raccourcis pour chaque type
    success(title, message, duration) {
        return this.show('success', title, message, duration);
    }

    error(title, message, duration) {
        return this.show('error', title, message, duration);
    }

    warning(title, message, duration) {
        return this.show('warning', title, message, duration);
    }

    info(title, message, duration) {
        return this.show('info', title, message, duration);
    }
}

// Instance globale
const toast = new ToastNotification();

/**
 * ANIMATIONS SPÉCIFIQUES
 */

/**
 * Animation ajout au panier
 * @param {HTMLElement} productElement - Élément produit
 * @param {HTMLElement} cartIcon - Icône panier
 */
function animateAddToCart(productElement, cartIcon) {
    // Créer une copie de l'image du produit
    const productImage = productElement.querySelector('img');
    if (!productImage || !cartIcon) return;

    const clone = productImage.cloneNode(true);
    const imageRect = productImage.getBoundingClientRect();
    const cartRect = cartIcon.getBoundingClientRect();

    // Positionner le clone
    clone.style.position = 'fixed';
    clone.style.top = imageRect.top + 'px';
    clone.style.left = imageRect.left + 'px';
    clone.style.width = imageRect.width + 'px';
    clone.style.height = imageRect.height + 'px';
    clone.style.zIndex = '9999';
    clone.style.transition = 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)';
    clone.style.pointerEvents = 'none';

    document.body.appendChild(clone);

    // Trigger animation
    requestAnimationFrame(() => {
        clone.style.top = cartRect.top + 'px';
        clone.style.left = cartRect.left + 'px';
        clone.style.width = '30px';
        clone.style.height = '30px';
        clone.style.opacity = '0';
    });

    // Animer le badge du panier
    setTimeout(() => {
        if (cartIcon) {
            const badge = cartIcon.querySelector('.badge');
            if (badge) {
                badge.classList.add('badge-pulse');
                setTimeout(() => badge.classList.remove('badge-pulse'), 400);
            }
        }
        
        // Retirer le clone
        clone.remove();
    }, 600);
}

/**
 * Animation suppression d'élément
 * @param {HTMLElement} element - Élément à supprimer
 * @param {Function} callback - Fonction à exécuter après suppression
 */
function animateRemoveElement(element, callback) {
    element.classList.add('slide-out-right');
    
    setTimeout(() => {
        if (callback && typeof callback === 'function') {
            callback();
        }
        element.remove();
    }, 300);
}

/**
 * Animation collapse d'élément
 * @param {HTMLElement} element - Élément à collapse
 * @param {Function} callback - Fonction à exécuter après collapse
 */
function animateCollapse(element, callback) {
    element.classList.add('collapse-animation');
    
    setTimeout(() => {
        if (callback && typeof callback === 'function') {
            callback();
        }
        element.remove();
    }, 400);
}

/**
 * Afficher un spinner de chargement
 * @param {HTMLElement} container - Container où afficher le spinner
 * @param {string} size - sm, normal, lg
 */
function showSpinner(container, size = 'normal') {
    const spinner = document.createElement('div');
    spinner.className = `spinner ${size !== 'normal' ? 'spinner-' + size : ''}`;
    spinner.setAttribute('data-spinner', 'true');
    
    if (container) {
        container.appendChild(spinner);
        container.style.position = 'relative';
        container.style.minHeight = '100px';
    }
    
    return spinner;
}

/**
 * Masquer le spinner
 * @param {HTMLElement} container - Container contenant le spinner
 */
function hideSpinner(container) {
    if (container) {
        const spinner = container.querySelector('[data-spinner="true"]');
        if (spinner) {
            spinner.classList.add('fade-out-scale');
            setTimeout(() => spinner.remove(), 300);
        }
    }
}

/**
 * Animer un changement de quantité
 * @param {HTMLElement} element - Élément quantité
 */
function animateQuantityChange(element) {
    element.classList.add('quantity-change');
    setTimeout(() => element.classList.remove('quantity-change'), 300);
}

/**
 * Animer un changement de prix
 * @param {HTMLElement} element - Élément prix
 */
function animatePriceUpdate(element) {
    element.classList.add('price-update');
    setTimeout(() => element.classList.remove('price-update'), 800);
}

/**
 * Animation ajout aux favoris
 * @param {HTMLElement} heartIcon - Icône coeur
 */
function animateAddToWishlist(heartIcon) {
    heartIcon.classList.add('heart-beat');
    setTimeout(() => heartIcon.classList.remove('heart-beat'), 800);
}

/**
 * Transitions douces pour les onglets
 * @param {HTMLElement} tabContent - Contenu de l'onglet
 */
function animateTabChange(tabContent) {
    tabContent.classList.add('fade-in');
    setTimeout(() => tabContent.classList.remove('fade-in'), 300);
}

/**
 * Animation stagger pour liste d'éléments
 * @param {NodeList} elements - Liste d'éléments
 */
function animateStagger(elements) {
    elements.forEach((element, index) => {
        element.style.opacity = '0';
        element.style.transform = 'translateY(20px)';
        
        setTimeout(() => {
            element.style.transition = 'all 0.4s ease-out';
            element.style.opacity = '1';
            element.style.transform = 'translateY(0)';
        }, index * 50);
    });
}

/**
 * INITIALISATION AUTOMATIQUE
 */
document.addEventListener('DOMContentLoaded', function() {
    // Animer le contenu au chargement
    const mainContent = document.querySelector('main');
    if (mainContent) {
        mainContent.classList.add('fade-in-up');
    }

    // Event delegation pour les boutons "Ajouter au panier"
    document.addEventListener('click', function(e) {
        // Bouton ajout au panier
        if (e.target.closest('.btn-add-to-cart, [data-add-to-cart]')) {
            const btn = e.target.closest('.btn-add-to-cart, [data-add-to-cart]');
            const productCard = btn.closest('.product-card, .card');
            const cartIcon = document.querySelector('.cart-icon, [data-cart-icon]');
            
            if (productCard && cartIcon) {
                animateAddToCart(productCard, cartIcon);
            }
            
            // Toast de confirmation
            toast.success(
                'Produit ajouté !',
                'Le produit a été ajouté à votre panier',
                3000
            );
        }

        // Bouton suppression
        if (e.target.closest('.btn-delete, [data-delete]')) {
            const btn = e.target.closest('.btn-delete, [data-delete]');
            const row = btn.closest('tr, .card, .item');
            
            if (row && confirm('Êtes-vous sûr de vouloir supprimer cet élément ?')) {
                animateRemoveElement(row, () => {
                    toast.info('Élément supprimé', 'L\'élément a été supprimé avec succès');
                });
            }
        }

        // Bouton favoris
        if (e.target.closest('.btn-wishlist, [data-wishlist]')) {
            const btn = e.target.closest('.btn-wishlist, [data-wishlist]');
            const icon = btn.querySelector('i');
            
            if (icon) {
                animateAddToWishlist(icon);
                
                if (icon.classList.contains('bi-heart')) {
                    icon.classList.remove('bi-heart');
                    icon.classList.add('bi-heart-fill');
                    toast.success('Ajouté aux favoris', 'Le produit a été ajouté à vos favoris');
                } else {
                    icon.classList.add('bi-heart');
                    icon.classList.remove('bi-heart-fill');
                    toast.info('Retiré des favoris', 'Le produit a été retiré de vos favoris');
                }
            }
        }
    });

    // Animer les changements de quantité
    document.addEventListener('change', function(e) {
        if (e.target.matches('input[type="number"][name*="quantity"]')) {
            const quantityDisplay = e.target.closest('.quantity-selector, .input-group');
            if (quantityDisplay) {
                animateQuantityChange(quantityDisplay);
            }
        }
    });

    // Transitions pour les onglets Bootstrap
    const tabLinks = document.querySelectorAll('[data-bs-toggle="tab"]');
    tabLinks.forEach(tab => {
        tab.addEventListener('shown.bs.tab', function(e) {
            const targetId = e.target.getAttribute('href') || e.target.dataset.bsTarget;
            const targetContent = document.querySelector(targetId);
            
            if (targetContent) {
                animateTabChange(targetContent);
            }
        });
    });

    // Animer les éléments au scroll (intersection observer)
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('fade-in-up');
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    // Observer les cards et sections
    const animatableElements = document.querySelectorAll('.product-card, .stats-card, .card-enhanced');
    animatableElements.forEach(el => {
        if (!el.classList.contains('fade-in-up')) {
            observer.observe(el);
        }
    });
});

// Exposer les fonctions globalement
window.toast = toast;
window.animateAddToCart = animateAddToCart;
window.animateRemoveElement = animateRemoveElement;
window.animateCollapse = animateCollapse;
window.showSpinner = showSpinner;
window.hideSpinner = hideSpinner;
window.animateQuantityChange = animateQuantityChange;
window.animatePriceUpdate = animatePriceUpdate;
window.animateAddToWishlist = animateAddToWishlist;
window.animateTabChange = animateTabChange;
window.animateStagger = animateStagger;
