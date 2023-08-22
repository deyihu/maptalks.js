import {
    isNil,
    loadImage,
    emptyImageUrl,
    now,
    isFunction,
    getImageBitMap,
    isString,
    getAbsoluteURL
} from '../../../core/util';
import Canvas2D from '../../../core/Canvas';
import Browser from '../../../core/Browser';
import { default as TileLayer } from '../../../layer/tile/TileLayer';
import WMSTileLayer from '../../../layer/tile/WMSTileLayer';
import CanvasRenderer from '../CanvasRenderer';
import Point from '../../../geo/Point';
import LRUCache from '../../../core/util/LRUCache';
import Canvas from '../../../core/Canvas';
import Actor from '../../../core/worker/Actor';
import { imageFetchWorkerKey } from '../../../core/worker/CoreWorkers';

const TILE_POINT = new Point(0, 0);
const TEMP_POINT = new Point(0, 0);
const TEMP_POINT1 = new Point(0, 0);
const TEMP_POINT2 = new Point(0, 0);


const EMPTY_ARRAY = [];
class TileWorkerConnection extends Actor {
    constructor() {
        super(imageFetchWorkerKey);
    }

    checkUrl(url) {
        if (!url || !isString(url)) {
            return url;
        }
        //The URL is processed. Here, only the relative protocol is processed
        return getAbsoluteURL(url);

    }

    fetchImage(url, workerId, cb, fetchOptions) {
        url = this.checkUrl(url);
        const data = {
            url,
            fetchOptions
        };
        this.send(data, EMPTY_ARRAY, cb, workerId);
    }
}

const BLANK_IMAGE = new Image();

/**
 * @classdesc
 * Renderer class based on HTML5 Canvas2D for TileLayers
 * @class
 * @protected
 * @memberOf renderer
 * @extends {renderer.CanvasRenderer}
 */
class TileLayerCanvasRenderer extends CanvasRenderer {

    /**
     *
     * @param {TileLayer} layer - TileLayer to render
     */
    constructor(layer) {
        super(layer);
        this.tilesInView = {};
        this.tilesLoading = {};
        this._parentTiles = [];
        this._childTiles = [];
        this._tileQueue = [];
        this.tileCache = new LRUCache(layer.options['maxCacheSize'], tile => {
            this.deleteTile(tile);
        });
        if (Browser.decodeImageInWorker && this.layer.options['decodeImageInWorker'] && (layer.options['renderer'] === 'gl' || !Browser.safari && !Browser.iosWeixin)) {
            this._tileImageWorkerConn = new TileWorkerConnection();
        }
        this._compareTiles = compareTiles.bind(this);
    }

    getCurrentTileZoom() {
        return this._tileZoom;
    }

    draw(timestamp, context) {
        const map = this.getMap();
        if (!this.isDrawable()) {
            return;
        }
        const mask2DExtent = this.prepareCanvas();
        if (mask2DExtent) {
            if (!mask2DExtent.intersects(this.canvasExtent2D)) {
                this.completeRender();
                return;
            }
        }

        if (this._renderTimestamp !== timestamp) {
            // maptalks/issues#10
            // 如果consumeTileQueue方法在每个renderMode都会调用，但多边形只在fxaa mode下才会绘制。
            // 导致可能出现consumeTileQueue在fxaa阶段后调用，之后的阶段就不再绘制。
            // 改为consumeTileQueue只在finalRender时调用即解决问题
            this._consumeTileQueue();
            this._computeAvgTileAltitude();
            this._renderTimestamp = timestamp;
        }


        let currentTiles;
        let hasFreshTiles = false;
        const frameTiles = this._frameTiles;
        if (frameTiles && timestamp === frameTiles.timestamp) {
            if (frameTiles.empty) {
                return;
            }
            currentTiles = frameTiles;
        } else {
            currentTiles = this._getTilesInCurrentFrame();
            if (!currentTiles) {
                this._frameTiles = { empty: true, timestamp };
                this.completeRender();
                return;
            }
            hasFreshTiles = true;
            this._frameTiles = currentTiles;
            this._frameTiles.timestamp = timestamp;
            if (currentTiles.loadingCount) {
                this.loadTileQueue(currentTiles.tileQueue);
            }
        }
        const { tiles, childTiles, parentTiles, placeholders, loading, loadingCount } = currentTiles;

        this._drawTiles(tiles, parentTiles, childTiles, placeholders, context);
        if (!loadingCount) {
            if (!loading) {
                //redraw to remove parent tiles if any left in last paint
                if (!map.isAnimating() && (this._parentTiles.length || this._childTiles.length)) {
                    this._parentTiles = [];
                    this._childTiles = [];
                    this.setToRedraw();
                }
                this.completeRender();
            }
        }
        if (hasFreshTiles) {
            this._retireTiles();
        }
    }

