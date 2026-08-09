# Atlas

Atlas est un explorateur de pays réalisé avec HTML, CSS et JavaScript natif. Il permet de consulter la liste des pays, de les rechercher, de les filtrer par continent, de les trier par population et de les explorer sur une carte.

## Fonctionnalités

- rechercher un pays par son nom
- filtrer les pays par continent
- trier la population par ordre croissant ou décroissant
- afficher le drapeau, la capitale, le continent, les langues et la population
- basculer entre une grille de cartes et une carte interactive
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
|-- index.html
|-- README.md
`-- styles.css
```

`countries.js` garde les responsabilités du projet dans un fichier organisé par sections : chargement des données, transformation de la liste, rendu, carte et interactions. Cette organisation est adaptée à une seule page et évite de multiplier les fichiers sans nécessité.

## Technologies et données

- HTML5 sémantique
- CSS avec Grid, Flexbox, propriétés personnalisées et media queries
- JavaScript natif
- Fetch API
- [countries.dev](https://countries.dev) pour les données pays
- [jsVectorMap](https://github.com/themustafaomar/jsvectormap) pour la carte interactive

## Auteur

Projet réalisé dans le cadre de l'Akieni Academy.
