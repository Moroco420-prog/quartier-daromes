// Main JavaScript for Quartier d'Arômes

document.addEventListener('DOMContentLoaded', function() {
    // Logo intro animation
    const logoImg = document.querySelector('.navbar .logo');
    if (logoImg) {
        logoImg.classList.add('logo-animate');
    }
    
    const productButtons = document.querySelectorAll('.btn-action');
    productButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            // Pas d'animation - garde l'apparence fixe
            this.style.animation = 'none';
        });
    });
    
    // Auto-hide alerts after 5 seconds
    const alerts = document.querySelectorAll('.alert');
    alerts.forEach(alert => {
        setTimeout(() => {
            alert.classList.add('fade');
            setTimeout(() => alert.remove(), 150);
        }, 5000);
    });

    // Product quantity selector
    const quantityInputs = document.querySelectorAll('.quantity-input');
    quantityInputs.forEach(input => {
        const minusBtn = input.previousElementSibling;
        const plusBtn = input.nextElementSibling;
        
        if (minusBtn) {
            minusBtn.addEventListener('click', () => {
                if (input.value > 1) {
                    input.value = parseInt(input.value) - 1;
                    updateCartQuantity(input);
                }
            });
        }
        
        if (plusBtn) {
            plusBtn.addEventListener('click', () => {
                input.value = parseInt(input.value) + 1;
                updateCartQuantity(input);
            });
        }
    });

    // Search functionality
    const searchInput = document.getElementById('searchInput');
    const searchResults = document.getElementById('searchResults');
    
    if (searchInput) {
        let searchTimeout;
        
        searchInput.addEventListener('input', function() {
            clearTimeout(searchTimeout);
            const query = this.value.trim();
            
            if (query.length < 2) {
                searchResults.classList.remove('show');
                return;
            }
            
            searchTimeout = setTimeout(() => {
                fetch(`/api/search?q=${encodeURIComponent(query)}`)
                    .then(response => response.json())
                    .then(data => {
                        displaySearchResults(data);
                    })
                    .catch(error => console.error('Search error:', error));
            }, 300);
        });
        
        // Hide search results when clicking outside
        document.addEventListener('click', function(e) {
            if (!searchInput.contains(e.target) && !searchResults.contains(e.target)) {
                searchResults.classList.remove('show');
            }
        });
    }
    
    function getImageUrl(imageUrl) {
        if (!imageUrl || imageUrl === '') {
            return 'https://via.placeholder.com/50x50?text=IMG';
        }
        if (imageUrl.startsWith('http') || imageUrl.startsWith('/')) {
            return imageUrl;
        }
        return `/static/${imageUrl}`; // ex: uploads/...
    }

    function displaySearchResults(results) {
        searchResults.innerHTML = '';
        
        if (results.length === 0) {
            searchResults.innerHTML = '<div class="p-3">Aucun résultat trouvé</div>';
        } else {
            results.forEach(product => {
                const item = document.createElement('a');
                item.href = `/product/${product.id}`;
                item.className = 'search-result-item d-flex align-items-center p-2 text-decoration-none text-dark';
                item.innerHTML = `
                    <img src="${getImageUrl(product.image_url)}" 
                         alt="${product.name}" width="50" height="50" class="me-3">
                    <div>
                        <div class="fw-bold">${product.name}</div>
                        <div class="text-muted">${product.price}€</div>
                    </div>
                `;
                searchResults.appendChild(item);
            });
        }
        
        searchResults.classList.add('show');
    }

    // Update cart quantity via AJAX
    function updateCartQuantity(input) {
        const itemId = input.dataset.itemId;
        const quantity = input.value;
        
        if (!itemId) return;
        
        fetch('/api/cart/update', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                item_id: itemId,
                quantity: quantity
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                updateCartTotal();
            }
        })
        .catch(error => console.error('Error updating cart:', error));
    }

    // Update cart total
    function updateCartTotal() {
        const cartItems = document.querySelectorAll('.cart-item');
        let total = 0;
        
        cartItems.forEach(item => {
            const price = parseFloat(item.dataset.price);
            const quantity = parseInt(item.querySelector('.quantity-input').value);
            const subtotal = price * quantity;
            
            item.querySelector('.item-subtotal').textContent = `${subtotal.toFixed(2)}€`;
            total += subtotal;
        });
        
        const totalElement = document.getElementById('cartTotal');
        if (totalElement) {
            totalElement.textContent = `${total.toFixed(2)}€`;
        }
    }

    // Image gallery for product detail page
    const galleryThumbnails = document.querySelectorAll('.gallery-thumbnail');
    const mainImage = document.getElementById('mainProductImage');
    
    galleryThumbnails.forEach(thumbnail => {
        thumbnail.addEventListener('click', function() {
            if (mainImage) {
                mainImage.src = this.dataset.fullImage;
                
                // Update active thumbnail
                galleryThumbnails.forEach(t => t.classList.remove('active'));
                this.classList.add('active');
            }
        });
    });

    // Filter products
    const filterCheckboxes = document.querySelectorAll('.filter-checkbox');
    filterCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', applyFilters);
    });
    
    function applyFilters() {
        const filters = {
            categories: [],
            prices: [],
            sizes: []
        };
        
        document.querySelectorAll('.filter-checkbox:checked').forEach(checkbox => {
            const filterType = checkbox.dataset.filterType;
            const filterValue = checkbox.value;
            
            if (filters[filterType]) {
                filters[filterType].push(filterValue);
            }
        });
        
        // Build query string
        const params = new URLSearchParams();
        Object.keys(filters).forEach(key => {
            if (filters[key].length > 0) {
                params.append(key, filters[key].join(','));
            }
        });
        
        // Reload page with filters
        window.location.href = `${window.location.pathname}?${params.toString()}`;
    }

    // Smooth scroll for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            const href = this.getAttribute('href');
            // Ignorer les liens avec juste "#"
            if (href === '#' || !href || href.length <= 1) {
                return;
            }
            e.preventDefault();
            const target = document.querySelector(href);
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });

    // Form validation
    const forms = document.querySelectorAll('.needs-validation');
    forms.forEach(form => {
        form.addEventListener('submit', function(event) {
            if (!form.checkValidity()) {
                event.preventDefault();
                event.stopPropagation();
            }
            form.classList.add('was-validated');
        });
    });

    // Product image zoom on hover
    const productImages = document.querySelectorAll('.product-card img');
    productImages.forEach(img => {
        img.addEventListener('mouseenter', function() {
            this.style.transform = 'scale(1.1)';
            this.style.transition = 'transform 0.3s ease';
        });
        
        img.addEventListener('mouseleave', function() {
            this.style.transform = 'scale(1)';
        });
    });

    // Admin: image file preview (add/edit product)
    const imageInput = document.getElementById('image');
    const imagePreview = document.getElementById('imagePreview');
    if (imageInput && imagePreview) {
        imageInput.addEventListener('change', function() {
            const file = this.files && this.files[0];
            if (!file) return;
            const objectUrl = URL.createObjectURL(file);
            imagePreview.src = objectUrl;
            imagePreview.onload = () => URL.revokeObjectURL(objectUrl);
        });
    }

    // Admin dashboard charts (if Chart.js is included)
    if (typeof Chart !== 'undefined') {
        const salesChartCanvas = document.getElementById('salesChart');
        if (salesChartCanvas) {
            new Chart(salesChartCanvas.getContext('2d'), {
                type: 'line',
                data: {
                    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
                    datasets: [{
                        label: 'Ventes',
                        data: [12, 19, 3, 5, 2, 3],
                        borderColor: 'rgb(255, 193, 7)',
                        backgroundColor: 'rgba(255, 193, 7, 0.1)',
                        tension: 0.1
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: {
                            position: 'top',
                        },
                        title: {
                            display: true,
                            text: 'Ventes Mensuelles'
                        }
                    }
                }
            });
        }
    }

    // Loading spinner removed - causes infinite loading issues

    // Add to cart animation
    const addToCartButtons = document.querySelectorAll('.add-to-cart-btn');
    addToCartButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            const icon = this.querySelector('i');
            if (icon) {
                icon.classList.add('animate__animated', 'animate__rubberBand');
                setTimeout(() => {
                    icon.classList.remove('animate__animated', 'animate__rubberBand');
                }, 1000);
            }
        });
    });
});

// Utility functions
function formatPrice(price) {
    return new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency: 'EUR'
    }).format(price);
}

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
