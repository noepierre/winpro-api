import express from 'express';
import { generateToken } from '../utils/jwtUtils.js';

const router = express.Router();

router.post('/login', (req, res) => {
    const { username, password } = req.body;

    // Vérifie les identifiants
    if (username === 'admin' && password === 'password') { // A changer peut-être
        const token = generateToken({ username });
        res.json({ token });
    } else {
        res.status(401).json({ message: 'Identifiants incorrects' });
    }
});

export default router;