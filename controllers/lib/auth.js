const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const sendgridTransport = require('nodemailer-sendgrid-transport');
const { validationResult } = require('express-validator/check');
const { get500 } = require('../../util/error');

const User = require('../../models/userModel');

const transporter = nodemailer.createTransport(sendgridTransport({ auth: { api_key: process.env.SENDGRID_API_KEY } }));

exports.getSignup = (req, res, next) => {
    let message = req.flash('error');
    if (message.length > 0) {
        message = message[0];
    } else {
        message = null;
    }
    res.render('auth/signup', {
        path: '/signup',
        pageTitle: 'Signup',
        errorMessage: message,
        oldInput: {
            email: '',
            password: '',
            confirmPassword: ''
        },
        validationErrors: []
    });
};

exports.postSignup = async (req, res, next) => { 
    const email = req.body.email;
    const password = req.body.password;
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        console.log(errors.array());
        return res.status(422).render('auth/signup', {
                path: '/signup',
                pageTitle: 'Signup',
                errorMessage: errors.array()[0].msg,
                oldInput: {
                    email: email,
                    password: password,
                    confirmPassword: req.body.confirmPassword
                },
                validationErrors: errors.array()
        });
    }
    try {
        const hashedPassword = await bcrypt.hash(password, 12);
        const user = new User({
            email: email,
            password: hashedPassword,
            cart: { items: [] }
        });
  
        await user.save();
        res.redirect('/login');
        const addr = req.protocol + '://' + req.get('host')
        return transporter.sendMail({
            to: email,
            from: 'liudingdeveloper@gmail.com',
            subject: 'Welcome to Mart77',
            html: `
                <h1>Welcome to Mart77</h1>
                <p>Hi,</p>
                <p>Thanks for signing up to Mart77! If you ever get lost, you can log in again with the email address '${email}'.</p>
                <p>If you're new to Mart77, take a look at our <a href="${req.protocol + '://' + req.get('host')}">site</a>.</p>
                <p>PS. We love talking to our users about Mart77. Reply to this email to get in touch with us directly, whatever the reason. Questions, comments, problems, suggestions, all welcome!</p>
            `                    
        });
    } catch (err) {
        return next(get500(err));
    }
};

exports.getLogin = (req, res, next) => {
    let message = req.flash('error');
    if (message.length > 0) {
        message = message[0];
    } else {
        message = null;
    }
    res.render('auth/login', {
        path: '/login',
        pageTitle: 'Login',
        errorMessage: message,
        oldInput: {
            email: '',
            password: ''
        },
        validationErrors: []
    });
};

exports.postLogin = async (req, res, next) => {
    const email = req.body.email;
    const password = req.body.password;
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        return res.status(422).render('auth/login', {
            path: '/login',
            pageTitle: 'Login',
            errorMessage: errors.array()[0].msg,
            oldInput: {
                email: email,
                password: password
            },
            validationErrors: errors.array()
        });
    }
  
    try {
        const user = await User.findOne({ email: email });
        if (!user) {
            return res.status(422).render('auth/login', {
                path: '/login',
                pageTitle: 'Login',
                errorMessage: 'Invalid email or password.',
                oldInput: { email: email, password: password },
                validationErrors: []
            });
        }
  
        const doMatch = await bcrypt.compare(password, user.password);
        if (doMatch) {
            req.session.isLoggedIn = true;
            req.session.user = user;
            const err = req.session.save();
            console.log(err);
            return res.redirect('/');
        }
        return res.status(422).render('auth/login', {
                path: '/login',
                pageTitle: 'Login',
                errorMessage: 'Invalid email or password.',
                oldInput: {
                    email: email,
                    password: password
                },
                validationErrors: []
        });
    } catch (err) {
      res.redirect('/login');
    }
};

exports.postLogout = (req, res, next) => {
    req.session.destroy(err => {
        console.log(err);
        res.redirect('/');
    });
};

exports.getReset = (req, res, next) => {
    let message = req.flash('error');
    if (message.length > 0) {
        message = message[0];
    } else {
        message = null;
    }
    res.render('auth/reset', {
        path: '/reset',
        pageTitle: 'Reset Password',
        errorMessage: message
    });
};

exports.postReset = (req, res, next) => {
    crypto.randomBytes(32, async (err, buffer) => {
        if (err) {
            console.log(err);
            return res.redirect('/reset');
        }

        const token = buffer.toString('hex');
        try {
            const user = await User.findOne({ email: req.body.email });
            if (!user) {
                req.flash('error', 'No account with that email found.');
                return res.redirect('/reset');
            }
            
            user.resetToken = token;
            user.resetTokenExpiration = Date.now() + 3600000;    
            await user.save();
    
            res.redirect('/');
            const addr = req.protocol + '://' + req.get('host') + '/reset'; // => http://localhost:8080/reset/xxx
            return transporter.sendMail({
                to: req.body.email,
                from: 'liudingdeveloper@gmail.com',
                subject: 'Password reset',
                html: `
                    <p>You requested a password reset</p>
                    <p>Click this <a href="${addr}/${token}">link</a> to set a new password.</p>
                    `                    
            });
        } catch (err) {
            return next(get500(err));
        }
    });
};

exports.getNewPassword = async (req, res, next) => {
    const token = req.params.token;
  
    try {
        const user = await User.findOne({ resetToken: token, resetTokenExpiration: { $gt: Date.now() } });
        if (!user) {
            req.flash('error', 'Your reset password token has expired, please submit a new request');
            return res.redirect('/reset');
        }
        let message = req.flash('error');
        if (message.length > 0) {
            message = message[0];
        } else {
            message = null;
        }
        return res.render('auth/new-password', {
                path: '/new-password',
                pageTitle: 'New Password',
                errorMessage: message,
                userId: user._id.toString(),
                passwordToken: token
        });
    } catch (err) {
        return next(get500(err));
    }
};

exports.postNewPassword = async (req, res, next) => {
    const newPassword = req.body.password;
    const userId = req.body.userId;
    const passwordToken = req.body.passwordToken;
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        console.log(errors.array());
        return res.status(422).render('auth/new-password', {
            path: '/new-password',
            pageTitle: 'New Password',
            errorMessage: errors.array()[0].msg,
            userId: userId,
            passwordToken: passwordToken
        });
    }
    
    try {
        const resetUser = await User.findOne({
            resetToken: passwordToken,
            resetTokenExpiration: { $gt: Date.now() },
            _id: userId
        });
  
        const hashedPassword = await bcrypt.hash(newPassword, 12);
        resetUser.password = hashedPassword;
        resetUser.resetToken = undefined;
        resetUser.resetTokenExpiration = undefined;
        await resetUser.save();
        
        res.redirect('/login');
    } catch (err) {
        return next(get500(err));
    }
};
  