/**
 * Système de Filtrage Instantané Côté Client avec AJAX
 * Filtrage sans rechargement de page
 */

class InstantFilters {
    constructor() {
        this.filters = {
            category: '',
            brand: '',
            priceMin: '',
            priceMax: '',
            size: '',
            format: '',
            search: '',
            sort: 'name'
        };
        
        this.products = [];
        this.filteredProducts = [];
        this.currentPage = 1;
        this.productsPerPage = 12;
        this.isLoading = false;
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadInitialProducts();
    }

    setupEventListeners() {
        // Filtres
        document.querySelectorAll('.filter-checkbox, .filter-radio').forEach(el => {
            el.addEventListener('change', (e) => this.handleFilterChange(e));
        });

        // Prix
        const priceMin = document.getElementById('priceMin');
        const priceMax = document.getElementById('priceMax');
        if (priceMin) priceMin.addEventListener('input', debounce(() => this.applyFilters(), 500));
        if (priceMax) priceMax.addEventListener('input', debounce(() => this.applyFilters(), 500));

        // Recherche instantanée
        const searchInput = document.getElementById('instantSearch');
        if (searchInput) {
            searchInput.addEventListener('input', debounce((e) => {
                this.filters.search = e.target.value;
                this.applyFilters();
            }, 300));
        }

        // Tri
        const sortSelect = document.getElementById('sortBy');
        if (sortSelect) {
            sortSelect.addEventListener('change', (e) => {
                this.filters.sort = e.target.value;
                this.applyFilters();
            });
        }

        // Reset filters
        const resetBtn = document.getElementById('resetFilters');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => this.resetFilters());
        }
    }

    handleFilterChange(e) {
        const filterType = e.target.dataset.filterType;
        const value = e.target.value;

        if (e.target.type === 'checkbox') {
            if (e.target.checked) {
                this.filters[filterType] = value;
            } else {
                this.filters[filterType] = '';
            }
        } else if (e.target.type === 'radio') {
            this.filters[filterType] = value;
        }

        this.applyFilters();
    }

    async loadInitialProducts() {
        // Charger les produits depuis le DOM ou via AJAX
        const productCards = document.querySelectorAll('.product-card');
        
        if (productCards.length > 0) {
            // Extraire les données des cartes existantes
            this.products = Array.from(productCards).map(card => ({
                id: card.dataset.productId,
                name: card.querySelector('.product-name')?.textContent || '',
                brand: card.dataset.brand || '',
                price: parseFloat(card.dataset.price) || 0,
                category: card.dataset.category || '',
                size: card.dataset.size || '',
                format: card.dataset.format || '',
                rating: parseFloat(card.dataset.rating) || 0,
                reviewCount: parseInt(card.dataset.reviewCount) || 0,
                element: card
            }));
        } else {
            // Charger via AJAX
            await this.fetchProducts();
        }

        this.filteredProducts = [...this.products];
    }

    async fetchProducts() {
        if (this.isLoading) return;
        
        this.isLoading = true;
        this.showLoader();

        try {
            const params = new URLSearchParams(this.filters);
            const response = await fetch(`/api/products?${params.toString()}`);
            
            if (!response.ok) throw new Error('Failed to fetch products');
            
            const data = await response.json();
            this.products = data.products || [];
            this.filteredProducts = [...this.products];
            
            this.renderProducts();
        } catch (error) {
            console.error('Error fetching products:', error);
            if (window.toast) {
                toast.error('Erreur lors du chargement des produits');
            }
        } finally {
            this.isLoading = false;
            this.hideLoader();
        }
    }

    applyFilters() {
        // Filtrer les produits localement
        this.filteredProducts = this.products.filter(product => {
            // Filtre par catégorie
            if (this.filters.category && product.category !== this.filters.category) {
                return false;
            }

            // Filtre par marque
            if (this.filters.brand && product.brand !== this.filters.brand) {
                return false;
            }

            // Filtre par format
            if (this.filters.format && product.format !== this.filters.format) {
                return false;
            }

            // Filtre par taille
            if (this.filters.size && product.size !== this.filters.size) {
                return false;
            }

            // Filtre par prix
            const priceMin = parseFloat(this.filters.priceMin) || 0;
            const priceMax = parseFloat(this.filters.priceMax) || Infinity;
            if (product.price < priceMin || product.price > priceMax) {
                return false;
            }

            // Recherche textuelle
            if (this.filters.search) {
                const searchLower = this.filters.search.toLowerCase();
                const nameMatch = product.name.toLowerCase().includes(searchLower);
                const brandMatch = product.brand.toLowerCase().includes(searchLower);
                if (!nameMatch && !brandMatch) {
                    return false;
                }
            }

            return true;
        });

        // Appliquer le tri
        this.sortProducts();

        // Reset à la première page
        this.currentPage = 1;

        // Afficher les résultats
        this.renderProducts();
        this.updateFilterCount();
    }

    sortProducts() {
        switch (this.filters.sort) {
            case 'name':
                this.filteredProducts.sort((a, b) => a.name.localeCompare(b.name));
                break;
            case 'price-asc':
                this.filteredProducts.sort((a, b) => a.price - b.price);
                break;
            case 'price-desc':
                this.filteredProducts.sort((a, b) => b.price - a.price);
                break;
            case 'rating':
                this.filteredProducts.sort((a, b) => b.rating - a.rating);
                break;
            case 'popularity':
                this.filteredProducts.sort((a, b) => b.reviewCount - a.reviewCount);
                break;
            default:
                break;
        }
    }

    renderProducts() {
        const container = document.getElementById('productsContainer');
        if (!container) return;

        // Ajouter animation de transition
        container.style.opacity = '0.5';

        setTimeout(() => {
            // Cacher tous les produits
            this.products.forEach(product => {
                if (product.element) {
                    product.element.style.display = 'none';
                }
            });

            // Afficher les produits filtrés avec pagination
            const start = (this.currentPage - 1) * this.productsPerPage;
            const end = start + this.productsPerPage;
            const productsToShow = this.filteredProducts.slice(start, end);

            if (productsToShow.length === 0) {
                this.showEmptyState();
            } else {
                this.hideEmptyState();
                productsToShow.forEach((product, index) => {
                    if (product.element) {
                        product.element.style.display = 'block';
                        product.element.classList.add('fade-in-up');
                        product.element.style.animationDelay = `${index * 0.05}s`;
                    }
                });
            }

            // Réorganiser les éléments dans le DOM
            productsToShow.forEach(product => {
                if (product.element) {
                    container.appendChild(product.element);
                }
            });

            // Restaurer l'opacité
            container.style.opacity = '1';
            container.style.transition = 'opacity 0.3s ease';

            // Mettre à jour la pagination
            this.renderPagination();

            // Scroll vers le haut
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }, 150);
    }

    renderPagination() {
        const paginationContainer = document.getElementById('pagination');
        if (!paginationContainer) return;

        const totalPages = Math.ceil(this.filteredProducts.length / this.productsPerPage);
        
        if (totalPages <= 1) {
            paginationContainer.innerHTML = '';
            return;
        }

        let html = '<ul class="pagination justify-content-center">';

        // Previous
        html += `
            <li class="page-item ${this.currentPage === 1 ? 'disabled' : ''}">
                <a class="page-link" href="#" data-page="${this.currentPage - 1}">
                    <i class="bi bi-chevron-left"></i>
                </a>
            </li>
        `;

        // Pages
        for (let i = 1; i <= totalPages; i++) {
            if (i === 1 || i === totalPages || (i >= this.currentPage - 2 && i <= this.currentPage + 2)) {
                html += `
                    <li class="page-item ${i === this.currentPage ? 'active' : ''}">
                        <a class="page-link" href="#" data-page="${i}">${i}</a>
                    </li>
                `;
            } else if (i === this.currentPage - 3 || i === this.currentPage + 3) {
                html += '<li class="page-item disabled"><span class="page-link">...</span></li>';
            }
        }

        // Next
        html += `
            <li class="page-item ${this.currentPage === totalPages ? 'disabled' : ''}">
                <a class="page-link" href="#" data-page="${this.currentPage + 1}">
                    <i class="bi bi-chevron-right"></i>
                </a>
            </li>
        `;

        html += '</ul>';
        paginationContainer.innerHTML = html;

        // Event listeners pour la pagination
        paginationContainer.querySelectorAll('a[data-page]').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const page = parseInt(e.currentTarget.dataset.page);
                if (page >= 1 && page <= totalPages) {
                    this.currentPage = page;
                    this.renderProducts();
                }
            });
        });
    }

    updateFilterCount() {
        const countElement = document.getElementById('filterCount');
        if (countElement) {
            countElement.textContent = this.filteredProducts.length;
        }

        const totalElement = document.getElementById('totalProducts');
        if (totalElement) {
            totalElement.textContent = this.products.length;
        }
    }

    showEmptyState() {
        const container = document.getElementById('productsContainer');
        const emptyState = document.getElementById('emptyState') || this.createEmptyState();
        
        if (container && emptyState) {
            container.innerHTML = '';
            container.appendChild(emptyState);
            emptyState.style.display = 'block';
        }
    }

    hideEmptyState() {
        const emptyState = document.getElementById('emptyState');
        if (emptyState) {
            emptyState.style.display = 'none';
        }
    }

    createEmptyState() {
        const div = document.createElement('div');
        div.id = 'emptyState';
        div.className = 'empty-state text-center py-5';
        div.innerHTML = `
            <i class="bi bi-search" style="font-size: 4rem; color: var(--logo-color); opacity: 0.3;"></i>
            <h3 class="mt-3">Aucun produit trouvé</h3>
            <p class="text-muted">Essayez de modifier vos filtres ou votre recherche</p>
            <button class="btn btn-primary mt-3" onclick="window.instantFilters.resetFilters()">
                <i class="bi bi-arrow-counterclockwise"></i> Réinitialiser les filtres
            </button>
        `;
        return div;
    }

    resetFilters() {
        // Reset tous les filtres
        this.filters = {
            category: '',
            brand: '',
            priceMin: '',
            priceMax: '',
            size: '',
            format: '',
            search: '',
            sort: 'name'
        };

        // Reset les inputs
        document.querySelectorAll('.filter-checkbox, .filter-radio').forEach(el => {
            el.checked = false;
        });

        const priceMin = document.getElementById('priceMin');
        const priceMax = document.getElementById('priceMax');
        if (priceMin) priceMin.value = '';
        if (priceMax) priceMax.value = '';

        const searchInput = document.getElementById('instantSearch');
        if (searchInput) searchInput.value = '';

        const sortSelect = document.getElementById('sortBy');
        if (sortSelect) sortSelect.value = 'name';

        // Réappliquer
        this.applyFilters();

        if (window.toast) {
            toast.info('Filtres réinitialisés');
        }
    }

    showLoader() {
        const loader = document.getElementById('productsLoader') || this.createLoader();
        if (loader) {
            loader.style.display = 'flex';
        }
    }

    hideLoader() {
        const loader = document.getElementById('productsLoader');
        if (loader) {
            loader.style.display = 'none';
        }
    }

    createLoader() {
        const div = document.createElement('div');
        div.id = 'productsLoader';
        div.className = 'products-loader';
        div.innerHTML = `
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Chargement...</span>
            </div>
        `;
        document.body.appendChild(div);
        return div;
    }
}

