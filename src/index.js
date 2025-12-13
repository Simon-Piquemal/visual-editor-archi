import FPS from 'fps-now';

import { BlueprintJS } from './scripts/blueprint.js';
import { EVENT_LOADED, EVENT_NOTHING_2D_SELECTED, EVENT_CORNER_2D_CLICKED, EVENT_WALL_2D_CLICKED,
    EVENT_ROOM_2D_CLICKED, EVENT_WALL_CLICKED, EVENT_ROOM_CLICKED, EVENT_NO_ITEM_SELECTED,
    EVENT_ITEM_SELECTED } from './scripts/core/events.js';
import { Configuration, configDimUnit, viewBounds, itemStatistics } from './scripts/core/configuration.js';
import { dimMeter, dimCentiMeter, dimFeetAndInch, dimInch, TEXTURE_NO_PREVIEW } from './scripts/core/constants.js';

import { Dimensioning } from './scripts/core/dimensioning.js';
import { ParametricsInterface } from './scripts/ParametricsInterface.js';

import * as floor_textures_json from './floor_textures.json';
import * as wall_textures_json from './wall_textures.json';
import * as default_room_json from './design.json';

// ========================================
// Data & State
// ========================================
const floor_textures = floor_textures_json;
const floor_texture_keys = Object.keys(floor_textures);
const wall_textures = wall_textures_json;
const wall_texture_keys = Object.keys(wall_textures);

const doorsData = {
    'Door Type 1': { src: 'assets/doors/DoorType1.png', type: 1 },
    'Door Type 2': { src: 'assets/doors/DoorType2.png', type: 2 },
    'Door Type 3': { src: 'assets/doors/DoorType3.png', type: 3 },
    'Door Type 4': { src: 'assets/doors/DoorType4.png', type: 4 },
    'Door Type 5': { src: 'assets/doors/DoorType5.png', type: 5 },
    'Door Type 6': { src: 'assets/doors/DoorType6.png', type: 6 },
};
const doorTypes = Object.keys(doorsData);

let blueprint3d = null;
let configurationHelper = null;
let floorplanningHelper = null;
let roomplanningHelper = null;
let parametricContextInterface = null;
let currentMode = 'draw'; // 'draw', 'move', 'transform'
let currentDragElement = null; // 'door' or 'window'

// ========================================
// DOM Elements
// ========================================
const $ = (id) => document.getElementById(id);

const elements = {
    // View buttons
    btnView2D: $('btn-view-2d'),
    btnView3D: $('btn-view-3d'),

    // Tool buttons
    btnDraw: $('btn-draw'),
    btnMove: $('btn-move'),
    btnTransform: $('btn-transform'),
    btnDelete: $('btn-delete'),

    // Tool groups
    tools2D: $('tools-2d'),
    tools3D: $('tools-3d'),

    // Action buttons
    btnLoad: $('btn-load'),
    btnReset: $('btn-reset'),
    fileInput: $('file-input'),

    // Panels
    panel2D: $('panel-2d'),
    panel3D: $('panel-3d'),

    // 2D Properties
    propsCorner: $('props-corner'),
    propsWall: $('props-wall'),
    propsRoom: $('props-room'),

    // 3D Properties
    propsWall3D: $('props-wall-3d'),
    propsRoom3D: $('props-room-3d'),
    noSelection3D: $('no-selection-3d'),

    // 2D Add elements
    btnAddDoor2D: $('btn-add-door-2d'),
    btnAddWindow2D: $('btn-add-window-2d'),
    addElementHint: $('add-element-hint'),

    // Drag & Drop
    dragPreview: $('drag-preview'),
    dragPreviewText: $('drag-preview-text'),
    viewer2D: $('bp3djs-viewer2d'),

    // 2D Options
    optSnap: $('opt-snap'),
    optDirectional: $('opt-directional'),
    optGridSpacing: $('opt-grid-spacing'),
    optSnapTolerance: $('opt-snap-tolerance'),

    // Corner properties
    cornerElevation: $('corner-elevation'),

    // Wall properties
    wallThickness: $('wall-thickness'),

    // Room properties
    roomName: $('room-name'),

    // 3D Wall textures
    wallTexture: $('wall-texture'),
    wallTexturePreview: $('wall-texture-preview'),
    wallTextureColor: $('wall-texture-color'),
    btnApplyWallTexture: $('btn-apply-wall-texture'),

    // Door
    doorType: $('door-type'),
    doorPreview: $('door-preview'),
    btnAddDoor: $('btn-add-door'),

    // 3D Floor textures
    floorTexture: $('floor-texture'),
    floorTexturePreview: $('floor-texture-preview'),
    floorTextureColor: $('floor-texture-color'),
    btnApplyFloorTexture: $('btn-apply-floor-texture'),

    // 3D Room wall textures
    roomWallTexture: $('room-wall-texture'),
    roomWallTexturePreview: $('room-wall-texture-preview'),
    roomWallTextureColor: $('room-wall-texture-color'),
    btnApplyRoomWallsTexture: $('btn-apply-room-walls-texture'),

    // Status
    statusMode: $('status-mode'),
    statusUnit: $('status-unit'),
    unitSelect: $('unit-select'),
    fpsCounter: $('fps-counter'),

    // Background Image
    bgImageInput: $('bg-image-input'),
    btnLoadBgImage: $('btn-load-bg-image'),
    bgImageControls: $('bg-image-controls'),
    bgImageOpacity: $('bg-image-opacity'),
    bgImageRotation: $('bg-image-rotation'),
    bgImageVisible: $('bg-image-visible'),
    btnCalibrate: $('btn-calibrate'),
    calibrateHint: $('calibrate-hint'),
    calibrateInputGroup: $('calibrate-input-group'),
    bgCalibrateLength: $('bg-calibrate-length'),
    btnApplyCalibration: $('btn-apply-calibration'),
    btnCancelCalibration: $('btn-cancel-calibration'),
    btnRemoveBgImage: $('btn-remove-bg-image'),
};

