import express from 'express';
import { generateToken } from '../utils/jwtUtils.js';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();

router.post('/login', (req, res) => {
    const { username, password } = req.body;

    // Vérifie les identifiants depuis les variables d'environnement
    if (username === process.env.ADMIN_USERNAME && password === process.env.ADMIN_PASSWORD) {
        const token = generateToken({ username });
        res.json({ token });
    } else {
        res.status(401).json({ message: 'Identifiants incorrects' });
    }
});

export default router;