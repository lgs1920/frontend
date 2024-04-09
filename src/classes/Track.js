import { DateTime }                                            from 'luxon'
import { FEATURE_COLLECTION, FEATURE_LINE_STRING, TrackUtils } from '../Utils/cesium/TrackUtils'
import { Mobility }                                            from '../Utils/Mobility'
import { POI }                                                 from './POI'
import { ORIGIN_STORE }                                        from './VT3D'


const CONFIGURATION = '../config.json'

export class Track {

    slug        // unic Id for the track
    title       // Track title
    geoJson     // All the data are translated into GeoJson
    metrics     // All the metrics associated to the track
    visible     // Is visible ?
    description // Add any description

    color = vt3d.configuration.track.color            // The color associated
    thickness = vt3d.configuration.track.thickness    // The thickness associated

    parent = undefined

    origin      // original GeoJson

    attributes = [
        'color',
        'title',
        'geoJson',
        'title',
        'visible',
        'hasTime',
        'DEMServer',
        'thickness',
        'description',
        'hasAltitude',
        'parent',
        'children',
    ]

    constructor(title, options = {}) {
        this.title = title
        this.parent = options.parent
        this.slug = options.slug

        this.color = vt3d.configuration.track.color
        this.thickness = vt3d.configuration.track.thickness
        this.visible = options.visible ?? true
        this.description = options.description ?? undefined

    }

    static getMarkerInformation = (markerId) => {
        const elements = markerId.split('#')
        if (elements.length === 3 && elements[0] === 'marker') {
            return {
                track: elements[1],
                marker: elements[2],
            }
        }
        return false

    }


    /**
     * Add this theTrackto the application context
     *
     */
    addToContext = (setToCurrent = true) => {
        //vt3d.saveTrack(this)
        if (setToCurrent) {
            vt3d.theJourney = this
        }
    }

    /**
     * Set Geo Json feature name
     *
     * @param name
     */
    setTrackName(name) {
        if (this.geoJson.type === FEATURE_COLLECTION) {
            let index = 0
            for (const feature of this.geoJson.features) {
                if (feature.type === 'Feature' && feature.geometry.type === FEATURE_LINE_STRING) {
                    this.geoJson.features[index].properties['name'] = name
                }
                index++
            }
        }
    }

    /**
     * Prepare it an extract all metrics
     *
     * @param content
     */
    computeAll = async () => {
        // Maybe we have some changes to operate
        await this.prepareGeoJson()
        await this.calculateMetrics()
        this.addToContext()
    }

    /**
     * Compute all metrics from a theJourney
     *
     * set metrics as  {[metrics/all points,global]}
     */
    calculateMetrics = async () => {
        return await TrackUtils.prepareDataForMetrics(this.geoJson).then(dataForMetrics => {
            let metrics = []
            let index = 1

            /**
             * GeoJson is a Feature Collection, so we iterate on each.
             */
            dataForMetrics.forEach((dataSet) => {
                let featureMetrics = []
                /**
                 * 1st step : Metrics per points
                 * we iterate on all points to compute
                 *  - distance, elevation, slope
                 * If we have time information, we can also compute
                 *  - duration, speed, pace
                 */
                for (const prev of dataSet) {
                    const current = dataSet[index]
                    const data = {}
                    if (index < dataSet.length) {
                        data.distance = Mobility.distance(prev, current)
                        if (current.time && prev.time) {
                            data.duration = Mobility.duration(DateTime.fromISO(prev.time), DateTime.fromISO(current.time))
                            data.speed = Mobility.speed(data.distance, data.duration)
                            data.pace = Mobility.pace(data.distance, data.duration)

                            //TODO Add idle time duration
                        }
                        data.elevation = Mobility.elevation(prev, current)
                        data.slope = data.elevation / data.distance * 100
                    }
                    index++
                    featureMetrics.push(data)
                }
                featureMetrics = featureMetrics.slice(0, -1)

                /**
                 * Step 2: Globals
                 *
                 * Now we can compute globals, ie some min max, average + total information(distance, time, D+/D- )
                 */
                let global = {}, tmp = []

                // Min Height
                global.minHeight = Math.min(...dataSet.map(a => a?.altitude))

                // Max Height
                global.maxHeight = Math.max(...dataSet.map(a => a?.altitude))

                // If the first have duration time, all the data set have time
                if (featureMetrics[0].duration) {
                    // Max speed
                    tmp = TrackUtils.filterArray(featureMetrics, {
                        speed: speed => speed !== 0 && speed !== undefined,
                    })
                    global.maxSpeed = Math.max(...tmp.map(a => a?.speed))

                    // Average speed (we exclude 0 and undefined values)
                    global.averageSpeed = tmp.reduce((s, o) => {
                        return s + o.speed
                    }, 0) / tmp.length

                    // Todo  Add average speed in motion

                    // Max Pace
                    global.maxPace = Math.max(...featureMetrics.map(a => a?.pace))

                    // Todo  Add average pace in motion
                }

                // Max Slope
                global.maxSlope = Math.max(...featureMetrics.map(a => a?.slope))

                // Positive elevation
                global.positiveElevation = 0
                featureMetrics.forEach((point, index) => {
                    if (point.elevation > 0) {
                        global.positiveElevation += point.elevation
                    }
                })

                // Negative elevation
                global.negativeElevation = 0
                featureMetrics.forEach((point, index) => {
                    if (point.elevation < 0) {
                        global.negativeElevation += point.elevation
                    }
                })

                // Total duration
                global.duration = featureMetrics.reduce((s, o) => {
                    return s + o.duration
                }, 0)

                // Total Distance
                global.distance = featureMetrics.reduce((s, o) => {
                    return s + o.distance
                }, 0)

                metrics.push({points: featureMetrics, global: global})
            })
            this.metrics = metrics
        })
    }

