// ======================================
// DEVIX Store Backend Server (Node.js)
// ======================================

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');
const DiscordWebhook = require('./webhook-handler');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public')); // مجلد الملفات الثابتة

// Initialize Discord Webhook
const webhook = new DiscordWebhook(process.env.DISCORD_WEBHOOK_URL);

// Initialize Email Transporter
const emailTransporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
    }
});

// ======================================
// Database (استخدم MongoDB أو MySQL في الإنتاج)
// ======================================

let users = [];
let orders = [];
let products = [
    { id: 1, name: 'لابتوب احترافي', price: 4999, stock: 10 },
    { id: 2, name: 'سماعات لاسلكية', price: 799, stock: 25 },
    { id: 3, name: 'ساعة ذكية برو', price: 1599, stock: 15 },
    // ... باقي المنتجات
];

// ======================================
// API Endpoints
// ======================================

// Home
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/index.html');
});

// Health Check
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        server: 'DEVIX Store API v1.0'
    });
});

// ======================================
// User Management
// ======================================

// Register User
app.post('/api/users/register', async (req, res) => {
    try {
        const { name, email, phone, password, discordId } = req.body;

        // Validation
        if (!name || !email || !phone || !password || !discordId) {
            return res.status(400).json({ 
                error: 'جميع الحقول مطلوبة' 
            });
        }

        // Check if user exists
        const existingUser = users.find(u => u.email === email);
        if (existingUser) {
            return res.status(409).json({ 
                error: 'البريد الإلكتروني مستخدم بالفعل' 
            });
        }

        // Create user
        const newUser = {
            id: Date.now(),
            name,
            email,
            phone,
            password: hashPassword(password),
            discordId,
            createdAt: new Date().toISOString()
        };

        users.push(newUser);

        // Send Discord notification
        await webhook.notifyNewUser({
            name,
            email,
            phone,
            discordId
        });

        // Send welcome email
        await sendWelcomeEmail(email, name);

        res.status(201).json({ 
            success: true,
            message: 'تم إنشاء الحساب بنجاح',
            user: {
                id: newUser.id,
                name: newUser.name,
                email: newUser.email
            }
        });

    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'حدث خطأ في التسجيل' });
    }
});

// Login User
app.post('/api/users/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = users.find(u => 
            u.email === email && 
            u.password === hashPassword(password)
        );

        if (!user) {
            return res.status(401).json({ 
                error: 'البريد أو كلمة المرور غير صحيحة' 
            });
        }

        res.json({ 
            success: true,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                discordId: user.discordId
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'حدث خطأ في تسجيل الدخول' });
    }
});

// ======================================
// Products Management
// ======================================

// Get All Products
app.get('/api/products', (req, res) => {
    res.json({ 
        success: true,
        products 
    });
});

// Get Single Product
app.get('/api/products/:id', (req, res) => {
    const product = products.find(p => p.id === parseInt(req.params.id));
    
    if (!product) {
        return res.status(404).json({ error: 'المنتج غير موجود' });
    }

    res.json({ 
        success: true,
        product 
    });
});

// Update Product Stock
app.patch('/api/products/:id/stock', (req, res) => {
    const { quantity } = req.body;
    const product = products.find(p => p.id === parseInt(req.params.id));
    
    if (!product) {
        return res.status(404).json({ error: 'المنتج غير موجود' });
    }

    product.stock += quantity;

    // Notify if out of stock
    if (product.stock <= 0) {
        webhook.notifyOutOfStock({
            id: product.id,
            name: product.name,
            price: product.price
        });
    }

    res.json({ 
        success: true,
        product 
    });
});

// ======================================
// Orders Management
// ======================================

