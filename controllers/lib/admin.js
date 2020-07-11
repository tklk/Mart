const { validationResult } = require('express-validator/check');
const Product = require('../../models/productModel');
const User = require('../../models/userModel');
const { get500 } = require('../../util/error');

exports.getAddProduct = (req, res, next) => {
    res.render('admin/edit-product', {
        pageTitle: 'Add Product',
        path: '/admin/add-product',
        editing: false,
        hasError: false,
        errorMessage: null,
        validationErrors: []
    });
};

exports.postAddProduct = async (req, res, next) => {
    const title = req.body.title;
    const image = req.body.imageUrl;
    const price = req.body.price;
    const description = req.body.description;
    if (!image) {
        return res.status(422).render('admin/edit-product', {
            pageTitle: 'Add Product',
            path: '/admin/add-product',
            editing: false,
            hasError: true,
            product: {
                title: title,
                price: price,
                description: description
            },
            errorMessage: 'Attached image is required.',
            validationErrors: []
        });
    }
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        console.log(errors.array());
        return res.status(422).render('admin/edit-product', {
            pageTitle: 'Add Product',
            path: '/admin/add-product',
            editing: false,
            hasError: true,
            product: {
                title: title,
                price: price,
                description: description
            },
            errorMessage: errors.array()[0].msg,
            validationErrors: errors.array()
        });
    }
    
    const user = await User.findById(req.user);
    const product = new Product({
        title: title,
        price: price,
        description: description,
        imageUrl: image,
        userId: req.user,
        userName: user.email.split('@')[0]
    });
  
    try {
        await product.save();
        console.log('Created Product');
        res.redirect('/admin/products');
    } catch (err) {
        return next(get500(err));
    }
};

exports.getEditProduct = async (req, res, next) => {
    const editMode = req.query.edit;
    if (!editMode) {
        return res.redirect('/');
    }
    const prodId = req.params.productId;
    try {
        const product = await Product.findById(prodId);
        if (!product) {
            return res.redirect('/');
        }
        res.render('admin/edit-product', {
            pageTitle: 'Edit Product',
            path: '/admin/edit-product',
            editing: editMode,
            product: product,
            hasError: false,
            errorMessage: null,
            validationErrors: []
        });
    } catch (err) {
        return next(get500(err));
    }
};

exports.postEditProduct = async (req, res, next) => {
    const prodId = req.body.productId;
    const updatedTitle = req.body.title;
    const updatedPrice = req.body.price;
    const updatedImageUrl = req.body.imageUrl;
    const updatedDesc = req.body.description; 
    const errors = validationResult(req);
  
    if (!errors.isEmpty()) {
        return res.status(422).render('admin/edit-product', {
                pageTitle: 'Edit Product',
                path: '/admin/edit-product',
                editing: true,
                hasError: true,
                product: {
                title: updatedTitle,
                imageUrl: updatedImageUrl,
                price: updatedPrice,
                description: updatedDesc,
                _id: prodId
            },
            errorMessage: errors.array()[0].msg,
            validationErrors: errors.array()
        });
    }
    try {
        const product = await Product.findById(prodId);
        if (product.userId.toString() !== req.user._id.toString()) {
            return res.redirect('/');
        }
        product.title = updatedTitle;
        product.price = updatedPrice;
        product.description = updatedDesc;
        product.imageUrl = updatedImageUrl;
        await product.save();
        console.log('UPDATED PRODUCT!');
        res.redirect('/admin/products');
    } catch (err) {
        return next(get500(err));
    }
};

exports.getProducts = async (req, res, next) => {
    try {
        const products = await Product.find({ userId: req.user._id });
        res.render('admin/products', {
            prods: products,
            pageTitle: 'Admin Products',
            path: '/admin/products'
        });
    } catch (err) {
        return next(get500(err));
    }
};

exports.deleteProduct = async (req, res, next) => {
    const prodId = req.params.productId;
    try {
        const product = await Product.findById(prodId);
        if (!product) {
            return next(new Error('Product not found.'));
        }
        await Product.deleteOne({ _id: prodId, userId: req.user._id });
        res.status(200).json({ message: 'Success!' });
    } catch (err) {
        res.status(500).json({ message: 'Deleting product failed.' });
    }
};