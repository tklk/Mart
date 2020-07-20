const shopController = require('./lib/shop');
const isAuth = require('../middleware/is-auth');

const shop = require('express').Router();
module.exports = shop;

// / index => GET
shop.get('/', shopController.getIndex);

// /search => GET
shop.get('/search', shopController.getSearch);

// /products/:productId => GET
shop.get('/products/:productId', shopController.getProduct);

// /user/:userId => GET
shop.get('/user/:userId', shopController.getUserMart);

// /cart => GET
shop.get('/cart', isAuth, shopController.getCart);

// /cart => POST
shop.post('/cart', isAuth, shopController.postCart);

// /cart-delete-item => POST
shop.post('/cart-delete-item', isAuth, shopController.postCartDeleteProduct);

// /checkout => GET
shop.get('/checkout', isAuth, shopController.getCheckout);

// /create-order => POST
shop.post('/create-order', isAuth, shopController.postOrder);

// /orders => GET
shop.get('/orders', isAuth, shopController.getOrders);

// /orders/:orderId => GET
shop.get('/orders/:orderId', isAuth, shopController.getInvoice);