// ========================================
// FPS Counter
// ========================================
const fps = FPS.of({ x: 0, y: 0 });
fps.start();

setInterval(() => {
    if (elements.fpsCounter) {
        elements.fpsCounter.textContent = `${Math.round(fps.rate)} FPS`;
    }
}, 500);

// ========================================
// Utility Functions
// ========================================
function populateSelect(selectElement, options, defaultIndex = 0) {
    selectElement.innerHTML = '';
    options.forEach((option, index) => {
        const opt = document.createElement('option');
        opt.value = option;
        opt.textContent = option;
        if (index === defaultIndex) opt.selected = true;
        selectElement.appendChild(opt);
    });
}

function updateRangeValue(input) {
    const valueSpan = input.parentElement.querySelector('.range-value');
    if (valueSpan) {
        valueSpan.textContent = input.value;
    }
}

function setActiveToolButton(activeBtn) {
    [elements.btnDraw, elements.btnMove, elements.btnTransform].forEach(btn => {
        btn.classList.remove('active');
    });
    activeBtn.classList.add('active');
}

function updateStatusMode(mode) {
    const modeNames = {
        draw: 'Dessin',
        move: 'Déplacement',
        transform: 'Transformation'
    };
    elements.statusMode.innerHTML = `
        <span class="material-icons-round">${mode === 'draw' ? 'edit' : mode === 'move' ? 'open_with' : 'transform'}</span>
        Mode: ${modeNames[mode]}
    `;
}

// ========================================
// View Switching
// ========================================
function switchTo2D() {
    blueprint3d.switchView();
    if (blueprint3d.currentView !== 2) {
        blueprint3d.switchView();
    }

    elements.btnView2D.classList.add('active');
    elements.btnView3D.classList.remove('active');
    elements.tools2D.classList.remove('hidden');
    elements.tools3D.classList.add('hidden');
    elements.panel2D.classList.remove('hidden');
    elements.panel3D.classList.add('hidden');

    hideAll2DProps();

    if (parametricContextInterface) {
        parametricContextInterface.destroy();
        parametricContextInterface = null;
    }
}

function switchTo3D() {
    blueprint3d.switchView();
    if (blueprint3d.currentView !== 3) {
        blueprint3d.switchView();
    }

    elements.btnView2D.classList.remove('active');
    elements.btnView3D.classList.add('active');
    elements.tools2D.classList.add('hidden');
    elements.tools3D.classList.remove('hidden');
    elements.panel2D.classList.add('hidden');
    elements.panel3D.classList.remove('hidden');

    hideAll3DProps();
    elements.noSelection3D.classList.remove('hidden');
}

// ========================================
// 2D Mode Functions
// ========================================
function switchToDrawMode() {
    currentMode = 'draw';
    blueprint3d.setViewer2DModeToDraw();
    setActiveToolButton(elements.btnDraw);
    updateStatusMode('draw');
}

function switchToMoveMode() {
    currentMode = 'move';
    blueprint3d.setViewer2DModeToMove();
    setActiveToolButton(elements.btnMove);
    updateStatusMode('move');
}

function switchToTransformMode() {
    currentMode = 'transform';
    blueprint3d.switchViewer2DToTransform();
    setActiveToolButton(elements.btnTransform);
    updateStatusMode('transform');
}

