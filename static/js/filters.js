// Filtrage dynamique AJAX pour les produits
// Quartier d'Arômes - Dynamic Product Filtering

document.addEventListener('DOMContentLoaded', function() {
    const filterForm = document.getElementById('filterForm');
    const productsContainer = document.getElementById('productsContainer');
    const productsCount = document.getElementById('productsCount');
    const loadingIndicator = document.getElementById('loadingIndicator');
    
    if (!filterForm) return;
    
    // Écouteurs d'événements pour tous les filtres
    const filterInputs = filterForm.querySelectorAll('select, input[type="range"], input[type="number"]');
    filterInputs.forEach(input => {
        input.addEventListener('change', applyFilters);
    });
    
    // Fonction pour appliquer les filtres
    async function applyFilters(e) {
        if (e) e.preventDefault();
        
        // Afficher l'indicateur de chargement
        if (loadingIndicator) {
            loadingIndicator.classList.remove('d-none');
        }
        if (productsContainer) {
            productsContainer.style.opacity = '0.5';
        }
        
        // Récupérer les valeurs des filtres
        const formData = new FormData(filterForm);
        const filters = {
            category: formData.get('category') || '',
            brand: formData.get('brand') || '',
            price_min: formData.get('price_min') || '',
            price_max: formData.get('price_max') || '',
            size: formData.get('size') || '',
            product_type: formData.get('product_type') || '',
            sort: formData.get('sort') || 'name'
        };
        
        try {
            // Envoyer la requête AJAX
            const response = await fetch('/api/products/filter', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(filters)
            });
            
            const data = await response.json();
            
            if (data.success) {
                // Mettre à jour l'affichage des produits
                displayProducts(data.products);
                
                // Mettre à jour le compteur
                if (productsCount) {
                    productsCount.textContent = `${data.count} produit${data.count > 1 ? 's' : ''} trouvé${data.count > 1 ? 's' : ''}`;
                }
            }
        } catch (error) {
            console.error('Erreur lors du filtrage:', error);
            alert('Une erreur est survenue lors du filtrage des produits.');
        } finally {
            // Masquer l'indicateur de chargement
            if (loadingIndicator) {
                loadingIndicator.classList.add('d-none');
            }
            if (productsContainer) {
                productsContainer.style.opacity = '1';
            }
        }
    }
    
    // Fonction pour afficher les produits
    function displayProducts(products) {
        if (!productsContainer) return;
        
        if (products.length === 0) {
            productsContainer.innerHTML = `
                <div class="col-12 text-center py-5">
                    <i class="fas fa-search fa-3x text-muted mb-3"></i>
                    <p class="text-muted">Aucun produit ne correspond à vos critères.</p>
                </div>
            `;
            return;
        }
        
        let html = '';
        products.forEach(product => {
            const imageUrl = product.image_url ? `/static/${product.image_url}` : '/static/images/placeholder.jpg';
            const stockBadge = product.stock > 0 
                ? `<span class="badge bg-success">En stock</span>` 
                : `<span class="badge bg-danger">Rupture</span>`;
            
            html += `
                <div class="col-md-4 col-lg-3 mb-4">
                    <div class="card product-card h-100">
                        <img src="${imageUrl}" class="card-img-top" alt="${product.name}" style="height: 250px; object-fit: cover;">
                        <div class="card-body">
                            <h6 class="card-title">${product.name}</h6>
                            <p class="text-muted small mb-2">${product.brand || ''}</p>
                            <div class="d-flex justify-content-between align-items-center">
                                <span class="h5 mb-0 text-primary">${product.price.toFixed(2)} DH</span>
                                ${stockBadge}
                            </div>
                            <p class="text-muted small mt-2">${product.size || ''}</p>
                        </div>
                        <div class="card-footer bg-white border-0">
                            <a href="/product/${product.id}" class="btn btn-sm btn-outline-primary w-100">
                                <i class="fas fa-eye"></i> Voir
                            </a>
                        </div>
                    </div>
                </div>
            `;
        });
        
        productsContainer.innerHTML = html;
    }
    
    // Bouton pour réinitialiser les filtres
    const resetButton = document.getElementById('resetFilters');
    if (resetButton) {
        resetButton.addEventListener('click', function() {
            filterForm.reset();
            applyFilters();
        });
    }
});
