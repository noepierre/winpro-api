import { verifyToken } from '../utils/jwtUtils.js';

function jwtAuth(req, res, next) {
    const token = req.headers['authorization']?.split(' ')[1];

    if (token) {
        const decoded = verifyToken(token);
        if (decoded) {
            req.user = decoded;
            next();
        } else {
            res.status(401).json({ message: 'Token invalide ou expiré' });
        }
    } else {
        res.status(401).json({ message: 'Token manquant' });
    }
}

export default jwtAuth;