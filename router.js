module.exports = function(app) {
	app.use('/admin', require('./controllers/adminController'));
	app.use(require('./controllers/shopController'));
	app.use(require('./controllers/authController'));
};