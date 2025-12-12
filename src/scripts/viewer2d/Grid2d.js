import { Configuration, gridSpacing, viewBounds } from '../core/configuration';
import { EVENT_CHANGED } from '../core/events';
import { Graphics } from 'pixi.js';
import { Vector2 } from 'three';
import { Dimensioning } from '../core/dimensioning';

const GRID_SIZE = 10000;

export class Grid2D extends Graphics {
    constructor(canvas, options) {
        super();
        this.__canvasHolder = canvas;
        this.__options = options;
        this.__size = new Vector2(GRID_SIZE, GRID_SIZE);
        this.__gridScale = 1.0;
        this.width = this.__size.x;
        this.height = this.__size.y;
        this.drawRect(0, 0, GRID_SIZE, GRID_SIZE);
        this.pivot.x = this.pivot.y = 0.5;
        Configuration.getInstance().addEventListener(EVENT_CHANGED, (evt) => this.__updateGrid(evt.key));
        this.__updateGrid();
    }

    __updateGrid() {
        let gridSize = Dimensioning.cmToPixel(Configuration.getNumericValue(viewBounds) * 1);
        let spacingCMS = Configuration.getNumericValue(gridSpacing);
        let spacing = Dimensioning.cmToPixel(spacingCMS);
        let totalLines = gridSize / spacing;
        let halfSize = gridSize * 0.5;

        // Modern line widths
        let linewidth = Math.max(1.0 / this.__gridScale, 0.5);
        let highlightLineWidth = Math.max(1.5 / this.__gridScale, 1.0);

        // Modern color scheme - subtle grays
        let normalColor = 0xE8E8E8;       // Light gray for minor lines
        let highlightColor = 0xD0D0D0;    // Slightly darker for major lines
        let accentColor = 0x6366F1;       // Purple accent for center lines

        this.clear();

        // Draw grid lines with fade effect near edges
        for (let i = 0; i < totalLines; i++) {
            let co = (i * spacing) - halfSize;
            let isCenter = Math.abs(co) < spacing * 0.5;
            let isMajor = i % 5 === 0;

            // Calculate fade based on distance from center
            let distFromCenter = Math.abs(co) / halfSize;
            let alpha = Math.max(0.2, 1 - distFromCenter * 0.5);

            if (isCenter) {
                // Center lines with accent color
                this.lineStyle(highlightLineWidth * 1.5, accentColor, alpha * 0.6);
                this.moveTo(-halfSize, co);
                this.lineTo(halfSize, co);
                this.moveTo(co, -halfSize);
                this.lineTo(co, halfSize);
            } else if (isMajor) {
                // Major grid lines
                this.lineStyle(highlightLineWidth, highlightColor, alpha * 0.8);
                this.moveTo(-halfSize, co);
                this.lineTo(halfSize, co);
                this.moveTo(co, -halfSize);
                this.lineTo(co, halfSize);
            } else {
                // Minor grid lines
                this.lineStyle(linewidth, normalColor, alpha * 0.6);
                this.moveTo(-halfSize, co);
                this.lineTo(halfSize, co);
                this.moveTo(co, -halfSize);
                this.lineTo(co, halfSize);
            }
        }

        // Draw origin marker
        let originSize = 8;
        this.lineStyle(2, accentColor, 0.8);
        this.moveTo(-originSize, 0);
        this.lineTo(originSize, 0);
        this.moveTo(0, -originSize);
        this.lineTo(0, originSize);

        // Origin dot
        this.beginFill(accentColor, 0.8);
        this.drawCircle(0, 0, 3);
        this.endFill();
    }

    get gridScale() {
        return this.__gridScale;
    }

    set gridScale(value) {
        this.__gridScale = value;
        this.__updateGrid();
    }

    __configurationUpdate(evt) {
        if (evt.key === gridSpacing) {
            this.__updateGrid();
        }
    }
}