    getTileGridsInCurrentFrame() {
        return this._frameTileGrids;
    }

    _getTilesInCurrentFrame() {
        const map = this.getMap();
        const layer = this.layer;
        let tileGrids = layer.getTiles();
        this._frameTileGrids = tileGrids;
        tileGrids = tileGrids.tileGrids;
        if (!tileGrids || !tileGrids.length) {
            return null;
        }
        const count = tileGrids.reduce((acc, curr) => acc + (curr && curr.tiles && curr.tiles.length || 0), 0);
        if (count >= (this.tileCache.max / 2)) {
            this.tileCache.setMaxSize(count * 2 + 1);
        }
        let loadingCount = 0;
        let loading = false;
        const checkedTiles = {};
        const tiles = [],
            parentTiles = [], parentKeys = {},
            childTiles = [], childKeys = {},
            placeholders = [], placeholderKeys = {};
        //visit all the tiles
        const tileQueue = {};
        const preLoadingCount = this._markTiles(),
            loadingLimit = this._getLoadLimit();

        const l = tileGrids.length;

        // main tile grid is the last one (draws on top)
        this._tileZoom = tileGrids[0]['zoom'];

        for (let i = 0; i < l; i++) {
            const tileGrid = tileGrids[i];
            const gridTiles = tileGrid['tiles'];
            const parents = tileGrid['parents'] || EMPTY_ARRAY;
            const parentCount = parents.length;
            const allTiles = parents.concat(gridTiles);

            let placeholder;
            if (allTiles.length) {
                placeholder = this._generatePlaceHolder(allTiles[0].res);
            }

            for (let j = 0, l = allTiles.length; j < l; j++) {
                const tile = allTiles[j];
                const tileId = tile['id'];
                const isParentTile = j < parentCount;
                //load tile in cache at first if it has.
                let tileLoading = false;
                if (this._isLoadingTile(tileId)) {
                    tileLoading = loading = true;
                    this.tilesLoading[tileId].current = true;
                } else {
                    const cached = this._getCachedTile(tileId, isParentTile);
                    if (cached) {
                        if (!isParentTile) {
                            if (cached.image && this.isTileFadingIn(cached.image)) {
                                tileLoading = loading = true;
                                this.setToRedraw();
                            }
                            tiles.push(cached);
                            if (!this.isTileComplete(cached)) {
                                tileLoading = true;
                            }
                        }
                    } else {
                        tileLoading = loading = true;
                        const hitLimit = loadingLimit && (loadingCount + preLoadingCount[0]) > loadingLimit;
                        if (!hitLimit && (!map.isInteracting() || (map.isMoving() || map.isRotating()))) {
                            loadingCount++;
                            const key = tileId;
                            tileQueue[key] = tile;
                        }
                    }
                }
                if (isParentTile) continue;
                if (!tileLoading) continue;
                if (checkedTiles[tileId]) continue;

                checkedTiles[tileId] = 1;
                if (placeholder && !placeholderKeys[tileId]) {
                    //tell gl renderer not to bind gl buffer with image
                    tile.cache = false;
                    placeholders.push({
                        image: placeholder,
                        info: tile
                    });

                    placeholderKeys[tileId] = 1;
                }

                const children = this._findChildTiles(tile);
                if (children.length) {
                    children.forEach(c => {
                        if (!childKeys[c.info.id]) {
                            childTiles.push(c);
                            childKeys[c.info.id] = 1;
                        }
                    });
                }
                // (children.length !== 4) means it's not complete, we still need a parent tile
                if (!children.length || children.length !== 4) {
                    const parentTile = this._findParentTile(tile);
                    if (parentTile) {
                        const parentId = parentTile.info.id;
                        if (parentKeys[parentId] === undefined) {
                            parentKeys[parentId] = parentTiles.length;
                            parentTiles.push(parentTile);
                        }/* else {
                            //replace with parentTile of above tiles
                            parentTiles[parentKeys[parentId]] = parentTile;
                        } */
                    }
                }
            }
        }

        this.tileCache.shrink();

        // if (parentTiles.length) {
        //     childTiles.length = 0;
        //     this._childTiles.length = 0;
        // }
        return {
            childTiles, parentTiles, tiles, placeholders, loading, loadingCount, tileQueue
        };
    }

