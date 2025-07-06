import express from 'express'
import bcrypt, { compare } from 'bcrypt'
import jwt from 'jsonwebtoken'
import connection from './dbconnect.js';
import dotenv from 'dotenv'
import verifyToken from './Middleware/tokenCheck.js';
import cors from 'cors'
import { ObjectId } from 'mongodb';
dotenv.config()
const app = express();
const corsOptions = {
    origin: 'https://quiz-website-5f105.web.app',
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(express.json());
app.get('/', (req, res) => {
  res.send('Backend is running');
});
app.post('/Signup', async (req, res) => {
    try {
        const data = req.body;
        data.password = await bcrypt.hash(data.password, 10);
        const connect = await connection()
        const db = await connect.db('Quiz')
        data.score = 0;
        const user = await db.collection('Login').findOne({ emailid: data.emailid });
        if (user) {
            res.status(400).send({ message: "User already exists", success: false });
            return
        }
        const insert = await db.collection('Login').insertOne(data);
        const insert2 = await db.collection('Attempts').insertOne({ emailid: data.emailid, attempts: [] });
        if (insert.acknowledged) {
            res.send({ message: "SignUp Successfully", success: true })
            return
        }

        return res.status(500).send({ message: "failed to insert", success: false });

    }
    catch (err) {
        res.status(500).send({ message: "Error" })
    }
})
app.post('/Login', async (req, res) => {
    try {
        const { emailid, password } = req.body
        const connect = await connection()
        const db = await connect.db('Quiz')
        const user = await db.collection('Login').findOne({ emailid: emailid });
        if (!user) {
            res.status(400).send({ message: "User not found", success: false })
            return
        }
        const check = await bcrypt.compare(password, user.password)
        if (check) {
            const token = jwt.sign({ emailid: user.emailid }, process.env.USER_TOKEN, { expiresIn: '86400s' });
            res.send({ message: "Login Successfully", token, success: true });
            return
        }
        return res.send({ message: "Invalid Password", success: false })

    } catch (err) {
        res.status(500).send({ message: "Error" });
    }
})
app.post('/question/:id', verifyToken, async (req, res) => {
    const id = req.params.id;
    const emailid = req.userData.emailid;

    try {
        const connect = await connection();
        const db = connect.db('Quiz');

        const userData = await db.collection('Attempts').findOne({ emailid: emailid });

        const alreadyAttempted = userData?.attempts?.some((a) => a._id === id);

        if (alreadyAttempted) {
            return res.status(400).send({ message: "already answered", error: false, success: false });
        }
        if (!ObjectId.isValid(id)) {
            return res.status(400).send({ message: "Invalid Question", error: false, success: false });
        }
        const ques = await db.collection('Questions').findOne({ _id: new ObjectId(id) });

        if (ques) {
            return res.send({ message: "Question", error: false, ques, success: true });
        }

    } catch (err) {
        return res.status(500).send({ message: "Error", error: true, success: false });
    }
});

app.post('/answer/:id', verifyToken, async (req, res) => {
    const id = req.params.id
    const { answer } = req.body
    const emailid = req.userData.emailid
    try {
        const connect = await connection();
        const db = connect.db('Quiz');
        const ques = await db.collection('Questions').findOne({ _id: new ObjectId(id) });
        if (ques.answer === answer) {
            try {
                const userData = await db.collection('Login').findOne({ emailid: emailid });
                const currentScore = userData.score;
                const update = await db.collection('Login').updateOne({ emailid: emailid }, { $set: { score: currentScore + 1 } });
            } catch (err) {
                return res.status(500).send({ message: "Error", success: false });
            }
        }
        await db.collection('Attempts').updateOne({ emailid: emailid }, { $push: { attempts: { _id: id, submittedAnswer: answer } } });
        res.send({ message: "Data Inserted", success: true })

    } catch (err) {
        return res.status(500).send({ message: "Error", success: false });
    }

})
app.get('/leaderboard',cors(corsOptions), async (req, res) => {
    try {
        const connect = await connection();
        const db = connect.db('Quiz');
        const leaderboard = await db.collection('Login').find({}, { projection: { emailid: 1, username: 1, score: 1, year: 1, _id: 0 } }).sort({ score: -1 }).toArray();

        res.send({ leaderboard, success: true });
    }
    catch (err) {
        res.status(500).send({ message: "failed to fetch", success: false })
    }
})
app.post('/QuestionEnter/:Name', async (req, res) => {
    const name = req.params.Name
    const question = req.body
    try {
        if (name === "Bhuvanesh") {
            const connect = await connection();
            const db = connect.db('Quiz')
            const coll = await db.collection('Questions').insertOne(question);
            if (coll.acknowledged) {
                res.send({ message: "Inserted Successfully", success: true })
            }
            else {
                res.status(400).send({ message: "Unsuccessfull", success: false });
            }
        }
        else {
            res.status(400).send({ message: "Invalid Page", success: false });
        }
    } catch (err) {
        res.status(500).send({ message: "Error" })
    }
})
app.listen(8000);
