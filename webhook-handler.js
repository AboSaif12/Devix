// ======================================
// Discord Webhook Handler
// ======================================

/**
 * هذا الملف يحتوي على جميع دوال معالجة الإشعارات عبر Discord
 * يمكن استخدامه في الـ Backend (Node.js) أو مباشرة في Frontend
 */

class DiscordWebhook {
    constructor(webhookUrl) {
        this.webhookUrl = webhookUrl;
        this.colors = {
            success: 5763719,  // أخضر
            info: 3447003,     // أزرق
            warning: 16776960, // أصفر
            error: 15548997,   // أحمر
            order: 15844367    // ذهبي
        };
    }

    /**
     * إرسال إشعار عام
     */
    async send(options) {
        try {
            const response = await fetch(this.webhookUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    username: options.username || 'DEVIX Store',
                    avatar_url: options.avatar || 'https://i.imgur.com/your-logo.png',
                    embeds: [{
                        title: options.title,
                        description: options.description,
                        color: options.color || this.colors.info,
                        fields: options.fields || [],
                        thumbnail: options.thumbnail,
                        image: options.image,
                        footer: {
                            text: options.footer || 'DEVIX Store © 2024',
                            icon_url: 'https://i.imgur.com/your-icon.png'
                        },
                        timestamp: new Date().toISOString()
                    }]
                })
            });

            if (!response.ok) {
                throw new Error(`Webhook failed: ${response.status}`);
            }

            return { success: true };
        } catch (error) {
            console.error('Discord Webhook Error:', error);
            return { success: false, error };
        }
    }

    /**
     * إشعار تسجيل مستخدم جديد
     */
    async notifyNewUser(userData) {
        return this.send({
            title: '🎉 مستخدم جديد',
            description: 'تم تسجيل مستخدم جديد في DEVIX Store',
            color: this.colors.success,
            fields: [
                { name: '👤 الاسم', value: userData.name, inline: true },
                { name: '📧 البريد', value: userData.email, inline: true },
                { name: '📱 الجوال', value: userData.phone, inline: true },
                { name: '🎮 Discord ID', value: userData.discordId ? `<@${userData.discordId}>` : 'غير مربوط', inline: true },
                { name: '📅 تاريخ التسجيل', value: new Date().toLocaleString('ar-SA'), inline: false }
            ],
            thumbnail: {
                url: 'https://i.imgur.com/user-icon.png'
            }
        });
    }

    /**
     * إشعار طلب جديد
     */
    async notifyNewOrder(orderData) {
        const productsText = orderData.items.map(item => 
            `• ${item.name} (×${item.quantity}) - ${(item.price * item.quantity).toLocaleString()} ريال`
        ).join('\n');

        return this.send({
            title: '🛒 طلب جديد',
            description: `**رقم الطلب:** #${orderData.orderNumber}`,
            color: this.colors.order,
            fields: [
                { name: '👤 العميل', value: orderData.customer.name, inline: true },
                { name: '📧 البريد', value: orderData.customer.email, inline: true },
                { name: '📱 الجوال', value: orderData.customer.phone, inline: true },
                { name: '🎮 Discord', value: `<@${orderData.customer.discordId}>`, inline: true },
                { name: '💰 المبلغ الإجمالي', value: `${orderData.total.toLocaleString()} ريال`, inline: true },
                { name: '💳 طريقة الدفع', value: orderData.paymentMethod.toUpperCase(), inline: true },
                { name: '📦 المنتجات', value: productsText, inline: false },
                { name: '📍 حالة الطلب', value: '⏳ قيد المعالجة', inline: false }
            ],
            thumbnail: {
                url: 'https://i.imgur.com/order-icon.png'
            }
        });
    }

    /**
     * إشعار تحديث حالة الطلب
     */
    async notifyOrderStatus(orderNumber, status, customerId) {
        const statusEmojis = {
            'processing': '⏳',
            'confirmed': '✅',
            'shipped': '🚚',
            'delivered': '📦',
            'cancelled': '❌'
        };

        const statusTexts = {
            'processing': 'قيد المعالجة',
            'confirmed': 'تم التأكيد',
            'shipped': 'تم الشحن',
            'delivered': 'تم التوصيل',
            'cancelled': 'ملغي'
        };

        return this.send({
            title: `${statusEmojis[status]} تحديث حالة الطلب`,
            description: `تم تحديث حالة الطلب #${orderNumber}`,
            color: status === 'delivered' ? this.colors.success : this.colors.info,
            fields: [
                { name: 'رقم الطلب', value: `#${orderNumber}`, inline: true },
                { name: 'الحالة الجديدة', value: statusTexts[status], inline: true },
                { name: 'العميل', value: `<@${customerId}>`, inline: true }
            ]
        });
    }

    /**
     * إشعار رسالة دعم فني
     */
    async notifySupportMessage(messageData) {
        return this.send({
            title: '💬 رسالة دعم فني جديدة',
            description: messageData.message,
            color: this.colors.warning,
            fields: [
                { name: '👤 المرسل', value: messageData.name, inline: true },
                { name: '📧 البريد', value: messageData.email, inline: true },
                { name: '📱 الجوال', value: messageData.phone || 'غير متوفر', inline: true },
                { name: '🏷️ نوع المشكلة', value: messageData.type, inline: true },
                { name: '⏰ الوقت', value: new Date().toLocaleString('ar-SA'), inline: true }
            ]
        });
    }

    /**
     * إشعار دفع ناجح
     */
    async notifyPaymentSuccess(paymentData) {
        return this.send({
            title: '💳 دفع ناجح',
            description: 'تمت عملية الدفع بنجاح',
            color: this.colors.success,
            fields: [
                { name: '🆔 رقم المعاملة', value: paymentData.transactionId, inline: true },
                { name: '💰 المبلغ', value: `${paymentData.amount.toLocaleString()} ريال`, inline: true },
                { name: '💳 الطريقة', value: paymentData.method, inline: true },
                { name: '👤 العميل', value: `<@${paymentData.customerId}>`, inline: true },
                { name: '📦 رقم الطلب', value: `#${paymentData.orderNumber}`, inline: true }
            ]
        });
    }

    /**
     * إشعار فشل الدفع
     */
    async notifyPaymentFailure(failureData) {
        return this.send({
            title: '⚠️ فشل عملية الدفع',
            description: failureData.reason,
            color: this.colors.error,
            fields: [
                { name: '👤 العميل', value: failureData.customerName, inline: true },
                { name: '📧 البريد', value: failureData.email, inline: true },
                { name: '💰 المبلغ', value: `${failureData.amount.toLocaleString()} ريال`, inline: true },
                { name: '💳 الطريقة', value: failureData.method, inline: true },
                { name: '❌ سبب الفشل', value: failureData.errorMessage, inline: false }
            ]
        });
    }

    /**
     * إشعار منتج نفذ من المخزون
     */
    async notifyOutOfStock(productData) {
        return this.send({
            title: '⚠️ تحذير: منتج نفذ من المخزون',
            description: `المنتج **${productData.name}** نفذ من المخزون`,
            color: this.colors.warning,
            fields: [
                { name: '📦 المنتج', value: productData.name, inline: true },
                { name: '🆔 رقم المنتج', value: `#${productData.id}`, inline: true },
                { name: '💰 السعر', value: `${productData.price.toLocaleString()} ريال`, inline: true },
                { name: '📊 الكمية المتبقية', value: '0', inline: true }
            ]
        });
    }

    /**
     * تقرير يومي للمبيعات
     */
    async sendDailyReport(reportData) {
        return this.send({
            title: '📊 تقرير المبيعات اليومي',
            description: `تقرير مبيعات يوم ${new Date().toLocaleDateString('ar-SA')}`,
            color: this.colors.info,
            fields: [
                { name: '🛒 إجمالي الطلبات', value: reportData.totalOrders.toString(), inline: true },
                { name: '💰 إجمالي المبيعات', value: `${reportData.totalRevenue.toLocaleString()} ريال`, inline: true },
                { name: '👥 عملاء جدد', value: reportData.newCustomers.toString(), inline: true },
                { name: '📦 طلبات مكتملة', value: reportData.completedOrders.toString(), inline: true },
                { name: '⏳ طلبات قيد التنفيذ', value: reportData.pendingOrders.toString(), inline: true },
                { name: '❌ طلبات ملغاة', value: reportData.cancelledOrders.toString(), inline: true }
            ]
        });
    }

    /**
     * إشعار مراجعة/تقييم جديد
     */
    async notifyNewReview(reviewData) {
        const stars = '⭐'.repeat(reviewData.rating);
        
        return this.send({
            title: '⭐ تقييم جديد',
            description: reviewData.comment,
            color: this.colors.info,
            fields: [
                { name: '👤 العميل', value: reviewData.customerName, inline: true },
                { name: '📦 المنتج', value: reviewData.productName, inline: true },
                { name: '⭐ التقييم', value: stars, inline: true },
                { name: '📅 التاريخ', value: new Date().toLocaleDateString('ar-SA'), inline: true }
            ]
        });
    }

    /**
     * إشعار خطأ في النظام
     */
    async notifySystemError(errorData) {
        return this.send({
            title: '🚨 خطأ في النظام',
            description: errorData.message,
            color: this.colors.error,
            fields: [
                { name: '📝 نوع الخطأ', value: errorData.type, inline: true },
                { name: '📍 الموقع', value: errorData.location, inline: true },
                { name: '⏰ الوقت', value: new Date().toLocaleString('ar-SA'), inline: false },
                { name: '🔍 التفاصيل', value: `\`\`\`${errorData.stack || 'لا توجد تفاصيل'}\`\`\``, inline: false }
            ]
        });
    }
}

