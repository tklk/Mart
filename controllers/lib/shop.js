const fs = require('fs');
const path = require('path');

const PDFDocument = require('pdfkit');
const stripe = require('stripe')(process.env.STRIPE_KEY);

const Product = require('../../models/product');
const Order = require('../../models/order');
const { get500 } = require('../../util/error');
const { page } = require('pdfkit');

const ITEMS_PER_PAGE = 3;

exports.getProduct = async (req, res, next) => {
    const prodId = req.params.productId;
    try {
        const product = await Product.findById(prodId);
        res.render('shop/product-detail', {
            product: product,
            pageTitle: product.title,
            path: '/products'
        });
    } catch (err) {
        return next(get500(err));
    }
};

exports.getSearch = async (req, res, next) => {
    const page = +req.query.page || 1;
    const pattern = new RegExp(req.query.keyword, "i");
    const query = { "title": pattern };
    const opt_index = { "title": 1, "description": 1 };
    try {
        const totalItems = await Product.find(query, null, opt_index).countDocuments();
        const products = await Product.find(query, null, opt_index).skip((page - 1) * ITEMS_PER_PAGE).limit(ITEMS_PER_PAGE).sort({ time: -1 });
        res.render('shop/product-list', {
            prods: products,
            pageTitle: "Result for: " + req.query.keyword,
            path: '/products',
            pageInfo: {
                currentPage: page,
                nextPage: page + 1,
                previousPage: page - 1,
                lastPage: Math.ceil(totalItems / ITEMS_PER_PAGE),
                type: 'search',
                keyword: req.query.keyword
            }
        });
    } catch (err) {
        return next(get500(err));
    }
};

exports.getIndex = async (req, res, next) => {
    const page = +req.query.page || 1;
    try {
        const totalItems = await Product.find().countDocuments();
        const products = await Product.find().skip((page - 1) * ITEMS_PER_PAGE).limit(ITEMS_PER_PAGE);
        res.render('shop/index', {
            prods: products,
            pageTitle: 'Shop',
            path: '/',
            pageInfo: {
                currentPage: page,
                nextPage: page + 1,
                previousPage: page - 1,
                lastPage: Math.ceil(totalItems / ITEMS_PER_PAGE),
                type: ''
            }
        });
    } catch (err) {
        return next(get500(err));
    }
};

exports.getCart = async (req, res, next) => {
    try {
        const user = await req.user.populate('cart.items.productId').execPopulate();
        const products = user.cart.items;
        res.render('shop/cart', {
            path: '/cart',
            pageTitle: 'Your Cart',
            products: products
        });
    } catch (err) {
        return next(get500(err));
    }
};

exports.postCart = async (req, res, next) => {
    const prodId = req.body.productId;
    try {
        const product = await Product.findById(prodId);
        const add_cart = await req.user.addToCart(product);
        console.log(add_cart);
        res.redirect('/cart');
    } catch (err) {
        return next(get500(err));
    }
};

exports.postCartDeleteProduct = async (req, res, next) => {
    const prodId = req.body.productId;
    try {
        await req.user.removeFromCart(prodId);
        res.redirect('/cart');
    } catch (err) {
        return next(get500(err));
    }
};

exports.getCheckout = async (req, res, next) => {
    try {
        const user = await req.user.populate('cart.items.productId').execPopulate();
        const products = user.cart.items;

        let total = 0;
        products.forEach((p) => {
            total += p.quantity * p.productId.price;
        });

        res.render('shop/checkout', {
            path: '/checkout',
            pageTitle: 'Checkout',
            products: products,
            totalSum: total
        });
    } catch (err) {
        return next(get500(err));
    }
};

