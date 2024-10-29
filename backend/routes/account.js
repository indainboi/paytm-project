const { Router } = require('express');
const authMiddleware = require('../middleware');
const { Account } = require('../db');
const { mongo, default: mongoose } = require('mongoose');
const router = Router();

router.get('/balance', authMiddleware, async (req, res) => {
    const userId = req.userId;

    const userBalance = await Account.findOne({
        userId
    })

    res.json({
        balance: userBalance.balance
    })
})

router.post('/transfer', authMiddleware, async (req, res) => {
    const session = await mongoose.startSession();

    session.startTransaction();
    const { amount, to } = req.body;

    const account = await Account.findOne({userId: req.userId}).session(session);

    if (!account || account.balance < amount) {
        await session.abortTransaction();
        return res.status(400).json({
            msg: "insufficient balance"
        });
    }

    const toAccount = await Account.findOne({userId: to}).session(session);

    if (!toAccount) {
        await session.abortTransaction();
        return res.status(400).json({
            msg: "invalid account"
        })
    }

    await Account.updateOne({ userId: req.userId }, { $inc: { balance: -amount } }).session(session);
    await Account.updateOne({ userId: to }, { $inc: { balance: amount } }).session(session);

    await session.commitTransaction();
    res.json({
        msg: "Transfer successful"
    })
})

module.exports = router;