function hideAll2DProps() {
    elements.propsCorner.classList.add('hidden');
    elements.propsWall.classList.add('hidden');
    elements.propsRoom.classList.add('hidden');
    elements.btnDelete.disabled = true;
}

function hideAll3DProps() {
    elements.propsWall3D.classList.add('hidden');
    elements.propsRoom3D.classList.add('hidden');
    elements.noSelection3D.classList.add('hidden');
}

function updateAddElementHint() {
    // Always enable buttons since we support drag & drop now
    elements.btnAddDoor2D.disabled = false;
    elements.btnAddWindow2D.disabled = false;

    if (floorplanningHelper && floorplanningHelper.selectedWall) {
        elements.addElementHint.textContent = 'Cliquez ou glissez pour ajouter';
        elements.addElementHint.style.color = 'var(--text-muted)';
    } else {
        elements.addElementHint.textContent = 'Glissez un élément sur le plan 2D';
        elements.addElementHint.style.color = 'var(--text-muted)';
    }
}

// ========================================
// File Operations
// ========================================
function loadDesign(file) {
    const reader = new FileReader();
    reader.onload = (event) => {
        blueprint3d.model.loadSerialized(event.target.result);
    };
    reader.readAsText(file);
}


// ========================================
// Texture Functions
// ========================================
function getSelectedFloorTexture() {
    const key = elements.floorTexture.value;
    return floor_textures[key];
}

function getSelectedWallTexture() {
    const key = elements.wallTexture.value;
    return wall_textures[key];
}

function getSelectedRoomWallTexture() {
    const key = elements.roomWallTexture.value;
    return wall_textures[key];
}

function applyFloorTexture() {
    const texturePack = getSelectedFloorTexture();
    const color = elements.floorTextureColor.value;
    roomplanningHelper.roomTexturePack = texturePack;
    roomplanningHelper.setRoomFloorColor(color);
}

function applyWallTexture() {
    const texturePack = getSelectedWallTexture();
    const color = elements.wallTextureColor.value;
    roomplanningHelper.wallTexturePack = texturePack;
    roomplanningHelper.setWallColor(color);
}

function applyRoomWallsTexture() {
    const texturePack = getSelectedRoomWallTexture();
    const color = elements.roomWallTextureColor.value;
    roomplanningHelper.roomWallsTexturePack = texturePack;
    roomplanningHelper.setRoomWallsTextureColor(color);
}

function updateFloorTexturePreview() {
    const texturePack = getSelectedFloorTexture();
    elements.floorTexturePreview.src = texturePack?.colormap || TEXTURE_NO_PREVIEW;
}

function updateWallTexturePreview() {
    const texturePack = getSelectedWallTexture();
    elements.wallTexturePreview.src = texturePack?.colormap || TEXTURE_NO_PREVIEW;
}

function updateRoomWallTexturePreview() {
    const texturePack = getSelectedRoomWallTexture();
    elements.roomWallTexturePreview.src = texturePack?.colormap || TEXTURE_NO_PREVIEW;
}

function updateDoorPreview() {
    const doorKey = elements.doorType.value;
    const door = doorsData[doorKey];
    elements.doorPreview.src = door?.src || '';
}

function addDoor() {
    const doorKey = elements.doorType.value;
    const door = doorsData[doorKey];
    if (door) {
        roomplanningHelper.addParametricDoorToCurrentWall(door.type);
    }
}

// ========================================
// Unit Configuration
// ========================================
function updateUnit(value) {
    const unitMap = {
        'm': dimMeter,
        'cm': dimCentiMeter,
        'ft': dimFeetAndInch,
        'inch': dimInch
    };
    const unitNames = {
        'm': 'Mètres',
        'cm': 'Centimètres',
        'ft': 'Pieds',
        'inch': 'Pouces'
    };

    Configuration.setValue(configDimUnit, unitMap[value]);
    elements.statusUnit.innerHTML = `
        <span class="material-icons-round">straighten</span>
        Unité: ${unitNames[value]}
    `;
}

// ========================================
// Background Image Functions
// ========================================
let isCalibrating = false;

function loadBackgroundImage(file) {
    const reader = new FileReader();
    reader.onload = async (event) => {
        try {
            await blueprint3d.floorplanner.setBackgroundImage(event.target.result, {
                opacity: 0.5
            });

            // Afficher les contrôles
            elements.bgImageControls.classList.remove('hidden');
            elements.bgImageOpacity.value = 50;
            elements.bgImageRotation.value = 0;
            elements.bgImageVisible.checked = true;
            updateRangeValue(elements.bgImageOpacity);
            updateRangeValue(elements.bgImageRotation);
            elements.calibrateHint.textContent = '';

            // Sauvegarder dans le modèle
            saveBackgroundImageToModel();

            console.log('Image de fond chargée');
        } catch (err) {
            console.error('Erreur lors du chargement de l\'image:', err);
            alert('Erreur lors du chargement de l\'image');
        }
    };
    reader.readAsDataURL(file);
}

