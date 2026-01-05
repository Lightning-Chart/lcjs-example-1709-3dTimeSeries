const lcjs = require('@lightningchart/lcjs')
const { lightningChart, AxisTickStrategies, PalettedFill, LUT, ColorCSS, PointStyle3D, } = lcjs

const lc = lightningChart({
            resourcesBaseUrl: new URL(document.head.baseURI).origin + new URL(document.head.baseURI).pathname + 'resources/',
        })

// Create 3D chart
const chart3D = lc
    .Chart3D({
        theme: Themes[new URLSearchParams(window.location.search).get('theme') || 'darkGold'] || undefined,
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
    individualPointSizeEnabled: true,
    individualPointColorEnabled: true,
    individualLookupValuesEnabled: true,
  })
  .setName('PM2.5 (µg/m³)')

fetch(document.head.baseURI + 'examples/assets/1709/waterlooplace_airquality.json')
	.then((r) => r.json())
	.then((data) => {
    const values = data.map((node) => node['pm25'])
    const min = Math.min(...values)
    const max = Math.max(...values)
    const A = Math.floor(min / 5) * 5
    const B = Math.ceil(max / 5) * 5

    series.setPointStyle(new PointStyle3D.Triangulated({
    fillStyle: new PalettedFill({
        lookUpProperty: 'y',
        lut: new LUT({
            interpolate: true,
            steps: [
                { value: A, color: ColorCSS('green') },
                { value: B, color: ColorCSS('red') },
            ]
        })
    }),
    size: 10,
    shape: 'sphere'
    }))
    // In XY charts, it is enough just to set axis type as "linear-highPrecision" when using UTC timestamps
    // However, this feature is not supported by 3D charts. Instead, "date time origin shift" approach has to be used
    // It means manually shifting timestamps data closer to 0
    // This is ultimately required due to low webgl number precision.
    const dateOrigin = new Date(data[0].datetime_utc) // usually can also be set to just new Date(), i.e. current date
    const dateOriginTime = dateOrigin.getTime()
    chart3D.axisX.setTickStrategy(AxisTickStrategies.DateTime, strategy => strategy
      .setDateOrigin(dateOrigin)
    )

    let pointSize = 6

    for (let i = 0; i < data.length; i++) {
      if (data[i].no2 > 65) {
          pointSize = 32
      }
      else if (data[i].no2 > 45) {
          pointSize = 20
      }
      else if (data[i].no2 > 25) {    //WHO 24-hour NO2 guideline: 25 µg/m³
          pointSize = 10
      }
      else {
        pointSize = 6
      }

      series.add({
        x: (new Date(data[i].datetime_utc).getTime() - dateOriginTime),
        y: data[i].pm25,
        z: data[i].no2,
        size: pointSize
      })
    }

    chart3D.setCursorFormatting((_, hit, hits) => {
      return [
        ['Time', '', hit.axisX.formatValue(hit.x)],
        ['PM2.5 (µg/m³)', '', hit.y.toFixed(2)], 
        ['NO₂ (µg/m³)', '', hit.z.toFixed(2)]
      ]
    })
  })