// Fonction utilitaire debounce
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Styles CSS
const instantFiltersStyles = `
<style>
/* Loader */
.products-loader {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(255, 255, 255, 0.9);
    display: none;
    align-items: center;
    justify-content: center;
    z-index: 9998;
}

body.dark-mode .products-loader {
    background: rgba(15, 23, 42, 0.9);
}

.products-loader .spinner-border {
    width: 3rem;
    height: 3rem;
    border-width: 0.3em;
    color: var(--logo-color) !important;
}

/* Empty State */
.empty-state {
    padding: 4rem 2rem;
    animation: fadeIn 0.5s ease;
}

/* Filter Count Badge */
.filter-count-badge {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 8px 16px;
    background: var(--logo-light);
    border-radius: 20px;
    font-size: 14px;
    font-weight: 500;
    color: var(--logo-color);
    margin-bottom: 1rem;
}

body.dark-mode .filter-count-badge {
    background: rgba(196, 148, 47, 0.2);
}

/* Active Filter Pills */
.active-filters {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-bottom: 1rem;
}

.filter-pill {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    background: var(--logo-color);
    color: white;
    border-radius: 16px;
    font-size: 13px;
    font-weight: 500;
    animation: scaleIn 0.3s ease;
}

.filter-pill button {
    background: none;
    border: none;
    color: white;
    padding: 0;
    width: 16px;
    height: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    cursor: pointer;
    transition: background 0.2s;
}

.filter-pill button:hover {
    background: rgba(255, 255, 255, 0.2);
}

/* Filtres sidebar animations */
.filter-group {
    animation: fadeInLeft 0.5s ease;
}

.filter-group:nth-child(1) { animation-delay: 0.1s; }
.filter-group:nth-child(2) { animation-delay: 0.2s; }
.filter-group:nth-child(3) { animation-delay: 0.3s; }
.filter-group:nth-child(4) { animation-delay: 0.4s; }

/* Checkbox et Radio customs */
.filter-checkbox,
.filter-radio {
    cursor: pointer;
    width: 18px;
    height: 18px;
    accent-color: var(--logo-color);
}

.filter-label {
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px;
    border-radius: 6px;
    transition: background 0.2s;
}

.filter-label:hover {
    background: rgba(196, 148, 47, 0.05);
}

body.dark-mode .filter-label:hover {
    background: rgba(196, 148, 47, 0.1);
}

/* Price Range Inputs */
.price-range-inputs {
    display: flex;
    gap: 10px;
    align-items: center;
}

.price-range-inputs input {
    flex: 1;
    padding: 8px;
    border: 1px solid #ddd;
    border-radius: 6px;
    font-size: 14px;
}

body.dark-mode .price-range-inputs input {
    background: var(--bg-tertiary);
    border-color: var(--border-color);
    color: var(--text-primary);
}

/* Sort Dropdown */
#sortBy {
    padding: 8px 12px;
    border: 1px solid #ddd;
    border-radius: 6px;
    background: white;
    cursor: pointer;
    transition: all 0.2s;
}

#sortBy:hover {
    border-color: var(--logo-color);
}

body.dark-mode #sortBy {
    background: var(--bg-tertiary);
    border-color: var(--border-color);
    color: var(--text-primary);
}

/* Responsive */
@media (max-width: 768px) {
    .filter-count-badge {
        font-size: 13px;
        padding: 6px 12px;
    }

    .price-range-inputs {
        flex-direction: column;
    }
}
</style>
`;

// Injecter les styles
document.head.insertAdjacentHTML('beforeend', instantFiltersStyles);

// Initialiser quand le DOM est prêt
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        if (document.getElementById('productsContainer')) {
            window.instantFilters = new InstantFilters();
        }
    });
} else {
    if (document.getElementById('productsContainer')) {
        window.instantFilters = new InstantFilters();
    }
}