function updateBgOpacity() {
    const bgImage = blueprint3d.floorplanner.getBackgroundImage();
    if (bgImage) {
        bgImage.setOpacity(elements.bgImageOpacity.value / 100);
        saveBackgroundImageToModel();
    }
    const valueSpan = elements.bgImageOpacity.parentElement.querySelector('.range-value');
    if (valueSpan) {
        valueSpan.textContent = elements.bgImageOpacity.value + '%';
    }
}

function updateBgRotation() {
    const bgImage = blueprint3d.floorplanner.getBackgroundImage();
    if (bgImage) {
        bgImage.setRotation(parseFloat(elements.bgImageRotation.value));
        saveBackgroundImageToModel();
    }
    const valueSpan = elements.bgImageRotation.parentElement.querySelector('.range-value');
    if (valueSpan) {
        valueSpan.textContent = elements.bgImageRotation.value + '°';
    }
}

function toggleBgVisibility() {
    const bgImage = blueprint3d.floorplanner.getBackgroundImage();
    if (bgImage) {
        bgImage.visible = elements.bgImageVisible.checked;
    }
}

function startCalibration() {
    isCalibrating = true;
    elements.calibrateHint.textContent = 'Cliquez sur le premier point de la ligne';
    elements.calibrateHint.style.color = 'var(--accent-primary)';
    elements.calibrateInputGroup.classList.add('hidden');

    blueprint3d.floorplanner.startCalibrationMode((p1, p2, lineLength) => {
        // Les deux points ont été définis
        elements.calibrateHint.textContent = 'Ligne tracée! Entrez la longueur réelle.';
        elements.calibrateHint.style.color = 'var(--accent-secondary)';
        elements.calibrateInputGroup.classList.remove('hidden');
    });

    // Mettre à jour le hint après le premier clic
    const checkFirstPoint = setInterval(() => {
        if (blueprint3d.floorplanner.__calibrationPoint1 && !blueprint3d.floorplanner.__calibrationPoint2) {
            elements.calibrateHint.textContent = 'Cliquez sur le deuxième point';
        }
        if (!isCalibrating) {
            clearInterval(checkFirstPoint);
        }
    }, 100);
}

function applyCalibration() {
    const lengthM = parseFloat(elements.bgCalibrateLength.value);
    if (isNaN(lengthM) || lengthM <= 0) {
        alert('Veuillez entrer une longueur valide');
        return;
    }

    // Convertir mètres en cm
    const lengthCm = lengthM * 100;

    blueprint3d.floorplanner.applyCalibration(lengthCm);
    blueprint3d.floorplanner.endCalibrationMode();

    isCalibrating = false;
    elements.calibrateHint.textContent = 'Calibration appliquée!';
    elements.calibrateHint.style.color = 'var(--accent-secondary)';
    elements.calibrateInputGroup.classList.add('hidden');

    // Sauvegarder dans le modèle
    saveBackgroundImageToModel();

    setTimeout(() => {
        elements.calibrateHint.textContent = '';
    }, 3000);
}

function cancelCalibration() {
    isCalibrating = false;
    blueprint3d.floorplanner.endCalibrationMode();
    elements.calibrateHint.textContent = '';
    elements.calibrateInputGroup.classList.add('hidden');
}

function removeBackgroundImage() {
    blueprint3d.floorplanner.removeBackgroundImage();
    blueprint3d.model.setBackgroundImageData(null);
    elements.bgImageControls.classList.add('hidden');
    elements.calibrateInputGroup.classList.add('hidden');
    elements.calibrateHint.textContent = '';
    isCalibrating = false;
}

function saveBackgroundImageToModel() {
    const bgData = blueprint3d.floorplanner.getBackgroundImageData();
    blueprint3d.model.setBackgroundImageData(bgData);
}

async function loadBackgroundImageFromModel() {
    const bgData = blueprint3d.model.getBackgroundImageData();
    if (bgData && bgData.dataURL) {
        try {
            await blueprint3d.floorplanner.loadBackgroundImageData(bgData);

            // Mettre à jour l'UI
            elements.bgImageControls.classList.remove('hidden');
            elements.bgImageOpacity.value = (bgData.opacity || 0.5) * 100;
            elements.bgImageRotation.value = bgData.rotation || 0;
            elements.bgImageVisible.checked = true;
            updateRangeValue(elements.bgImageOpacity);
            updateRangeValue(elements.bgImageRotation);
            elements.calibrateHint.textContent = bgData.calibrated ? 'Image calibrée' : '';

            console.log('Image de fond restaurée depuis le projet');
        } catch (err) {
            console.error('Erreur lors du chargement de l\'image de fond:', err);
        }
    }
}

