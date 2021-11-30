import { LayerState } from '../frontend/LayersController';

export default class LayerManager
{
    private layers: Map<string, LayerState>;

    constructor()
    {
        this.layers = new Map<string, LayerState.Off>();
    }

    setLayerState(layer: string, state: LayerState)
    {
        this.layers.set(layer, state);
    }

    getLayerState(layer: string)
    {
        const state = this.layers.get(layer);
        return state != undefined ? state : LayerState.Off;
    }

    clear()
    {
        this.layers.clear();
    }
}