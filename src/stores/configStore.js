import { create } from 'zustand';
import { Configuration, configDimUnit, configWallHeight, configWallThickness } from '../scripts/core/configuration';
import { dimCentiMeter, dimMeter, dimMilliMeter, dimFeetAndInch, dimInch } from '../scripts/core/constants';

export const DimensionUnits = {
    CENTIMETER: dimCentiMeter,
    METER: dimMeter,
    MILLIMETER: dimMilliMeter,
    FEET_AND_INCH: dimFeetAndInch,
    INCH: dimInch,
};

export const useConfigStore = create((set, get) => ({
    // Dimension unit (it's a string, not numeric)
    dimensionUnit: Configuration.getStringValue(configDimUnit),
    setDimensionUnit: (unit) => {
        Configuration.setValue(configDimUnit, unit);
        set({ dimensionUnit: unit });
    },

    // Wall defaults
    defaultWallHeight: Configuration.getNumericValue(configWallHeight),
    setDefaultWallHeight: (height) => {
        Configuration.setValue(configWallHeight, height);
        set({ defaultWallHeight: height });
    },

    defaultWallThickness: Configuration.getNumericValue(configWallThickness),
    setDefaultWallThickness: (thickness) => {
        Configuration.setValue(configWallThickness, thickness);
        set({ defaultWallThickness: thickness });
    },

    // Format dimension for display
    formatDimension: (value) => {
        const unit = get().dimensionUnit;
        switch (unit) {
            case dimMeter:
                return `${(value / 100).toFixed(2)} m`;
            case dimCentiMeter:
                return `${value.toFixed(1)} cm`;
            case dimMilliMeter:
                return `${(value * 10).toFixed(0)} mm`;
            case dimFeetAndInch:
                const totalInches = value / 2.54;
                const feet = Math.floor(totalInches / 12);
                const inches = Math.round(totalInches % 12);
                return `${feet}' ${inches}"`;
            case dimInch:
                return `${(value / 2.54).toFixed(1)} in`;
            default:
                return `${value.toFixed(1)} cm`;
        }
    },

    // Parse dimension from user input
    parseDimension: (input) => {
        const unit = get().dimensionUnit;
        const value = parseFloat(input);
        if (isNaN(value)) return null;

        switch (unit) {
            case dimMeter:
                return value * 100;
            case dimCentiMeter:
                return value;
            case dimMilliMeter:
                return value / 10;
            case dimInch:
                return value * 2.54;
            default:
                return value;
        }
    },
}));
