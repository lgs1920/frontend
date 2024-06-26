export const main = {
    components: {

        mainUI:{
            show:false,
            credits: {show: false},
        },

        camera: {
            show: false,
            showTarget: false,
            position: {},
            event: false,
        },

        journeyEditor: {
            visible: false,
            show: false,
            list: [],
            keys: {
                journey: {
                    list: 0,
                    settings: 0,
                },
                track: {
                    list: 5000,
                    settings: 0,
                },
            },
        },
        floatingMenu: {
            coordinates: {x: 0, y: -9999},
            delay: 3,
            type: undefined,
            target: undefined,
            show: true,
            latitude: 0,
            longitude: 0,
            altitude: 0,
        },
        profile: {
            visible: false,
            show: false,
            key: 0,
        },
        wanderer: {
            run: false,
            pause:false,
            forward: true,
            duration: undefined,
            loop:false
        },

    },
    modals: {
        altitudeChoice: {
            show: false,
            model: 'terrain',
        },
    },
    theJourney: null,
    fullSize: false,
    canViewJourneyData: false,
    canViewProfile: false,
    layer: false,
}