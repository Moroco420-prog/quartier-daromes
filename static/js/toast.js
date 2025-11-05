/**
 * Système de Toast Notifications Moderne
 * Feedback instantané pour toutes les actions utilisateur
 */

class ToastManager {
    constructor() {
        this.container = this.createContainer();
        this.queue = [];
        this.maxToasts = 3;
    }

    createContainer() {
        let container = document.getElementById('toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toast-container';
            container.className = 'toast-container';
            document.body.appendChild(container);
        }
        return container;
    }

    show(message, type = 'info', duration = 3000, options = {}) {
        // Types disponibles: success, error, warning, info
        const toast = this.createToast(message, type, options);
        
        // Limiter le nombre de toasts affichés
        if (this.container.children.length >= this.maxToasts) {
            const oldestToast = this.container.firstElementChild;
            this.removeToast(oldestToast);
        }

        this.container.appendChild(toast);
        
        // Animation d'entrée
        setTimeout(() => toast.classList.add('show'), 10);

        // Auto-dismiss si duration > 0
        if (duration > 0) {
            setTimeout(() => this.removeToast(toast), duration);
        }

        return toast;
    }

    createToast(message, type, options = {}) {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        
        const icon = this.getIcon(type);
        const title = options.title || this.getDefaultTitle(type);
        
        toast.innerHTML = `
            <div class="toast-icon">
                <i class="bi bi-${icon}"></i>
            </div>
            <div class="toast-content">
                ${title ? `<div class="toast-title">${title}</div>` : ''}
                <div class="toast-message">${message}</div>
                ${options.action ? `<button class="toast-action">${options.action}</button>` : ''}
            </div>
            <button class="toast-close" aria-label="Fermer">
                <i class="bi bi-x-lg"></i>
            </button>
        `;

        // Event listener pour le bouton fermer
        const closeBtn = toast.querySelector('.toast-close');
        closeBtn.addEventListener('click', () => this.removeToast(toast));

        // Event listener pour l'action
        if (options.action && options.onAction) {
            const actionBtn = toast.querySelector('.toast-action');
            actionBtn.addEventListener('click', () => {
                options.onAction();
                this.removeToast(toast);
            });
        }

        return toast;
    }

    removeToast(toast) {
        toast.classList.add('removing');
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }

    getIcon(type) {
        const icons = {
            success: 'check-circle-fill',
            error: 'exclamation-circle-fill',
            warning: 'exclamation-triangle-fill',
            info: 'info-circle-fill',
            cart: 'cart-check-fill',
            heart: 'heart-fill'
        };
        return icons[type] || icons.info;
    }

    getDefaultTitle(type) {
        const titles = {
            success: 'Succès !',
            error: 'Erreur',
            warning: 'Attention',
            info: 'Information'
        };
        return titles[type] || '';
    }

    // Méthodes raccourcies
    success(message, options = {}) {
        return this.show(message, 'success', 3000, options);
    }

    error(message, options = {}) {
        return this.show(message, 'error', 4000, options);
    }

    warning(message, options = {}) {
        return this.show(message, 'warning', 3500, options);
    }

    info(message, options = {}) {
        return this.show(message, 'info', 3000, options);
    }

    // Toast spécialisés
    cartAdded(productName) {
        return this.show(
            `"${productName}" ajouté au panier`,
            'cart',
            3000,
            {
                title: 'Panier mis à jour',
                action: 'Voir le panier',
                onAction: () => window.location.href = '/cart'
            }
        );
    }

    wishlistAdded(productName) {
        return this.show(
            `"${productName}" ajouté à vos favoris`,
            'heart',
            2500,
            { title: '❤️ Favori' }
        );
    }

    wishlistRemoved(productName) {
        return this.show(
            `"${productName}" retiré de vos favoris`,
            'info',
            2500
        );
    }
}

