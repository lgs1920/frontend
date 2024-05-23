import { faPencil }                    from '@fortawesome/pro-regular-svg-icons'
import { SlButton, SlIcon, SlTooltip } from '@shoelace-style/shoelace/dist/react'
import { FA2SL }                       from '@Utils/FA2SL'
import './style.css'
import { useSnapshot }                 from 'valtio'

export const TracksEditorButton = function TracksEditorButton(props, ref) {

    const mainStore = lgs.mainProxy
    const mainSnap = useSnapshot(mainStore)


    /**
     * Open tracks editor pane
     *
     * @param event
     */
    const toggleTracksEditor = () => {
        lgs.journeyEditorStore.show = !lgs.journeyEditorStore.show
    }

    return (<>
        <SlTooltip placement={props.tooltip} content="Edit Tracks">
            {mainSnap.canViewJourneyData &&
                <SlButton size={'small'} className={'square-icon'} id={'open-theJourney-editor'}
                          onClick={toggleTracksEditor}>
                    <SlIcon library="fa" name={FA2SL.set(faPencil)}></SlIcon>
                </SlButton>}
        </SlTooltip>
    </>)
}
