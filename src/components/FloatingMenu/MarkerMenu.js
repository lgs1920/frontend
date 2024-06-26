import { POI_TYPE }   from '@Utils/cesium/EntitiesUtils'
import { MouseUtils } from '@Utils/cesium/MouseUtils'
import * as Cesium    from 'cesium'

export class MarkerMenu {
    static show = (data) => {

        const menuStore = lgs.mainProxy.components.floatingMenu

        if (data.picked.type !== POI_TYPE) {
            return
        }

        // Save slugs in store
        menuStore.target = data.picked

        const position = data.positions.position ?? data.positions.position.endPosition
        const cartesian = lgs.viewer.camera.pickEllipsoid(position, lgs.viewer.scene.globe.ellipsoid)


        if (cartesian) {
            const cartographic = Cesium.Cartographic.fromCartesian(cartesian)
            menuStore.longitude = Cesium.Math.toDegrees(cartographic.longitude)
            menuStore.latitude = Cesium.Math.toDegrees(cartographic.latitude)

            let {x, y} = Cesium.SceneTransforms.wgs84ToWindowCoordinates(lgs.viewer.scene, cartesian)
            menuStore.coordinates.x = x
            menuStore.coordinates.y = y

            MouseUtils.showMenu(data.picked.type)
        }
    }

}