exports.postOrder = async (req, res, next) => {
    try {
        const user = await req.user.populate('cart.items.productId').execPopulate();
        let totalSum = 0;
        user.cart.items.forEach((p) => {
            totalSum += p.quantity * p.productId.price;
        });

        const products = user.cart.items.map((i) => {
            return { quantity: i.quantity, product: { ...i.productId._doc } };
        });
        const order = new Order({
            user: {
                email: req.user.email,
                userId: req.user
            },
            products: products
        });

        const result = await order.save();
        // Get the payment token ID submitted by the form:
        const customer = await stripe.customers.create({
            email: req.body.stripeEmail,
            source: req.body.stripeToken
        });
        
        await stripe.charges.create({
            amount: totalSum * 100,
            currency: 'usd',
            description: `Order - ${Date.now()}`,
            customer: customer.id,
            metadata: { order_id: result._id.toString() }
        });

        await req.user.clearCart();
        res.redirect('/orders');
    } catch (err) {
        return next(get500(err));
    }
};

exports.getOrders = async (req, res, next) => {
    try {
        const orders = await Order.find({ 'user.userId': req.user._id });
        res.render('shop/orders', {
            path: '/orders',
            pageTitle: 'Your Orders',
            orders: orders
        });
    } catch (err) {
        return next(get500(err));
    }
};

exports.getInvoice = async (req, res, next) => {
    const orderId = req.params.orderId;
    try {
        const order = await Order.findById(orderId);
        if (!order) {
            return next(new Error('No order found.'));
        }
        if (order.user.userId.toString() !== req.user._id.toString()) {
            return next(new Error('Unauthorized'));
        }
        console.log(order);
        /*
        To-Do: 
            1. Prepare 
                order: {
                    id: order.id,
                    date: order.created_at,
                    sum: totalsum * 100,
                    shipdate: order.created_at + 24 * 3600 * 1000,                    
                    name: email.spilt('@')[0],
                    addr1: '360 huntington ave',
                    addr2: 'Boston, MA 02115',
                    cty: 'us,
                    subtotal: totalsum * 100,
                    fee: 'shipping fee',
                    pretax: totalsum * 100,
                    tax: totalsum * 6.25,
                    total: subtotal + fee + pretax + tax,
                },
                prods: {
                    title: xxx,
                    qty: xxx,
                    price: xxx,
                    id: xxxx,
                    seller: email.spilt('@')[0]
                },
                billing: {
                    digit: '4242',
                    name: email.spilt('@')[0],
                    addr1: '360 huntington ave',
                    addr2: 'Boston, MA 02115',
                    cty: 'us
                }
            2. render page
        */
        res.render('/shop/invoice', {
            path: '/invoice',
            pageTitle: 'Order: '+order.id,
            order: order
        })
        //res.redirect('/')
    } catch (err) {
        next(err);
    }
};

exports.getInv = async (req, res, next) => {
    const orderId = req.params.orderId;
    try {
        const order = await Order.findById(orderId);
        if (!order) {
            return next(new Error('No order found.'));
        }
        if (order.user.userId.toString() !== req.user._id.toString()) {
            return next(new Error('Unauthorized'));
        }
        const invoiceName = 'invoice-' + orderId + '.pdf';
        const invoicePath = path.join('data', 'invoices', invoiceName);
        const pdfDoc = new PDFDocument();
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader(
            'Content-Disposition',
            'inline; filename="' + invoiceName + '"'
        );
        pdfDoc.pipe(fs.createWriteStream(invoicePath));
        pdfDoc.pipe(res);

        pdfDoc.fontSize(26).text('Invoice', {
            underline: true
        });
        pdfDoc.text('-----------------------');
        let totalPrice = 0;
        order.products.forEach(prod => {
            totalPrice += prod.quantity * prod.product.price;
            pdfDoc
                .fontSize(14)
                .text(
                prod.product.title +
                    ' - ' +
                    prod.quantity +
                    ' x ' +
                    '$' +
                    prod.product.price
                );
        });
        pdfDoc.text('---');
        pdfDoc.fontSize(20).text('Total Price: $' + totalPrice);

        pdfDoc.end();
        // fs.readFile(invoicePath, (err, data) => {
        //   if (err) {
        //     return next(err);
        //   }
        //   res.setHeader('Content-Type', 'application/pdf');
        //   res.setHeader(
        //     'Content-Disposition',
        //     'inline; filename="' + invoiceName + '"'
        //   );
        //   res.send(data);
        // });
        // const file = fs.createReadStream(invoicePath);

        // file.pipe(res);
    } catch (err) {
        next(err);
    }
};