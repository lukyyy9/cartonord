# Structure CSS

Ce dossier contient les fichiers CSS organisés par composant et page pour une meilleure maintenabilité.

## Structure des fichiers

- **`index.css`** - Point d'entrée qui importe tous les autres fichiers CSS
- **`global.css`** - Variables globales, styles de base (body, liens, boutons)
- **`layout.css`** - Layout principal de l'application (#root, .app)
- **`map.css`** - Styles liés aux cartes et marqueurs
- **`layers.css`** - Styles pour la liste des couches et drag & drop
- **`poi.css`** - Styles pour les points d'intérêt
- **`pictograms.css`** - Styles pour le menu de sélection des pictogrammes
- **`forms.css`** - Styles pour les formulaires d'édition
- **`login.css`** - Styles pour la page de connexion
- **`admin.css`** - Styles pour l'interface administrateur
- **`user.css`** - Styles pour l'interface utilisateur et popups
- **`components.css`** - Composants réutilisables (loading, overlays)

## Utilisation

L'import se fait via le fichier `index.css` dans `main.jsx` :

```jsx
import './style/index.css'
```

## Migration depuis App.css

L'ancien fichier `App.css` a été complètement décomposé et supprimé. Le fichier `AdminHomepage.css` a également été intégré dans `admin.css` et supprimé. Cette approche offre plusieurs avantages :

1. **Maintenabilité** - Plus facile de trouver et modifier les styles spécifiques
2. **Réutilisabilité** - Les composants peuvent importer seulement les styles nécessaires
3. **Performance** - Possibilité d'optimiser le chargement des styles par composant
4. **Collaboration** - Réduction des conflits lors du travail en équipe

## Conseils

- Gardez les styles spécifiques dans le fichier correspondant au composant
- Utilisez `global.css` pour les variables CSS et styles de base
- Préférez `components.css` pour les styles réutilisables dans plusieurs pages
