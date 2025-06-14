const mongoose = require('mongoose');

const Order = require('./model/playbox/playboxOrderModel');
const sendOrderNotification = require('./utils/sendOrderNotification');


const retryFailedOrderEmails = async () => {
  try {
    const failedOrders = await Order.find({ emailSent: false });
    for (const order of failedOrders) {
      const success = await sendOrderNotification(order);
      if (success) {
        order.emailSent = true;
        await order.save();
        console.log(`✅ Resent email for order ${order._id}`);
      }
    }
  } catch (err) {
    console.error("❌ Error retrying failed emails:", err.message);
  }
};


const playboxConnection = mongoose.createConnection(process.env.PLAYBOX_MONGO_URL, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

playboxConnection.on('connected', () => {
  retryFailedOrderEmails();
  console.log('Connected to Playbox Database');
});

playboxConnection.on('error', (err) => {
  console.error('Playbox Database connection error:', err);
});

module.exports = playboxConnection;
