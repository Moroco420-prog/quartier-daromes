/**
 * Lazy Loading Avancé pour Images
 * Améliore les performances et le SEO
 */

class LazyLoader {
    constructor(options = {}) {
        this.options = {
            root: null,
            rootMargin: options.rootMargin || '50px',
            threshold: options.threshold || 0.01,
            loadingClass: 'lazy-loading',
            loadedClass: 'lazy-loaded',
            errorClass: 'lazy-error',
            placeholderSrc: options.placeholderSrc || 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"%3E%3Crect fill="%23f0f0f0" width="400" height="300"/%3E%3Ctext fill="%23999" x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="18"%3EChargement...%3C/text%3E%3C/svg%3E'
        };

        this.imageObserver = null;
        this.init();
    }

    init() {
        // Vérifier le support d'Intersection Observer
        if (!('IntersectionObserver' in window)) {
            console.warn('IntersectionObserver not supported, loading all images immediately');
            this.loadAllImages();
            return;
        }

        this.setupObserver();
        this.observeImages();
        this.setupEventListeners();
    }

    setupObserver() {
        this.imageObserver = new IntersectionObserver(
            (entries, observer) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        this.loadImage(entry.target);
                        observer.unobserve(entry.target);
                    }
                });
            },
            {
                root: this.options.root,
                rootMargin: this.options.rootMargin,
                threshold: this.options.threshold
            }
        );
    }

    observeImages() {
        const images = document.querySelectorAll('img[data-src], img[data-srcset]');
        images.forEach(img => {
            // Ajouter placeholder si pas de src
            if (!img.src || img.src === window.location.href) {
                img.src = this.options.placeholderSrc;
            }
            
            // Ajouter classe de chargement
            img.classList.add(this.options.loadingClass);
            
            // Observer l'image
            this.imageObserver.observe(img);
        });
    }

    loadImage(img) {
        const src = img.dataset.src;
        const srcset = img.dataset.srcset;

        if (!src && !srcset) {
            console.warn('No data-src or data-srcset found for image', img);
            return;
        }

        // Créer une nouvelle image pour précharger
        const tempImg = new Image();

        // Gestion du chargement réussi
        tempImg.onload = () => {
            this.applyImage(img, src, srcset);
            img.classList.remove(this.options.loadingClass);
            img.classList.add(this.options.loadedClass);
            
            // Animation de fade-in
            img.style.opacity = '0';
            setTimeout(() => {
                img.style.transition = 'opacity 0.3s ease';
                img.style.opacity = '1';
            }, 10);

            // Dispatch event
            img.dispatchEvent(new CustomEvent('lazyloaded', { detail: { src } }));
        };

        // Gestion des erreurs
        tempImg.onerror = () => {
            img.classList.remove(this.options.loadingClass);
            img.classList.add(this.options.errorClass);
            
            // Image de fallback
            img.src = this.getErrorPlaceholder();
            img.alt = 'Image non disponible';

            console.error('Failed to load image:', src);
            img.dispatchEvent(new CustomEvent('lazyerror', { detail: { src } }));
        };

        // Commencer le chargement
        if (srcset) {
            tempImg.srcset = srcset;
        }
        if (src) {
            tempImg.src = src;
        }
    }

    applyImage(img, src, srcset) {
        if (srcset) {
            img.srcset = srcset;
        }
        if (src) {
            img.src = src;
        }
        
        // Nettoyer les data attributes
        delete img.dataset.src;
        delete img.dataset.srcset;
    }

    getErrorPlaceholder() {
        return 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"%3E%3Crect fill="%23f8f8f8" width="400" height="300"/%3E%3Cpath fill="%23ddd" d="M150 100h100v20h-100zM150 140h150v10h-150zM150 160h120v10h-120z"/%3E%3Ccircle fill="%23ddd" cx="200" cy="220" r="30"/%3E%3C/svg%3E';
    }

    loadAllImages() {
        const images = document.querySelectorAll('img[data-src], img[data-srcset]');
        images.forEach(img => this.loadImage(img));
    }

    setupEventListeners() {
        // Recharger les images quand de nouveaux éléments sont ajoutés au DOM
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === 1) { // Element node
                        const images = node.querySelectorAll ? 
                            node.querySelectorAll('img[data-src], img[data-srcset]') : [];
                        
                        images.forEach(img => {
                            if (!img.src || img.src === window.location.href) {
                                img.src = this.options.placeholderSrc;
                            }
                            img.classList.add(this.options.loadingClass);
                            this.imageObserver.observe(img);
                        });
                    }
                });
            });
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    // Méthode publique pour forcer le chargement d'une image
    forceLoad(img) {
        if (img.dataset.src || img.dataset.srcset) {
            this.loadImage(img);
        }
    }

    // Méthode pour charger toutes les images visibles immédiatement
    loadVisible() {
        const images = document.querySelectorAll('img[data-src], img[data-srcset]');
        images.forEach(img => {
            const rect = img.getBoundingClientRect();
            if (rect.top < window.innerHeight && rect.bottom > 0) {
                this.loadImage(img);
            }
        });
    }
}

