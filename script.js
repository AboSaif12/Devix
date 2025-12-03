// ======================================
// DEVIX Store - Main Script
// ======================================

// Configuration
const CONFIG = {
    DISCORD_WEBHOOK: 'https://discord.com/api/webhooks/1445065848439046164/mwuT8NHrs5Ap2IEbP9hdL0lc0njJYf81VzSgw5SHvDeV30VlOQhSSTlgXxh-OktrYuZ5', // ضع رابط الـ webhook هنا
    EMAIL_SERVICE: 'YOUR_EMAIL_SERVICE_API', // خدمة البريد الإلكتروني
    SHIPPING_COST: 50
};

// State Management
let cart = [];
let currentUser = null;
let discordLinked = false;
let selectedPaymentMethod = 'visa';

// Products Data
const products = [
    {
        id: 1,
        name: 'لابتوب احترافي',
        price: 4999,
        emoji: '💻',
        desc: 'أحدث معالج، شاشة 4K، أداء خرافي للمحترفين',
        badge: 'الأكثر مبيعاً'
    },
    {
        id: 2,
        name: 'سماعات لاسلكية',
        price: 799,
        emoji: '🎧',
        desc: 'إلغاء الضوضاء، صوت نقي، بطارية 30 ساعة',
        badge: 'عرض خاص'
    },
    {
        id: 3,
        name: 'ساعة ذكية برو',
        price: 1599,
        emoji: '⌚',
        desc: 'تتبع صحي متقدم، GPS، مقاومة للماء',
        badge: 'جديد'
    },
    {
        id: 4,
        name: 'كاميرا احترافية 4K',
        price: 3299,
        emoji: '📷',
        desc: 'دقة 4K، 60 إطار، عدسات قابلة للتبديل',
        badge: null
    },
    {
        id: 5,
        name: 'لوحة مفاتيح ميكانيكية',
        price: 899,
        emoji: '⌨️',
        desc: 'RGB قابل للتخصيص، مفاتيح ميكانيكية عالية الجودة',
        badge: null
    },
    {
        id: 6,
        name: 'شاشة منحنية 4K',
        price: 2499,
        emoji: '🖥️',
        desc: '144Hz، HDR، تصميم بدون حواف',
        badge: 'الأكثر طلباً'
    },
    {
        id: 7,
        name: 'ماوس احترافي للألعاب',
        price: 599,
        emoji: '🖱️',
        desc: 'حساس دقيق، إضاءة RGB، 8 أزرار قابلة للبرمجة',
        badge: null
    },
    {
        id: 8,
        name: 'هاتف ذكي فلاجشيب',
        price: 3999,
        emoji: '📱',
        desc: 'شاشة AMOLED، كاميرا 108MP، شحن سريع',
        badge: 'جديد'
    },
    {
        id: 9,
        name: 'سماعة VR',
        price: 2199,
        emoji: '🥽',
        desc: 'واقع افتراضي غامر، تتبع حركة متقدم',
        badge: null
    }
];

// ======================================
// Initialization
// ======================================

function init() {
    displayProducts();
    loadUserData();
    updateCartUI();
    setupEventListeners();
}

function setupEventListeners() {
    // Register Form
    document.getElementById('registerForm').addEventListener('submit', handleRegister);
    
    // Login Form
    document.getElementById('loginForm').addEventListener('submit', handleLogin);
    
    // Payment Form
    document.getElementById('paymentForm').addEventListener('submit', handlePayment);
    
    // Card Number Formatting
    document.getElementById('cardNumber').addEventListener('input', formatCardNumber);
    document.getElementById('cardExpiry').addEventListener('input', formatExpiry);
}

// ======================================
// Products Display
// ======================================

