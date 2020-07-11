module.exports = function(app) {
	app.use('/admin', require('./controllers/adminController'));
	app.use(require('./controllers/shopController'));
	app.use(require('./controllers/authController'));
};

/*
	const adminRoutes = require('./controllers/adminController');
	const shopRoutes = require('./controllers/shopController');
	const authRoutes = require('./controllers/authController');
	app.use('/admin', adminRoutes);
	app.use(shopRoutes);
	app.use(authRoutes);
*/