import jwt from 'jsonwebtoken';

import dotenv from 'dotenv';
dotenv.config(); // Charger les variables d'environnement à partir de .env

// Utiliser la variable d'environnement
const jwtSecret = process.env.JWT_SECRET;

// Fonction pour générer un token
export function generateToken(payload) {
    // expiration après 24h
    return jwt.sign(payload, jwtSecret, { expiresIn: '24h' });
}

// Fonction pour vérifier un token
export function verifyToken(token) {
    try {
        return jwt.verify(token, jwtSecret);
    } catch (err) {
        return null;
    }
}