function displayProducts() {
    const grid = document.getElementById('productsGrid');
    grid.innerHTML = products.map(p => `
        <div class="product-card">
            <div class="product-image">
                ${p.badge ? `<span class="product-badge">${p.badge}</span>` : ''}
                ${p.emoji}
            </div>
            <h3 class="product-title">${p.name}</h3>
            <p class="product-desc">${p.desc}</p>
            <div class="product-price">${p.price.toLocaleString()} ريال</div>
            <button class="add-to-cart" onclick="addToCart(${p.id})">
                <i class="fas fa-cart-plus"></i>
                إضافة للسلة
            </button>
        </div>
    `).join('');
}

// ======================================
// Cart Management
// ======================================

function addToCart(productId) {
    const product = products.find(p => p.id === productId);
    const existingItem = cart.find(item => item.id === productId);
    
    if (existingItem) {
        existingItem.quantity++;
    } else {
        cart.push({ ...product, quantity: 1 });
    }
    
    updateCartUI();
    saveCartData();
    showToast('✅ تمت الإضافة للسلة بنجاح!');
}

function removeFromCart(productId) {
    cart = cart.filter(item => item.id !== productId);
    updateCartUI();
    saveCartData();
    showToast('🗑️ تم الحذف من السلة');
}

function updateQuantity(productId, change) {
    const item = cart.find(item => item.id === productId);
    if (item) {
        item.quantity += change;
        if (item.quantity <= 0) {
            removeFromCart(productId);
        } else {
            updateCartUI();
            saveCartData();
        }
    }
}

function updateCartUI() {
    const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
    document.querySelector('.cart-count').textContent = cartCount;
    
    const cartItems = document.getElementById('cartItems');
    
    if (cart.length === 0) {
        cartItems.innerHTML = `
            <div style="text-align: center; padding: 3rem; color: var(--text-secondary);">
                <i class="fas fa-shopping-cart" style="font-size: 5rem; margin-bottom: 1rem; opacity: 0.3;"></i>
                <p style="font-size: 1.3rem;">السلة فارغة</p>
            </div>
        `;
    } else {
        cartItems.innerHTML = cart.map(item => `
            <div class="cart-item">
                <div class="cart-item-info">
                    <h4>${item.name}</h4>
                    <div class="cart-item-details">
                        <div style="display: flex; align-items: center; gap: 1rem; margin-top: 0.5rem;">
                            <button onclick="updateQuantity(${item.id}, -1)" style="background: rgba(239, 68, 68, 0.2); border: none; color: #ef4444; width: 30px; height: 30px; border-radius: 50%; cursor: pointer; font-size: 1.2rem;">-</button>
                            <span style="font-size: 1.1rem; font-weight: 600;">الكمية: ${item.quantity}</span>
                            <button onclick="updateQuantity(${item.id}, 1)" style="background: rgba(16, 185, 129, 0.2); border: none; color: #10b981; width: 30px; height: 30px; border-radius: 50%; cursor: pointer; font-size: 1.2rem;">+</button>
                        </div>
                    </div>
                </div>
                <div>
                    <div class="cart-item-price">${(item.price * item.quantity).toLocaleString()} ريال</div>
                    <button class="remove-btn" onclick="removeFromCart(${item.id})">
                        <i class="fas fa-trash"></i> حذف
                    </button>
                </div>
            </div>
        `).join('');
    }
    
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const total = subtotal + CONFIG.SHIPPING_COST;
    
    document.getElementById('subtotal').textContent = `${subtotal.toLocaleString()} ريال`;
    document.getElementById('cartTotal').textContent = `${total.toLocaleString()} ريال`;
    document.getElementById('paymentAmount').textContent = total.toLocaleString();
}

function toggleCart() {
    document.getElementById('cartModal').classList.toggle('active');
}

function proceedToCheckout() {
    if (cart.length === 0) {
        showToast('⚠️ السلة فارغة!', 'warning');
        return;
    }
    
    if (!currentUser) {
        showToast('⚠️ يرجى تسجيل الدخول أولاً', 'warning');
        toggleCart();
        openAuthModal();
        return;
    }
    
    if (!discordLinked) {
        showToast('⚠️ يجب ربط حساب Discord للمتابعة', 'warning');
        toggleCart();
        openAuthModal();
        return;
    }
    
    toggleCart();
    openPaymentModal();
}

