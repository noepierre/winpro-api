import express from 'express';
import generateRoute from './routes/generateRoute.js';

// ------------------------------- IMPORTS POUR LA PARTIE CONFIGURATEUR WEB DE TEST -------------------------------
import fs from 'fs';
import cors from 'cors';
import bodyParser from 'body-parser';

const app = express();
const PORT = 3000;

// Utiliser CORS avant tout autre middleware
app.use(cors());

// Middleware pour parser les requêtes JSON
app.use(express.json());

// Utiliser le routeur pour les API
app.use('/api', generateRoute);

// ------------------------------- POUR LA PARTIE CONFIGURATEUR WEB DE TEST -------------------------------

// Utiliser bodyParser pour analyser les requêtes
app.use(bodyParser.json());
app.use(bodyParser.text({ type: 'text/xml' }));

// Servir les fichiers statiques
app.use(express.static('public'));

// Créer une route GET pour obtenir les spécifications des portails
app.get('/portail-specifications', (req, res) => {
    fs.readFile('portail_specifications.json', 'utf-8', (err, data) => {
        if (err) {
            console.error('Erreur lors de la lecture du fichier:', err);
            return res.status(500).send('Erreur lors de la lecture des spécifications des portails');
        }
        res.json(JSON.parse(data)); // Retourner les spécifications en format JSON
    });
});

// Démarrer le serveur
app.listen(PORT, () => {
    console.log(`Serveur démarré sur http://localhost:${PORT}`);
});