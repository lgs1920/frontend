import { Cartesian2, Cartesian3, Ellipsoid, HeadingPitchRange, Math as M, Transforms } from 'cesium'
import { Camera }                                                                      from '../../core/ui/Camera.js'

export class CameraUtils {

    static lookAt = (camera, center, hpr) => {
        // Lock camera to a point
        const point = new Cartesian3(center.x, center.y, center.z)
        camera.lookAtTransform(Transforms.eastNorthUpToFixedFrame(point), hpr)
    }

    /**
     * get Camera Heading and Pitch
     */
    static getHeadingPitchRoll = (camera) => {
        if (camera) {
            return {
                heading: Math.max(0, Math.min(M.toDegrees(Math.round(camera.heading)), 360)),
                pitch: M.toDegrees(camera.pitch),
                roll: M.toDegrees(camera.roll),
            }
        } else {
            return {heading: 360, pitch: -90, roll: 360}
        }

    }

    /**
     * get Camera target and position in degrees
     */
    static getPositions = async (camera) => {

        // If we do not have camera, we try to set one or return zeros
        if (!camera) {
            camera = vt3d.camera
            if (camera === undefined) {
                return {
                    target: {
                        longitude: 0,
                        latitude: 0,
                        height: 0,
                    },
                    position: {
                        longitude: 0,
                        latitude: 0,
                        height: 0,
                        range: 0,
                    },
                }
            }
        }

        const target = CameraUtils.lookAtPoint()

        const {longitude, latitude, height} = await camera.positionCartographic
        return {
            target: {
                longitude: target?.longitude,
                latitude: target?.latitude,
                height: target?.height,
            },
            position: {
                longitude: M.toDegrees(longitude),
                latitude: M.toDegrees(latitude),
                height: height,
                range: target?.range ?? vt3d.configuration.camera.range,
            },
        }
    }

    /**
     *
     * @param camera
     */
    static  updateCamera = async (camera) => {

        // If we do not have camera, we try to set one or return
        if (!camera) {
            camera = vt3d.camera
            if (camera === undefined) {
                return
            }
        }

        try {
            const cameraPositions = await CameraUtils.getPositions(camera)
            const hpr = await CameraUtils.getHeadingPitchRoll(camera)
            return {
                target: cameraPositions.target,
                longitude: cameraPositions.position.longitude,
                latitude: cameraPositions.position.latitude,
                height: cameraPositions.position.height,
                heading: hpr.heading,
                pitch: hpr.pitch,
                roll: hpr.roll,
                range: cameraPositions.position.range,
            }
        } catch (e) {
            console.error(e)
            return undefined
        }


    }


    /**
     * Turn around the camera target by PI/1000 on each Camera rotation.
     *
     *
     *
     */
    static run360 = (camera = __.ui.camera && new Camera()) => {
        CameraUtils.lookAt(vt3d.camera,
            Cartesian3.fromDegrees(
                camera.longitude ?? camera.target.longitude,
                camera.latitude ?? camera.target.latitude,
                camera.height ?? camera.target.height,
            ),
            new HeadingPitchRange(
                M.toRadians(camera.heading),
                M.toRadians(camera.pitch),
                camera.range,
            ))

        const step = (camera.clockwise) ? M.PI / 1000 : -M.PI / 1000
        vt3d.stop360 = vt3d.viewer.clock.onTick.addEventListener(async () => {
            vt3d.camera.rotateLeft(step)
            __.ui.camera.update()
        })
    }

    //https://groups.google.com/g/cesium-dev/c/QSFf3RxNRfE
    static lookAtPoint = () => {
        var ray = vt3d.camera.getPickRay(new Cartesian2(
            Math.round(vt3d.canvas.clientWidth / 2),
            Math.round(vt3d.canvas.clientHeight / 2),
        ))

        var position = vt3d.scene.globe.pick(ray, vt3d.scene)
        if (position) {
            var cartographic = Ellipsoid.WGS84.cartesianToCartographic(position)
            return {
                latitude: M.toDegrees(cartographic.latitude),
                longitude: M.toDegrees(cartographic.longitude),
                height: cartographic.height,
                range: Cartesian3.distance(position, vt3d.camera.position),
            }
        }
    }


}