const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const addrObj = new Schema({
    name: { type: String, required: true },
    addr: { type: String, required: true },
    addr2: { 
        city: { type: String, required: true },
        state: { type: String, required: true },
        postcode: { type: Number, required: true }
    },
    country: { type: String, required: true }    
});

const orderSchema = new Schema({
    products: [{
        product: { type: Object, required: true },
        quantity: { type: Number, required: true }
    }],
    user: {
        email: { type: String, required: true },
        userId: { type: Schema.Types.ObjectId, required: true, ref: 'User' }
    },
    shipAddr: { type: addrObj }, 
    billing: {
        billAddr: { type: addrObj }, 
        digit: { type: Number, required: true },
        subtotal: { type: Number, required: true },
        fee: { type: Number, required: true },
        pretax: { type: Number, required: true },
        tax: { type: Number, required: true },
        total: { type: Number, required: true }
    }
}, { timestamps: { createdAt: 'created_at' } });

module.exports = mongoose.model('Order', orderSchema);
