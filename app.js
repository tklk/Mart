
const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
const session = require('express-session');
const MongoDBStore = require('connect-mongodb-session')(session);
const flash = require('connect-flash');
const helmet = require('helmet');
const compression = require('compression');
const errorController = require('./controllers/lib/error');

const app = express();

const favicon = require('serve-favicon');
app.use(favicon(__dirname + '/public/favicon.ico'));
app.set('view engine', 'ejs');
app.set('views', 'views');

const morgan = require('morgan');

app.use(helmet()); // protection
app.use(compression()); // asset compression
if (app.settings.env === "development" ) {
    const accessLogStream = fs.createWriteStream( path.join(__dirname, 'logs', '/access.log'), { flags: 'a' });
    app.use(morgan('combined', { stream: accessLogStream }));
}

app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/images', express.static(path.join(__dirname, 'images')));

app.use(session({
    secret: 'mart',
    resave: false,
    saveUninitialized: false,
    store: new MongoDBStore({ uri: process.env.MONGODB_URI, collection: 'sessions' })
}))

app.use(flash());

app.use((req, res, next) => {
    res.locals.isAuthenticated = req.session.isLoggedIn;
    next();
});

const User = require('./models/userModel');
app.use(async (req, res, next) => {
    if (!req.session.user) {
        return next();
    }
    try {
        const user = await User.findById(req.session.user._id);
        if (!user) {
          return next();
        }
        req.user = user;
        next();
    } catch (err) {
        next(new Error(err));
    }
});

const csrf = require('csurf'); // protection
const csrfProtection = csrf();
app.use(csrfProtection);
app.use((req, res, next) => {
    console.log('req: '+ req.url);
    res.locals.csrfToken = req.csrfToken();
    next();
});

let router = express.Router();
router = require('./router')(app);

app.get('/500', errorController.get500);

app.use(errorController.get404);

app.use((err, req, res, next) => {
    if (app.settings.env === "development" ) {
        errorLogStream = fs.createWriteStream( path.join(__dirname, 'logs', '/error.log'), { flags: 'a' });
        const meta = '[' + new Date() + '] ' + req.url + '\n';
        errorLogStream.write(meta + err.stack + '\n');
    }
    
    res.status(500).render('500', {
        pageTitle: 'Error!',
        path: '/500',
        isAuthenticated: req.session.isLoggedIn
    });
});

(async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const port = process.env.PORT || 5000;
        app.listen(port);
        console.log("DB connect and Express server listening on port %d in %s mode", port, app.settings.env);
    } catch (err) {
        console.log('error: ' + err)
     }
})();