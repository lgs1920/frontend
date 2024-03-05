import { faTrashCan }    from '@fortawesome/pro-regular-svg-icons'
import { faLocationDot } from '@fortawesome/pro-solid-svg-icons'

import {
    SlCard, SlColorPicker, SlDivider, SlIcon, SlInput, SlProgressBar, SlRange, SlSwitch, SlTooltip,
}                               from '@shoelace-style/shoelace/dist/react'
import { useSnapshot }          from 'valtio'
import { NO_DEM_SERVER, Track } from '../../../classes/Track'
import { FA2SL }                from '../../../Utils/FA2SL'
import { TracksEditorUtils }    from '../../../Utils/TracksEditorUtils'
import { DEMServerSelection }   from '../DEMServerSelection'
import { useConfirm }           from '../Modals/ConfirmUI'

export const TrackSettings = function TrackSettings() {

    const editorStore = vt3d.editorProxy
    const editorSnapshot = useSnapshot(editorStore)

    let dataSource = vt3d.viewer.dataSources.getByName(editorStore.track.slug)[0]

    /**
     * Remove track confirmation
     */
    const [ConfirmRemoveTrackDialog, confirmRemoveTrack] = useConfirm(
        `Remove "${editorSnapshot.track.title}" ?`,
        'Are you sure you want to remove this track ?',
    )


    /**
     * Change track Color
     *
     * @type {setColor}
     */
    const setColor = (async event => {
        editorStore.track.color = event.target.value
        TracksEditorUtils.reRenderTracksList()
        await rebuildTrack()
    })

    /**
     * Change Track Title
     *
     * The selection box is then synchronised
     *
     * @type {setTitle}
     */
    const setTitle = (async event => {
        const title = event.target.value
        // Title is empty, we force the former value
        if (title === '') {
            const field = document.getElementById('track-title')
            field.value = editorStore.track.title
            return
        }
        // Let's check if the next title has not been already used for
        // another track.
        editorStore.track.title = Track.defineUnicTitle(title)
        await rebuildTrack()

        TracksEditorUtils.reRenderTracksList()
    })

    /**
     * Change track thickness
     *
     * @type {setThickness}
     */
    const setThickness = (async event => {
        editorStore.track.thickness = event.target.value
        TracksEditorUtils.reRenderTrackSettings()
        await rebuildTrack()

    })

    /**
     * Change track visibility
     *
     * @type {setThickness}
     */
    const setVisibility = (async event => {
        //save state
        editorStore.track.visible = event.target.checked

        // Change track visibility by changing it for each entity
        if (event.target.checked) {
            // We show all tracks and markers Except for start and stop,
            // for which the pre-masking status is maintained.
            dataSource.entities.values.forEach(entity => {
                if (entity.id.endsWith('start')) {
                    entity.show = editorStore.track.markers.get('start').visible
                } else if (entity.id.endsWith('stop')) {
                    entity.show = editorStore.track.markers.get('stop').visible
                } else {
                    entity.show = event.target.checked
                }
            })
        } else {
            // We hide all tracks and markers
            dataSource.entities.values.forEach(entity => {
                entity.show = event.target.checked
            })
        }


    })

    /**
     * Change marker visibility
     *
     * @type {setMarkerVisibility}
     */
    const setMarkerVisibility = (event => {
        // Which marker ?
        const type = event.target.id.endsWith('start') ? 'start' : 'stop'
        // Save state
        editorStore.track.markers.get(type).visible = event.target.checked
        // Toggle marker visibility
        dataSource.entities.values.forEach(entity => {
            if (entity.id.endsWith(type)) {
                entity.show = event.target.checked
            }
        })
    })

    /**
     * Change DEM server
     *
     * @type {setDEMServer}
     */
    const setDEMServer = (async event => {
        editorStore.track.DEMServer = event.target.value
        editorStore.longTask = editorStore.track.DEMServer !== NO_DEM_SERVER
        TracksEditorUtils.reRenderTrackSettings()
    })

    /**
     * Remove track
     */
    const removeTrack = async () => {

        const confirmation = await confirmRemoveTrack()

        if (confirmation) {
            const mainStore = vt3d.mainProxy.components.tracksEditor
            const track = editorStore.track.slug
            // get Track index
            const index = mainStore.list.findIndex((list) => list === track)

            /**
             * Do some cleaning
             */
            if (index >= 0) {
                // In store
                mainStore.list.splice(index, 1)
                // In Context context
                vt3d.tracks.splice(index, 1)
                // In canvas, ie remove the tracks and all markers
                // But sometimes we loo dataSource TODO why ?
                if (dataSource === undefined) {
                    dataSource = vt3d.viewer.dataSources.getByName(editorStore.track.slug)[0]
                }
                vt3d.viewer.dataSources.remove(dataSource)

            }

            /**
             * If we have some other tracks, we'll take the first and render the editor.
             * Otherwise we close the editing.
             */
            if (mainStore.list.length >= 1) {
                // New current is the first.
                vt3d.currentTrack = vt3d.getTrackBySlug(mainStore.list[0])
                TracksEditorUtils.reRenderTracksList()
                TracksEditorUtils.reRenderTrackSettings()
                await rebuildTrack()
            } else {
                mainStore.usable = false
                mainStore.show = false
            }
        }
    }


    /**
     * Re build the track object,
     * Re compute metrix //TODO voir one peut paseprendre le anciens(tant que DEM n'a pa change)
     *
     * @return {Track}
     */
    const rebuildTrack = async () => {
        // unproxify
        const unproxyfied = JSON.parse(JSON.stringify(editorStore.track))
        // We clone but keep the same slug
        const track = Track.clone(unproxyfied, {
            slug: unproxyfied.slug,
            title: unproxyfied.title,
            markers: editorStore.track.markers,
        })
        await track.computeAll()
        //track.addTipsMarkers()
        vt3d.saveTrack(track)

        //  vt3d.viewer.dataSources.removeAll()
        if (track.visible) {
            await track.loadAfterNewSettings()
        }
        return track
    }

    /**
     * Marker Visibility component
     * @param props
     *
     * @return {JSX.Element}
     *
     * @constructor
     */
    const MarkerVisibility = (props) => {
        return (
            <>
                {
                    <div id={`visibility-marker-${props.type}`}>
                        <div style={{color: vt3d.configuration.track.markers[props.type].color}}>
                            <SlIcon library="fa"
                                    className={'fa-lg'}
                                    name={FA2SL.set(faLocationDot)}/>
                        </div>
                        {props.label}:
                        <SlSwitch size="small"
                                  checked={editorStore.track.markers.get(props.type).visible}
                                  style={{'--thumb-size': '1rem'}}
                                  onSlChange={setMarkerVisibility}
                                  id={`switch-visibility-marker-${props.type}`}
                        />
                    </div>
                }
            </>
        )
    }

    return (<>
        {editorSnapshot.track &&
            <SlCard id="track-settings" key={vt3d.mainProxy.components.tracksEditor.trackSettingsKey}>
                {/* Change visible name (title) */}
                <SlInput id="track-title" label="Title:" value={editorSnapshot.track.title}
                         onSlChange={setTitle}
                />

                {/* Add DEM server selection if we do not have height initially (ie in the track file) */
                    !editorSnapshot.track.hasHeight &&
                    <>
                        <DEMServerSelection
                            default={editorSnapshot.track?.DEMServer ?? NO_DEM_SERVER}
                            label={'Simulate Altitude:'}
                            onChange={setDEMServer}
                        />
                        {editorSnapshot.longTask && <SlProgressBar indeterminate/>}
                    </>
                }

                {/* Track line settings */}
                <div id="track-line-settings">
                    <div>
                        <SlTooltip content="Color">
                            <SlColorPicker opacity
                                           size={'small'}
                                           label={'Color'}
                                           value={editorSnapshot.track.color}
                                           swatches={vt3d.configuration.defaultTrackColors.join(';')}
                                           onSlChange={setColor}
                                           disabled={!editorSnapshot.track.visible}
                            />
                        </SlTooltip>
                        <SlTooltip content="Thickness">
                            <SlRange min={1} max={10} step={1}
                                     value={editorSnapshot.track.thickness}
                                     style={{'--thumb-size': '1rem'}}
                                     onSlChange={setThickness}
                                     disabled={!editorSnapshot.track.visible}
                            />
                        </SlTooltip>

                        <SlDivider id="test-line" style={{
                            '--color': editorSnapshot.track.visible ? editorSnapshot.track.color : 'transparent',
                            '--width': `${editorSnapshot.track.thickness}px`,
                            '--spacing': 0,
                        }}
                                   disabled={!editorSnapshot.track.visible}
                        />

                        <SlSwitch size="small"
                                  checked={editorSnapshot.track.visible}
                                  style={{'--thumb-size': '1rem'}}
                                  onSlChange={setVisibility}
                        />

                        <SlTooltip content={'Remove'}>
                            <a onClick={removeTrack}>
                                <SlIcon library="fa" name={FA2SL.set(faTrashCan)}/>
                            </a>
                        </SlTooltip>

                        <ConfirmRemoveTrackDialog/>
                    </div>

                    {editorSnapshot.track.visible &&
                        <div>
                            <MarkerVisibility type={'start'} label={'Start'}/>
                            <MarkerVisibility type={'stop'} label={'Stop'}/>
                        </div>
                    }
                </div>
            </SlCard>
        }
    </>)
}