// ========================================
// Event Binding
// ========================================
function bindEvents() {
    // View switching
    elements.btnView2D.addEventListener('click', switchTo2D);
    elements.btnView3D.addEventListener('click', switchTo3D);

    // 2D Tools
    elements.btnDraw.addEventListener('click', switchToDrawMode);
    elements.btnMove.addEventListener('click', switchToMoveMode);
    elements.btnTransform.addEventListener('click', switchToTransformMode);
    elements.btnDelete.addEventListener('click', () => floorplanningHelper.deleteCurrentItem());

    // File operations
    elements.btnLoad.addEventListener('click', () => elements.fileInput.click());
    elements.fileInput.addEventListener('change', (e) => {
        if (e.target.files[0]) loadDesign(e.target.files[0]);
    });
    elements.btnReset.addEventListener('click', () => blueprint3d.model.reset());

    // 2D Options
    elements.optSnap.addEventListener('change', (e) => {
        configurationHelper.snapToGrid = e.target.checked;
    });
    elements.optDirectional.addEventListener('change', (e) => {
        configurationHelper.directionalDrag = e.target.checked;
    });
    elements.optGridSpacing.addEventListener('input', (e) => {
        updateRangeValue(e.target);
        configurationHelper.gridSpacing = parseInt(e.target.value);
    });
    elements.optSnapTolerance.addEventListener('input', (e) => {
        updateRangeValue(e.target);
        configurationHelper.snapTolerance = parseInt(e.target.value);
    });

    // Corner elevation
    elements.cornerElevation.addEventListener('change', (e) => {
        floorplanningHelper.cornerElevation = Dimensioning.cmFromMeasureRaw(parseFloat(e.target.value));
    });

    // Wall thickness
    elements.wallThickness.addEventListener('change', (e) => {
        floorplanningHelper.wallThickness = Dimensioning.cmFromMeasureRaw(parseFloat(e.target.value));
    });

    // Room name
    elements.roomName.addEventListener('change', (e) => {
        floorplanningHelper.roomName = e.target.value;
    });

    // 3D Textures
    elements.floorTexture.addEventListener('change', updateFloorTexturePreview);
    elements.wallTexture.addEventListener('change', updateWallTexturePreview);
    elements.roomWallTexture.addEventListener('change', updateRoomWallTexturePreview);
    elements.doorType.addEventListener('change', updateDoorPreview);

    elements.btnApplyFloorTexture.addEventListener('click', applyFloorTexture);
    elements.btnApplyWallTexture.addEventListener('click', applyWallTexture);
    elements.btnApplyRoomWallsTexture.addEventListener('click', applyRoomWallsTexture);
    elements.btnAddDoor.addEventListener('click', addDoor);

    // Unit select
    elements.unitSelect.addEventListener('change', (e) => updateUnit(e.target.value));

    // Background Image
    elements.btnLoadBgImage.addEventListener('click', () => elements.bgImageInput.click());
    elements.bgImageInput.addEventListener('change', (e) => {
        if (e.target.files[0]) {
            loadBackgroundImage(e.target.files[0]);
        }
    });
    elements.bgImageOpacity.addEventListener('input', updateBgOpacity);
    elements.bgImageRotation.addEventListener('input', updateBgRotation);
    elements.bgImageVisible.addEventListener('change', toggleBgVisibility);
    elements.btnCalibrate.addEventListener('click', startCalibration);
    elements.btnApplyCalibration.addEventListener('click', applyCalibration);
    elements.btnCancelCalibration.addEventListener('click', cancelCalibration);
    elements.btnRemoveBgImage.addEventListener('click', removeBackgroundImage);

    // 2D Add elements (door/window)
    elements.btnAddDoor2D.addEventListener('click', () => {
        if (floorplanningHelper.addDoorToSelectedWall(1)) {
            elements.addElementHint.textContent = 'Porte ajoutée au mur sélectionné';
            elements.addElementHint.style.color = 'var(--accent-primary)';
            setTimeout(() => {
                updateAddElementHint();
            }, 2000);
        } else {
            elements.addElementHint.textContent = 'Sélectionnez un mur d\'abord';
            elements.addElementHint.style.color = 'var(--danger)';
        }
    });

    elements.btnAddWindow2D.addEventListener('click', () => {
        if (floorplanningHelper.addWindowToSelectedWall()) {
            elements.addElementHint.textContent = 'Fenêtre ajoutée au mur sélectionné';
            elements.addElementHint.style.color = 'var(--accent-primary)';
            setTimeout(() => {
                updateAddElementHint();
            }, 2000);
        } else {
            elements.addElementHint.textContent = 'Sélectionnez un mur d\'abord';
            elements.addElementHint.style.color = 'var(--danger)';
        }
    });
}