    removeTileCache(tileId) {
        delete this.tilesInView[tileId];
        this.tileCache.remove(tileId);
    }

    isTileCachedOrLoading(tileId) {
        return this.tileCache.get(tileId) || this.tilesInView[tileId] || this.tilesLoading[tileId];
    }

    isTileCached(tileId) {
        return !!(this.tileCache.get(tileId) || this.tilesInView[tileId]);
    }

    isTileFadingIn(tileImage) {
        return this._getTileFadingOpacity(tileImage) < 1;
    }

    _drawTiles(tiles, parentTiles, childTiles, placeholders, parentContext) {
        if (parentTiles.length) {
            //closer the latter (to draw on top)
            // parentTiles.sort((t1, t2) => Math.abs(t2.info.z - this._tileZoom) - Math.abs(t1.info.z - this._tileZoom));
            parentTiles.sort(this._compareTiles);
            this._parentTiles = parentTiles;
        }
        if (childTiles.length) {
            this._childTiles = childTiles;
            this._childTiles.sort(this._compareTiles);
        }

        let drawBackground = true;
        const backgroundTimestamp = this.canvas._parentTileTimestamp;
        if (this.layer.constructor === TileLayer || this.layer.constructor === WMSTileLayer) {
            // background tiles are only painted once for TileLayer and WMSTileLayer per frame.
            if (this._renderTimestamp === backgroundTimestamp) {
                drawBackground = false;
            } else {
                this.canvas._parentTileTimestamp = this._renderTimestamp;
            }
        }

        const context = { tiles, parentTiles: this._parentTiles, childTiles: this._childTiles, parentContext };
        this.onDrawTileStart(context, parentContext);

        if (drawBackground && this.layer.options['opacity'] === 1) {
            this.layer._silentConfig = true;
            const fadingAnimation = this.layer.options['fadeAnimation'];
            this.layer.options['fadeAnimation'] = false;
            // _hasOwnSR 时，瓦片之间会有重叠，会产生z-fighting，所以背景瓦片要后绘制
            this.drawingChildTiles = true;
            this._childTiles.forEach(t => this._drawTile(t.info, t.image, parentContext));
            delete this.drawingChildTiles;
            this.drawingParentTiles = true;
            this._parentTiles.forEach(t => this._drawTile(t.info, t.image, parentContext));
            delete this.drawingParentTiles;
            this.layer.options['fadeAnimation'] = fadingAnimation;
            this.layer._silentConfig = false;
        }

        this.drawingCurrentTiles = true;
        tiles.sort(this._compareTiles);
        for (let i = 0, l = tiles.length; i < l; i++) {
            this._drawTileAndCache(tiles[i], parentContext);
        }
        delete this.drawingCurrentTiles;

        if (drawBackground && this.layer.options['opacity'] < 1) {
            this.layer._silentConfig = true;
            const fadingAnimation = this.layer.options['fadeAnimation'];
            this.layer.options['fadeAnimation'] = false;
            this.drawingChildTiles = true;
            this._childTiles.forEach(t => this._drawTile(t.info, t.image, parentContext));
            delete this.drawingChildTiles;
            this.drawingParentTiles = true;
            this._parentTiles.forEach(t => this._drawTile(t.info, t.image, parentContext));
            delete this.drawingParentTiles;
            this.layer.options['fadeAnimation'] = fadingAnimation;
            this.layer._silentConfig = false;
        }

        placeholders.forEach(t => this._drawTile(t.info, t.image, parentContext));

        this.onDrawTileEnd(context, parentContext);

    }

    onDrawTileStart() { }
    onDrawTileEnd() { }

    _drawTile(info, image, parentContext) {
        if (image) {
            this.drawTile(info, image, parentContext);
        }
    }

