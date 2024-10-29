const { Router } = require("express");
const router = Router();
const zod = require('zod');
const { User, Account } = require("../db");
const jwt = require("jsonwebtoken");
const JWT_SECRET = require("../config");
const authMiddleware = require("../middleware");

const signupSchema = zod.object({
    username: zod.string(),
    password: zod.string(),
    firstName: zod.string(),
    lastName: zod.string()
})

const signinSchema = zod.object({
    username: zod.string(),
    password: zod.string()
})

router.post('/signup', async (req, res) => {
    const { success } = signupSchema.safeParse(req.body);

    if(!success) {
        return res.status(411).json({
            msg: "incorrect inputs"
        })
    }
    
    const existingUser = await User.findOne({
        username: req.body.username
    })

    if (existingUser) {
        return res.status(411).json({
            msg: "Email already taken"
        })
    }

    const user = await User.create({
        username: req.body.username,
        password: req.body.password,
        firstName: req.body.firstName,
        lastName: req.body.lastName
    })

    await Account.create({
        userId: user._id,
        balance: 1 + Math.random() * 10000
    });

    const token = jwt.sign({userId: user._id}, JWT_SECRET)
    res.json({
        msg: "user created successfully",
        token
    })
})

router.post('/signin', async (req, res) => {
    const { success } = signinSchema.safeParse(req.body);

    if (!success) {
        return res.status(411).json({
            msg: "incorrect inputs"
        })
    }

    const user = await User.findOne({
        username: req.body.username,
        password: req.body.password
    })

    if (!user) {
        return res.status(411).json({
            msg: "user doesn't exists"
        })
    } else {
        token = jwt.sign({userId: user._id}, JWT_SECRET);
        res.json({
            msg: "signed in successfully",
            token
        })
    }
})

const updateSchema = zod.object({
    password: zod.string().optional(),
    firstName: zod.string().optional(),
    lastName: zod.string().optional()
})

router.put('/', authMiddleware, async (req, res) => {
    const body = req.body;
    const userId = req.userId
    const { success } = updateSchema.safeParse(body);

    if (!success) {
        return res.status(403).json({
            msg: "error while updating information" 
        })
    }

    await User.updateOne({
        _id: userId
    }, {
        body
    })

    res.json({
        msg: "user updated successfully"
    })
})

router.get('/bulk', authMiddleware, async (req, res) => {
    const filter = req.params.filter || "";

    const users = await User.find({
        $or: [{
            firstName: {
                "$regex": filter
            }
        },{
            lastName: {
                "$regex": filter
            }
        }]
    })

    res.json({
        user: users.map(user => ({
            username: user.username,
            firstName: user.firstName,
            lastName: user.lastName,
            userId: user._id
        }))
    })
})

module.exports = router;