// ========================================
// Drag & Drop Functions (Custom implementation)
// ========================================
let isDragging = false;
let dragSourceElement = null;

function setupDragAndDrop() {
    // Use mousedown instead of dragstart for better control
    elements.btnAddDoor2D.addEventListener('mousedown', (e) => startCustomDrag(e, 'door'));
    elements.btnAddWindow2D.addEventListener('mousedown', (e) => startCustomDrag(e, 'window'));

    // Global mouse events for drag
    document.addEventListener('mousemove', handleCustomDragMove);
    document.addEventListener('mouseup', handleCustomDragEnd);
}

function startCustomDrag(e, elementType) {
    e.preventDefault();
    isDragging = true;
    currentDragElement = elementType;
    dragSourceElement = e.currentTarget;
    dragSourceElement.classList.add('dragging');

    // Update preview text and icon
    elements.dragPreviewText.textContent = elementType === 'door' ? 'Porte' : 'Fenêtre';

    const previewIcon = elements.dragPreview.querySelector('.preview-icon');
    if (elementType === 'door') {
        previewIcon.innerHTML = '<rect x="4" y="2" width="16" height="20" rx="1"/><path d="M14 2v20"/><circle cx="12" cy="12" r="1"/>';
    } else {
        previewIcon.innerHTML = '<rect x="3" y="4" width="18" height="16" rx="1"/><line x1="12" y1="4" x2="12" y2="20"/><line x1="3" y1="12" x2="21" y2="12"/>';
    }

    // Position and show preview
    elements.dragPreview.style.left = e.clientX + 'px';
    elements.dragPreview.style.top = e.clientY + 'px';
    elements.dragPreview.classList.add('visible');

    // Update hint
    elements.addElementHint.textContent = 'Déposez sur un mur du plan 2D';
    elements.addElementHint.style.color = 'var(--accent-primary)';
}

function handleCustomDragMove(e) {
    if (!isDragging || !currentDragElement) return;

    // Move preview
    elements.dragPreview.style.left = e.clientX + 'px';
    elements.dragPreview.style.top = e.clientY + 'px';

    // Check if over 2D viewer
    const rect = elements.viewer2D.getBoundingClientRect();
    const isOverViewer = e.clientX >= rect.left && e.clientX <= rect.right &&
                         e.clientY >= rect.top && e.clientY <= rect.bottom;

    if (isOverViewer) {
        elements.viewer2D.classList.add('drop-target');

        // Convert to cm and check wall proximity
        const pixelX = e.clientX - rect.left;
        const pixelY = e.clientY - rect.top;
        const cmPos = pixelToFloorplanCm(pixelX, pixelY);

        if (cmPos) {
            const closest = floorplanningHelper.findClosestWall(cmPos.x, cmPos.y);
            if (closest && closest.distance < 150) {
                elements.viewer2D.classList.add('drop-target-valid');
                elements.viewer2D.classList.remove('drop-target-invalid');
                elements.addElementHint.textContent = 'Relâchez pour placer';
                elements.addElementHint.style.color = 'var(--accent-secondary)';
            } else {
                elements.viewer2D.classList.add('drop-target-invalid');
                elements.viewer2D.classList.remove('drop-target-valid');
                elements.addElementHint.textContent = 'Trop loin d\'un mur';
                elements.addElementHint.style.color = 'var(--accent-danger)';
            }
        }
    } else {
        elements.viewer2D.classList.remove('drop-target', 'drop-target-valid', 'drop-target-invalid');
        elements.addElementHint.textContent = 'Déposez sur un mur du plan 2D';
        elements.addElementHint.style.color = 'var(--accent-primary)';
    }
}