// ======================================
// Authentication
// ======================================

function openAuthModal() {
    document.getElementById('authModal').classList.add('active');
}

function closeAuthModal() {
    document.getElementById('authModal').classList.remove('active');
}

function switchTab(tab) {
    const tabs = document.querySelectorAll('.tab-btn');
    tabs.forEach(t => t.classList.remove('active'));
    
    if (tab === 'register') {
        tabs[0].classList.add('active');
        document.getElementById('registerForm').style.display = 'flex';
        document.getElementById('loginForm').style.display = 'none';
        document.getElementById('authTitle').innerHTML = '<i class="fas fa-user-plus"></i> إنشاء حساب';
    } else {
        tabs[1].classList.add('active');
        document.getElementById('registerForm').style.display = 'none';
        document.getElementById('loginForm').style.display = 'flex';
        document.getElementById('authTitle').innerHTML = '<i class="fas fa-sign-in-alt"></i> تسجيل الدخول';
    }
}

async function handleRegister(e) {
    e.preventDefault();
    
    const name = document.getElementById('regName').value;
    const email = document.getElementById('regEmail').value;
    const phone = document.getElementById('regPhone').value;
    const password = document.getElementById('regPassword').value;
    
    if (!discordLinked) {
        showToast('⚠️ يجب ربط حساب Discord أولاً', 'warning');
        return;
    }
    
    // Validate
    if (!validateEmail(email)) {
        showToast('❌ البريد الإلكتروني غير صحيح', 'error');
        return;
    }
    
    if (!validatePhone(phone)) {
        showToast('❌ رقم الجوال غير صحيح', 'error');
        return;
    }
    
    const userData = {
        name,
        email,
        phone,
        password: hashPassword(password),
        discordId: discordLinked,
        registeredAt: new Date().toISOString()
    };
    
    // Save user data
    localStorage.setItem('devix_user', JSON.stringify(userData));
    currentUser = userData;
    
    // Send notification to Discord
    await sendDiscordNotification({
        title: '🎉 تسجيل مستخدم جديد',
        description: `تم تسجيل مستخدم جديد في DEVIX Store`,
        fields: [
            { name: '👤 الاسم', value: name },
            { name: '📧 البريد', value: email },
            { name: '📱 الجوال', value: phone },
            { name: '🎮 Discord', value: `<@${discordLinked}>` }
        ],
        color: 3447003
    });
    
    // Send welcome email
    await sendEmail({
        to: email,
        subject: 'مرحباً بك في DEVIX Store',
        body: `
            <h2>مرحباً ${name}!</h2>
            <p>نشكرك على التسجيل في متجر DEVIX</p>
            <p>يمكنك الآن الاستمتاع بتجربة تسوق فريدة ومتطورة</p>
        `
    });
    
    updateAccountButton();
    closeAuthModal();
    showToast('✅ تم إنشاء الحساب بنجاح!');
}

async function handleLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    
    const savedUser = JSON.parse(localStorage.getItem('devix_user'));
    
    if (!savedUser) {
        showToast('❌ المستخدم غير موجود', 'error');
        return;
    }
    
    if (savedUser.email === email && savedUser.password === hashPassword(password)) {
        currentUser = savedUser;
        discordLinked = savedUser.discordId;
        
        updateAccountButton();
        closeAuthModal();
        showToast('✅ تم تسجيل الدخول بنجاح!');
    } else {
        showToast('❌ البريد أو كلمة المرور غير صحيحة', 'error');
    }
}

function updateAccountButton() {
    const btn = document.getElementById('accountBtn');
    if (currentUser) {
        btn.innerHTML = `
            <i class="fas fa-user-check"></i>
            <span>${currentUser.name}</span>
        `;
        btn.onclick = logout;
    }
}

