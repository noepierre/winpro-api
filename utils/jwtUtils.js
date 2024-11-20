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

// Fonction pour récupérer le token
export async function getToken() {
    try {
        const response = await fetch('http://localhost:3000/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: 'admin', password: 'password' }) // A changer peut-être
        });
        
        if (!response.ok) {
            throw new Error('Erreur de connexion');
        }

        const data = await response.json();
        return data.token; // Retourne le token
    } catch (error) {
        console.error('Erreur lors de la récupération du token:', error);
        return null; // Retourne null si une erreur se produit
    }
}