// Create Order
app.post('/api/orders', async (req, res) => {
    try {
        const { userId, items, paymentMethod, cardDetails } = req.body;

        // Validate user
        const user = users.find(u => u.id === userId);
        if (!user) {
            return res.status(404).json({ error: 'المستخدم غير موجود' });
        }

        // Validate stock
        for (const item of items) {
            const product = products.find(p => p.id === item.id);
            if (!product || product.stock < item.quantity) {
                return res.status(400).json({ 
                    error: `المنتج ${product.name} غير متوفر بالكمية المطلوبة` 
                });
            }
        }

        // Calculate total
        const subtotal = items.reduce((sum, item) => {
            const product = products.find(p => p.id === item.id);
            return sum + (product.price * item.quantity);
        }, 0);

        const shippingCost = 50;
        const total = subtotal + shippingCost;

        // Process payment (integrate with real payment gateway)
        const paymentResult = await processPayment({
            amount: total,
            method: paymentMethod,
            cardDetails
        });

        if (!paymentResult.success) {
            // Notify payment failure
            await webhook.notifyPaymentFailure({
                customerName: user.name,
                email: user.email,
                amount: total,
                method: paymentMethod,
                errorMessage: paymentResult.error
            });

            return res.status(402).json({ 
                error: 'فشل الدفع: ' + paymentResult.error 
            });
        }

        // Create order
        const orderNumber = generateOrderNumber();
        const newOrder = {
            id: Date.now(),
            orderNumber,
            userId: user.id,
            items,
            subtotal,
            shippingCost,
            total,
            paymentMethod,
            transactionId: paymentResult.transactionId,
            status: 'processing',
            createdAt: new Date().toISOString()
        };

        orders.push(newOrder);

        // Update stock
        for (const item of items) {
            const product = products.find(p => p.id === item.id);
            product.stock -= item.quantity;
        }

        // Send Discord notification
        await webhook.notifyNewOrder({
            orderNumber,
            customer: {
                name: user.name,
                email: user.email,
                phone: user.phone,
                discordId: user.discordId
            },
            items: items.map(item => {
                const product = products.find(p => p.id === item.id);
                return {
                    name: product.name,
                    quantity: item.quantity,
                    price: product.price
                };
            }),
            total,
            paymentMethod
        });

        // Send confirmation email
        await sendOrderConfirmationEmail(user.email, user.name, newOrder);

        // Notify successful payment
        await webhook.notifyPaymentSuccess({
            transactionId: paymentResult.transactionId,
            amount: total,
            method: paymentMethod,
            customerId: user.discordId,
            orderNumber
        });

        res.status(201).json({ 
            success: true,
            message: 'تم إنشاء الطلب بنجاح',
            order: {
                orderNumber,
                total,
                status: 'processing'
            }
        });

    } catch (error) {
        console.error('Order creation error:', error);
        res.status(500).json({ error: 'حدث خطأ في إنشاء الطلب' });
    }
});

// Get User Orders
app.get('/api/users/:userId/orders', (req, res) => {
    const userOrders = orders.filter(o => o.userId === parseInt(req.params.userId));
    
    res.json({ 
        success: true,
        orders: userOrders 
    });
});

// Get Order by Number
app.get('/api/orders/:orderNumber', (req, res) => {
    const order = orders.find(o => o.orderNumber === req.params.orderNumber);
    
    if (!order) {
        return res.status(404).json({ error: 'الطلب غير موجود' });
    }

    res.json({ 
        success: true,
        order 
    });
});

// Update Order Status
app.patch('/api/orders/:orderNumber/status', async (req, res) => {
    const { status } = req.body;
    const order = orders.find(o => o.orderNumber === req.params.orderNumber);
    
    if (!order) {
        return res.status(404).json({ error: 'الطلب غير موجود' });
    }

    order.status = status;
    order.updatedAt = new Date().toISOString();

    // Get user
    const user = users.find(u => u.id === order.userId);

    // Send notification
    await webhook.notifyOrderStatus(
        order.orderNumber,
        status,
        user.discordId
    );

    res.json({ 
        success: true,
        order 
    });
});

// ======================================
// Support Messages
// ======================================