function logout() {
    if (confirm('هل تريد تسجيل الخروج؟')) {
        currentUser = null;
        discordLinked = false;
        const btn = document.getElementById('accountBtn');
        btn.innerHTML = `
            <i class="fas fa-user"></i>
            <span>تسجيل الدخول</span>
        `;
        btn.onclick = openAuthModal;
        showToast('✅ تم تسجيل الخروج');
    }
}

// ======================================
// Discord Integration
// ======================================

function connectDiscord(context) {
    // Simulate Discord OAuth
    const mockDiscordId = `DISCORD_${Math.random().toString(36).substr(2, 9)}`;
    discordLinked = mockDiscordId;
    
    const statusElement = document.getElementById(context === 'register' ? 'discordStatusReg' : 'discordStatusLogin');
    if (statusElement) {
        statusElement.textContent = '✅ تم الربط بنجاح';
        statusElement.classList.add('connected');
    }
    
    showToast('✅ تم ربط Discord بنجاح!');
    
    // In production, use real Discord OAuth:
    window.location.href = `https://discord.com/api/oauth2/authorize?client_id=1377336841929232494&redirect_uri=${encodeURIComponent(window.location.origin)}&response_type=code&scope=identify`;
}

async function sendDiscordNotification(data) {
    if (!CONFIG.DISCORD_WEBHOOK || CONFIG.DISCORD_WEBHOOK === 'https://discord.com/api/webhooks/1445065848439046164/mwuT8NHrs5Ap2IEbP9hdL0lc0njJYf81VzSgw5SHvDeV30VlOQhSSTlgXxh-OktrYuZ5') {
        console.log('Discord Webhook:', data);
        return;
    }
    
    try {
        await fetch(CONFIG.DISCORD_WEBHOOK, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                embeds: [{
                    title: data.title,
                    description: data.description,
                    fields: data.fields,
                    color: data.color,
                    timestamp: new Date().toISOString(),
                    footer: { text: 'DEVIX Store' }
                }]
            })
        });
    } catch (error) {
        console.error('Discord notification error:', error);
    }
}

// ======================================
// Payment Processing
// ======================================

function openPaymentModal() {
    document.getElementById('paymentModal').classList.add('active');
}

function closePaymentModal() {
    document.getElementById('paymentModal').classList.remove('active');
    document.getElementById('paymentFormContainer').style.display = 'block';
    document.getElementById('paymentSuccess').style.display = 'none';
    document.getElementById('paymentForm').reset();
}

