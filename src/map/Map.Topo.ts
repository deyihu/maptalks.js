import { Geometry } from './../geometry';
import { INTERNAL_LAYER_PREFIX } from '../core/Constants';
import { isString, isArrayHasData, pushIn } from '../core/util';
import Coordinate from '../geo/Coordinate';
import Point from '../geo/Point';
// import Map from './Map';
type Constructor = new (...args: any[]) => {};
/**
 * Methods of topo computations
 * @mixin MapTopo
 */

export default function MapTopo<TBase extends Constructor>(Base: TBase) {
    return class extends Base {
        /** @lends Map.prototype */
        /**
         * Caculate distance of two coordinates.
         * @param {Number[]|Coordinate} coord1 - coordinate 1
         * @param {Number[]|Coordinate} coord2 - coordinate 2
         * @return {Number} distance, unit is meter
         * @function MapTopo.computeLength
         * @example
         * var distance = map.computeLength([0, 0], [0, 20]);
         */
        computeLength(coord1: Coordinate, coord2: Coordinate) {
            //@ts-ignore
            if (!this.getProjection()) {
                return null;
            }
            const p1 = new Coordinate(coord1),
                p2 = new Coordinate(coord2);
            if (p1.equals(p2)) {
                return 0;
            }
            //@ts-ignore
            return this.getProjection().measureLength(p1, p2);
        }

        /**
         * Caculate a geometry's length.
         * @param {Geometry} geometry - geometry to caculate
         * @return {Number} length, unit is meter
         * @function MapTopo.computeGeometryLength
         */
        computeGeometryLength(geometry: Geometry) {
            //@ts-ignore
            return geometry._computeGeodesicLength(this.getProjection());
        }

        /**
         * Caculate a geometry's area.
         * @param  {Geometry} geometry - geometry to caculate
         * @return {Number} area, unit is sq.meter
         * @function MapTopo.computeGeometryArea
         */
        computeGeometryArea(geometry: Geometry) {
            //@ts-ignore
            return geometry._computeGeodesicArea(this.getProjection());
        }

        /**
         * Identify the geometries on the given coordinate.
         * @param {Object} opts - the identify options
         * @param {Coordinate} opts.coordinate - coordinate to identify
         * @param {Object}   opts.layers        - the layers to perform identify on.
         * @param {Function} [opts.filter=null] - filter function of the result geometries, return false to exclude.
         * @param {Number}   [opts.count=null]  - limit of the result count.
         * @param {Number}   [opts.tolerance=0] - identify tolerance in pixel.
         * @param {Boolean}  [opts.includeInternals=false] - whether to identify internal layers.
         * @param {Boolean}  [opts.includeInvisible=false] - whether to identify invisible layers.
         * @param {Function} callback           - the callback function using the result geometries as the parameter.
         * @return {Map} this
         * @function MapTopo.identify
         * @example
         * map.identify({
         *      coordinate: [0, 0],
         *      layers: [layer]
         *  },
         *  geos => {
         *      console.log(geos);
         *  });
         */
        identify(opts, callback) {
            opts = opts || {};
            const coordinate = new Coordinate(opts['coordinate']);
            return this._identify(opts, callback, layer => layer.identify(coordinate, opts));
        }

        /**
         * Identify the geometries on the given container point.
         * @param {Object} opts - the identify options
         * @param {Point} opts.containerPoint - container point to identify
         * @param {Object}   opts.layers        - the layers to perform identify on.
         * @param {Function} [opts.filter=null] - filter function of the result geometries, return false to exclude.
         * @param {Number}   [opts.count=null]  - limit of the result count.
         * @param {Number}   [opts.tolerance=0] - identify tolerance in pixel.
         * @param {Boolean}  [opts.includeInternals=false] - whether to identify internal layers.
         * @param {Boolean}  [opts.includeInvisible=false] - whether to identify invisible layers.
         * @param {Function} callback           - the callback function using the result geometries as the parameter.
         * @return {Map} this
         * @function MapTopo.identifyAtPoint
         * @example
         * map.identifyAtPoint({
         *      containerPoint: [200, 300],
         *      layers: [layer]
         *  },
         *  geos => {
         *      console.log(geos);
         *  });
         */
        identifyAtPoint(opts, callback) {
            opts = opts || {};
            const containerPoint = new Point(opts['containerPoint']);
            //@ts-ignore
            const coordinate = this.containerPointToCoord(containerPoint);
            return this._identify(opts, callback, layer => {
                if (layer.identifyAtPoint) {
                    return layer.identifyAtPoint(containerPoint, opts);
                } else if (coordinate) {
                    return layer.identify(coordinate, opts);
                } else {
                    return [];
                }
            });
        }

        _identify(opts, callback, fn) {
            const reqLayers = opts['layers'];
            if (!isArrayHasData(reqLayers)) {
                return this;
            }
            const eventTypes = opts.eventTypes;
            let layers = [];
            for (let i = 0, len = reqLayers.length; i < len; i++) {
                if (isString(reqLayers[i])) {
                    //@ts-ignore
                    layers.push(this.getLayer(reqLayers[i]));
                } else {
                    layers.push(reqLayers[i]);
                }
            }
            if (eventTypes) {
                layers = layers.filter(layer => {
                    if (!layer._hasGeoListeners) {
                        return true;
                    }
                    return layer._hasGeoListeners(eventTypes);
                });
            }


            const hits = [];
            for (let i = layers.length - 1; i >= 0; i--) {
                if (opts['count'] && hits.length >= opts['count']) {
                    break;
                }
                const layer = layers[i];
                if (!layer || !layer.getMap() || (!opts['includeInvisible'] && !layer.isVisible()) || (!opts['includeInternals'] && layer.getId().indexOf(INTERNAL_LAYER_PREFIX) >= 0)) {
                    continue;
                }
                const layerHits = fn(layer);
                if (layerHits) {
                    if (Array.isArray(layerHits)) {
                        //@ts-ignore
                        pushIn(hits, layerHits);
                    } else {
                        hits.push(layerHits);
                    }
                }
            }
            callback.call(this, hits);
            return this;
        }

    }
}