app.post('/api/support', async (req, res) => {
    try {
        const { name, email, phone, type, message } = req.body;

        // Send to Discord
        await webhook.notifySupportMessage({
            name,
            email,
            phone,
            type,
            message
        });

        res.json({ 
            success: true,
            message: 'تم إرسال رسالتك بنجاح' 
        });

    } catch (error) {
        console.error('Support message error:', error);
        res.status(500).json({ error: 'حدث خطأ في إرسال الرسالة' });
    }
});

// ======================================
// Reports
// ======================================

app.get('/api/reports/daily', async (req, res) => {
    const today = new Date().toDateString();
    const todayOrders = orders.filter(o => 
        new Date(o.createdAt).toDateString() === today
    );

    const report = {
        totalOrders: todayOrders.length,
        totalRevenue: todayOrders.reduce((sum, o) => sum + o.total, 0),
        completedOrders: todayOrders.filter(o => o.status === 'delivered').length,
        pendingOrders: todayOrders.filter(o => o.status === 'processing').length,
        cancelledOrders: todayOrders.filter(o => o.status === 'cancelled').length,
        newCustomers: users.filter(u => 
            new Date(u.createdAt).toDateString() === today
        ).length
    };

    // Send to Discord
    await webhook.sendDailyReport(report);

    res.json({ 
        success: true,
        report 
    });
});

// ======================================
// Helper Functions
// ======================================

function hashPassword(password) {
    // استخدم bcrypt في الإنتاج
    return Buffer.from(password).toString('base64');
}

function generateOrderNumber() {
    return 'DX' + Date.now().toString(36).toUpperCase() + 
           Math.random().toString(36).substr(2, 5).toUpperCase();
}

async function processPayment(paymentData) {
    // هنا يتم التكامل مع بوابة الدفع الحقيقية
    // مثل Stripe, PayTabs, Moyasar, إلخ
    
    // للتجربة:
    return {
        success: true,
        transactionId: 'TXN_' + Date.now()
    };
    
    /*
    // مثال مع Stripe:
    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    
    try {
        const paymentIntent = await stripe.paymentIntents.create({
            amount: paymentData.amount * 100, // بالهللات
            currency: 'sar',
            payment_method_types: ['card'],
        });
        
        return {
            success: true,
            transactionId: paymentIntent.id
        };
    } catch (error) {
        return {
            success: false,
            error: error.message
        };
    }
    */
}

async function sendWelcomeEmail(to, name) {
    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: to,
        subject: 'مرحباً بك في DEVIX Store 🎉',
        html: `
            <!DOCTYPE html>
            <html dir="rtl">
            <head>
                <style>
                    body { font-family: Arial, sans-serif; background: #f5f5f5; }
                    .container { max-width: 600px; margin: 0 auto; background: white; padding: 40px; }
                    .header { text-align: center; color: #0ea5e9; }
                    .content { margin: 30px 0; }
                    .footer { text-align: center; color: #94a3b8; margin-top: 40px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>⚡ DEVIX Store</h1>
                    </div>
                    <div class="content">
                        <h2>مرحباً ${name}!</h2>
                        <p>نشكرك على التسجيل في متجر DEVIX الإلكتروني.</p>
                        <p>يمكنك الآن الاستمتاع بتجربة تسوق فريدة ومتطورة.</p>
                        <p>ميزات حسابك:</p>
                        <ul>
                            <li>✅ متابعة طلباتك</li>
                            <li>✅ عروض حصرية</li>
                            <li>✅ إشعارات Discord</li>
                            <li>✅ دعم فني 24/7</li>
                        </ul>
                    </div>
                    <div class="footer">
                        <p>&copy; 2024 DEVIX Store. جميع الحقوق محفوظة</p>
                    </div>
                </div>
            </body>
            </html>
        `
    };

    try {
        await emailTransporter.sendMail(mailOptions);
        console.log('Welcome email sent to:', to);
    } catch (error) {
        console.error('Email error:', error);
    }
}

