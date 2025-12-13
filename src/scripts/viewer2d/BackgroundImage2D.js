import { Sprite, Texture, Graphics } from 'pixi.js';
import { Dimensioning } from '../core/dimensioning.js';

/**
 * BackgroundImage2D - Classe pour gérer une image de fond dans le viewer 2D
 * Permet de charger un plan (JPEG, PNG, WEBP) et de le calibrer à l'échelle réelle
 */
export class BackgroundImage2D extends Sprite {
    constructor() {
        super();

        // Propriétés de l'image
        this.__dataURL = null;
        this.__opacity = 0.5;
        this.__rotationDegrees = 0;
        this.__positionCm = { x: 0, y: 0 };
        this.__calibrationScale = 1;
        this.__calibrated = false;

        // Points de calibration (en pixels de l'image originale)
        this.__calibrationLine = null; // { p1: {x, y}, p2: {x, y} }

        // Graphique pour la ligne de calibration
        this.__calibrationGraphics = new Graphics();
        this.addChild(this.__calibrationGraphics);

        // Configuration initiale
        this.anchor.set(0.5, 0.5);
        this.alpha = this.__opacity;
        this.visible = true;
        this.interactive = false;
    }

    /**
     * Charge une image depuis une URL data (base64)
     * @param {string} dataURL - L'URL data de l'image
     * @returns {Promise} - Résolu quand l'image est chargée
     */
    async loadFromDataURL(dataURL) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                this.__dataURL = dataURL;
                const texture = Texture.from(img);
                this.texture = texture;

                // Réinitialiser la calibration
                this.__calibrated = false;
                this.__calibrationScale = 1;
                this.__calibrationLine = null;
                this.__calibrationGraphics.clear();

                // Appliquer les paramètres actuels
                this.__updateTransform();

