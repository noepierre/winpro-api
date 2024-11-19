# API WinPro

Cette API Node.js génère un fichier SVG en fonction de paramètres fournis dans une requête HTTP.

## Table des matières

- [Description](#description)
- [Prérequis](#prérequis)
- [Installation](#installation)
- [Démarrage](#démarrage)
- [Utilisation](#utilisation)
- [Exemple de Requête](#exemple-de-requête)
- [Structure du Projet](#structure-du-projet)
- [Explication de portail_specifications.json](#explication-de-portail_specificationsjson)
- [Sécurisation](#sécurisation)
- [Exemple d'utilisation](#exemple-dutilisation)

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
| `tole`           | `string` | Modèle de tôle                                                | `Tôle pleine`                              |
| `poignee`        | `string` | Poignée                                                       | `Poignée Béquille Inox`                    |
| `decor`          | `string` | Décor                                                         | `A09 - Numéro de rue`                      |
| `gammeDecor`     | `string` | Gamme du décor                                                | `Nature`                                   |
| `numeroRue`      | `number` | Numéro de rue (si le décor est un numéro de rue)              | `42`                                       |
| `aspect`         | `string` | Aspect du portail (pour les portails coulissants)             | `Aspect 2`                                 |

Mis à part le modèle, aucun paramètre n'est obligatoire.

Si vous ne donnez pas de valeur pour la hauteur, vous devez laisser le paramètre de la largeur vide.

Si un paramètre est manquant, il sera remplacé par une valeur par défaut chosie par WinPro.

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
| `model`          | N'importe quel nom de modèle de portail (ex : `ANTA210`, `TONN110-B`, `FOUD110-CDG`)                       |
| `pose`           | `QD_typepose_RGarrp`, `QD_typepose_entrep`, `QD_typepose_entGA`, `QD_typepose_ouvext`, `QD_typepose_ouvextDP`, `QD_typepose_entrepDapG`, `QD_typepose_entrepGapD`, `QD_typepose_gonarr`, `QD_typepose_RarrGc`, `QD_typepose_RGdevp`, `QD_typepose_RdevGc` |
| `sens_ouverture` | `QO_sensouv_droiteP`, `QO_sensouv_gaucheP`, `QO_sensouv_droiteT`, `QO_sensouv_gaucheT`                    |
| `poteau_gauche`  | `QD_poteauD_Sans`, `QD_poteauG_100`, `QD_poteauG_150`, `QD_poteauG_180`, `QD_poteauG_100F`, `QD_poteauG_150F`, `QD_poteauG_180F`, `QD_poteauG_100R`, `QD_poteauG_150R`, `QD_poteauG_180R`, `QD_poteauG_SansPP` |
| `poteau_droit`   | `QD_poteauG_Sans`, `QD_poteauD_100`, `QD_poteauD_150`, `QD_poteauD_180`, `QD_poteauD_100F`, `QD_poteauD_150F`, `QD_poteauD_180F`, `QD_poteauD_100R`, `QD_poteauD_150R`, `QD_poteauD_180R`, `QD_poteauD_SansPP` |
| `serrure`        | `QQ_serrure_PR`, `QQ_serrure_sans`                                                                        |
| `ferrage`        | `QQ_ferrage_A`, `QQ_ferrage_B`, `QQ_ferrage_C`, `QQ_ferrage_D`, `QQ_ferrage_E`, `QQ_ferrage_Ebis`, `QQ_ferrage_F`, `QQ_ferrage_G`, `QQ_ferrage_H`, `QQ_ferrage_P`, `QQ_ferrage_Dep` |
| `tole`           | `QR_ModTole_0`, `QR_ModTole_pleine`, `QR_ModTole_TrouCar`, `QR_ModTole_Lhassa`, `QR_ModTole_Perseide`, ... |
| `poignee`        | `QQ_Poignee_BeqInox`, `QQ_Poignee_BeqDSIGN`, `QQ_Poignee_PoiPlqNoir`, `QQ_Poignee_PoiPlqBlanc`            |
| `gammeDecor`     | `QP_GamDecor_Sans`, `QP_GamDecor_Acces`, `QP_GamDecor_Design`, `QP_GamDecor_Nature`                       |
| `decor`          | `QP_ModDecor_Sans`, `QP_ModDecor_A01`, `QP_ModDecor_A02`, `QP_ModDecor_A03`, `QP_ModDecor_A04`, `QP_ModDecor_A05`, `QP_ModDecor_A06`, `QP_ModDecor_A07`, `QP_ModDecor_A08`, `QP_ModDecor_A09`, `QP_ModDecor_D01`, `QP_ModDecor_N03`, ... |
| `numeroRue`      | N'importe quel nombre entier positif inférieur à 10000 (ex : `12`, `42`)                                  |
| `aspect`         | `1`, `2`                                                                                                  |

Bien que plusieurs valeurs soient possibles pour chaque paramètre, certaines valeurs peuvent ne pas être compatibles avec le modèle de portail choisi ou avec d'autres paramètres.

Il est possible qu'il y ai d'autres valeurs possibles pour chaque paramètre. Veuillez vous référer à la documentation fournie par CFP pour plus d'informations.

## Exemple de Requête

Utilisez votre navigateur, **curl** ou un outil comme **Postman** pour envoyer une requête.

```bash
http://localhost:3000/api/generate?color1=7016STRU&color2=BLEUCANON&width=4000&height=1600&width2=0&model=ALTA210&pose=QD_typepose_RGarrp&sens_ouverture=QO_sensouv_droiteP&poteau_gauche=QD_poteauG_Sans&poteau_droit=QD_poteauD_Sans&serrure=QQ_serrure_PR&ferrage=QQ_ferrage_A&tole=QR_ModTole_0&poignee=QQ_Poignee_BeqInox&decor=QP_ModDecor_A08&gammeDecor=QP_GamDecor_Acces&numeroRue=12&aspect=1
```

La réponse sera un fichier SVG généré avec les paramètres fournis.

## Structure du Projet

```
winpro-api/
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
├── middleware/
│   └── authJwt.js
├── web/
│   ├── index.html
│   ├── script.js
|   └── style.css
└── temp/
    │── portail.svg
    │── request.xml
    └── response.xml
```

- **server.js** : Point d'entrée du serveur.

- **portail_specifications.json** : Spécifications des modèles de portail.

- **routes/generateRoute.js** : Route pour générer le fichier SVG.
- **routes/authRoute.js** : Route pour gérer l'authentification.

- **requete/template.xml** : Modèle XML pour générer le fichier SVG.

- **utils/svgUtils.js** : Fonctions utilitaires pour générer le fichier SVG.
- **utils/jwtUtils.js** : Fonctions utilitaires pour gérer les tokens JWT.

- **middleware/authJwt.js** : Middleware pour vérifier le token JWT.

- **temp/portail.svg** : Fichier SVG extrait de la réponse.
- **temp/request.xml** : Fichier XML de la requête envoyée.
- **temp/response.xml** : Fichier XML de la réponse reçue.

- **web/index.html** : Page web pour tester concrètement l'API.
- **web/script.js** : Script JavaScript pour la page web.
- **web/style.css** : Feuille de style CSS pour la page web.

## Explication de portail_specifications.json

Ce fichier contient les spécifications des modèles de portail. Il est utilisé pour construire la requête en fonction des spécifications du modèle choisi.

Il contient les champs suivants :

- **bicolores** : Modèles de portail pouvant être bicolores.
- **models_DG** : Modèles de portillons (XXXX110) qui existe en deux versions : XXXX110-D et XXXX110-G (et pas en XXXX110).
- **models_tole_changeable** : Modèles de portail pour lesquels la tôle est changeable.
- **maxWidth_without_m** : Largeur maximale des modèles de portail sans meneau.

    Exemple :

    ```json
    "model":"ATRI110", // Modèle de portail
    "maxWidth": 2000 // Largeur maximale du portail
    ```

- **remplissage_vantail_110** : Remplissage du vantail des modèles 110 (Portillons).

    Exemple :

    ```json
    "model":"ARCE", // Modèle de portail
    "remplissage_vantail_110":[1, 2] // Parties du vantail remplissables
    ```

- **remplissage_vantail** : Indique pour chaque modèle quelle partie du vantail est remplissable (d'une couleur).

    Exemple :

    ```json
    "model":"MAGN", // Modèle de portail
    "remplissage_vantail1":[2], // Parties du vantail 1 remplissables
    "remplissage_vantail2":[1] // Parties du vantail 2 remplissables
    ```

    Ici, pour le modèle MAGN, le vantail 1 a la partie 2 remplissable et le vantail 2 a la partie 1 remplissable.

- **remplissage_vantail_310** : Remplissage du vantail des modèles 310.

    Exemple :

    ```json
    "model":"ARCE", // Modèle de portail
    "remplissage_vantail_310":[3, 4] // Parties du vantail remplissables
    ```

    Ici, pour le modèle ARCE310, les parties 3 et 4 du vantail sont remplissables.

## Sécurisation

Cette API est sécurisée par un **token JWT**.

Pour obtenir un token, envoyez une requête POST à la route `/api/auth/login` avec les identifiants suivants :

```bash
curl -X POST http://localhost:3000/api/auth/login -H "Content-Type: application/json" -d "{\"username\":\"admin\",\"password\":\"password\"}"
```

Le token sera renvoyé dans la réponse.

Un exemple d'utilisation avec JavaScript est disponible dans le fichier `web/script.js` (fonction `getToken`).

Ensuite, il vous suffit de l'ajouter dans le header `Authorization` de vos requêtes :

```bash
curl -X GET http://localhost:3000/api/generate?color1=7016STRU&color2=BLEUCANON&width=4000&height=1600&width2=0&model=ALTA210&pose=QD_typepose_RGarrp&sens_ouverture=QO_sensouv_droiteP&poteau_gauche=QD_poteauG_Sans&poteau_droit=QD_poteauD_Sans&serrure=QQ_serrure_PR&ferrage=QQ_ferrage_A&tole=QR_ModTole_0&poignee=QQ_Poignee_BeqInox&decor=QP_ModDecor_A08&gammeDecor=QP_GamDecor_Acces&numeroRue=12&aspect=1 -H "Authorization: Bearer <the_token>"
```

Un exemple d'utilisation avec JavaScript est disponible dans le fichier `web/script.js` (lignes 159 à 170).

## Exemple d'utilisation

Un exemple d'utilisation complet de cette API à travers une page web est fourni dans le répertoire `web`.

Pour lancer l'application web, naviguez vers le répertoire `web` et exécutez la commande suivante :

```bash
http-server
```

La page web sera accessible sur `http://localhost:8080` si aucun autre service n'utilise ce port sinon, un autre port sera utilisé.