function selectPaymentMethod(method) {
    selectedPaymentMethod = method;
    document.querySelectorAll('.payment-method-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.closest('.payment-method-btn').classList.add('active');
}

async function handlePayment(e) {
    e.preventDefault();
    
    const cardNumber = document.getElementById('cardNumber').value;
    const cardName = document.getElementById('cardName').value;
    const cardExpiry = document.getElementById('cardExpiry').value;
    const cardCVV = document.getElementById('cardCVV').value;
    
    if (!validateCardNumber(cardNumber)) {
        showToast('❌ رقم البطاقة غير صحيح', 'error');
        return;
    }
    
    if (!validateExpiry(cardExpiry)) {
        showToast('❌ تاريخ الانتهاء غير صحيح', 'error');
        return;
    }
    
    if (!validateCVV(cardCVV)) {
        showToast('❌ CVV غير صحيح', 'error');
        return;
    }
    
    // Show loading
    showToast('⏳ جاري معالجة الدفع...', 'info');
    
    // Simulate payment processing
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const orderNumber = generateOrderNumber();
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const total = subtotal + CONFIG.SHIPPING_COST;
    
    // Send order notification to Discord
    await sendDiscordNotification({
        title: '🛒 طلب جديد',
        description: `تم استلام طلب جديد #${orderNumber}`,
        fields: [
            { name: '👤 العميل', value: currentUser.name },
            { name: '📧 البريد', value: currentUser.email },
            { name: '📱 الجوال', value: currentUser.phone },
            { name: '💰 المبلغ', value: `${total.toLocaleString()} ريال` },
            { name: '📦 المنتجات', value: cart.map(item => `${item.name} (×${item.quantity})`).join('\n') },
            { name: '💳 طريقة الدفع', value: selectedPaymentMethod.toUpperCase() },
            { name: '🎮 Discord', value: `<@${currentUser.discordId}>` }
        ],
        color: 5763719
    });
    
    // Send confirmation email
    await sendEmail({
        to: currentUser.email,
        subject: `تأكيد الطلب #${orderNumber}`,
        body: `
            <h2>شكراً لك ${currentUser.name}!</h2>
            <p>تم استلام طلبك بنجاح</p>
            <h3>تفاصيل الطلب:</h3>
            <ul>
                ${cart.map(item => `<li>${item.name} (×${item.quantity}) - ${(item.price * item.quantity).toLocaleString()} ريال</li>`).join('')}
            </ul>
            <p><strong>المجموع: ${total.toLocaleString()} ريال</strong></p>
            <p>رقم الطلب: ${orderNumber}</p>
        `
    });
    
    // Show success
    document.getElementById('paymentFormContainer').style.display = 'none';
    document.getElementById('paymentSuccess').style.display = 'block';
    document.getElementById('orderNumber').textContent = orderNumber;
    
    // Clear cart
    cart = [];
    updateCartUI();
    saveCartData();
}

function closePaymentSuccess() {
    closePaymentModal();
    showToast('✅ شكراً لك! تم استلام طلبك');
}

// ======================================
// Email Service
// ======================================

async function sendEmail(data) {
    // In production, integrate with a real email service like SendGrid, Mailgun, etc.
    console.log('Email sent:', data);
    
    // Example with a real service:
    /*
    try {
        await fetch('https://your-email-service-api.com/send', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${CONFIG.EMAIL_SERVICE}`
            },
            body: JSON.stringify(data)
        });
    } catch (error) {
        console.error('Email error:', error);
    }
    */
}

// ======================================
// Utilities
// ======================================

function validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validatePhone(phone) {
    return /^05\d{8}$/.test(phone);
}

function validateCardNumber(number) {
    return /^\d{4}\s\d{4}\s\d{4}\s\d{4}$/.test(number);
}

function validateExpiry(expiry) {
    const [month, year] = expiry.split('/');
    const currentYear = new Date().getFullYear() % 100;
    const currentMonth = new Date().getMonth() + 1;
    
    return month >= 1 && month <= 12 && 
           (year > currentYear || (year == currentYear && month >= currentMonth));
}

function validateCVV(cvv) {
    return /^\d{3}$/.test(cvv);
}

function formatCardNumber(e) {
    let value = e.target.value.replace(/\s/g, '');
    let formattedValue = value.match(/.{1,4}/g)?.join(' ') || value;
    e.target.value = formattedValue;
}

function formatExpiry(e) {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length >= 2) {
        value = value.slice(0, 2) + '/' + value.slice(2, 4);
    }
    e.target.value = value;
}

function hashPassword(password) {
    // Simple hash for demo - use bcrypt or similar in production
    return btoa(password);
}

function generateOrderNumber() {
    return 'DX' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).substr(2, 5).toUpperCase();
}

function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast show ${type}`;
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

function scrollToProducts() {
    document.getElementById('products').scrollIntoView({ behavior: 'smooth' });
}

// ======================================
// Local Storage
// ======================================

function saveCartData() {
    localStorage.setItem('devix_cart', JSON.stringify(cart));
}

function loadCartData() {
    const saved = localStorage.getItem('devix_cart');
    if (saved) {
        cart = JSON.parse(saved);
        updateCartUI();
    }
}

function loadUserData() {
    const savedUser = localStorage.getItem('devix_user');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        discordLinked = currentUser.discordId;
        updateAccountButton();
    }
}

// ======================================
// Initialize on page load
// ======================================

document.addEventListener('DOMContentLoaded', () => {
    init();
    loadCartData();
});
