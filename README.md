# Atlas

Atlas est un explorateur de pays réalisé avec HTML, CSS et JavaScript natif. Il permet de consulter la liste des pays, de les rechercher, de les filtrer par continent, de les trier par population et de les explorer sur une carte.

## Fonctionnalités

- rechercher un pays par son nom
- filtrer les pays par continent
- trier la population par ordre croissant ou décroissant
- afficher le drapeau, la capitale, le continent, les langues et la population
- basculer entre une grille de cartes et une carte interactive
- ouvrir une fiche pays avec ses repères, ses voisins, sa météo et des indicateurs récents
- gérer les états de chargement, de liste vide et d'erreur réseau
- adapter l'interface aux écrans mobiles et respecter `prefers-reduced-motion`

## Lancer le projet

Ouvrir `index.html` avec un serveur statique, par exemple :

```bash
python -m http.server 8000
```

Puis visiter `http://localhost:8000`.

## Organisation

```text
explorateur-pays/
|-- countries.js
|-- country-detail.css
|-- country-detail.html
|-- country-detail.js
|-- index.html
|-- README.md
`-- styles.css
```

`countries.js` garde les responsabilités du projet dans un fichier organisé par sections : chargement des données, transformation de la liste, rendu, carte et interactions. Cette organisation est adaptée à une seule page et évite de multiplier les fichiers sans nécessité.

`country-detail.js` est réservé à la fiche pays. Il charge les données de base puis lance indépendamment les requêtes complémentaires, afin que la fiche reste utilisable même lorsqu'un service tiers est indisponible.

## Technologies et données

- HTML5 sémantique
- CSS avec Grid, Flexbox, propriétés personnalisées et media queries
- JavaScript natif
- Fetch API
- [countries.dev](https://countries.dev) pour les données pays
- [jsVectorMap](https://github.com/themustafaomar/jsvectormap) pour la carte interactive
- [Open-Meteo](https://open-meteo.com/en/docs) pour la météo locale
- [Banque mondiale](https://datahelpdesk.worldbank.org/knowledgebase/articles/889392) pour les indicateurs de développement
- [Wikimedia](https://www.mediawiki.org/wiki/API:Cross-site_requests) pour le résumé encyclopédique
- [Nager.Date](https://date.nager.at/api) pour les jours fériés

## Auteur

Projet réalisé dans le cadre de l'Akieni Academy.
