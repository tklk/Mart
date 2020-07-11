const { check, body } = require('express-validator/check');
const authController = require('./lib/auth');
const User = require('../models/userModel');

const auth = require('express').Router();
module.exports = auth;

// /signup => GET
auth.get('/signup', authController.getSignup);

// /signup => POST
auth.post('/signup',
    [
        check('email')
            .isEmail()
            .withMessage('Please enter a valid email.')
            .custom((value, { req }) => {
                // if (value === 'test@test.com') {
                //   throw new Error('This email address if forbidden.');
                // }
                // return true;
            return User.findOne({ email: value }).then(userDoc => {
                if (userDoc) {
                    return Promise.reject(
                        'E-Mail exists already, please pick a different one.'
                    );
                }
            });
            })
            .normalizeEmail(),
        body(
            'password',
            'Please enter a password with only numbers and text and at least 5 characters.'
        )
            .isLength({ min: 5 })
            .isAlphanumeric()
            .trim(),
        body('confirmPassword')
            .trim()
            .custom((value, { req }) => {
                if (value !== req.body.password) {
                    throw new Error('Passwords have to match!');
                }
                return true;
            })
    ],
  authController.postSignup
);

// /login => GET
auth.get('/login', authController.getLogin);

// /login => POST
auth.post('/login',
    [
        body('email')
            .isEmail()
            .withMessage('Please enter a valid email address.')
            .normalizeEmail(),
      body('password', 'Password has to be valid.')
            .isLength({ min: 5 })
            .isAlphanumeric()
            .trim()
    ],
    authController.postLogin
);

// /logout => POST
auth.post('/logout', authController.postLogout);

// /reset => GET
auth.get('/reset', authController.getReset);

// /reset => POST
auth.post('/reset', authController.postReset);

// /reset/:token => GET
auth.get('/reset/:token', authController.getNewPassword);

// /new-password => POST
auth.post('/new-password', 
    [
        body(
            'password',
            'Please enter a password with only numbers and text and at least 5 characters.'
        )
        .isLength({ min: 5 })
        .isAlphanumeric()
        .trim()
    ],
    authController.postNewPassword
);


