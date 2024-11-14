# API WinPro

Une API Node.js simple qui génère un fichier SVG en fonction des paramètres fournis dans la requête HTTP.

## Table des matières

- [Description](#description)
- [Prérequis](#prérequis)
- [Installation](#installation)
- [Démarrage](#démarrage)
- [Utilisation](#utilisation)
- [Exemple de Requête](#exemple-de-requête)
- [Structure du Projet](#structure-du-projet)

## Description

Cette API permet de communiquer avec WinPro pour générer des fichiers SVG basés sur les paramètres fournis dans une requête HTTP.

## Prérequis

Avant de commencer, assurez-vous d'avoir les éléments suivants installés sur votre machine :

- [Node.js](https://nodejs.org/) pour exécuter le serveur.
- [npm](https://www.npmjs.com/) pour installer les dépendances.

Les dépendances suivantes sont utilisées dans ce projet :

- [xmldom](https://www.npmjs.com/package/xmldom) pour manipuler le fichier XML.
- [express](https://www.npmjs.com/package/express) pour créer le serveur.
- [body-parser](https://www.npmjs.com/package/body-parser) pour parser les requêtes HTTP.
- [jsonwebtoken](https://www.npmjs.com/package/jsonwebtoken) pour gérer les tokens JWT.
- [dotenv](https://www.npmjs.com/package/dotenv) pour charger les variables d'environnement.

## Installation

1. **Cloner le dépôt :**

    ```bash
    git clone https://github.com/votre-utilisateur/portail-api.git
    cd portail-api
    ```

2. **Installer les dépendances :**

    ```bash
    npm install
    ```

## Démarrage

Pour démarrer le serveur, utilisez la commande suivante :

```bash
npm start
```

Le serveur sera lancé sur `http://localhost:3000`.

## Utilisation

L'API dispose d'une seule route pour générer un fichier SVG. 

### Route

```
GET /api/svg/generate
```

### Paramètres de la requête

Les paramètres suivants sont nécessaires pour la génération du fichier SVG :

| Paramètre        | Type     | Description                                                   | Exemple                                    |
|------------------|----------|---------------------------------------------------------------|--------------------------------------------|
| `color1`         | `string` | Couleur principale                                            | `7016STRU`                                 |
| `color2`         | `string` | Couleur secondaire (pour les modèles pouvant être bicolorés)  | `1015STRU`                                 |
| `width`          | `number` | Largeur du portail en mm                                      | `1600`                                     |
| `height`         | `number` | Hauteur du portail en mm                                      | `4000`                                     |
| `width2`         | `number` | Largeur du deuxième vantail si vantaux asymétriques (0 si vantaux symétriques) | `2200`                    |
| `model`          | `string` | Modèle de portail                                             | `ANTA210`                                  |
| `pose`           | `string` | Type de pose                                                  | `Pose entre piliers`                       |
| `sens_ouverture` | `string` | Sens d'ouverture                                              | `Droite poussant`                          |
| `poteau_gauche`  | `string` | Poteau gauche                                                 | `Poteau de 180mm à gauche`                 |
| `poteau_droit`   | `string` | Poteau droit                                                  | `Poteau de Façade 150mm`                   |
| `serrure`        | `string` | Serrure                                                       | `Serrure Pène Rentrant`                    |
| `ferrage`        | `string` | Type de ferrage                                               | `Ferrage A - Gond 2 points Haut et pivot de sol` |
| `poignee`        | `string` | Poignée                                                       | `Poignée Béquille Inox`                    |
| `decor`          | `string` | Décor                                                         | `A09 - Numéro de rue`                      |
| `gammeDecor`     | `string` | Gamme du décor                                                | `Nature`                                   |
| `numeroRue`      | `number` | Numéro de rue (si le décor est un numéro de rue)              | `42`                                       |
| `aspect`         | `string` | Aspect du portail (pour les portails coulissants)             | `Aspect 2`                                 |

Mis à part le modèle, aucun paramètre n'est obligatoire.

Si vous ne donnez pas de valeur pour la hauteur, vous devez laisser le paramètre de la largeur vide.

Si un paramètre est manquant, il sera remplacé par une valeur par défaut.

Si un paramètre n'a pas besoin d'être fourni, vous pouvez le laisser vide.

Si un paramètre est specifié alors qu'il dépend d'un autre paramètre, il sera ignoré. (Ex : `numeroRue = 13` sans le `decor` correspondant)

### Valeurs possibles pour chaque paramètre

Chaque paramètre accepte des valeurs spécifiques encodées par CFP. Voici une liste des valeurs possibles pour chaque paramètre :

| Paramètre        | Valeurs possibles                                                                                          |
|------------------|-----------------------------------------------------------------------------------------------------------|
| `color1`         | N'importe quelle couleur au format code couleur (ex : `7016STRU`, `BLEUCANON`)                            |
| `color2`         | N'importe quelle couleur au format code couleur (ex : `1015STRU`, `BOISIRLANDAIS`)                             |
| `width`          | N'importe quel nombre entier (largeur en mm, ex : `1000`, `4000`)                                 |
| `height`         | N'importe quel nombre entier (hauteur en mm, ex : `1200`, `2000`)                                 |
| `width2`         | N'importe quel nombre entier (largeur du vantail secondaire en mm, `0` si vantaux symétriques)    |
| `model`          | N'importe quel nom de modèle de portail (ex : `ANTA210`, `WEB_ELEG_2VTX`)                                 |
| `pose`           | `QD_typepose_RGarrp`, `QD_typepose_entrep`, `QD_typepose_entGA`, `QD_typepose_ouvext`, `QD_typepose_ouvextDP`, `QD_typepose_entrepDapG`, `QD_typepose_entrepGapD`, `QD_typepose_gonarr`, `QD_typepose_RarrGc`, `QD_typepose_RGdevp`, `QD_typepose_RdevGc` |
| `sens_ouverture` | `QO_sensouv_droiteP`, `QO_sensouv_gaucheP`, `QO_sensouv_droiteT`, `QO_sensouv_gaucheT`                    |
| `poteau_gauche`  | `QD_poteauD_Sans`, `QD_poteauG_100`, `QD_poteauG_150`, `QD_poteauG_180`, `QD_poteauG_100F`, `QD_poteauG_150F`, `QD_poteauG_180F`, `QD_poteauG_100R`, `QD_poteauG_150R`, `QD_poteauG_180R`, `QD_poteauG_SansPP` |
| `poteau_droit`   | `QD_poteauG_Sans`, `QD_poteauD_100`, `QD_poteauD_150`, `QD_poteauD_180`, `QD_poteauD_100F`, `QD_poteauD_150F`, `QD_poteauD_180F`, `QD_poteauD_100R`, `QD_poteauD_150R`, `QD_poteauD_180R`, `QD_poteauD_SansPP` |
| `serrure`        | `QQ_serrure_PR`, `QQ_serrure_sans`                                                                        |
| `ferrage`        | `QQ_ferrage_A`, `QQ_ferrage_B`, `QQ_ferrage_C`, `QQ_ferrage_D`, `QQ_ferrage_E`, `QQ_ferrage_Ebis`, `QQ_ferrage_F`, `QQ_ferrage_G`, `QQ_ferrage_H`, `QQ_ferrage_P`, `QQ_ferrage_Dep` |
| `poignee`        | `QQ_Poignee_BeqInox`, `QQ_Poignee_BeqDSIGN`, `QQ_Poignee_PoiPlqNoir`, `QQ_Poignee_PoiPlqBlanc`            |
| `gammeDecor`     | `QP_GamDecor_Sans`, `QP_GamDecor_Acces`, `QP_GamDecor_Design`, `QP_GamDecor_Nature`                       |
| `decor`          | `QP_ModDecor_Sans`, `QP_ModDecor_A01`, `QP_ModDecor_A02`, `QP_ModDecor_A03`, `QP_ModDecor_A04`, `QP_ModDecor_A05`, `QP_ModDecor_A06`, `QP_ModDecor_A07`, `QP_ModDecor_A08`, `QP_ModDecor_A09`, `QP_ModDecor_D01`, `QP_ModDecor_N03` |
| `numeroRue`      | N'importe quel nombre entier positif inférieur à 10000 (ex : `12`, `42`)                                  |
| `aspect`         | `1`, `2`                                                                                                  |

Bien que plusieurs valeurs soient possibles pour chaque paramètre, certaines valeurs peuvent ne pas être compatibles avec le modèle de portail choisi ou avec d'autres paramètres.

Il est possible qu'il y ai d'autres valeurs possibles pour chaque paramètre. Veuillez vous référer à la documentation fournie par CFP pour plus d'informations.

## Exemple de Requête

Utilisez votre navigateur, **curl** ou un outil comme **Postman** pour envoyer une requête.

```bash
http://localhost:3000/api/generate?color1=7016STRU&color2=BLEUCANON&width=4000&height=1600&width2=0&model=ALTA210&pose=QD_typepose_RGarrp&sens_ouverture=QO_sensouv_droiteP&poteau_gauche=QD_poteauG_Sans&poteau_droit=QD_poteauD_Sans&serrure=QQ_serrure_PR&ferrage=QQ_ferrage_A&poignee=QQ_Poignee_BeqInox&decor=QP_ModDecor_A08&gammeDecor=QP_GamDecor_Acces&numeroRue=12&aspect=1
```

La réponse sera un fichier SVG généré avec les paramètres fournis.

## Structure du Projet

```
portail-api/
├── package.json
├── package-lock.json
├── portail_specifications.json
├── server.js
├── routes/
│   └── generateRoute.js
│   ├── authRoute.js
├── requete/
|   └── template.xml
├── utils/
│   ├── svgUtils.js
│   └── jwtUtils.js
└── middleware/
    └── authJwt.js

```

- **server.js** : Point d'entrée du serveur.
- **portail_specifications.json** : Spécifications des modèles de portail.
- **routes/generateRoute.js** : Route pour générer le fichier SVG.
- **routes/authRoute.js** : Route pour gérer l'authentification.
- **requete/template.xml** : Modèle XML pour générer le fichier SVG.
- **utils/svgUtils.js** : Fonctions utilitaires pour générer le fichier SVG.
- **utils/jwtUtils.js** : Fonctions utilitaires pour gérer les tokens JWT.
- **middleware/authJwt.js** : Middleware pour vérifier le token JWT.

## Sécurisation

Cette API est sécurisé par un token JWT.

Pour obtenir un token, envoyez une requête POST à la route `/api/auth/login` avec les identifiants suivants :

```bash
curl -X POST http://localhost:3000/api/auth/login -H "Content-Type: application/json" -d "{\"username\":\"<the_username>\",\"password\":\"<the_password>\"}"
```

Le token sera renvoyé dans la réponse.

Ensuite, il vous suffit de l'ajouter dans le header `Authorization` de vos requêtes :

```bash
curl "http://localhost:3000/api/generate?color1=7016STRU&color2=BLEUCANON&width=4000&height=1600&width2=0&model=ALTA210&pose=QD_typepose_RGarrp&sens_ouverture=QO_sensouv_droiteP&poteau_gauche=QD_poteauG_Sans&poteau_droit=QD_poteauD_Sans&serrure=QQ_serrure_PR&ferrage=QQ_ferrage_A&poignee=QQ_Poignee_BeqInox&decor=QP_ModDecor_A08&gammeDecor=QP_GamDecor_Acces&numeroRue=12&aspect=1" -H "Authorization: Bearer <your_token>"
```

Actuellement le token expire après 24 heures. Vous pouvez changer cette valeur dans le fichier `utils/jwtUtils.js`.