    _drawTileAndCache(tile, parentContext) {
        this.tilesInView[tile.info.id] = tile;
        this._drawTile(tile.info, tile.image, parentContext);
    }

    drawOnInteracting(event, timestamp, context) {
        this.draw(timestamp, context);
    }

    needToRedraw() {
        const map = this.getMap();
        if (this._tileQueue.length) {
            return true;
        }
        if (map.getPitch()) {
            return super.needToRedraw();
        }
        if (map.isRotating() || map.isZooming()) {
            return true;
        }
        if (map.isMoving()) {
            return !!this.layer.options['forceRenderOnMoving'];
        }
        return super.needToRedraw();
    }

    hitDetect() {
        return false;
    }

    // limit tile number to load when map is interacting
    _getLoadLimit() {
        if (this.getMap().isInteracting()) {
            return this.layer.options['loadingLimitOnInteracting'];
        }
        return this.layer.options['loadingLimit'] || 0;
    }

    isDrawable() {
        if (this.getMap().getPitch()) {
            if (console) {
                console.warn('TileLayer with canvas renderer can\'t be pitched, use gl renderer (\'renderer\' : \'gl\') instead.');
            }
            this.clear();
            return false;
        }
        return true;
    }

    clear() {
        this._retireTiles(true);
        this.tileCache.reset();
        this.tilesInView = {};
        this.tilesLoading = {};
        this._parentTiles = [];
        this._childTiles = [];
        super.clear();
    }

    _isLoadingTile(tileId) {
        return !!this.tilesLoading[tileId];
    }

    clipCanvas(context) {
        // const mask = this.layer.getMask();
        // if (!mask) {
        //     return this._clipByPitch(context);
        // }
        return super.clipCanvas(context);
    }

    // clip canvas to avoid rough edge of tiles
    _clipByPitch(ctx) {
        const map = this.getMap();
        if (map.getPitch() <= map.options['maxVisualPitch']) {
            return false;
        }
        if (!this.layer.options['clipByPitch']) {
            return false;
        }
        const clipExtent = map.getContainerExtent();
        const r = map.getDevicePixelRatio();
        ctx.save();
        ctx.strokeStyle = 'rgba(0, 0, 0, 0)';
        ctx.beginPath();
        ctx.rect(0, Math.ceil(clipExtent.ymin) * r, Math.ceil(clipExtent.getWidth()) * r, Math.ceil(clipExtent.getHeight()) * r);
        ctx.stroke();
        ctx.clip();
        return true;
    }

    loadTileQueue(tileQueue) {
        for (const p in tileQueue) {
            if (tileQueue.hasOwnProperty(p)) {
                const tile = tileQueue[p];
                const tileImage = this.loadTile(tile);
                if (tileImage.loadTime === undefined) {
                    // tile image's loading may not be async
                    this.tilesLoading[tile['id']] = {
                        image: tileImage,
                        current: true,
                        info: tile
                    };
                }
            }
        }
    }

    loadTile(tile) {
        let tileImage = {};
        if (this.loadTileBitmap) {
            const onLoad = (bitmap) => {
                this.onTileLoad(bitmap, tile);
            };
            this.loadTileBitmap(tile['url'], tile, onLoad);
        } else if (this._tileImageWorkerConn && this.loadTileImage === this.constructor.prototype.loadTileImage) {
            this._fetchImage(tileImage, tile);
        } else {
            const tileSize = this.layer.getTileSize(tile.layer);
            tileImage = new Image();

            tileImage.width = tileSize['width'];
            tileImage.height = tileSize['height'];

            tileImage.onload = this.onTileLoad.bind(this, tileImage, tile);
            tileImage.onerror = this.onTileError.bind(this, tileImage, tile);

            this.loadTileImage(tileImage, tile['url']);
        }
        return tileImage;
    }

    _fetchImage(image, tile) {
        if (image instanceof Image) {
            image.src = tile.url;
        } else {
            const { x, y } = tile;
            const workerId = Math.abs(x + y) % this._tileImageWorkerConn.workers.length;
            this._tileImageWorkerConn.fetchImage(tile.url, workerId, (err, data) => {
                if (err) {
                    this.onTileError(image, tile, err);
                } else {
                    getImageBitMap(data, bitmap => {
                        this.onTileLoad(bitmap, tile);
                    });
                }
            }, this.layer.options['fetchOptions'] || {
                referrer: document.location.href,
                headers: { accept: 'image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8' }
            });
        }
    }

