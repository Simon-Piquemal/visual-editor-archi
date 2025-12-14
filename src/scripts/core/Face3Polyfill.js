/**
 * Face3 polyfill for Three.js r126+
 * Face3 was removed from Three.js but some legacy code still uses it.
 * This provides a compatible replacement.
 */
import { Color, Vector3 } from 'three';

export class Face3 {
    constructor(a, b, c, normal, color, materialIndex = 0) {
        this.a = a;
        this.b = b;
        this.c = c;

        this.normal = (normal && normal.isVector3)
            ? normal
            : new Vector3();

        this.vertexNormals = Array.isArray(normal)
            ? normal
            : [];

        this.color = (color && color.isColor)
            ? color
            : new Color();

        this.vertexColors = Array.isArray(color)
            ? color
            : [];

        this.materialIndex = materialIndex;
    }

    clone() {
        return new Face3(
            this.a,
            this.b,
            this.c,
            this.normal.clone(),
            this.color.clone(),
            this.materialIndex
        ).copyVertexNormals(this.vertexNormals).copyVertexColors(this.vertexColors);
    }

    copy(source) {
        this.a = source.a;
        this.b = source.b;
        this.c = source.c;

        this.normal.copy(source.normal);
        this.color.copy(source.color);

        this.materialIndex = source.materialIndex;

        this.copyVertexNormals(source.vertexNormals);
        this.copyVertexColors(source.vertexColors);

        return this;
    }

    copyVertexNormals(vertexNormals) {
        this.vertexNormals = [];
        for (let i = 0; i < vertexNormals.length; i++) {
            this.vertexNormals.push(vertexNormals[i].clone());
        }
        return this;
    }

    copyVertexColors(vertexColors) {
        this.vertexColors = [];
        for (let i = 0; i < vertexColors.length; i++) {
            this.vertexColors.push(vertexColors[i].clone());
        }
        return this;
    }
}

export default Face3;