async function sendOrderConfirmationEmail(to, name, order) {
    const itemsList = order.items.map(item => {
        const product = products.find(p => p.id === item.id);
        return `<li>${product.name} (×${item.quantity}) - ${(product.price * item.quantity).toLocaleString()} ريال</li>`;
    }).join('');

    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: to,
        subject: `تأكيد الطلب #${order.orderNumber}`,
        html: `
            <!DOCTYPE html>
            <html dir="rtl">
            <head>
                <style>
                    body { font-family: Arial, sans-serif; background: #f5f5f5; }
                    .container { max-width: 600px; margin: 0 auto; background: white; padding: 40px; }
                    .header { text-align: center; color: #0ea5e9; }
                    .order-number { background: #0ea5e9; color: white; padding: 15px; text-align: center; border-radius: 10px; }
                    .content { margin: 30px 0; }
                    .total { font-size: 24px; color: #0ea5e9; font-weight: bold; }
                    .footer { text-align: center; color: #94a3b8; margin-top: 40px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>✅ تم استلام طلبك</h1>
                    </div>
                    <div class="order-number">
                        <h2>رقم الطلب: #${order.orderNumber}</h2>
                    </div>
                    <div class="content">
                        <h3>شكراً لك ${name}!</h3>
                        <p>تم استلام طلبك بنجاح وسيتم معالجته قريباً.</p>
                        <h3>📦 تفاصيل الطلب:</h3>
                        <ul>${itemsList}</ul>
                        <p>رسوم الشحن: ${order.shippingCost} ريال</p>
                        <p class="total">المجموع الكلي: ${order.total.toLocaleString()} ريال</p>
                        <p>طريقة الدفع: ${order.paymentMethod.toUpperCase()}</p>
                        <p>رقم المعاملة: ${order.transactionId}</p>
                    </div>
                    <div class="footer">
                        <p>سيتم إرسال إشعار على Discord عند شحن طلبك</p>
                        <p>&copy; 2024 DEVIX Store</p>
                    </div>
                </div>
            </body>
            </html>
        `
    };

    try {
        await emailTransporter.sendMail(mailOptions);
        console.log('Order confirmation email sent to:', to);
    } catch (error) {
        console.error('Email error:', error);
    }
}

// ======================================
// Error Handler
// ======================================

app.use((err, req, res, next) => {
    console.error('Server error:', err);
    
    // Send error to Discord
    webhook.notifySystemError({
        type: err.name,
        message: err.message,
        location: req.path,
        stack: err.stack
    });

    res.status(500).json({ 
        error: 'حدث خطأ في الخادم' 
    });
});

// ======================================
// Start Server
// ======================================

app.listen(PORT, () => {
    console.log(`
    ╔════════════════════════════════════╗
    ║  🚀 DEVIX Store Server Running    ║
    ║  📡 Port: ${PORT}                     ║
    ║  🌐 http://localhost:${PORT}         ║
    ╚════════════════════════════════════╝
    `);
});

// ======================================
// Scheduled Tasks (Optional)
// ======================================

// Send daily report at midnight
const cron = require('node-cron');

cron.schedule('0 0 * * *', async () => {
    console.log('Sending daily report...');
    
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toDateString();
    
    const yesterdayOrders = orders.filter(o => 
        new Date(o.createdAt).toDateString() === yesterdayStr
    );

    const report = {
        totalOrders: yesterdayOrders.length,
        totalRevenue: yesterdayOrders.reduce((sum, o) => sum + o.total, 0),
        completedOrders: yesterdayOrders.filter(o => o.status === 'delivered').length,
        pendingOrders: yesterdayOrders.filter(o => o.status === 'processing').length,
        cancelledOrders: yesterdayOrders.filter(o => o.status === 'cancelled').length,
        newCustomers: users.filter(u => 
            new Date(u.createdAt).toDateString() === yesterdayStr
        ).length
    };

    await webhook.sendDailyReport(report);
});

module.exports = app;