    /**
     * Prepare GeoJson
     *
     * Simulate altitude, interpolate, clean data
     *
     * @param geoJson
     * @return geoJson
     *
     */
    prepareGeoJson = async () => {

        /**
         * Only for Feature Collections
         */
        if (this.geoJson.type === FEATURE_COLLECTION) {
            let index = 0
            for (const feature of this.geoJson.features) {
                if (feature.type === 'Feature' && feature.geometry.type === FEATURE_LINE_STRING) {
                    let index = 0
                    /**
                     * Have altitude or simulate ?
                     */
                    if (!this.hasAltitude) {
                        // Some altitudes info are missing. Let's simulate them

                        // TODO add different plugins for DEM elevation like:
                        //        https://tessadem.com/elevation-api/  ($)
                        //     or https://github.com/Jorl17/open-elevation/blob/master/docs/api.md


                        if (this.DEMServer === NO_DEM_SERVER) {
                            // May be, some computations have been done before, so we cleaned them
                            // use case : any DEM server -> no DEM server
                            let j = 0
                            feature.geometry.coordinates.forEach(coordinate => {
                                if (coordinate.length === 3) {
                                    feature.geometry.coordinates[j] = coordinate.splice(2, 1)
                                }
                                j++
                            })
                        } else {
                            // We have aDEM Server, so let's compute altitude
                            let altitudes = []
                            switch (this.DEMServer) {
                                case NO_DEM_SERVER:
                                case 'internal' :
                                    altitudes = await TrackUtils.getElevationFromTerrain(feature.geometry.coordinates)
                                    break
                                case 'open-elevation' : {
                                }
                            }
                            // Add them to data
                            for (let j = 0; j < altitudes.length; j++) {
                                feature.geometry.coordinates[j].push(altitudes[j])
                            }
                            // Hide progress bar
                            vt3d.theJourneyEditorProxy.longTask = false
                        }

                        /**
                         * Use title as feature name
                         */
                        feature.properties.name = this.title


                        // TODO interpolate points to avoid GPS errors (Kalman Filter ?)
                        // TODO Clean


                        // Add Current GeoJson
                        this.geoJson.features[index] = feature


                    }
                    index++
                }


            }
        }
    }

    /**
     * Draws the Track on the globe
     *
     * @return {Promise<void>}
     */
    draw = async (action = INITIAL_LOADING, mode = DRAW_ANIMATE) => {
        await TrackUtils.loadTrack(this, action, mode)
        this.markers.forEach(async marker => {
            const tmp = POI.clone(marker)
            await tmp.draw()
        })
    }

    /**
     * Toggle track visibility
     *
     */
    toggleVisibility = () => {
        this.visible = !this.visible
    }

    showAfterHeightSimulation = async () => {
        await this.draw(SIMULATE_ALTITUDE)
    }

    loadAfterNewSettings = async (mode) => {
        await this.draw(RE_LOADING, mode)
    }

    checkOtherData = () => {
        this.altitude = true
        if (this.geoJson.type === FEATURE_COLLECTION) {
            let index = 0
            for (const feature of this.geoJson.features) {
                if (feature.type === 'Feature' && feature.geometry.type === FEATURE_LINE_STRING) {
                    const data = TrackUtils.checkIfDataContainsAltitudeOrTime(feature)
                    this.description = TrackUtils.getDescription(feature)

                    this.hasAltitude = data.hasAltitude
                    this.hasTime = data.hasTime
                    if (!this.hasAltitude) {
                        break
                    }
                }
            }

        }
    }

    /**
     * Read a track from DB
     *
     * @param store
     * @return {Promise<void>}
     */
    fromDB = async (store = '') => {
        // TODO read data and add origine
    }


    /**
     * Remove a track fromDB
     *
     * @return {Promise<void>}
     */
    removeFromDB = async () => {
        if (this.origin === undefined) {
            await vt3d.db.tracks.delete(this.slug, ORIGIN_STORE)
        }

        await vt3d.db.tracks.delete(this.slug, JOURNEY_STORE)
    }
}