module.exports = function AbnormalManager(dispatch, common){
    const getEntity = common.getEntity
    const lngCmp = common.lngCmp
    const debug = common.debug
    const getCid = common.getCid
    const ID_ENRAGE = 8888888
    let npcs = {}
    dispatch.hook('S_ABNORMALITY_BEGIN', 1, addAbnormal)
    dispatch.hook('S_ABNORMALITY_REFRESH', 1, refreshAbnormal)
    dispatch.hook('S_ABNORMALITY_END', 1, removeAbnormal)
    dispatch.hook('S_NPC_STATUS', 1, (event) => {
        if(lngCmp(event.target, 0)) return
        let npc = getNpc(event.creature)
        let entity = getEntity(event.creature)
        if(event.enraged === 1) {
            if(!npc.enraged){
                addAbnormal({
                    target: event.creature,
                    source: {},
                    id: ID_ENRAGE,
                    duration: 36000,
                    stacks: 1
                })
            }
            npc.enraged = true
        }
        if(event.enraged === 0) {
            if(npc.enraged){
                removeAbnormal({
                    target: event.creature,
                    id: ID_ENRAGE
                })
                if(entity.hp){
                    entity.abnormals[ID_ENRAGE].nextEnrage = entity.hp - 10
                }
            }
            npc.enraged = false
        }
    })
    function getNpc(id){
        return npcs[id.toString()] = npcs[id.toString()] || {}
    }
    function addAbnormal(event){
        let entity = getEntity(event.target)
        let abnormal = entity.abnormals[event.id] = entity.abnormals[event.id] || {}
        abnormal.added = Date.now()
        abnormal.expires = Date.now() + event.duration
        delete abnormal.refreshed
        delete abnormal.removed
    }
    function refreshAbnormal(event){
        let entity = getEntity(event.target)
        let abnormal = entity.abnormals[event.id] = entity.abnormals[event.id] || {}
        if(!abnormal.added) abnormal.added = Date.now()
        abnormal.refreshed = Date.now()
        abnormal.expires = Date.now() + event.duration
    }
    function removeAbnormal(event){
        let entity = getEntity(event.target)
        let abnormal = entity.abnormals[event.id] = entity.abnormals[event.id] || {}
        abnormal.removed = Date.now()
        delete abnormal.added
        delete abnormal.refreshed
        delete abnormal.expires
    }
}
