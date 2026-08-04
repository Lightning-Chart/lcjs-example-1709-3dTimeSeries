window.lcjsSmallView = window.devicePixelRatio >= 2
const lcjs = require('@lightningchart/lcjs')
const { lightningChart, Themes, AxisTickStrategies, PalettedFill, LUT, ColorCSS, PointStyle3D } = lcjs

const lc = lightningChart({
            resourcesBaseUrl: new URL(document.head.baseURI).origin + new URL(document.head.baseURI).pathname + 'resources/',
        })

// Create 3D chart
const chart3D = lc
    .Chart3D({
        theme: (() => {
    const t = Themes[new URLSearchParams(window.location.search).get('theme') || 'darkGold'] || undefined
    return t && window.lcjsSmallView ? lcjs.scaleTheme(t, 0.5) : t
})(),
textRenderer: window.lcjsSmallView ? lcjs.htmlTextRenderer : undefined,
    })
    .setTitle('London Air Quality - 3D Time Series')
    // Set 3D bounding box dimensions to highlight X Axis.
    .setBoundingBox({ x: 1, y: 0.75, z: 0.75 })

// Set Axis titles
chart3D.getDefaultAxisX().setTitle('Time')
chart3D.getDefaultAxisY().setTitle('PM2.5 (µg/m³)')
chart3D.getDefaultAxisZ().setTitle('NO₂ (µg/m³)')

// Create Series
const series = chart3D
    .addPointSeries({
        schema: {
            x: { pattern: null },
            y: { pattern: null },
            z: { pattern: null },
            size: { pattern: null },
        },
    })
    .setDataMapping({ x: 'x', y: 'y', z: 'z', size: 'size' })
    .setName('PM2.5 (µg/m³)')

fetch(document.head.baseURI + 'examples/assets/1709/waterlooplace_airquality.json')
    .then((r) => r.json())
    .then((data) => {
        const values = data.map((node) => node['pm25'])
        const min = Math.min(...values)
        const max = Math.max(...values)
        const A = Math.floor(min / 5) * 5
        const B = Math.ceil(max / 5) * 5

        series.setPointStyle(
            new PointStyle3D.Triangulated({
                fillStyle: new PalettedFill({
                    lookUpProperty: 'y',
                    lut: new LUT({
                        interpolate: true,
                        steps: [
                            { value: A, color: ColorCSS('green') },
                            { value: B, color: ColorCSS('red') },
                        ],
                    }),
                }),
                size: 10,
                shape: 'sphere',
            }),
        )
        chart3D.axisX.setTickStrategy(AxisTickStrategies.DateTime)

        let pointSize = 6

        for (let i = 0; i < data.length; i++) {
            if (data[i].no2 > 65) {
                pointSize = 32
            } else if (data[i].no2 > 45) {
                pointSize = 20
            } else if (data[i].no2 > 25) {
                //WHO 24-hour NO2 guideline: 25 µg/m³
                pointSize = 10
            } else {
                pointSize = 6
            }

            series.appendSample({
                x: new Date(data[i].datetime_utc).getTime(),
                y: data[i].pm25,
                z: data[i].no2,
                size: pointSize,
            })
        }

        chart3D.setCursorFormatting((_, hit, hits) => {
            return [
                ['Time', '', hit.axisX.formatValue(hit.x)],
                ['PM2.5 (µg/m³)', '', hit.y.toFixed(2)],
                ['NO₂ (µg/m³)', '', hit.z.toFixed(2)],
            ]
        })
    })