// Styles CSS pour le lazy loading
const lazyLoadStyles = `
<style>
/* Animation de chargement */
img.lazy-loading {
    background: linear-gradient(
        90deg,
        #f0f0f0 25%,
        #e0e0e0 50%,
        #f0f0f0 75%
    );
    background-size: 200% 100%;
    animation: shimmerLoading 1.5s infinite;
    min-height: 200px;
}

body.dark-mode img.lazy-loading {
    background: linear-gradient(
        90deg,
        #1e293b 25%,
        #334155 50%,
        #1e293b 75%
    );
    background-size: 200% 100%;
}

@keyframes shimmerLoading {
    0% {
        background-position: -1000px 0;
    }
    100% {
        background-position: 1000px 0;
    }
}

/* Image chargée */
img.lazy-loaded {
    animation: fadeIn 0.3s ease;
}

/* Image en erreur */
img.lazy-error {
    border: 2px dashed #ddd;
    opacity: 0.5;
}

/* Blur-up effect (optionnel) */
img.blur-up {
    filter: blur(10px);
    transition: filter 0.3s ease;
}

img.blur-up.lazy-loaded {
    filter: blur(0);
}

/* Aspect ratio containers pour éviter le layout shift */
.image-container {
    position: relative;
    overflow: hidden;
}

.image-container.ratio-1-1 {
    padding-bottom: 100%;
}

.image-container.ratio-4-3 {
    padding-bottom: 75%;
}

.image-container.ratio-16-9 {
    padding-bottom: 56.25%;
}

.image-container.ratio-3-4 {
    padding-bottom: 133.33%;
}

.image-container img {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
}

/* Loading spinner sur l'image */
img.lazy-loading::after {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    width: 30px;
    height: 30px;
    margin: -15px 0 0 -15px;
    border: 3px solid #f3f3f3;
    border-top: 3px solid var(--logo-color);
    border-radius: 50%;
    animation: spin 1s linear infinite;
}

@keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
}
</style>
`;

// Injecter les styles
document.head.insertAdjacentHTML('beforeend', lazyLoadStyles);

// Initialiser le lazy loader
window.lazyLoader = new LazyLoader({
    rootMargin: '100px',
    threshold: 0.01
});

// Fonction helper pour convertir les images existantes
function convertToLazyLoad() {
    const images = document.querySelectorAll('img:not([data-src]):not([data-srcset])');
    images.forEach(img => {
        if (img.src && img.src !== window.location.href) {
            img.dataset.src = img.src;
            img.src = window.lazyLoader.options.placeholderSrc;
            img.classList.add('lazy-loading');
            window.lazyLoader.imageObserver.observe(img);
        }
    });
}

// Exemples d'utilisation :
// 
// Dans le HTML :
// <img data-src="image.jpg" alt="Description" class="lazy">
// <img data-srcset="image-320w.jpg 320w, image-640w.jpg 640w" data-src="image.jpg" alt="Description">
//
// Avec aspect ratio (évite layout shift) :
// <div class="image-container ratio-16-9">
//     <img data-src="image.jpg" alt="Description">
// </div>
//
// Forcer le chargement d'une image :
// lazyLoader.forceLoad(document.querySelector('#myImage'));
//
// Charger toutes les images visibles :
// lazyLoader.loadVisible();