function handleCustomDragEnd(e) {
    if (!isDragging || !currentDragElement) return;

    // Store element type before reset
    const elementType = currentDragElement;

    // Hide preview and reset styles
    elements.dragPreview.classList.remove('visible');
    elements.viewer2D.classList.remove('drop-target', 'drop-target-valid', 'drop-target-invalid');
    if (dragSourceElement) {
        dragSourceElement.classList.remove('dragging');
    }

    // Check if dropped on 2D viewer
    const rect = elements.viewer2D.getBoundingClientRect();
    const isOverViewer = e.clientX >= rect.left && e.clientX <= rect.right &&
                         e.clientY >= rect.top && e.clientY <= rect.bottom;

    console.log('Drop - isOverViewer:', isOverViewer, 'elementType:', elementType);
    console.log('Viewer rect:', rect);
    console.log('Mouse position:', e.clientX, e.clientY);

    if (isOverViewer) {
        const pixelX = e.clientX - rect.left;
        const pixelY = e.clientY - rect.top;
        const cmPos = pixelToFloorplanCm(pixelX, pixelY);

        console.log('Drop position - pixel:', pixelX, pixelY, 'cm:', cmPos);

        if (cmPos) {
            let success = false;
            let successMessage = '';

            if (elementType === 'entry-door') {
                console.log('Adding entry door at', cmPos.x, cmPos.y);
                if (floorplanningHelper.hasEntryDoor()) {
                    console.log('Entry door already exists, replacing...');
                }
                success = floorplanningHelper.addEntryDoorAtPosition(cmPos.x, cmPos.y);
                successMessage = 'Porte d\'entrée ajoutée!';
            } else if (elementType === 'door') {
                console.log('Adding internal door at', cmPos.x, cmPos.y);
                success = floorplanningHelper.addDoorAtPosition(cmPos.x, cmPos.y, 1);
                successMessage = 'Porte interne ajoutée!';
            } else if (elementType === 'window') {
                console.log('Adding window at', cmPos.x, cmPos.y);
                success = floorplanningHelper.addWindowAtPosition(cmPos.x, cmPos.y);
                successMessage = 'Fenêtre ajoutée!';
            }

            console.log('Add result:', success);

            if (success) {
                elements.addElementHint.textContent = successMessage;
                elements.addElementHint.style.color = 'var(--accent-secondary)';
            } else {
                elements.addElementHint.textContent = 'Trop loin d\'un mur';
                elements.addElementHint.style.color = 'var(--accent-danger)';
            }
        } else {
            console.log('cmPos is null');
            elements.addElementHint.textContent = 'Erreur de position';
            elements.addElementHint.style.color = 'var(--accent-danger)';
        }
    }

    // Reset state
    isDragging = false;
    currentDragElement = null;
    dragSourceElement = null;

    // Reset hint after delay
    setTimeout(() => {
        if (!isDragging) {
            elements.addElementHint.textContent = 'Glissez un élément sur le plan 2D';
            elements.addElementHint.style.color = 'var(--text-muted)';
        }
    }, 2000);
}

// Debug function - test adding door to first wall
window.testAddDoor = function() {
    const walls = floorplanningHelper.floorplan.walls;
    console.log('Number of walls:', walls.length);
    if (walls.length > 0) {
        const wall = walls[0];
        const center = wall.wallCenter();
        console.log('Wall center:', center);
        const success = floorplanningHelper.addDoorAtPosition(center.x, center.y, 1);
        console.log('Door added:', success);
    }
};

window.testAddWindow = function() {
    const walls = floorplanningHelper.floorplan.walls;
    console.log('Number of walls:', walls.length);
    if (walls.length > 0) {
        const wall = walls[0];
        const center = wall.wallCenter();
        console.log('Wall center:', center);
        const success = floorplanningHelper.addWindowAtPosition(center.x, center.y);
        console.log('Window added:', success);
    }
};

function pixelToFloorplanCm(pixelX, pixelY) {
    // Get the floorplanner viewport info
    if (!blueprint3d || !blueprint3d.floorplanner) {
        console.warn('blueprint3d or floorplanner not found');
        return null;
    }

    const floorplanner = blueprint3d.floorplanner;

    // Use the public getters we added to Viewer2D
    const viewportPos = floorplanner.viewportPosition;
    const scale = floorplanner.viewportScale;

    if (!viewportPos || !scale) {
        console.warn('Could not get viewport info');
        return null;
    }

    // Convert pixel position to world coordinates
    const worldX = (pixelX - viewportPos.x) / scale;
    const worldY = (pixelY - viewportPos.y) / scale;

    // Convert from pixels to cm
    const cmX = Dimensioning.pixelToCm(worldX);
    const cmY = Dimensioning.pixelToCm(worldY);

    return { x: cmX, y: cmY };
}

