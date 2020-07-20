const User = require('../models/userModel');
const Product = require('../models/productModel');
const bcrypt = require('bcryptjs');
const initJSON = require('./init.json');

function Test(email) {
    this.email = email;
}

module.exports = Test;

/***
/*  Create Test Account, if it is not exist
/*    If succeed, return null
/*      else return error
/**/
Test.prototype.init =  async function () {
    const password = process.env.Test_pwd;
    try {
        const checkuser = await User.findOne({ email: this.email });
		if (checkuser) {
            console.log('User exist');
            return
        } 
        const hashedPassword = await bcrypt.hash(password, 12);
        const user = new User({
            email: this.email,
            password: hashedPassword,
            cart: { items: [] }
        });
        await user.save();
        console.log('User create');
        let prodObj;
        initJSON.forEach(async (product) => {
            prodObj = new Product({
                title: product.title,
                price: parseFloat(product.price),
                description: product.description,
                imageUrl: product.imageUrl,
                userId: user,
                userName: user.email.split('@')[0]
            });
            await prodObj.save();
        });
        console.log('Init success!');
    } catch (err) {
        console.log('Init error: '+err);
    }    
}