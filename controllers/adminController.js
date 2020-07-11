const { body } = require('express-validator/check');
const adminController = require('./lib/admin');
const isAuth = require('../middleware/is-auth');

const admin = require('express').Router();
module.exports = admin;

// /admin/add-product => GET
admin.get('/add-product', isAuth, adminController.getAddProduct);

// /admin/products => GET
admin.get('/products', isAuth, adminController.getProducts);

// /admin/add-product => POST
admin.post('/add-product',
    [
        body('title')
            .isString()
            .isLength({ min: 3 })
            .trim(),
        body('price').isFloat(),
        body('description')
            .isLength({ min: 5, max: 400 })
            .trim()
    ],
    isAuth,
    adminController.postAddProduct
);

// /admin//edit-product/:productId => GET
admin.get('/edit-product/:productId', isAuth, adminController.getEditProduct);

// /admin//edit-product => POST
admin.post('/edit-product',
    [
        body('title')
            .isString()
            .isLength({ min: 3 })
            .trim(),
        body('price').isFloat(),
        body('description')
            .isLength({ min: 5, max: 400 })
            .trim()
    ],
    isAuth,
    adminController.postEditProduct
);

// /admin//edit-product => DELETE
admin.delete('/product/:productId', isAuth, adminController.deleteProduct);