// ======================================
// Usage Examples
// ======================================

/**
 * مثال على الاستخدام في Node.js:
 * 
 * const webhook = new DiscordWebhook('YOUR_WEBHOOK_URL');
 * 
 * // إشعار مستخدم جديد
 * await webhook.notifyNewUser({
 *     name: 'محمد أحمد',
 *     email: 'mohamed@example.com',
 *     phone: '0501234567',
 *     discordId: '123456789'
 * });
 * 
 * // إشعار طلب جديد
 * await webhook.notifyNewOrder({
 *     orderNumber: 'DX12345',
 *     customer: {
 *         name: 'محمد أحمد',
 *         email: 'mohamed@example.com',
 *         phone: '0501234567',
 *         discordId: '123456789'
 *     },
 *     items: [
 *         { name: 'لابتوب', quantity: 1, price: 4999 }
 *     ],
 *     total: 5049,
 *     paymentMethod: 'visa'
 * });
 */

// Export for use in Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DiscordWebhook;
}

// ======================================
// Express.js Server Example
// ======================================

/**
 * مثال على استخدام webhook في Express.js server:
 * 
 * const express = require('express');
 * const DiscordWebhook = require('./webhook-handler');
 * 
 * const app = express();
 * const webhook = new DiscordWebhook(process.env.DISCORD_WEBHOOK_URL);
 * 
 * app.use(express.json());
 * 
 * // API endpoint for new orders
 * app.post('/api/orders', async (req, res) => {
 *     const orderData = req.body;
 *     
 *     // Save order to database
 *     // ...
 *     
 *     // Send Discord notification
 *     await webhook.notifyNewOrder(orderData);
 *     
 *     res.json({ success: true });
 * });
 * 
 * // API endpoint for new users
 * app.post('/api/users/register', async (req, res) => {
 *     const userData = req.body;
 *     
 *     // Save user to database
 *     // ...
 *     
 *     // Send Discord notification
 *     await webhook.notifyNewUser(userData);
 *     
 *     res.json({ success: true });
 * });
 * 
 * app.listen(3000, () => {
 *     console.log('Server running on port 3000');
 * });
 */