    loadTileImage(tileImage, url) {
        const crossOrigin = this.layer.options['crossOrigin'];
        if (!isNil(crossOrigin)) {
            tileImage.crossOrigin = crossOrigin;
        }
        return loadImage(tileImage, [url]);
    }

    abortTileLoading(tileImage, tileInfo) {
        if (tileInfo && tileInfo.id !== undefined) {
            this.removeTileLoading(tileInfo);
        }
        if (!tileImage) return;
        tileImage.onload = falseFn;
        tileImage.onerror = falseFn;
        tileImage.src = emptyImageUrl;
    }

    onTileLoad(tileImage, tileInfo) {
        this.removeTileLoading(tileInfo);
        this._tileQueue.push({ tileInfo: tileInfo, tileData: tileImage });
        this.setToRedraw();
    }

    removeTileLoading(tileInfo) {
        delete this.tilesLoading[tileInfo.id];
        // need to setToRedraw to let tiles blocked by loadingLimit continue to load
        this.setToRedraw();
    }

    _consumeTileQueue() {
        let count = 0;
        const limit = this.layer.options['tileLimitPerFrame'];
        const queue = this._tileQueue;
        /* eslint-disable no-unmodified-loop-condition */
        while (queue.length && (limit <= 0 || count < limit)) {
            const { tileData, tileInfo } = queue.shift();
            if (!this.checkTileInQueue(tileData, tileInfo)) {
                continue;
            }
            this.consumeTile(tileData, tileInfo);
            count++;
        }
        /* eslint-enable no-unmodified-loop-condition */
    }

    _computeAvgTileAltitude() {
        let sumMin = 0;
        let sumMax = 0;
        let count = 0;
        for (const p in this.tilesInView) {
            const info = this.tilesInView[p] && this.tilesInView[p].info;
            if (info) {
                sumMin += info.minAltitude || 0;
                sumMax += info.maxAltitude || 0;
                count++;
            }
        }
        this.avgMinAltitude = sumMin / count;
        this.avgMaxAltitude = sumMax / count;
    }

    checkTileInQueue() {
        return true;
    }

    consumeTile(tileImage, tileInfo) {
        if (!this.layer) {
            return;
        }
        if (!this.tilesInView) {
            // removed
            return;
        }
        const e = { tile: tileInfo, tileImage: tileImage };
        /**
         * tileload event, fired when tile is loaded.
         *
         * @event TileLayer#tileload
         * @type {Object}
         * @property {String} type - tileload
         * @property {TileLayer} target - tile layer
         * @property {Object} tileInfo - tile info
         * @property {Image} tileImage - tile image
         */
        this.layer.fire('tileload', e);
        // let user update tileImage in listener if needed
        tileImage = e.tileImage;
        this.resetTileLoadTime(tileImage);
        this.removeTileLoading(tileInfo);
        this._addTileToCache(tileInfo, tileImage);
        this.setToRedraw();
    }

    resetTileLoadTime(tileImage) {
        tileImage.loadTime = now();
    }

    onTileError(tileImage, tileInfo) {
        if (!this.layer) {
            return;
        }
        tileImage.onerrorTick = tileImage.onerrorTick || 0;
        const tileRetryCount = this.layer.options['tileRetryCount'];
        if (tileRetryCount > tileImage.onerrorTick) {
            tileImage.onerrorTick++;
            this._fetchImage(tileImage, tileInfo);
            this.removeTileLoading(tileInfo);
            return;
        }
        const errorUrl = this.layer.options['errorUrl'];
        if (errorUrl) {
            if ((tileImage instanceof Image) && tileImage.src !== errorUrl) {
                tileImage.src = errorUrl;
                this.removeTileLoading(tileInfo);
                return;
            } else {
                tileImage = new Image();
                tileImage.src = errorUrl;
            }
        }
        tileImage = tileImage instanceof Image ? tileImage : BLANK_IMAGE;
        this.abortTileLoading(tileImage, tileInfo);

        tileImage.loadTime = 0;
        this.removeTileLoading(tileInfo);
        this._addTileToCache(tileInfo, tileImage);
        this.setToRedraw();
        /**
         * tileerror event, fired when tile loading has error.
         *
         * @event TileLayer#tileerror
         * @type {Object}
         * @property {String} type - tileerror
         * @property {TileLayer} target - tile layer
         * @property {Object} tileInfo - tile info
         */
        this.layer.fire('tileerror', { tile: tileInfo });
    }

