describe('TileSpatialRefSpec', function () {

    var container;
    var map;
    var center = new maptalks.Coordinate(118.846825, 32.046534);

    function createMap(center, zoom, spatialRef) {
        container = document.createElement('div');
        container.style.width = '512px';
        container.style.height = '512px';
        document.body.appendChild(container);
        var option = {
            center: center,
            zoom: zoom,
            spatialReference: spatialRef
        };
        map = new maptalks.Map(container, option);
    }

    afterEach(function () {
        if (map) {
            map.remove();
        }
        REMOVE_CONTAINER(container);
    });

    it('tilelayer with baidu projection on zoom 0', function () {
        createMap([0, 0], 0, { projection: 'baidu' });
        var tileLayer = new maptalks.TileLayer('tile', {
            renderer : 'canvas',
            urlTemplate : '#',
            placeholder : true,
            pyramidMode: 1,
            repeatWorld: true
        }).addTo(map);
        var tileGrid = tileLayer.getTiles().tileGrids[0];
        var tiles = tileGrid.tiles;
        var extent = tileGrid.extent;
        expect(extent.toJSON()).to.be.eql({ xmin: -256, ymin: -256, xmax: 256, ymax: 512 });
        var expected = '-1,-1,0,{"xmin":-256,"ymin":-256,"xmax":0,"ymax":0}|-1,0,0,{"xmin":-256,"ymin":0,"xmax":0,"ymax":256}|-1,1,0,{"xmin":-256,"ymin":256,"xmax":0,"ymax":512}|0,-1,0,{"xmin":0,"ymin":-256,"xmax":256,"ymax":0}|0,0,0,{"xmin":0,"ymin":0,"xmax":256,"ymax":256}|0,1,0,{"xmin":0,"ymin":256,"xmax":256,"ymax":512}';
        var actual = tiles.map(function (t) {
            return [t.idx, t.idy, t.z, JSON.stringify(t.extent2d.toJSON())].join();
        }).sort().join('|');
        expect(actual).to.be.eql(expected);
    });

     it('tilelayer with baidu projection on zoom 3', function () {
        createMap([0, 0], 3, { projection: 'baidu' });
        var tileLayer = new maptalks.TileLayer('tile', {
            renderer : 'canvas',
            urlTemplate : '#',
            placeholder : true,
            pyramidMode: 1,
            repeatWorld: true
        }).addTo(map);
        var tileGrid = tileLayer.getTiles().tileGrids[0];
        var tiles = tileGrid.tiles;
        var extent = tileGrid.extent;
        expect(extent.toJSON()).to.be.eql({ xmin: -512, ymin: -256, xmax: 256, ymax: 512 });
        var expected = '-1,-1,3,{"xmin":-256,"ymin":-256,"xmax":0,"ymax":0}|-1,0,3,{"xmin":-256,"ymin":0,"xmax":0,"ymax":256}|-1,1,3,{"xmin":-256,"ymin":256,"xmax":0,"ymax":512}|-2,-1,3,{"xmin":-512,"ymin":-256,"xmax":-256,"ymax":0}|-2,0,3,{"xmin":-512,"ymin":0,"xmax":-256,"ymax":256}|-2,1,3,{"xmin":-512,"ymin":256,"xmax":-256,"ymax":512}|0,-1,3,{"xmin":0,"ymin":-256,"xmax":256,"ymax":0}|0,0,3,{"xmin":0,"ymin":0,"xmax":256,"ymax":256}|0,1,3,{"xmin":0,"ymin":256,"xmax":256,"ymax":512}';
        var actual = tiles.map(function (t) {
            return [t.idx, t.idy, t.z, JSON.stringify(t.extent2d.toJSON())].join();
        }).sort().join('|');
        expect(actual).to.be.eql(expected);
    });

    it('tilelayer with baidu projection without pyramidMode on zoom 0', function () {
        createMap([0, 0], 0, { projection: 'baidu' });
        var tileLayer = new maptalks.TileLayer('tile', {
            renderer : 'canvas',
            urlTemplate : '#',
            placeholder : true,
            pyramidMode: 0,
            repeatWorld: true
        }).addTo(map);
        var tileGrid = tileLayer.getTiles().tileGrids[0];
        var tiles = tileGrid.tiles;
        var extent = tileGrid.extent;
        expect(extent.toJSON()).to.be.eql({ xmin: -256, ymin: -256, xmax: 256, ymax: 512 });
        var expected = '-1,-1,0,{"xmin":-256,"ymin":-256,"xmax":0,"ymax":0}|-1,0,0,{"xmin":-256,"ymin":0,"xmax":0,"ymax":256}|-1,1,0,{"xmin":-256,"ymin":256,"xmax":0,"ymax":512}|0,-1,0,{"xmin":0,"ymin":-256,"xmax":256,"ymax":0}|0,0,0,{"xmin":0,"ymin":0,"xmax":256,"ymax":256}|0,1,0,{"xmin":0,"ymin":256,"xmax":256,"ymax":512}';
        var actual = tiles.map(function (t) {
            return [t.idx, t.idy, t.z, JSON.stringify(t.extent2d.toJSON())].join();
        }).sort().join('|');
        expect(actual).to.be.eql(expected);
    });

    it('tilelayer with EPSG:3857 projection on zoom 0', function () {
        createMap([0, 0], 0, { projection: 'EPSG:3857' });
        var tileLayer = new maptalks.TileLayer('tile', {
            renderer : 'canvas',
            urlTemplate : '#',
            placeholder : true,
            pyramidMode: 1,
            repeatWorld: true
        }).addTo(map);
        var tileGrid = tileLayer.getTiles().tileGrids[0];
        var tiles = tileGrid.tiles;
        var extent = tileGrid.extent;
        expect(extent.toJSON()).to.be.eql({xmin: -384, ymin: -384, xmax: 384, ymax: 384});
        var expected = '-1,-1,0,{"xmin":-384,"ymin":128,"xmax":-128,"ymax":384}|-1,0,0,{"xmin":-384,"ymin":-128,"xmax":-128,"ymax":128}|-1,1,0,{"xmin":-384,"ymin":-384,"xmax":-128,"ymax":-128}|0,-1,0,{"xmin":-128,"ymin":128,"xmax":128,"ymax":384}|0,0,0,{"xmin":-128,"ymin":-128,"xmax":128,"ymax":128}|0,1,0,{"xmin":-128,"ymin":-384,"xmax":128,"ymax":-128}|1,-1,0,{"xmin":128,"ymin":128,"xmax":384,"ymax":384}|1,0,0,{"xmin":128,"ymin":-128,"xmax":384,"ymax":128}|1,1,0,{"xmin":128,"ymin":-384,"xmax":384,"ymax":-128}';
        var actual = tiles.map(function (t) {
            return [t.idx, t.idy, t.z, JSON.stringify(t.extent2d.toJSON())].join();
        }).sort().join('|');
        expect(actual).to.be.eql(expected);
    });

     it('tilelayer with EPSG:3857 projection on zoom 3', function () {
        createMap([0, 0], 3, { projection: 'EPSG:3857' });
        var tileLayer = new maptalks.TileLayer('tile', {
            renderer : 'canvas',
            urlTemplate : '#',
            placeholder : true,
            pyramidMode: 1,
            repeatWorld: true
        }).addTo(map);
        var tileGrid = tileLayer.getTiles().tileGrids[0];
        var tiles = tileGrid.tiles;
        var extent = tileGrid.extent;
        expect(extent.toJSON()).to.be.eql({xmin: -512, ymin: -512, xmax: 512, ymax: 512});
        var expected = '2,2,3,{"xmin":-512,"ymin":256,"xmax":-256,"ymax":512}|2,3,3,{"xmin":-512,"ymin":0,"xmax":-256,"ymax":256}|2,4,3,{"xmin":-512,"ymin":-256,"xmax":-256,"ymax":0}|2,5,3,{"xmin":-512,"ymin":-512,"xmax":-256,"ymax":-256}|3,2,3,{"xmin":-256,"ymin":256,"xmax":0,"ymax":512}|3,3,3,{"xmin":-256,"ymin":0,"xmax":0,"ymax":256}|3,4,3,{"xmin":-256,"ymin":-256,"xmax":0,"ymax":0}|3,5,3,{"xmin":-256,"ymin":-512,"xmax":0,"ymax":-256}|4,2,3,{"xmin":0,"ymin":256,"xmax":256,"ymax":512}|4,3,3,{"xmin":0,"ymin":0,"xmax":256,"ymax":256}|4,4,3,{"xmin":0,"ymin":-256,"xmax":256,"ymax":0}|4,5,3,{"xmin":0,"ymin":-512,"xmax":256,"ymax":-256}|5,2,3,{"xmin":256,"ymin":256,"xmax":512,"ymax":512}|5,3,3,{"xmin":256,"ymin":0,"xmax":512,"ymax":256}|5,4,3,{"xmin":256,"ymin":-256,"xmax":512,"ymax":0}|5,5,3,{"xmin":256,"ymin":-512,"xmax":512,"ymax":-256}';
        var actual = tiles.map(function (t) {
            return [t.idx, t.idy, t.z, JSON.stringify(t.extent2d.toJSON())].join();
        }).sort().join('|');
        expect(actual).to.be.eql(expected);
    });

    it('tilelayer with EPSG:3857 projection without pyramidMode on zoom 0', function () {
        createMap([0, 0], 0, { projection: 'EPSG:3857' });
        var tileLayer = new maptalks.TileLayer('tile', {
            renderer : 'canvas',
            urlTemplate : '#',
            placeholder : true,
            pyramidMode: 0,
            repeatWorld: true
        }).addTo(map);
        var tileGrid = tileLayer.getTiles().tileGrids[0];
        var tiles = tileGrid.tiles;
        var extent = tileGrid.extent;
        expect(extent.toJSON()).to.be.eql({xmin: -384, ymin: -384, xmax: 384, ymax: 384});
        var expected = '-1,-1,0,{"xmin":-384,"ymin":128,"xmax":-128,"ymax":384}|-1,0,0,{"xmin":-384,"ymin":-128,"xmax":-128,"ymax":128}|-1,1,0,{"xmin":-384,"ymin":-384,"xmax":-128,"ymax":-128}|0,-1,0,{"xmin":-128,"ymin":128,"xmax":128,"ymax":384}|0,0,0,{"xmin":-128,"ymin":-128,"xmax":128,"ymax":128}|0,1,0,{"xmin":-128,"ymin":-384,"xmax":128,"ymax":-128}|1,-1,0,{"xmin":128,"ymin":128,"xmax":384,"ymax":384}|1,0,0,{"xmin":128,"ymin":-128,"xmax":384,"ymax":128}|1,1,0,{"xmin":128,"ymin":-384,"xmax":384,"ymax":-128}';
        var actual = tiles.map(function (t) {
            return [t.idx, t.idy, t.z, JSON.stringify(t.extent2d.toJSON())].join();
        }).sort().join('|');
        expect(actual).to.be.eql(expected);
    });

    it('tilelayer with custom spatialRef without fullExtent', function () {
        var firstRes = 0.009507170090264933;
        var res = [];
        for (var i = 0; i <= 5; i++) {
          res.push(firstRes / Math.pow(2, i));
        }
        var crs = {
          projection: "EPSG:4326",
          resolutions: res,
          // fullExtent: {
          //   top: 42.31,
          //   left: 114.59,
          //   bottom: 37.44232891378436,
          //   right:  119.45767108621564
          // }
        };
        createMap([114.59, 42.31], 0, crs);
        var tileLayer = new maptalks.TileLayer("base", {
          urlTemplate: '#',
          // repeatWorld:true,
          spatialReference: crs,
          tileSystem: [1, -1, 114.59, 42.31]
        }).addTo(map);
        var tileGrid = tileLayer.getTiles().tileGrids[0];
        var tiles = tileGrid.tiles;
        var extent = tileGrid.extent;
        expect(extent.toJSON()).to.be.eql({ xmin: 11797.008299213752, ymin: 3938.3253437449503, xmax: 12565.008299213752, ymax: 4706.32534374495 });
        var expected = '-1,-1,0,{"xmin":11797.008299213752,"ymin":4450.32534374495,"xmax":12053.008299213752,"ymax":4706.32534374495}|-1,0,0,{"xmin":11797.008299213752,"ymin":4194.32534374495,"xmax":12053.008299213752,"ymax":4450.32534374495}|-1,1,0,{"xmin":11797.008299213752,"ymin":3938.3253437449503,"xmax":12053.008299213752,"ymax":4194.32534374495}|0,-1,0,{"xmin":12053.008299213752,"ymin":4450.32534374495,"xmax":12309.008299213752,"ymax":4706.32534374495}|0,0,0,{"xmin":12053.008299213752,"ymin":4194.32534374495,"xmax":12309.008299213752,"ymax":4450.32534374495}|0,1,0,{"xmin":12053.008299213752,"ymin":3938.3253437449503,"xmax":12309.008299213752,"ymax":4194.32534374495}|1,-1,0,{"xmin":12309.008299213752,"ymin":4450.32534374495,"xmax":12565.008299213752,"ymax":4706.32534374495}|1,0,0,{"xmin":12309.008299213752,"ymin":4194.32534374495,"xmax":12565.008299213752,"ymax":4450.32534374495}|1,1,0,{"xmin":12309.008299213752,"ymin":3938.3253437449503,"xmax":12565.008299213752,"ymax":4194.32534374495}';
        var actual = tiles.map(function (t) {
            return [t.idx, t.idy, t.z, JSON.stringify(t.extent2d.toJSON())].join();
        }).sort().join('|');
        if (!maptalks.Browser.ie) {
            expect(actual).to.be.eql(expected);
        }
    });

    it('tilelayer with custom spatialRef with fullExtent', function () {
        var firstRes = 0.009507170090264933;
        var res = [];
        for (var i = 0; i <= 5; i++) {
          res.push(firstRes / Math.pow(2, i));
        }
        var crs = {
          projection: "EPSG:4326",
          resolutions: res,
          fullExtent: {
            top: 42.31,
            left: 114.59,
            bottom: 37.44232891378436,
            right:  119.45767108621564
          }
        };
        createMap([114.59, 42.31], 0, crs);
        var tileLayer = new maptalks.TileLayer("base", {
          urlTemplate: '#',
          // repeatWorld:true,
          spatialReference: crs,
          tileSystem: [1, -1, 114.59, 42.31]
        }).addTo(map);
        var tileGrid = tileLayer.getTiles().tileGrids[0];
        var tiles = tileGrid.tiles;
        var extent = tileGrid.extent;
        expect(extent.toJSON()).to.be.eql({ xmin: 11797.008299213752, ymin: 3938.3253437449503, xmax: 12565.008299213752, ymax: 4706.32534374495 });
        var expected = '-1,-1,0,{"xmin":11797.008299213752,"ymin":4450.32534374495,"xmax":12053.008299213752,"ymax":4706.32534374495}|-1,0,0,{"xmin":11797.008299213752,"ymin":4194.32534374495,"xmax":12053.008299213752,"ymax":4450.32534374495}|-1,1,0,{"xmin":11797.008299213752,"ymin":3938.3253437449503,"xmax":12053.008299213752,"ymax":4194.32534374495}|0,-1,0,{"xmin":12053.008299213752,"ymin":4450.32534374495,"xmax":12309.008299213752,"ymax":4706.32534374495}|0,0,0,{"xmin":12053.008299213752,"ymin":4194.32534374495,"xmax":12309.008299213752,"ymax":4450.32534374495}|0,1,0,{"xmin":12053.008299213752,"ymin":3938.3253437449503,"xmax":12309.008299213752,"ymax":4194.32534374495}|1,-1,0,{"xmin":12309.008299213752,"ymin":4450.32534374495,"xmax":12565.008299213752,"ymax":4706.32534374495}|1,0,0,{"xmin":12309.008299213752,"ymin":4194.32534374495,"xmax":12565.008299213752,"ymax":4450.32534374495}|1,1,0,{"xmin":12309.008299213752,"ymin":3938.3253437449503,"xmax":12565.008299213752,"ymax":4194.32534374495}';
        var actual = tiles.map(function (t) {
            return [t.idx, t.idy, t.z, JSON.stringify(t.extent2d.toJSON())].join();
        }).sort().join('|');
        if (!maptalks.Browser.ie) {
            expect(actual).to.be.eql(expected);
        }

    });

    it('tilelayer with custom spatialRef with fullExtent and no repeatWorld', function () {
        var firstRes = 0.009507170090264933;
        var res = [];
        for (var i = 0; i <= 5; i++) {
          res.push(firstRes / Math.pow(2, i));
        }
        var crs = {
          projection: "EPSG:4326",
          resolutions: res,
          fullExtent: {
            top: 42.31,
            left: 114.59,
            bottom: 37.44232891378454,
            right:  119.45767108621599
          }
        };
        createMap([114.59, 42.31], 0, crs);
        var tileLayer = new maptalks.TileLayer("base", {
          urlTemplate: '#',
          repeatWorld: false,
          spatialReference: crs,
          tileSystem: [1, -1, 114.59, 42.31]
        }).addTo(map);
        var tileGrid = tileLayer.getTiles().tileGrids[0];
        var tiles = tileGrid.tiles;
        var extent = tileGrid.extent;
        expect(extent.toJSON()).to.be.eql({ xmin: 12053.008299213752, ymin: 3938.3253437449507, xmax: 12565.008299213754, ymax: 4450.32534374495 });
        var expected =  '0,0,0,{"xmin":12053.008299213752,"ymin":4194.32534374495,"xmax":12309.008299213752,"ymax":4450.32534374495}|0,1,0,{"xmin":12053.008299213752,"ymin":3938.3253437449507,"xmax":12309.008299213752,"ymax":4194.32534374495}|1,0,0,{"xmin":12309.008299213752,"ymin":4194.32534374495,"xmax":12565.008299213754,"ymax":4450.32534374495}|1,1,0,{"xmin":12309.008299213752,"ymin":3938.3253437449507,"xmax":12565.008299213754,"ymax":4194.32534374495}';
        var actual = tiles.map(function (t) {
            return [t.idx, t.idy, t.z, JSON.stringify(t.extent2d.toJSON())].join();
        }).sort().join('|');
        if (!maptalks.Browser.ie) {
            expect(actual).to.be.eql(expected);
        }

    });

    it('tilelayer with custom spatialRef with fullExtent in getCascadedTiles', function () {
        var firstRes = 0.009507170090264933;
        var res = [];
        for (var i = 0; i <= 5; i++) {
          res.push(firstRes / Math.pow(2, i));
        }
        var crs = {
          projection: "EPSG:4326",
          resolutions: res,
          fullExtent: {
            top: 42.31,
            left: 114.59,
            bottom: 37.44232891378436,
            right:  119.45767108621564
          }
        };
        createMap([114.59, 42.31], 0, crs);
        var tileLayer = new maptalks.TileLayer("base", {
          urlTemplate: '#',
          // repeatWorld:true,
          spatialReference: crs,
          pyramidMode: 0,
          tileSystem: [1, -1, 114.59, 42.31]
        }).addTo(map);
        var tileGrid = tileLayer.getTiles().tileGrids[0];
        var tiles = tileGrid.tiles;
        var extent = tileGrid.extent;
        expect(extent.toJSON()).to.be.eql({ xmin: 11797.008299213752, ymin: 3938.3253437449503, xmax: 12565.008299213752, ymax: 4706.32534374495 });
        var expected = '-1,-1,0,{"xmin":11797.008299213752,"ymin":4450.32534374495,"xmax":12053.008299213752,"ymax":4706.32534374495}|-1,0,0,{"xmin":11797.008299213752,"ymin":4194.32534374495,"xmax":12053.008299213752,"ymax":4450.32534374495}|-1,1,0,{"xmin":11797.008299213752,"ymin":3938.3253437449503,"xmax":12053.008299213752,"ymax":4194.32534374495}|0,-1,0,{"xmin":12053.008299213752,"ymin":4450.32534374495,"xmax":12309.008299213752,"ymax":4706.32534374495}|0,0,0,{"xmin":12053.008299213752,"ymin":4194.32534374495,"xmax":12309.008299213752,"ymax":4450.32534374495}|0,1,0,{"xmin":12053.008299213752,"ymin":3938.3253437449503,"xmax":12309.008299213752,"ymax":4194.32534374495}|1,-1,0,{"xmin":12309.008299213752,"ymin":4450.32534374495,"xmax":12565.008299213752,"ymax":4706.32534374495}|1,0,0,{"xmin":12309.008299213752,"ymin":4194.32534374495,"xmax":12565.008299213752,"ymax":4450.32534374495}|1,1,0,{"xmin":12309.008299213752,"ymin":3938.3253437449503,"xmax":12565.008299213752,"ymax":4194.32534374495}';
        var actual = tiles.map(function (t) {
            return [t.idx, t.idy, t.z, JSON.stringify(t.extent2d.toJSON())].join();
        }).sort().join('|');
        if (!maptalks.Browser.ie) {
            expect(actual).to.be.eql(expected);
        }
    });
});
