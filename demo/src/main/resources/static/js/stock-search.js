/**
 * stock-search.js — Ortak Hisse Arama ve Dropdown Yöneticisi
 */

const StockSearch = (function() {
    let allStocks = [];
    let isLoaded = false;

    // Tüm hisseleri backend'den yükle (sayfa açıldığında bir kez)
    async function loadStocks() {
        if (isLoaded) return;
        try {
            const res = await fetch('/api/market/stocks');
            const data = await res.json();
            if (data.durum === 'basarili' && data.hisseler) {
                allStocks = data.hisseler;
                isLoaded = true;
            }
        } catch (e) {
            console.error("Hisse listesi yüklenemedi:", e);
        }
    }

    // Başlangıçta yüklemeyi tetikle
    loadStocks();

    /**
     * Input ve Dropdown elementlerini birbirine bağlar ve olayları yönetir.
     * @param {Object} config Ayarlar
     * @param {string} config.inputId - Arama kutusunun ID'si
     * @param {string} config.dropdownId - Sonuçların listeleneceği div ID'si
     * @param {Function} config.onSelect - Bir hisse seçildiğinde çalışacak callback(symbol)
     */
    function setup(config) {
        const inputEl = document.getElementById(config.inputId);
        const dropdownEl = document.getElementById(config.dropdownId);
        
        if (!inputEl || !dropdownEl) return;

        let activeIndex = -1;
        let currentResults = [];

        // Dışarı tıklanınca dropdown'ı kapat
        document.addEventListener('click', (e) => {
            if (!inputEl.contains(e.target) && !dropdownEl.contains(e.target)) {
                dropdownEl.style.display = 'none';
            }
        });

        // Focus olunca eğer metin varsa aramayı tetikle
        inputEl.addEventListener('focus', () => {
            if (inputEl.value.trim().length > 0) {
                handleInput();
            }
        });

        // Yazarken arama yap
        inputEl.addEventListener('input', handleInput);

        function handleInput() {
            const q = inputEl.value.trim().toLocaleUpperCase('tr-TR');
            activeIndex = -1;

            if (q.length < 1) {
                dropdownEl.style.display = 'none';
                return;
            }

            // Hisseleri filtrele
            currentResults = allStocks.filter(h => 
                h.kod.toLocaleUpperCase('tr-TR').includes(q) || 
                h.ad.toLocaleUpperCase('tr-TR').includes(q)
            ).slice(0, 15); // En fazla 15 sonuç göster

            renderDropdown();
        }

        function renderDropdown() {
            dropdownEl.innerHTML = '';
            if (currentResults.length === 0) {
                dropdownEl.style.display = 'none';
                return;
            }

            dropdownEl.style.display = 'block';

            currentResults.forEach((h, index) => {
                const item = document.createElement('div');
                item.className = 'stock-dropdown-item';
                item.innerHTML = `
                    <span class="stock-dropdown-code">${escapeHtml(h.kod)}</span>
                    <span class="stock-dropdown-name">${escapeHtml(h.ad)}</span>
                `;
                
                // Fare ile üzerine gelme
                item.addEventListener('mouseenter', () => {
                    activeIndex = index;
                    updateActiveState();
                });

                // Seçim yapma
                item.addEventListener('click', () => {
                    selectItem(h.kod);
                });

                dropdownEl.appendChild(item);
            });
        }

        function updateActiveState() {
            const items = dropdownEl.querySelectorAll('.stock-dropdown-item');
            items.forEach((item, i) => {
                if (i === activeIndex) {
                    item.classList.add('active');
                    item.scrollIntoView({ block: 'nearest' });
                } else {
                    item.classList.remove('active');
                }
            });
        }

        function selectItem(symbol) {
            inputEl.value = symbol;
            dropdownEl.style.display = 'none';
            activeIndex = -1;
            if (typeof config.onSelect === 'function') {
                config.onSelect(symbol);
            }
        }

        // Klavye yönlendirmeleri
        inputEl.addEventListener('keydown', (e) => {
            if (dropdownEl.style.display !== 'block') {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    if (inputEl.value.trim() && typeof config.onSelect === 'function') {
                        config.onSelect(inputEl.value.trim().toLocaleUpperCase('tr-TR'));
                    }
                }
                return;
            }

            if (e.key === 'ArrowDown') {
                e.preventDefault();
                activeIndex = Math.min(activeIndex + 1, currentResults.length - 1);
                updateActiveState();
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                activeIndex = Math.max(activeIndex - 1, 0);
                updateActiveState();
            } else if (e.key === 'Enter') {
                e.preventDefault();
                if (activeIndex >= 0 && activeIndex < currentResults.length) {
                    selectItem(currentResults[activeIndex].kod);
                } else if (inputEl.value.trim() && typeof config.onSelect === 'function') {
                    config.onSelect(inputEl.value.trim().toLocaleUpperCase('tr-TR'));
                    dropdownEl.style.display = 'none';
                }
            } else if (e.key === 'Escape') {
                dropdownEl.style.display = 'none';
            }
        });
    }

    // escapeHtml (eğer globalde yoksa diye)
    function escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function getCompanyBySymbol(symbol) {
        if (!symbol) return symbol;
        const symStr = symbol.toLocaleUpperCase('tr-TR');
        const found = allStocks.find(s => s.kod.toLocaleUpperCase('tr-TR') === symStr);
        return found ? found.ad : symbol;
    }

    return {
        setup,
        getCompanyBySymbol
    };
})();
