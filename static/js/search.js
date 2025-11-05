// Recherche intelligente avec suggestions automatiques
let searchTimeout = null;
let searchInput = null;
let suggestionsContainer = null;

document.addEventListener('DOMContentLoaded', function() {
    // Initialiser la recherche dans le modal
    const searchModal = document.getElementById('searchModal');
    if (searchModal) {
        searchInput = searchModal.querySelector('#searchInput');
        
        // Créer le conteneur de suggestions s'il n'existe pas
        if (!document.getElementById('searchSuggestions')) {
            suggestionsContainer = document.createElement('div');
            suggestionsContainer.id = 'searchSuggestions';
            suggestionsContainer.className = 'search-suggestions';
            searchInput.parentNode.insertBefore(suggestionsContainer, searchInput.nextSibling);
        } else {
            suggestionsContainer = document.getElementById('searchSuggestions');
        }
        
        // Écouter les saisies
        searchInput.addEventListener('input', handleSearchInput);
        
        // Fermer les suggestions au clic extérieur
        document.addEventListener('click', function(e) {
            if (!e.target.closest('.modal-body')) {
                hideSuggestions();
            }
        });
    }
});

function handleSearchInput(e) {
    const query = e.target.value.trim();
    
    // Annuler la recherche précédente
    if (searchTimeout) {
        clearTimeout(searchTimeout);
    }
    
    if (query.length < 2) {
        hideSuggestions();
        return;
    }
    
    // Attendre 300ms avant de lancer la recherche
    searchTimeout = setTimeout(() => {
        fetchSuggestions(query);
    }, 300);
}

function fetchSuggestions(query) {
    fetch(`/api/search/suggestions?q=${encodeURIComponent(query)}`)
        .then(response => response.json())
        .then(data => {
            displaySuggestions(data);
        })
        .catch(error => {
            console.error('Erreur recherche:', error);
        });
}

function displaySuggestions(suggestions) {
    if (!suggestions || suggestions.length === 0) {
        hideSuggestions();
        return;
    }
    
    let html = '<div class="suggestions-list">';
    
    // Grouper par type
    const products = suggestions.filter(s => s.type === 'product');
    const brands = suggestions.filter(s => s.type === 'brand');
    
    // Afficher les produits
    if (products.length > 0) {
        html += '<div class="suggestion-group">';
        html += '<div class="suggestion-header">Produits</div>';
        
        products.forEach(product => {
            html += `
                <a href="${product.url}" class="suggestion-item">
                    <div class="suggestion-image">
                        ${product.image ? 
                            `<img src="/static/${product.image}" alt="${product.name}">` :
                            '<div class="no-image"><i class="bi bi-image"></i></div>'
                        }
                    </div>
                    <div class="suggestion-details">
                        <div class="suggestion-name">${product.name}</div>
                        <div class="suggestion-brand">${product.brand}</div>
                    </div>
                    <div class="suggestion-price">${product.price} DH</div>
                </a>
            `;
        });
        
        html += '</div>';
    }
    
    // Afficher les marques
    if (brands.length > 0) {
        html += '<div class="suggestion-group">';
        html += '<div class="suggestion-header">Marques</div>';
        
        brands.forEach(brand => {
            html += `
                <a href="${brand.url}" class="suggestion-item suggestion-brand">
                    <i class="bi bi-award-fill text-warning me-2"></i>
                    <span>${brand.name}</span>
                </a>
            `;
        });
        
        html += '</div>';
    }
    
    html += '</div>';
    
    suggestionsContainer.innerHTML = html;
    suggestionsContainer.style.display = 'block';
}

function hideSuggestions() {
    if (suggestionsContainer) {
        suggestionsContainer.style.display = 'none';
    }
}

// Styles CSS pour les suggestions
const style = document.createElement('style');
style.textContent = `
.search-suggestions {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    background: white;
    border-radius: 12px;
    box-shadow: 0 10px 30px rgba(0,0,0,0.2);
    max-height: 450px;
    overflow-y: auto;
    z-index: 1000;
    display: none;
    margin-top: 10px;
    border: 1px solid #e9ecef;
}

.suggestions-list {
    padding: 12px 0;
}

.suggestion-group {
    margin-bottom: 12px;
}

.suggestion-group:last-child {
    margin-bottom: 0;
}

.suggestion-header {
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    color: #6c757d;
    padding: 10px 20px 8px 20px;
    letter-spacing: 1px;
    background: #f8f9fa;
    border-bottom: 2px solid #e9ecef;
}

.suggestion-item {
    display: flex;
    align-items: center;
    padding: 14px 20px;
    text-decoration: none;
    color: #333;
    transition: all 0.25s ease;
    border-left: 3px solid transparent;
}

.suggestion-item:hover {
    background: #fffbf0;
    border-left-color: #C4942F;
    padding-left: 23px;
}

.suggestion-image {
    width: 55px;
    height: 55px;
    border-radius: 8px;
    overflow: hidden;
    flex-shrink: 0;
    margin-right: 15px;
    border: 2px solid #f0f0f0;
    background: #fff;
}

.suggestion-image img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.no-image {
    width: 100%;
    height: 100%;
    background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    color: #C4942F;
    font-size: 20px;
}

.suggestion-details {
    flex: 1;
    min-width: 0;
}

.suggestion-name {
    font-weight: 600;
    font-size: 14px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    margin-bottom: 4px;
    color: #212529;
}

.suggestion-brand {
    font-size: 12px;
    color: #6c757d;
    display: flex;
    align-items: center;
    gap: 4px;
}

.suggestion-brand::before {
    content: '•';
    color: #C4942F;
}

.suggestion-price {
    font-weight: 700;
    color: #C4942F;
    white-space: nowrap;
    margin-left: 15px;
    font-size: 15px;
    background: #fffbf0;
    padding: 4px 10px;
    border-radius: 6px;
}

.suggestion-item.suggestion-brand {
    padding: 14px 20px;
    font-weight: 600;
}

.suggestion-item.suggestion-brand i {
    font-size: 18px;
    color: #C4942F;
}

.suggestion-item.suggestion-brand span {
    font-size: 14px;
}

/* Scrollbar personnalisée */
.search-suggestions::-webkit-scrollbar {
    width: 8px;
}

.search-suggestions::-webkit-scrollbar-track {
    background: #f8f9fa;
    border-radius: 0 12px 12px 0;
}

.search-suggestions::-webkit-scrollbar-thumb {
    background: #C4942F;
    border-radius: 4px;
}

.search-suggestions::-webkit-scrollbar-thumb:hover {
    background: #a67c26;
}

/* Séparateur entre groupes */
.suggestion-group + .suggestion-group {
    border-top: 1px solid #e9ecef;
    padding-top: 12px;
}

/* Animation d'apparition */
@keyframes fadeInDown {
    from {
        opacity: 0;
        transform: translateY(-10px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

.search-suggestions {
    animation: fadeInDown 0.3s ease;
}

/* Indicateur "Aucun résultat" */
.no-results {
    padding: 30px 20px;
    text-align: center;
    color: #6c757d;
}

.no-results i {
    font-size: 40px;
    color: #dee2e6;
    margin-bottom: 10px;
}
`;
document.head.appendChild(style);
