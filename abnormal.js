module.exports = function AbnormalManager(dispatch, debug){
    const ID_ENRAGE = 8888888
    let entities = {}
    dispatch.hook('S_ABNORMALITY_BEGIN', 1, addAbnormal)
    dispatch.hook('S_ABNORMALITY_REFRESH', 1, refreshAbnormal)
    dispatch.hook('S_ABNORMALITY_END', 1, removeAbnormal)
    dispatch.hook('S_CLEAR_ALL_HOLDED_ABNORMALITY', 'raw', (data) => {
        entities = {}
    })
    dispatch.hook('S_NPC_STATUS', 1, (event) => {
        let entity = getEntity(event.creature)
        if(event.enraged === 1) {
            if(!entity.enraged)
                addAbnormal({
                    target: event.creature,
                    source: {},
                    id: ID_ENRAGE,
                    duration: 36000,
                    stacks: 1
                })
            entity.enraged = true
        }
        if(event.enraged === 0) {
            if(entity.enraged)
                removeAbnormal({
                    target: event.creature,
                    id: ID_ENRAGE
                })
            entity.enraged = false
        }
    })
    function getEntity(id){
        if(!id) return false
        id = id.toString()
        return entities[id] = entities[id] || {}
    }
    function getAbnormal(entityId, abnormalId){
        let entity = getEntity(entityId)
        return entity[abnormalId] = entity[abnormalId] || {}
    }
    function addAbnormal(event){
        let abnormal = getAbnormal(event.target, event.id)
        abnormal.added = Date.now()
        abnormal.expires = Date.now() + event.duration
        delete abnormal.refreshed
        delete abnormal.removed
    }
    function refreshAbnormal(event){
        let abnormal = getAbnormal(event.target, event.id)
        if(!abnormal.added) abnormal.added = Date.now()
        abnormal.refreshed = Date.now()
        abnormal.expires = Date.now() + event.duration
    }
    function removeAbnormal(event){
        let abnormal = getAbnormal(event.target, event.id)
        abnormal.removed = Date.now()
        delete abnormal.added
        delete abnormal.refreshed
        delete abnormal.expires
    }
    this.get = function(entityId, abnormalId){
        let entity = getEntity(entityId)
        return entity[abnormalId]
    }
}