// ========================================
// Blueprint3D Event Listeners
// ========================================
function bindBlueprintEvents() {
    blueprint3d.model.addEventListener(EVENT_LOADED, async () => {
        console.log('Design loaded');
        // Charger l'image de fond si présente dans le projet
        await loadBackgroundImageFromModel();
    });

    // 2D Events
    blueprint3d.floorplanner.addFloorplanListener(EVENT_NOTHING_2D_SELECTED, () => {
        hideAll2DProps();
        updateAddElementHint();
    });

    blueprint3d.floorplanner.addFloorplanListener(EVENT_CORNER_2D_CLICKED, (evt) => {
        hideAll2DProps();
        elements.propsCorner.classList.remove('hidden');
        elements.btnDelete.disabled = false;
        elements.cornerElevation.value = Dimensioning.cmToMeasureRaw(evt.item.elevation);
        updateAddElementHint();
    });

    blueprint3d.floorplanner.addFloorplanListener(EVENT_WALL_2D_CLICKED, (evt) => {
        hideAll2DProps();
        elements.propsWall.classList.remove('hidden');
        elements.btnDelete.disabled = false;
        elements.wallThickness.value = Dimensioning.cmToMeasureRaw(evt.item.thickness);
        updateAddElementHint();
    });

    blueprint3d.floorplanner.addFloorplanListener(EVENT_ROOM_2D_CLICKED, (evt) => {
        hideAll2DProps();
        elements.propsRoom.classList.remove('hidden');
        elements.roomName.value = evt.item.name || '';
        updateAddElementHint();
    });

    // 3D Events
    blueprint3d.roomplanner.addRoomplanListener(EVENT_ITEM_SELECTED, (evt) => {
        hideAll3DProps();

        if (parametricContextInterface) {
            parametricContextInterface.destroy();
            parametricContextInterface = null;
        }

        const itemModel = evt.itemModel;
        if (itemModel.isParametric) {
            parametricContextInterface = new ParametricsInterface(itemModel.parametricClass, blueprint3d.roomplanner);
        }
    });

    blueprint3d.roomplanner.addRoomplanListener(EVENT_NO_ITEM_SELECTED, () => {
        hideAll3DProps();
        elements.noSelection3D.classList.remove('hidden');

        if (parametricContextInterface) {
            parametricContextInterface.destroy();
            parametricContextInterface = null;
        }
    });

    blueprint3d.roomplanner.addRoomplanListener(EVENT_WALL_CLICKED, () => {
        hideAll3DProps();
        elements.propsWall3D.classList.remove('hidden');

        if (parametricContextInterface) {
            parametricContextInterface.destroy();
            parametricContextInterface = null;
        }
    });

    blueprint3d.roomplanner.addRoomplanListener(EVENT_ROOM_CLICKED, () => {
        hideAll3DProps();
        elements.propsRoom3D.classList.remove('hidden');

        if (parametricContextInterface) {
            parametricContextInterface.destroy();
            parametricContextInterface = null;
        }
    });
}

// ========================================
// Initialization
// ========================================
function init() {
    console.log('Initializing Blueprint JS...');

    // Configure Blueprint3D
    Configuration.setValue(viewBounds, 10000);

    const opts = {
        viewer2d: {
            id: 'bp3djs-viewer2d',
            viewer2dOptions: {
                'corner-radius': 12.5,
                'boundary-point-radius': 5.0,
                'boundary-line-thickness': 2.0,
                'boundary-point-color': '#030303',
                'boundary-line-color': '#090909',
                pannable: true,
                zoomable: true,
                scale: false,
                rotate: true,
                translate: true,
                dimlinecolor: '#6366f1',
                dimarrowcolor: '#818cf8',
                dimtextcolor: '#ffffff',
                pixiAppOptions: {
                    resolution: 1,
                },
                pixiViewportOptions: {
                    passiveWheel: false,
                }
            },
        },
        viewer3d: {
            id: 'bp3djs-viewer3d',
            viewer3dOptions: {
                occludedWalls: false,
                occludedRoofs: false
            }
        },
        textureDir: "models/textures/",
        widget: false,
        resize: true,
    };

    blueprint3d = new BlueprintJS(opts);
    Configuration.setValue(configDimUnit, dimMeter);
    Configuration.setValue(itemStatistics, false);

    configurationHelper = blueprint3d.configurationHelper;
    floorplanningHelper = blueprint3d.floorplanningHelper;
    roomplanningHelper = blueprint3d.roomplanningHelper;

    // Populate selects
    populateSelect(elements.floorTexture, floor_texture_keys);
    populateSelect(elements.wallTexture, wall_texture_keys);
    populateSelect(elements.roomWallTexture, wall_texture_keys);
    populateSelect(elements.doorType, doorTypes);

    // Set initial previews
    updateFloorTexturePreview();
    updateWallTexturePreview();
    updateRoomWallTexturePreview();
    updateDoorPreview();

    // Bind events
    bindEvents();
    bindBlueprintEvents();
    setupDragAndDrop();

    // Load default design
    const defaultRoom = JSON.stringify(default_room_json);
    blueprint3d.model.loadSerialized(defaultRoom);

    // Set initial state
    updateStatusMode('draw');
    updateAddElementHint();

    console.log('Blueprint JS initialized successfully!');
}

// Start the application
init();