    drawTile(tileInfo, tileImage) {
        if (!tileImage || !this.getMap()) {
            return;
        }
        const { extent2d, offset } = tileInfo;
        const point = TILE_POINT.set(extent2d.xmin - offset[0], extent2d.ymax - offset[1]),
            tileZoom = tileInfo.z,
            tileId = tileInfo.id;
        const map = this.getMap(),
            zoom = map.getZoom(),
            ctx = this.context,
            cp = map._pointAtResToContainerPoint(point, tileInfo.res, 0, TEMP_POINT),
            bearing = map.getBearing(),
            transformed = bearing || zoom !== tileZoom;
        const opacity = this.getTileOpacity(tileImage, tileInfo);
        const alpha = ctx.globalAlpha;
        if (opacity < 1) {
            ctx.globalAlpha = opacity;
        }
        if (!transformed) {
            cp._round();
        }
        let x = cp.x,
            y = cp.y;
        let w = tileInfo.extent2d.xmax - tileInfo.extent2d.xmin;
        let h = tileInfo.extent2d.ymax - tileInfo.extent2d.ymin;
        if (transformed) {
            ctx.save();
            ctx.translate(x, y);
            if (bearing) {
                ctx.rotate(-bearing * Math.PI / 180);
            }
            w += 0.5;
            h += 0.5;
            const res = map._getResolution();
            if (res !== tileInfo.res) {
                const scale = tileInfo.res / res;
                ctx.scale(scale, scale);
            }
            x = y = 0;
        }
        Canvas2D.image(ctx, tileImage, x, y, w, h);
        if (this.layer.options['debug']) {
            const color = this.layer.options['debugOutline'];
            ctx.save();
            ctx.strokeStyle = color;
            ctx.fillStyle = color;
            ctx.strokeWidth = 10;
            ctx.font = '20px monospace';
            const point = new Point(x, y);
            Canvas2D.rectangle(ctx, point, { width: w, height: h }, 1, 0);
            Canvas2D.fillText(ctx, this.getDebugInfo(tileId), point._add(32, h - 14), color);
            Canvas2D.drawCross(ctx, x + w / 2, y + h / 2, 2, color);
            ctx.restore();
        }
        if (transformed) {
            ctx.restore();
        }
        if (ctx.globalAlpha !== alpha) {
            ctx.globalAlpha = alpha;
        }
        this.setCanvasUpdated();
    }

    getDebugInfo(tileId) {
        const xyz = tileId.split('_');
        const length = xyz.length;
        return xyz[length - 3] + '/' + xyz[length - 2] + '/' + xyz[length - 1];
    }

    _findChildTiles(info) {
        const layer = this._getLayerOfTile(info.layer);
        if (!layer || !layer.options['background'] || info.z > this.layer.getMaxZoom()) {
            return EMPTY_ARRAY;
        }
        const map = this.getMap();
        const children = [];
        if (layer._isPyramidMode()) {
            const zoomDiff = 2;
            const cx = info.x * 2;
            const cy = info.y * 2;
            const cz = info.z + 1;
            const queue = [];
            for (let j = 0; j < 2; j++) {
                for (let jj = 0; jj < 2; jj++) {
                    queue.push(cx + j, cy + jj, cz);
                }
            }
            while (queue.length) {
                const z = queue.pop();
                const y = queue.pop();
                const x = queue.pop();
                const id = layer._getTileId(x, y, z, info.layer);
                const canVisit = z + 1 <= info.z + zoomDiff;
                const tile = this.tileCache.getAndRemove(id);
                if (tile) {
                    if (this.isValidCachedTile(tile)) {
                        children.push(tile);
                        this.tileCache.add(id, tile);
                    } else if (canVisit) {
                        for (let j = 0; j < 2; j++) {
                            for (let jj = 0; jj < 2; jj++) {
                                queue.push(x * 2 + j, y * 2 + jj, z + 1);
                            }
                        }
                    }
                } else if (canVisit) {
                    for (let j = 0; j < 2; j++) {
                        for (let jj = 0; jj < 2; jj++) {
                            queue.push(x * 2 + j, y * 2 + jj, z + 1);
                        }
                    }
                }
            }
            return children;
        }
        const zoomDiff = 1;
        const res = info.res;
        const min = info.extent2d.getMin(),
            max = info.extent2d.getMax(),
            pmin = layer._project(map._pointToPrjAtRes(min, res, TEMP_POINT1), TEMP_POINT1),
            pmax = layer._project(map._pointToPrjAtRes(max, res, TEMP_POINT2), TEMP_POINT2);

        for (let i = 1; i < zoomDiff; i++) {
            this._findChildTilesAt(children, pmin, pmax, layer, info.z + i);
        }

        return children;
    }