                resolve(this);
            };
            img.onerror = (err) => {
                reject(new Error('Erreur de chargement de l\'image'));
            };
            img.src = dataURL;
        });
    }

    /**
     * Met à jour la transformation du sprite
     */
    __updateTransform() {
        // Position en pixels
        const pixelPos = Dimensioning.cmToPixelVector2D(this.__positionCm);
        this.position.set(pixelPos.x, pixelPos.y);

        // Rotation
        this.rotation = (this.__rotationDegrees * Math.PI) / 180;

        // Échelle de calibration
        this.scale.set(this.__calibrationScale, this.__calibrationScale);

        // Opacité
        this.alpha = this.__opacity;
    }

    /**
     * Définit l'opacité de l'image
     * @param {number} value - Opacité entre 0 et 1
     */
    setOpacity(value) {
        this.__opacity = Math.max(0, Math.min(1, value));
        this.alpha = this.__opacity;
    }

    /**
     * Récupère l'opacité actuelle
     * @returns {number}
     */
    getOpacity() {
        return this.__opacity;
    }

    /**
     * Définit la rotation de l'image
     * @param {number} degrees - Rotation en degrés
     */
    setRotation(degrees) {
        this.__rotationDegrees = degrees % 360;
        this.rotation = (this.__rotationDegrees * Math.PI) / 180;
    }

    /**
     * Récupère la rotation actuelle en degrés
     * @returns {number}
     */
    getRotationDegrees() {
        return this.__rotationDegrees;
    }

    /**
     * Définit la position de l'image en cm
     * @param {number} cmX - Position X en cm
     * @param {number} cmY - Position Y en cm
     */
    setPositionCm(cmX, cmY) {
        this.__positionCm = { x: cmX, y: cmY };
        const pixelPos = Dimensioning.cmToPixelVector2D(this.__positionCm);
        this.position.set(pixelPos.x, pixelPos.y);
    }

    /**
     * Récupère la position en cm
     * @returns {{x: number, y: number}}
     */
    getPositionCm() {
        return { ...this.__positionCm };
    }

    /**
     * Définit les points de la ligne de calibration (en coordonnées locales du sprite)
     * @param {{x: number, y: number}} p1 - Premier point
     * @param {{x: number, y: number}} p2 - Deuxième point
     */
    setCalibrationLine(p1, p2) {
        this.__calibrationLine = { p1: { ...p1 }, p2: { ...p2 } };
        this.__drawCalibrationLine();
    }

    /**
     * Récupère la ligne de calibration
     * @returns {{p1: {x: number, y: number}, p2: {x: number, y: number}}|null}
     */
    getCalibrationLine() {
        return this.__calibrationLine ? {
            p1: { ...this.__calibrationLine.p1 },
            p2: { ...this.__calibrationLine.p2 }
        } : null;
    }

    /**
     * Dessine la ligne de calibration sur l'image
     */
    __drawCalibrationLine() {
        this.__calibrationGraphics.clear();

        if (!this.__calibrationLine) return;

        const { p1, p2 } = this.__calibrationLine;
        const accentColor = 0xFF6B6B;

        // Ligne principale
        this.__calibrationGraphics.lineStyle(4, accentColor, 1);
        this.__calibrationGraphics.moveTo(p1.x, p1.y);
        this.__calibrationGraphics.lineTo(p2.x, p2.y);

        // Points aux extrémités
        this.__calibrationGraphics.beginFill(accentColor, 1);
        this.__calibrationGraphics.drawCircle(p1.x, p1.y, 8);
        this.__calibrationGraphics.drawCircle(p2.x, p2.y, 8);
        this.__calibrationGraphics.endFill();

        // Centre blanc
        this.__calibrationGraphics.beginFill(0xFFFFFF, 1);
        this.__calibrationGraphics.drawCircle(p1.x, p1.y, 4);
        this.__calibrationGraphics.drawCircle(p2.x, p2.y, 4);
        this.__calibrationGraphics.endFill();
    }

    /**
     * Efface la ligne de calibration visuelle
     */
    clearCalibrationLine() {
        this.__calibrationGraphics.clear();
    }

    /**
     * Calcule la longueur de la ligne de calibration en pixels de l'image
     * @returns {number} - Longueur en pixels
     */
    getCalibrationLineLength() {
        if (!this.__calibrationLine) return 0;

        const { p1, p2 } = this.__calibrationLine;
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    /**
     * Applique la calibration basée sur une longueur réelle
     * @param {number} realLengthCm - Longueur réelle de la ligne en cm
     */
    applyCalibration(realLengthCm) {
        const linePixelLength = this.getCalibrationLineLength();
        if (linePixelLength === 0) {
            console.warn('Pas de ligne de calibration définie');
            return;
        }

        // La longueur en pixels que devrait avoir la ligne pour correspondre à realLengthCm
        const targetPixelLength = Dimensioning.cmToPixel(realLengthCm);

        // Le facteur d'échelle nécessaire
        this.__calibrationScale = targetPixelLength / linePixelLength;
        this.__calibrated = true;

        // Appliquer l'échelle
        this.scale.set(this.__calibrationScale, this.__calibrationScale);

        // Effacer la ligne de calibration après application
        this.clearCalibrationLine();

        console.log(`Calibration appliquée: échelle = ${this.__calibrationScale.toFixed(4)}`);
    }

    /**
     * Vérifie si l'image a été calibrée
     * @returns {boolean}
     */
    isCalibrated() {
        return this.__calibrated;
    }

    /**
     * Récupère le facteur d'échelle de calibration
     * @returns {number}
     */
    getCalibrationScale() {
        return this.__calibrationScale;
    }

    /**
     * Définit manuellement le facteur d'échelle
     * @param {number} scale - Facteur d'échelle
     */
    setCalibrationScale(scale) {
        this.__calibrationScale = scale;
        this.__calibrated = true;
        this.scale.set(this.__calibrationScale, this.__calibrationScale);
    }

    /**
     * Sérialise l'état de l'image pour la sauvegarde
     * @returns {object}
     */
    toJSON() {
        return {
            dataURL: this.__dataURL,
            opacity: this.__opacity,
            rotation: this.__rotationDegrees,
            position: this.__positionCm,
            scale: this.__calibrationScale,
            calibrated: this.__calibrated
        };
    }

    /**
     * Charge l'état depuis des données sérialisées
     * @param {object} data - Données sérialisées
     * @returns {Promise}
     */
    async fromJSON(data) {
        if (!data || !data.dataURL) {
            throw new Error('Données invalides pour BackgroundImage2D');
        }

        // Charger l'image d'abord
        await this.loadFromDataURL(data.dataURL);

        // Restaurer les paramètres
        if (typeof data.opacity === 'number') {
            this.setOpacity(data.opacity);
        }
        if (typeof data.rotation === 'number') {
            this.setRotation(data.rotation);
        }
        if (data.position && typeof data.position.x === 'number') {
            this.setPositionCm(data.position.x, data.position.y);
        }
        if (typeof data.scale === 'number') {
            this.setCalibrationScale(data.scale);
        }
        this.__calibrated = data.calibrated || false;

        return this;
    }

    /**
     * Nettoie les ressources
     */
    dispose() {
        this.__calibrationGraphics.clear();
        if (this.texture) {
            this.texture.destroy(true);
        }
        this.destroy({ children: true });
    }
}
