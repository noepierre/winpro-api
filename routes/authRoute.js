import express from 'express';
import { generateToken } from '../utils/jwtUtils.js';

const router = express.Router();

router.post('/login', (req, res) => {
    const { username, password } = req.body;

    // Vérifie les identifiants (ici, un exemple simple)
    if (username === 'admin' && password === 'password') {
        const token = generateToken({ username });
        res.json({ token });
    } else {
        res.status(401).json({ message: 'Identifiants incorrects' });
    }
});

export default router;