// Styles CSS pour les toasts
const toastStyles = `
<style>
.toast-container {
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 9999;
    display: flex;
    flex-direction: column;
    gap: 12px;
    max-width: 400px;
}

.toast {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    padding: 16px;
    background: white;
    border-radius: 12px;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12),
                0 2px 8px rgba(0, 0, 0, 0.08);
    border-left: 4px solid var(--logo-color);
    transform: translateX(400px);
    opacity: 0;
    transition: all 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55);
    pointer-events: auto;
    backdrop-filter: blur(10px);
    position: relative;
    overflow: hidden;
}

.toast::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 2px;
    background: var(--logo-color);
    animation: progress 3s linear forwards;
}

@keyframes progress {
    from { width: 100%; }
    to { width: 0%; }
}

.toast.show {
    transform: translateX(0);
    opacity: 1;
}

.toast.removing {
    transform: translateX(400px);
    opacity: 0;
}

.toast-icon {
    flex-shrink: 0;
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 20px;
}

.toast-content {
    flex: 1;
    min-width: 0;
}

.toast-title {
    font-weight: 600;
    font-size: 14px;
    margin-bottom: 4px;
    color: #1a1a1a;
}

.toast-message {
    font-size: 13px;
    color: #666;
    line-height: 1.4;
}

.toast-action {
    margin-top: 8px;
    padding: 6px 12px;
    background: var(--logo-color);
    color: white;
    border: none;
    border-radius: 6px;
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
}

.toast-action:hover {
    background: var(--logo-hover);
    transform: translateY(-1px);
}

.toast-close {
    flex-shrink: 0;
    width: 20px;
    height: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: transparent;
    border: none;
    color: #999;
    cursor: pointer;
    border-radius: 4px;
    transition: all 0.2s;
    font-size: 12px;
}

.toast-close:hover {
    background: rgba(0, 0, 0, 0.05);
    color: #333;
}

/* Types de toasts */
.toast-success {
    border-left-color: #10b981;
}

.toast-success .toast-icon {
    color: #10b981;
}

.toast-success::before {
    background: #10b981;
}

.toast-error {
    border-left-color: #ef4444;
}

.toast-error .toast-icon {
    color: #ef4444;
}

.toast-error::before {
    background: #ef4444;
}

.toast-warning {
    border-left-color: #f59e0b;
}

.toast-warning .toast-icon {
    color: #f59e0b;
}

.toast-warning::before {
    background: #f59e0b;
}

.toast-info {
    border-left-color: #3b82f6;
}

.toast-info .toast-icon {
    color: #3b82f6;
}

.toast-info::before {
    background: #3b82f6;
}

.toast-cart {
    border-left-color: var(--logo-color);
}

.toast-cart .toast-icon {
    color: var(--logo-color);
}

.toast-heart {
    border-left-color: #ec4899;
}

.toast-heart .toast-icon {
    color: #ec4899;
}

.toast-heart::before {
    background: #ec4899;
}

/* Dark mode */
body.dark-mode .toast {
    background: #1f2937;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
}

body.dark-mode .toast-title {
    color: #f9fafb;
}

body.dark-mode .toast-message {
    color: #d1d5db;
}

body.dark-mode .toast-close {
    color: #9ca3af;
}

body.dark-mode .toast-close:hover {
    background: rgba(255, 255, 255, 0.1);
    color: #f9fafb;
}

/* Responsive */
@media (max-width: 768px) {
    .toast-container {
        top: auto;
        bottom: 20px;
        right: 10px;
        left: 10px;
        max-width: none;
    }

    .toast {
        transform: translateY(100px);
    }

    .toast.show {
        transform: translateY(0);
    }

    .toast.removing {
        transform: translateY(100px);
    }
}
</style>
`;

// Injecter les styles
document.head.insertAdjacentHTML('beforeend', toastStyles);

// Instance globale
window.toast = new ToastManager();

// Exemples d'utilisation :
// toast.success('Opération réussie !');
// toast.error('Une erreur est survenue');
// toast.cartAdded('Parfum Creed Aventus');
// toast.wishlistAdded('Dior Sauvage');