    _findChildTilesAt(children, pmin, pmax, layer, childZoom) {
        const layerId = layer.getId(),
            res = layer.getSpatialReference().getResolution(childZoom);
        if (!res) {
            return;
        }
        const dmin = layer._getTileConfig().getTileIndex(pmin, res),
            dmax = layer._getTileConfig().getTileIndex(pmax, res);
        const sx = Math.min(dmin.idx, dmax.idx), ex = Math.max(dmin.idx, dmax.idx);
        const sy = Math.min(dmin.idy, dmax.idy), ey = Math.max(dmin.idy, dmax.idy);
        let id, tile;
        for (let i = sx; i < ex; i++) {
            for (let ii = sy; ii < ey; ii++) {
                id = layer._getTileId(i, ii, childZoom, layerId);
                tile = this.tileCache.getAndRemove(id);
                if (tile) {
                    if (this.isValidCachedTile(tile)) {
                        children.push(tile);
                        this.tileCache.add(id, tile);
                    }
                }
            }
        }
    }

    _findParentTile(info) {
        const map = this.getMap(),
            layer = this._getLayerOfTile(info.layer);
        if (!layer || !layer.options['background']) {
            return null;
        }
        const minZoom = layer.getMinZoom();
        const zoomDiff = info.z - minZoom;
        if (layer._isPyramidMode()) {
            for (let z = info.z - 1; z >= minZoom; z--) {
                const diff = info.z - z;
                const scale = Math.pow(2, diff);
                const x = Math.floor(info.x / scale);
                const y = Math.floor(info.y / scale);
                const id = layer._getTileId(x, y, z, info.layer);
                const tile = this.tileCache.getAndRemove(id);
                if (tile) {
                    if (this.isValidCachedTile(tile)) {
                        this.tileCache.add(id, tile);
                        return tile;
                    }
                }
            }
            return null;
        }
        const sr = layer.getSpatialReference();
        // const zoomOffset = layer.options['zoomOffset'];
        const d = sr.getZoomDirection();
        const res = info.res;
        const center = info.extent2d.getCenter(),
            prj = layer._project(map._pointToPrjAtRes(center, res));
        for (let diff = 1; diff <= zoomDiff; diff++) {
            const z = info.z - d * diff;
            const res = sr.getResolution(z);
            if (!res) continue;
            const tileIndex = layer._getTileConfig().getTileIndex(prj, res);
            const id = layer._getTileId(tileIndex.x, tileIndex.y, z, info.layer);
            const tile = this.tileCache.getAndRemove(id);
            if (tile) {
                this.tileCache.add(id, tile);
                return tile;
            }
        }
        return null;
    }

    isValidCachedTile(tile) {
        return !!tile.image;
    }

    isTileComplete(/*tile*/) {
        return true;
    }

    _getLayerOfTile(layerId) {
        return this.layer.getChildLayer ? this.layer.getChildLayer(layerId) : this.layer;
    }

    _getCachedTile(tileId, isParent) {
        const tilesInView = this.tilesInView;
        let cached = this.tileCache.getAndRemove(tileId);
        if (cached) {
            if (!isParent) {
                tilesInView[tileId] = cached;
            }
            const tilesLoading = this.tilesLoading;
            if (tilesLoading && tilesLoading[tileId]) {
                tilesLoading[tileId].current = false;
                const { image, info } = tilesLoading[tileId];
                this.abortTileLoading(image, info);
                delete tilesLoading[tileId];
            }
        } else {
            cached = tilesInView[tileId];
        }
        if (cached) {
            cached.current = true;
            this.tileCache.add(tileId, cached);
        }
        return cached;
    }

    _addTileToCache(tileInfo, tileImage) {
        this.tilesInView[tileInfo.id] = {
            image: tileImage,
            current: true,
            info: tileInfo
        };
    }

    getTileOpacity(tileImage, tileInfo) {
        let opacity = this._getTileFadingOpacity(tileImage);
        if (this.layer.getChildLayer) {
            // in GroupTileLayer
            const childLayer = this.layer.getLayer(tileInfo.layer);
            if (childLayer) {
                opacity *= childLayer.options['opacity'];
            }
        }
        return opacity;
    }

    _getTileFadingOpacity(tileImage) {
        if (!this.layer.options['fadeAnimation'] || !tileImage.loadTime) {
            return 1;
        }
        return Math.min(1, (now() - tileImage.loadTime) / this.layer.options['fadeDuration']);
    }

    onRemove() {
        this.clear();
        delete this.tileCache;
        delete this._tilePlaceHolder;
        super.onRemove();
    }


    _markTiles() {
        let a = 0, b = 0;
        if (this.tilesLoading) {
            for (const p in this.tilesLoading) {
                this.tilesLoading[p].current = false;
                a++;
            }
        }
        if (this.tilesInView) {
            for (const p in this.tilesInView) {
                this.tilesInView[p].current = false;
                b++;
            }
        }
        return [a, b];
    }

    _retireTiles(force) {
        for (const i in this.tilesLoading) {
            const tile = this.tilesLoading[i];
            if (force || !tile.current) {
                // abort loading tiles
                if (tile.image) {
                    this.abortTileLoading(tile.image, tile.info);
                }
                this.deleteTile(tile);
                this.removeTileLoading(tile.info);
            }
        }
        for (const i in this.tilesInView) {
            const tile = this.tilesInView[i];
            if (!tile.current) {
                delete this.tilesInView[i];
                if (!this.tileCache.has(i)) {
                    this.deleteTile(tile);
                }
            }
        }
    }

    deleteTile(tile) {
        if (!tile || !tile.image) {
            return;
        }
        if (tile.image.close) {
            tile.image.close();
        }
        tile.image.onload = null;
        tile.image.onerror = null;
    }

    _generatePlaceHolder(res) {
        const map = this.getMap();
        const placeholder = this.layer.options['placeholder'];
        if (!placeholder || map.getPitch()) {
            return null;
        }
        const tileSize = this.layer.getTileSize(),
            scale = res / map._getResolution(),
            canvas = this._tilePlaceHolder = this._tilePlaceHolder || Canvas.createCanvas(1, 1, map.CanvasClass);
        canvas.width = tileSize.width * scale;
        canvas.height = tileSize.height * scale;
        if (isFunction(placeholder)) {
            placeholder(canvas);
        } else {
            defaultPlaceholder(canvas);
        }
        return canvas;
    }
}

TileLayer.registerRenderer('canvas', TileLayerCanvasRenderer);

function falseFn() { return false; }

function defaultPlaceholder(canvas) {
    const ctx = canvas.getContext('2d'),
        cw = canvas.width, ch = canvas.height,
        w = cw / 16, h = ch / 16;
    ctx.beginPath();
    for (let i = 0; i < 16; i++) {
        ctx.moveTo(0, i * h);
        ctx.lineTo(cw, i * h);
        ctx.moveTo(i * w, 0);
        ctx.lineTo(i * w, ch);
    }
    ctx.strokeStyle = 'rgba(180, 180, 180, 0.1)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.beginPath();
    const path = [
        [0, 0], [cw, 0], [0, ch], [cw, ch], [0, 0], [0, ch], [cw, 0], [cw, ch], [0, ch / 2], [cw, ch / 2], [cw / 2, 0], [cw / 2, ch]
    ];
    for (let i = 1; i < path.length; i += 2) {
        ctx.moveTo(path[i - 1][0], path[i - 1][1]);
        ctx.lineTo(path[i][0], path[i][1]);
    }
    ctx.lineWidth = 1 * 4;
    ctx.stroke();
}

export default TileLayerCanvasRenderer;

function compareTiles(a, b) {
    return Math.abs(this._tileZoom - a.info.z) - Math.abs(this._tileZoom - b.info.z);
}
